import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = String(process.env.CORS_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
if (isProduction && (!process.env.FFGLORY_API_KEY || !process.env.FFGLORY_MASTER_KEY)) {
  throw new Error('FFGLORY_API_KEY and FFGLORY_MASTER_KEY are required in production');
}

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : false);
app.use((req,res,next)=>{
  const id=req.get('x-request-id') || crypto.randomUUID();
  res.setHeader('X-Request-ID', id);
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('X-Frame-Options','DENY');
  if (isProduction) res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
  next();
});
app.use(cors({ credentials: true, allowedHeaders: ['Content-Type','Authorization','X-Request-ID'], methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], origin: (origin, cb) => {
  if (!origin) return cb(null, true);
  if (!isProduction && allowedOrigins.length === 0) return cb(null, true);
  if (allowedOrigins.includes(origin)) return cb(null, true);
  return cb(new Error('Origin not allowed'));
}, allowedHeaders: ['Content-Type','Authorization','X-Request-ID'] }));
app.use(express.json({ limit: '32kb' }));
app.use((err,req,res,next)=>{ if(err?.type==='entity.parse.failed') return res.status(400).json({error:'Invalid JSON body'}); if(err) return res.status(500).json({error:'Request processing error'}); next(); });

const buckets = new Map();
setInterval(()=>{ const cutoff=Date.now()-120000; for(const [k,v] of buckets){ if(v.t<cutoff) buckets.delete(k); } },60000).unref();
function rateLimit(req,res,next){
  const key=(req.ip||'unknown')+'|'+(req.get('authorization')||''); const now=Date.now();
  let b=buckets.get(key); if(!b||now-b.t>60000){b={t:now,n:0};buckets.set(key,b)}
  if(++b.n>120)return res.status(429).json({error:'Too many requests'}); next();
}
app.use(rateLimit);

const base=(process.env.FFGLORY_BASE||'https://ffglory.pro').replace(/\/$/,'');
const accountKey=process.env.FFGLORY_API_KEY; const masterKey=process.env.FFGLORY_MASTER_KEY;
const appToken=process.env.APP_ACCESS_TOKEN;
const dataDir=process.env.DATA_DIR || path.resolve(process.cwd(),'data');

const supabaseUrl=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const supabaseServiceKey=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'');
async function supabaseRequest(method, table, body){
  if(!supabaseUrl || !supabaseServiceKey) return null;
  const r=await fetch(supabaseUrl+'/rest/v1/'+table,{
    method,
    headers:{
      apikey:supabaseServiceKey,
      Authorization:'Bearer '+supabaseServiceKey,
      'Content-Type':'application/json',
      Prefer: method==='GET' ? 'return=representation' : 'return=representation'
    },
    body:body===undefined?undefined:JSON.stringify(body),
    signal:AbortSignal.timeout(10000)
  });
  const text=await r.text();
  let data=[]; try{data=text?JSON.parse(text):[];}catch{data=[];}
  if(!r.ok) throw new Error('Supabase request failed: '+r.status);
  return data;
}
async function getPersistentPricing(){
  if(!supabaseUrl || !supabaseServiceKey) return null;
  const rows=await supabaseRequest('GET','pricing?select=id,name,price,credits&order=id.asc');
  return Array.isArray(rows)?rows:null;
}
async function savePersistentPricing(plans){
  if(!supabaseUrl || !supabaseServiceKey) return false;
  await supabaseRequest('POST','pricing?on_conflict=id',plans);
  return true;
}
const usersFile=path.join(dataDir,'users.json');
const auditFile=path.join(dataDir,'audit.json');
const sessionsFile=path.join(dataDir,'sessions.json');
fs.mkdirSync(dataDir,{recursive:true});
if(!fs.existsSync(usersFile)) fs.writeFileSync(usersFile,'{}','utf8');
if(!fs.existsSync(auditFile)) fs.writeFileSync(auditFile,'[]','utf8');
if(!fs.existsSync(sessionsFile)) fs.writeFileSync(sessionsFile,'{}','utf8');

function readUsers(){ try{return JSON.parse(fs.readFileSync(usersFile,'utf8')||'{}')}catch{return {}} }
function atomicWrite(file, value){ const tmp=file+'.tmp'; fs.writeFileSync(tmp,JSON.stringify(value,null,2)+'\n','utf8'); fs.renameSync(tmp,file); }
function writeUsers(users){ atomicWrite(usersFile,users); }
function readAudit(){ try{return JSON.parse(fs.readFileSync(auditFile,'utf8')||'[]')}catch{return []} }
function readSessions(){ try{return JSON.parse(fs.readFileSync(sessionsFile,'utf8')||'{}')}catch{return {}} }
function writeSessions(rows){ atomicWrite(sessionsFile,rows); }
function tokenHash(t){ return crypto.createHash('sha256').update(t).digest('hex'); }
function audit(req,action,target=''){ const rows=readAudit(); rows.push({id:crypto.randomUUID(),at:new Date().toISOString(),actor:req.user?.email||'system',actorId:req.user?.id||'system',action,target,ip:req.ip||''}); while(rows.length>1000) rows.shift(); atomicWrite(auditFile,rows); }
function adminOnly(req,res,next){ if(req.user?.role!=='admin') return res.status(403).json({error:'Admin access required'}); next(); }
function hashPassword(password){ const salt=crypto.randomBytes(16); const hash=crypto.scryptSync(password,salt,64); return salt.toString('hex')+':'+hash.toString('hex'); }
function verifyPassword(password,stored){ try{const [s,h]=stored.split(':'); const hash=crypto.scryptSync(password,Buffer.from(s,'hex'),64); const expected=Buffer.from(h,'hex'); return expected.length===hash.length&&crypto.timingSafeEqual(hash,expected)}catch{return false} }
function sessionToken(){ return crypto.randomBytes(32).toString('base64url'); }
const sessions=new Map(Object.entries(readSessions()));
function pruneSessions(){ const now=Date.now(); let changed=false; for(const [k,s] of sessions){ if(!s || s.expiresAt<=now){ sessions.delete(k); changed=true; } } if(changed) writeSessions(Object.fromEntries(sessions)); }
setInterval(pruneSessions,60000).unref();

function appAuth(req,res,next){
  pruneSessions();
  const got=(req.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(appToken && got && Buffer.byteLength(got)===Buffer.byteLength(appToken) && crypto.timingSafeEqual(Buffer.from(got),Buffer.from(appToken))){ req.user={id:'service',email:'service'}; return next(); }
  const key=tokenHash(got); const s=sessions.get(key);
  if(!s || s.expiresAt<Date.now()){ sessions.delete(key); writeSessions(Object.fromEntries(sessions)); return res.status(401).json({error:'Authentication required'}); }
  req.user=s.user; next();
}

async function ff(method,pathName,body){
  if(!accountKey||!masterKey) throw new Error('Server secrets are not configured');
  const u=new URL(base+pathName); u.searchParams.set('api_key',accountKey);
  const r=await fetch(u,{method,headers:{'Content-Type':'application/json','x-api-key':masterKey},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
  const text=await r.text(); let data; try{data=JSON.parse(text)}catch{data={error:text}}; return {status:r.status,data};
}
function proxy(pathName,method='GET',bodyMap=()=>undefined){ return async(req,res)=>{ try{const target=typeof pathName==='function'?pathName(req):pathName; const x=await ff(method,target,bodyMap(req)); res.status(x.status).json(x.data)}catch(e){res.status(502).json({error:'Upstream API unavailable'})} }; }

app.get('/health',(req,res)=>res.json({ok:true,service:'ffglory-backend',version:'4.2',environment:isProduction?'production':'development',upstreamConfigured:Boolean(accountKey&&masterKey)}));

app.post('/auth/register',(req,res)=>{
  const email=String(req.body?.email||'').trim().toLowerCase(); const password=String(req.body?.password||''); const name=String(req.body?.name||'').trim().slice(0,80);
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<8) return res.status(400).json({error:'Valid email and password of at least 8 characters are required'});
  const users=readUsers(); if(users[email]) return res.status(409).json({error:'Account already exists'});
  users[email]={id:crypto.randomUUID(),email,name,passwordHash:hashPassword(password),role:'user',active:true,createdAt:new Date().toISOString()}; writeUsers(users);
  audit({user:{id:users[email].id,email}},'register',email); const token=sessionToken(); sessions.set(tokenHash(token),{user:{id:users[email].id,email,name,role:'user'},expiresAt:Date.now()+1000*60*60*24*30}); writeSessions(Object.fromEntries(sessions));
  res.status(201).json({token,user:{id:users[email].id,email,name,role:'user'}});
});

app.post('/auth/login',(req,res)=>{
  const email=String(req.body?.email||'').trim().toLowerCase(); const password=String(req.body?.password||''); const u=readUsers()[email];
  if(!u||u.active===false||!verifyPassword(password,u.passwordHash)) return res.status(401).json({error:'Invalid email or password'});
  const token=sessionToken(); sessions.set(tokenHash(token),{user:{id:u.id,email:u.email,name:u.name||'',role:u.role||'user'},expiresAt:Date.now()+1000*60*60*24*30}); writeSessions(Object.fromEntries(sessions));
  audit({user:{id:u.id,email:u.email}},'login',email); res.json({token,user:{id:u.id,email:u.email,name:u.name||'',role:u.role||'user'}});
});
app.post('/auth/logout',appAuth,(req,res)=>{const got=(req.get('authorization')||'').replace(/^Bearer\s+/i,''); sessions.delete(tokenHash(got)); writeSessions(Object.fromEntries(sessions)); res.json({ok:true});});
app.get('/auth/me',appAuth,(req,res)=>res.json({user:req.user}));

app.use('/api',(req,res,next)=>{ if(req.method==='GET' && req.path==='/pricing') return next(); appAuth(req,res,next); });

const localFile = name => path.join(dataDir,name);
function readJson(name,fallback){
  try{return JSON.parse(fs.readFileSync(localFile(name),'utf8')||JSON.stringify(fallback))}
  catch{return fallback}
}
function writeJson(name,value){atomicWrite(localFile(name),value);}
function userKey(req){return req.user?.id||req.user?.email||"unknown";}

const defaultPricing=[
  {id:"basic",name:"Basic",price:99,credits:1},
  {id:"premium",name:"Premium",price:199,credits:1},
  {id:"pro",name:"Pro",price:399,credits:1}
];

app.get('/api/me',(req,res)=>{
  const transactions=readJson("transactions.json",[]);
  const credits=transactions
    .filter(x=>String(x.userId)===String(userKey(req))&&x.status==="completed")
    .reduce((sum,x)=>sum+Number(x.credits||0),0);
  res.json({user:req.user,credits});
});

app.get('/api/pricing',async(req,res)=>{
  try{
    const plans=await getPersistentPricing();
    res.json({plans:plans&&plans.length?plans:readJson("pricing.json",defaultPricing)});
  }catch(e){
    console.error('Pricing load failed:', e?.message || e);
    res.status(500).json({error:'Unable to load pricing',detail:String(e?.message||e)});
  }
});

app.get('/api/credit-history',(req,res)=>{
  const transactions=readJson("transactions.json",[]).filter(x=>String(x.userId)===String(userKey(req)));
  const completed=transactions.filter(x=>x.status==="completed");
  const refunded=transactions.filter(x=>x.status==="refunded");
  const balance=completed.reduce((sum,x)=>sum+Number(x.credits||0),0)-refunded.reduce((sum,x)=>sum+Number(x.credits||0),0);
  const purchased=completed.reduce((sum,x)=>sum+Number(x.credits||0),0);
  res.json({balance:Math.max(0,balance),purchased,history:transactions.slice().reverse().map(x=>({id:x.id,planName:x.planName,credits:Number(x.credits||0),status:x.status,createdAt:x.createdAt}))});
});

app.get('/api/groups',(req,res)=>{
  const rows=readJson("groups.json",[]);
  res.json({groups:rows.filter(x=>String(x.userId)===String(userKey(req)))});
});

app.post('/api/groups',(req,res)=>{
  const rows=readJson("groups.json",[]);
  const row={id:crypto.randomUUID(),userId:userKey(req),
    name:String(req.body?.name||"My FF Group"),
    region:String(req.body?.region||""),
    clan_id:String(req.body?.clan_id||""),
    status:"active",createdAt:new Date().toISOString()};
  rows.push(row);writeJson("groups.json",rows);
  audit(req,"group.create",row.id);
  res.status(201).json({group:row});
});

app.post('/api/groups/action',(req,res)=>{
  const rows=readJson("groups.json",[]);
  const id=String(req.body?.group_id||"");
  const row=rows.find(x=>String(x.id)===id&&String(x.userId)===String(userKey(req)));
  if(!row)return res.status(404).json({error:"Group not found"});
  row.lastAction=String(req.body?.action||"");
  writeJson("groups.json",rows);
  res.json({ok:true,group:row});
});

app.get('/api/coupons',(req,res)=>{
  const rows=readJson("coupons.json",[]);
  res.json({coupons:rows.filter(x=>String(x.userId)===String(userKey(req)))});
});

app.post('/api/coupons',(req,res)=>{
  const rows=readJson("coupons.json",[]);
  const row={id:crypto.randomUUID(),userId:userKey(req),
    code:"MF-"+crypto.randomBytes(4).toString("hex").toUpperCase(),
    basic_credits:Number(req.body?.basic_credits||0),
    premium_credits:Number(req.body?.premium_credits||0),
    status:"active",createdAt:new Date().toISOString()};
  rows.push(row);writeJson("coupons.json",rows);
  res.status(201).json({coupon:row});
});

app.post('/api/coupons/redeem',(req,res)=>{
  const rows=readJson("coupons.json",[]);
  const code=String(req.body?.code||"").trim().toUpperCase();
  const row=rows.find(x=>x.code===code&&x.status==="active");
  if(!row)return res.status(404).json({error:"Coupon not found"});
  row.status="redeemed";row.redeemedBy=userKey(req);row.redeemedAt=new Date().toISOString();
  writeJson("coupons.json",rows);res.json({ok:true,coupon:row});
});

app.get('/api/coupons/redeemed',(req,res)=>{
  const rows=readJson("coupons.json",[]);
  res.json({coupons:rows.filter(x=>x.redeemedBy===userKey(req))});
});

app.post('/api/coupons/cancel',(req,res)=>{
  const rows=readJson("coupons.json",[]);
  const code=String(req.body?.code||"").trim().toUpperCase();
  const row=rows.find(x=>x.code===code&&x.userId===userKey(req));
  if(!row)return res.status(404).json({error:"Coupon not found"});
  row.status="cancelled";writeJson("coupons.json",rows);
  res.json({ok:true,coupon:row});
});

app.post('/api/transactions',async(req,res)=>{
  const rows=readJson("transactions.json",[]);
  const plan=String(req.body?.plan_id||"");
  const persistentPlans=await getPersistentPricing();
  const plans=persistentPlans&&persistentPlans.length?persistentPlans:readJson("pricing.json",defaultPricing);
  const selected=plans.find(x=>String(x.id)===plan);
  if(!selected)return res.status(404).json({error:"Plan not found"});

  const row={
    id:crypto.randomUUID(),
    userId:userKey(req),
    planId:selected.id,
    planName:selected.name,
    amount:Number(selected.price||0),
    credits:Number(selected.credits||0),
    status:"payment_pending",
    paymentMethod:"UPI",
    createdAt:new Date().toISOString()
  };

  rows.push(row);
  writeJson("transactions.json",rows);
  audit(req,"transaction.create",row.id);
  res.status(201).json({transaction:row,upiId:String(process.env.PAYMENT_UPI_ID||"")});
});

app.get('/api/transactions',(req,res)=>{
  const rows=readJson("transactions.json",[]);
  res.json({transactions:rows.filter(x=>String(x.userId)===String(userKey(req)))});
});

app.post('/api/transactions/refund-request',(req,res)=>{
  const rows=readJson("transactions.json",[]);
  const id=String(req.body?.transaction_id||"");
  const row=rows.find(x=>String(x.id)===id&&String(x.userId)===String(userKey(req)));
  if(!row)return res.status(404).json({error:"Transaction not found"});
  if(row.status==="refunded")return res.status(400).json({error:"Credits already refunded"});
  if(row.status!=="completed")return res.status(400).json({error:"Only completed transactions can request a refund"});
  row.status="refund_requested";
  row.refundRequestedAt=new Date().toISOString();
  writeJson("transactions.json",rows);
  audit(req,"transaction.refund_request",row.id);
  res.json({ok:true,transaction:row});
});

app.post('/api/transactions/cancel',(req,res)=>{
  const rows=readJson("transactions.json",[]);
  const id=String(req.body?.transaction_id||"");
  const row=rows.find(x=>String(x.id)===id&&String(x.userId)===String(userKey(req)));
  if(!row)return res.status(404).json({error:"Transaction not found"});
  row.status="cancelled";writeJson("transactions.json",rows);
  res.json({ok:true,transaction:row});
});

app.get('/api/history',(req,res)=>{
  const rows=readJson("history.json",[]);
  res.json({history:rows.filter(x=>String(x.userId)===String(userKey(req)))});
});

app.get('/api/glory-progression',(req,res)=>{
  const rows=readJson("glory.json",{});
  res.json(rows[userKey(req)]||{level:1,xp:0,nextLevelXp:100});
});

app.get('/api/activity',(req,res)=>{
  const rows=readAudit().filter(x=>String(x.actorId)===String(userKey(req)));
  res.json({activity:rows.slice(-100).reverse()});
});

app.get('/api/notifications',(req,res)=>{
  const rows=readJson("notifications.json",[]);
  res.json({notifications:rows.filter(x=>String(x.userId)===String(userKey(req)))});
});


app.get('/admin/overview',appAuth,adminOnly,(req,res)=>{
  const users=Object.values(readUsers());
  const groups=readJson("groups.json",[]);
  const coupons=readJson("coupons.json",[]);
  const transactions=readJson("transactions.json",[]);
  res.json({
    stats:{
      users:users.length,
      activeUsers:users.filter(u=>u.active!==false).length,
      admins:users.filter(u=>u.role==="admin").length,
      groups:groups.length,
      coupons:coupons.length,
      transactions:transactions.length,
      revenue:transactions.reduce((n,x)=>n+Number(x.amount||0),0)
    }
  });
});
app.get('/admin/groups',appAuth,adminOnly,(req,res)=>res.json({groups:readJson("groups.json",[])}));
app.patch('/admin/groups/:id',appAuth,adminOnly,(req,res)=>{
  const rows=readJson("groups.json",[]);
  const row=rows.find(x=>String(x.id)===String(req.params.id));
  if(!row)return res.status(404).json({error:"Group not found"});
  if(typeof req.body?.name==="string") row.name=req.body.name.trim().slice(0,80);
  if(typeof req.body?.region==="string") row.region=req.body.region.trim().slice(0,40);
  if(typeof req.body?.status==="string") row.status=req.body.status.trim().slice(0,30);
  writeJson("groups.json",rows); audit(req,"admin.group.update",row.id);
  res.json({ok:true,group:row});
});
app.delete('/admin/groups/:id',appAuth,adminOnly,(req,res)=>{
  const rows=readJson("groups.json",[]);
  const next=rows.filter(x=>String(x.id)!==String(req.params.id));
  if(next.length===rows.length)return res.status(404).json({error:"Group not found"});
  writeJson("groups.json",next); audit(req,"admin.group.delete",req.params.id);
  res.json({ok:true});
});
app.get('/admin/coupons',appAuth,adminOnly,(req,res)=>res.json({coupons:readJson("coupons.json",[])}));
app.patch('/admin/coupons/:id',appAuth,adminOnly,(req,res)=>{
  const rows=readJson("coupons.json",[]);
  const row=rows.find(x=>String(x.id)===String(req.params.id));
  if(!row)return res.status(404).json({error:"Coupon not found"});
  if(typeof req.body?.status==="string") row.status=req.body.status.trim().slice(0,30);
  writeJson("coupons.json",rows); audit(req,"admin.coupon.update",row.id);
  res.json({ok:true,coupon:row});
});
app.get('/admin/transactions',appAuth,adminOnly,(req,res)=>res.json({transactions:readJson("transactions.json",[])}));
app.patch('/admin/transactions/:id/verify',appAuth,adminOnly,(req,res)=>{
  const rows=readJson("transactions.json",[]);
  const row=rows.find(x=>String(x.id)===String(req.params.id));
  if(!row)return res.status(404).json({error:"Transaction not found"});
  if(row.status!=="payment_pending")return res.status(400).json({error:"Only pending payments can be verified"});
  row.status="completed";
  row.verifiedAt=new Date().toISOString();
  row.verifiedBy=req.user.id;
  writeJson("transactions.json",rows);
  audit(req,"admin.transaction.verify",row.id);
  res.json({ok:true,transaction:row});
});
app.patch('/admin/transactions/:id/reject',appAuth,adminOnly,(req,res)=>{
  const rows=readJson("transactions.json",[]);
  const row=rows.find(x=>String(x.id)===String(req.params.id));
  if(!row)return res.status(404).json({error:"Transaction not found"});
  if(row.status!=="payment_pending")return res.status(400).json({error:"Only pending payments can be rejected"});
  row.status="payment_rejected";
  row.rejectedAt=new Date().toISOString();
  row.rejectedBy=req.user.id;
  writeJson("transactions.json",rows);
  audit(req,"admin.transaction.reject",row.id);
  res.json({ok:true,transaction:row});
});

app.patch('/admin/transactions/:id/refund',appAuth,adminOnly,(req,res)=>{
  const rows=readJson("transactions.json",[]);
  const row=rows.find(x=>String(x.id)===String(req.params.id));
  if(!row)return res.status(404).json({error:"Transaction not found"});
  if(row.status==="refunded")return res.status(400).json({error:"Credits already refunded"});
  if(row.status!=="completed")return res.status(400).json({error:"Only completed transactions can be refunded"});
  row.status="refunded";
  row.refundedAt=new Date().toISOString();
  row.refundedBy=req.user.id;
  writeJson("transactions.json",rows);
  audit(req,"admin.transaction.refund",row.id);
  res.json({ok:true,refundedCredits:Number(row.credits||0),transaction:row});
});

app.patch('/admin/transactions/:id',appAuth,adminOnly,(req,res)=>{
  const rows=readJson("transactions.json",[]);
  const row=rows.find(x=>String(x.id)===String(req.params.id));
  if(!row)return res.status(404).json({error:"Transaction not found"});
  if(typeof req.body?.status==="string") row.status=req.body.status.trim().slice(0,30);
  writeJson("transactions.json",rows); audit(req,"admin.transaction.update",row.id);
  res.json({ok:true,transaction:row});
});
app.get('/admin/pricing',appAuth,adminOnly,async(req,res)=>{
  try{
    const plans=await getPersistentPricing();
    res.json({plans:plans&&plans.length?plans:readJson("pricing.json",defaultPricing)});
  }catch(e){res.status(500).json({error:'Unable to load pricing'});}
});
app.put('/admin/pricing',appAuth,adminOnly,async(req,res)=>{
  if(!Array.isArray(req.body?.plans)) return res.status(400).json({error:"plans must be an array"});
  const plans=req.body.plans.map(x=>({
    id:String(x.id||"").trim(),
    name:String(x.name||"").trim().slice(0,50),
    price:Number(x.price||0),
    credits:Number(x.credits||0)
  })).filter(x=>x.id&&x.name&&Number.isFinite(x.price)&&x.price>=0&&Number.isFinite(x.credits)&&x.credits>=0);
  if(!plans.length)return res.status(400).json({error:"At least one valid plan is required"});
  try{
    if(supabaseUrl && supabaseServiceKey){
      await supabaseRequest('POST','pricing?on_conflict=id',plans);
    }else{
      writeJson("pricing.json",plans);
    }
    audit(req,"admin.pricing.update","pricing");
    res.json({ok:true,plans});
  }catch(e){
    res.status(500).json({error:'Unable to save pricing'});
  }
});

app.post('/auth/change-password',appAuth,(req,res)=>{ const u=readUsers()[req.user.email]; const old=String(req.body?.old_password||''); const next=String(req.body?.new_password||''); if(!u||!verifyPassword(old,u.passwordHash)) return res.status(401).json({error:'Current password is incorrect'}); if(next.length<8) return res.status(400).json({error:'New password must be at least 8 characters'}); u.passwordHash=hashPassword(next); const users=readUsers(); users[req.user.email]=u; writeUsers(users); for(const [k,s] of sessions){ if(s?.user?.id===u.id) sessions.delete(k); } writeSessions(Object.fromEntries(sessions)); audit(req,'password.change',req.user.email); res.json({ok:true}); });

function ensureAdmin(){
  const email=String(process.env.ADMIN_EMAIL||'').trim().toLowerCase(); const password=String(process.env.ADMIN_PASSWORD||'');
  if(!email||password.length<12) return;
  const users=readUsers();
  if(!users[email]) users[email]={id:crypto.randomUUID(),email,name:'Administrator',passwordHash:hashPassword(password),role:'admin',active:true,createdAt:new Date().toISOString()};
  else { users[email].role='admin'; users[email].active=true; }
  writeUsers(users);
}
ensureAdmin();

app.get('/admin/users',appAuth,adminOnly,(req,res)=>{
  const users=readUsers(); res.json({users:Object.values(users).map(u=>({id:u.id,email:u.email,name:u.name||'',role:u.role||'user',active:u.active!==false,createdAt:u.createdAt}))});
});
app.patch('/admin/users/:id',appAuth,adminOnly,(req,res)=>{
  const users=readUsers(); const entry=Object.entries(users).find(([,u])=>u.id===req.params.id); if(!entry) return res.status(404).json({error:'User not found'});
  const [email,u]=entry; if(email===req.user.email && req.body?.active===false) return res.status(400).json({error:'You cannot disable your own account'});
  if(req.body?.role==='admin'||req.body?.role==='user') u.role=req.body.role; if(typeof req.body?.active==='boolean') u.active=req.body.active; if(typeof req.body?.name==='string') u.name=req.body.name.trim().slice(0,80); writeUsers(users); audit(req,'user.update',email); res.json({ok:true,user:{id:u.id,email,name:u.name||'',role:u.role||'user',active:u.active!==false}});
});
app.get('/admin/audit',appAuth,adminOnly,(req,res)=>{ const limit=Math.min(Math.max(Number(req.query.limit||100),1),500); res.json({events:readAudit().slice(-limit).reverse()}); });

app.use((err,req,res,next)=>{ if(res.headersSent) return next(err); const status=err?.message==='Origin not allowed'?403:500; res.status(status).json({error:status===403?'Origin not allowed':'Request processing error'}); });

const port=Number(process.env.PORT||8080);
if(!Number.isInteger(port)||port<1||port>65535) throw new Error('PORT must be a valid TCP port');
const server=app.listen(port,()=>console.log(`FFGlory backend v4.1 listening on ${port}`));
function shutdown(signal){ console.log(`${signal}: shutting down`); server.close(()=>process.exit(0)); setTimeout(()=>process.exit(1),10000).unref(); }
process.on('SIGTERM',()=>shutdown('SIGTERM'));
process.on('SIGINT',()=>shutdown('SIGINT'));
