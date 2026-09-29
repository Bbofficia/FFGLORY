import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = String(process.env.CORS_ORIGINS || '').split(',').map(v => v.trim()).filter(Boolean);
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

const appToken=process.env.APP_ACCESS_TOKEN;
const dataDir=process.env.DATA_DIR || path.resolve(process.cwd(),'data');

const supabaseUrl=String(process.env.SUPABASE_URL||'').replace(/\/$/,'');
const supabaseServiceKey=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'');
app.get('/health',(req,res)=>res.json({ok:true,service:'ffmafia-panel',version:'5.0',environment:isProduction?'production':'development',database:!!(supabaseUrl&&supabaseServiceKey),timestamp:new Date().toISOString()}));
async function supabaseRequest(method, table, body){
  if(!supabaseUrl || !supabaseServiceKey) return null;
  const r=await fetch(supabaseUrl+'/rest/v1/'+table,{
    method,
    headers:{
      apikey:supabaseServiceKey,
      Authorization:'Bearer '+supabaseServiceKey,
      'Content-Type':'application/json',
      Prefer: method==='POST' ? 'resolution=merge-duplicates,return=representation' : 'return=representation'
    },
    body:body===undefined?undefined:JSON.stringify(body),
    signal:AbortSignal.timeout(10000)
  });
  const text=await r.text();
  let data=[]; try{data=text?JSON.parse(text):[];}catch{data=[];}
  if(!r.ok){
    let detail='';
    try{ const errData=text?JSON.parse(text):null; detail=String(errData?.message||errData?.error_description||errData?.hint||errData?.code||'').slice(0,300); }catch{}
    throw new Error('Supabase request failed: '+r.status+(detail?' - '+detail:''));
  }
  return data;
}
async function getPersistentUser(email){
  if(!supabaseUrl || !supabaseServiceKey) return null;
  const rows=await supabaseRequest('GET','users?email=eq.'+encodeURIComponent(email)+'&select=id,email,name,password_hash,role,active,created_at&limit=1');
  return Array.isArray(rows)&&rows[0]?rows[0]:null;
}
async function createPersistentUser(user){
  if(!supabaseUrl || !supabaseServiceKey) return null;
  const rows=await supabaseRequest('POST','users',[{
    id:user.id,email:user.email,name:user.name||'',password_hash:user.passwordHash,
    role:user.role||'user',active:user.active!==false,created_at:user.createdAt||new Date().toISOString()
  }]);
  return Array.isArray(rows)&&rows[0]?rows[0]:null;
}
async function createPersistentSession(tokenHashValue,user,expiresAt){
  if(!supabaseUrl || !supabaseServiceKey) return null;
  const rows=await supabaseRequest('POST','sessions',[{
    token_hash:tokenHashValue,user_id:user.id,email:user.email,name:user.name||'',
    role:user.role||'user',expires_at:new Date(expiresAt).toISOString()
  }]);
  return Array.isArray(rows)&&rows[0]?rows[0]:null;
}
async function getPersistentSession(tokenHashValue){
  if(!supabaseUrl || !supabaseServiceKey) return null;
  const rows=await supabaseRequest('GET','sessions?token_hash=eq.'+encodeURIComponent(tokenHashValue)+'&select=token_hash,user_id,email,name,role,expires_at&limit=1');
  return Array.isArray(rows)&&rows[0]?rows[0]:null;
}
async function deletePersistentSession(tokenHashValue){
  if(!supabaseUrl || !supabaseServiceKey) return false;
  await supabaseRequest('DELETE','sessions?token_hash=eq.'+encodeURIComponent(tokenHashValue));
  return true;
}
async function deletePersistentUserSessions(userId){
  if(!supabaseUrl || !supabaseServiceKey) return false;
  await supabaseRequest('DELETE','sessions?user_id=eq.'+encodeURIComponent(userId));
  return true;
}
async function updatePersistentPassword(email,passwordHash){
  if(!supabaseUrl || !supabaseServiceKey) return false;
  await supabaseRequest('PATCH','users?email=eq.'+encodeURIComponent(email),{password_hash:passwordHash});
  return true;
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

async function appAuth(req,res,next){
  try{
    pruneSessions();
    const got=(req.get('authorization')||'').replace(/^Bearer\s+/i,'');
    if(appToken && got && Buffer.byteLength(got)===Buffer.byteLength(appToken) && crypto.timingSafeEqual(Buffer.from(got),Buffer.from(appToken))){
      req.user={id:'service',email:'service'}; return next();
    }
    const key=tokenHash(got);
    const persistent=await getPersistentSession(key);
    if(persistent){
      const expires=Date.parse(persistent.expires_at);
      if(Number.isFinite(expires) && expires>Date.now()){
        req.user={id:persistent.user_id,email:persistent.email,name:persistent.name||'',role:persistent.role||'user'};
        return next();
      }
      await deletePersistentSession(key);
    }
    const s=sessions.get(key);
    if(!s || s.expiresAt<Date.now()){
      sessions.delete(key); writeSessions(Object.fromEntries(sessions));
      return res.status(401).json({error:'Authentication required'});
    }
    req.user=s.user; next();
  }catch(e){
    console.error('Auth session lookup failed:',e?.message||e);
    return res.status(500).json({error:'Authentication service unavailable'});
  }
}
async function ff(method,pathName,body){
  if(!accountKey||!masterKey) throw new Error('Server secrets are not configured');
  const u=new URL(base+pathName); u.searchParams.set('api_key',accountKey);
  const r=await fetch(u,{method,headers:{'Content-Type':'application/json','x-api-key':masterKey},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
  const text=await r.text(); let data; try{data=JSON.parse(text)}catch{data={error:text}}; return {status:r.status,data};
}
function proxy(pathName,method='GET',bodyMap=()=>undefined){ return async(req,res)=>{ try{const target=typeof pathName==='function'?pathName(req):pathName; const x=await ff(method,target,bodyMap(req)); res.status(x.status).json(x.data)}catch(e){res.status(502).json({error:'Upstream API unavailable'})} }; }

app.get('/health',(req,res)=>res.json({ok:true,service:'ffmafia-panel',version:'4.2',environment:isProduction?'production':'development',upstreamConfigured:Boolean(accountKey&&masterKey)}));

app.post('/auth/register',async(req,res)=>{
  try{
    const email=String(req.body?.email||'').trim().toLowerCase(); const password=String(req.body?.password||''); const name=String(req.body?.name||'').trim().slice(0,80);
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<8) return res.status(400).json({error:'Valid email and password of at least 8 characters are required'});
    const persistentExisting=await getPersistentUser(email);
    if(persistentExisting) return res.status(409).json({error:'Account already exists'});
    const users=readUsers(); if(users[email]) return res.status(409).json({error:'Account already exists'});
    const user={id:crypto.randomUUID(),email,name,passwordHash:hashPassword(password),role:'user',active:true,createdAt:new Date().toISOString()};
    if(supabaseUrl && supabaseServiceKey) await createPersistentUser(user);
    users[email]=user; writeUsers(users);
    audit({user:{id:user.id,email}},'register',email);
    const token=sessionToken(); const expiresAt=Date.now()+1000*60*60*24*30;
    if(supabaseUrl && supabaseServiceKey) await createPersistentSession(tokenHash(token),user,expiresAt);
    sessions.set(tokenHash(token),{user:{id:user.id,email,name,role:'user'},expiresAt}); writeSessions(Object.fromEntries(sessions));
    res.status(201).json({token,user:{id:user.id,email,name,role:'user'}});
  }catch(e){
    console.error('Register failed:',e?.message||e);
    res.status(500).json({error:'Unable to create account'});
  }
});

app.post('/auth/login',async(req,res)=>{
  try{
    const email=String(req.body?.email||'').trim().toLowerCase(); const password=String(req.body?.password||'');
    let u=await getPersistentUser(email);
    if(!u){
      const local=readUsers()[email];
      if(local && local.active!==false){
        u={id:local.id,email:local.email,name:local.name||'',password_hash:local.passwordHash,role:local.role||'user',active:local.active!==false};
        if(supabaseUrl && supabaseServiceKey){
          try{ await createPersistentUser(local); }catch(e){ console.error('Legacy user migration failed:',e?.message||e); }
        }
      }
    }
    if(!u||u.active===false||!verifyPassword(password,u.password_hash||u.passwordHash||'')) return res.status(401).json({error:'Invalid email or password'});
    const user={id:u.id,email:u.email,name:u.name||'',role:u.role||'user'};
    const token=sessionToken(); const expiresAt=Date.now()+1000*60*60*24*30;
    if(supabaseUrl && supabaseServiceKey) await createPersistentSession(tokenHash(token),user,expiresAt);
    sessions.set(tokenHash(token),{user,expiresAt}); writeSessions(Object.fromEntries(sessions));
    audit({user:{id:user.id,email:user.email}},'login',email);
    res.json({token,user});
  }catch(e){
    console.error('Login failed:',e?.message||e);
    res.status(500).json({error:'Login service unavailable'});
  }
});
app.post('/auth/logout',appAuth,async(req,res)=>{
  const got=(req.get('authorization')||'').replace(/^Bearer\s+/i,''); const key=tokenHash(got);
  try{ if(supabaseUrl && supabaseServiceKey) await deletePersistentSession(key); }catch(e){ console.error('Logout session cleanup failed:',e?.message||e); }
  sessions.delete(key); writeSessions(Object.fromEntries(sessions)); res.json({ok:true});
});
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

app.get('/api/me',async(req,res)=>{
  const credits=await calculateCreditBalance(userKey(req));
  res.json({user:req.user,credits});
});

async function getPersistentProducts(){
  if(!supabaseUrl||!supabaseServiceKey) return null;
  const rows=await supabaseRequest('GET','products?select=id,name,description,price,stock,status,image_url,delivery_text,created_at&order=created_at.desc');
  return Array.isArray(rows)?rows:null;
}
async function savePersistentProduct(row){
  if(!supabaseUrl||!supabaseServiceKey) return false;
  await supabaseRequest('POST','products?on_conflict=id',[{
    id:row.id,name:row.name,description:row.description||'',price:Number(row.price||0),stock:Number(row.stock??-1),
    status:row.status||'active',image_url:row.imageUrl||null,delivery_text:row.deliveryText||'',created_at:row.createdAt||new Date().toISOString()
  }]);
  return true;
}
async function updatePersistentProduct(row){
  if(!supabaseUrl||!supabaseServiceKey) return false;
  await supabaseRequest('PATCH','products?id=eq.'+encodeURIComponent(row.id),{
    name:row.name,description:row.description||'',price:Number(row.price||0),stock:Number(row.stock??-1),
    status:row.status||'active',image_url:row.imageUrl||null,delivery_text:row.deliveryText||''
  });
  return true;
}

app.get('/api/products',async(req,res)=>{
  try{
    const persistent=await getPersistentProducts();
    if(persistent) return res.json({products:persistent.map(x=>({id:x.id,name:x.name,description:x.description||'',price:Number(x.price||0),stock:Number(x.stock??-1),status:x.status||'active',imageUrl:x.image_url||'',deliveryText:x.delivery_text||'',createdAt:x.created_at}))});
  }catch(e){}
  const rows=readJson('products.json',[]);
  res.json({products:rows.filter(x=>x.status!=='hidden')});
});

app.post('/api/products/:id/order',appAuth,async(req,res)=>{
  const id=String(req.params.id); let product=null;
  try{ const p=await getPersistentProducts(); if(Array.isArray(p)) product=p.find(x=>String(x.id)===id)||null; }catch(e){}
  if(!product){ const rows=readJson('products.json',[]); product=rows.find(x=>String(x.id)===id)||null; }
  if(!product||product.status!=='active') return res.status(404).json({error:'Product not available'});
  const stock=Number(product.stock??-1); if(stock===0) return res.status(400).json({error:'Out of stock'});
  const tx={id:crypto.randomUUID(),userId:userKey(req),planId:'product:'+id,planName:product.name,amount:Number(product.price||0),credits:0,status:'payment_pending',type:'product_purchase',orderId:crypto.randomUUID(),productId:id,createdAt:new Date().toISOString()};
  const rows=readJson('transactions.json',[]); rows.push(tx); writeJson('transactions.json',rows); try{await savePersistentTransaction(tx)}catch(e){}
  audit(req,'product.order.create',id); res.status(201).json({ok:true,order:tx,upiId:process.env.PAYMENT_UPI_ID||'',qrUrl:'https://raw.githubusercontent.com/Bbofficia/FFGLORY/main/website/phonepe-qr.svg',product:{id:product.id,name:product.name,price:Number(product.price||0),deliveryText:product.deliveryText||''}});
});

app.post('/api/product-orders/:id/confirm-payment',appAuth,async(req,res)=>{
  const id=String(req.params.id);
  const rows=readJson('transactions.json',[]);
  let row=rows.find(x=>String(x.id)===id&&String(x.userId)===String(userKey(req)));
  if(!row) row=await getPersistentTransactionById(id);
  if(!row||row.type!=='product_purchase') return res.status(404).json({error:'Product order not found'});
  if(row.status==='completed') return res.json({ok:true,transaction:row,message:'Payment already verified'});
  if(row.status!=='payment_pending'&&row.status!=='payment_submitted') return res.status(400).json({error:'Order is not awaiting payment confirmation'});
  row.status='payment_submitted';
  row.paymentSubmittedAt=new Date().toISOString();
  const local=rows.find(x=>String(x.id)===id);
  if(local) Object.assign(local,row); else rows.push(row);
  writeJson('transactions.json',rows);
  try{ await updatePersistentTransaction(row); }catch(e){}
  audit(req,'product.order.payment_submitted',id);
  res.json({ok:true,transaction:row});
});

app.get('/admin/products',appAuth,adminOnly,async(req,res)=>{
  try{const p=await getPersistentProducts(); if(Array.isArray(p)) return res.json({products:p.map(x=>({id:x.id,name:x.name,description:x.description||'',price:Number(x.price||0),stock:Number(x.stock??-1),status:x.status||'active',imageUrl:x.image_url||'',deliveryText:x.delivery_text||'',createdAt:x.created_at}))});}catch(e){}
  res.json({products:readJson('products.json',[])});
});
app.post('/admin/products',appAuth,adminOnly,async(req,res)=>{
  const row={id:crypto.randomUUID(),name:String(req.body?.name||'').trim().slice(0,100),description:String(req.body?.description||'').trim().slice(0,1000),price:Math.max(0,Number(req.body?.price||0)),stock:Number(req.body?.stock??-1),status:req.body?.status==='inactive'?'inactive':'active',imageUrl:String(req.body?.image_url||'').trim().slice(0,500),deliveryText:String(req.body?.delivery_text||'').trim().slice(0,2000),createdAt:new Date().toISOString()};
  if(!row.name)return res.status(400).json({error:'Product name is required'}); if(!Number.isFinite(row.price))return res.status(400).json({error:'Invalid price'});
  const rows=readJson('products.json',[]); rows.push(row); writeJson('products.json',rows); try{await savePersistentProduct(row)}catch(e){}
  audit(req,'admin.product.create',row.id); res.status(201).json({ok:true,product:row});
});
app.patch('/admin/products/:id',appAuth,adminOnly,async(req,res)=>{
  const id=String(req.params.id); let row=null; try{const p=await getPersistentProducts(); if(Array.isArray(p)){const x=p.find(v=>String(v.id)===id); if(x) row={id:x.id,name:x.name,description:x.description||'',price:Number(x.price||0),stock:Number(x.stock??-1),status:x.status||'active',imageUrl:x.image_url||'',deliveryText:x.delivery_text||'',createdAt:x.created_at};}}catch(e){}
  const rows=readJson('products.json',[]); if(!row) row=rows.find(x=>String(x.id)===id)||null; if(!row)return res.status(404).json({error:'Product not found'});
  if(req.body?.name!==undefined)row.name=String(req.body.name).trim().slice(0,100); if(req.body?.description!==undefined)row.description=String(req.body.description).trim().slice(0,1000); if(req.body?.price!==undefined)row.price=Math.max(0,Number(req.body.price)); if(req.body?.stock!==undefined)row.stock=Number(req.body.stock); if(req.body?.status!==undefined)row.status=req.body.status==='inactive'?'inactive':'active'; if(req.body?.image_url!==undefined)row.imageUrl=String(req.body.image_url).trim().slice(0,500); if(req.body?.delivery_text!==undefined)row.deliveryText=String(req.body.delivery_text).trim().slice(0,2000);
  const i=rows.findIndex(x=>String(x.id)===id); if(i>=0)rows[i]=row; else rows.push(row); writeJson('products.json',rows); try{await updatePersistentProduct(row)}catch(e){} audit(req,'admin.product.update',id); res.json({ok:true,product:row});
});
app.delete('/admin/products/:id',appAuth,adminOnly,async(req,res)=>{const id=String(req.params.id);const rows=readJson('products.json',[]);const next=rows.filter(x=>String(x.id)!==id);if(next.length===rows.length)return res.status(404).json({error:'Product not found'});writeJson('products.json',next);try{if(supabaseUrl&&supabaseServiceKey)await supabaseRequest('DELETE','products?id=eq.'+encodeURIComponent(id))}catch(e){}audit(req,'admin.product.delete',id);res.json({ok:true});});

app.get('/api/pricing',async(req,res)=>{
  try{
    const plans=await getPersistentPricing();
    res.json({plans:plans&&plans.length?plans:readJson("pricing.json",defaultPricing)});
  }catch(e){
    console.error('Pricing load failed:', e?.message || e);
    res.status(500).json({error:'Unable to load pricing',detail:String(e?.message||e)});
  }
});

app.get('/api/credit-history',async(req,res)=>{
  try{
    const persistent=await getPersistentTransactions(userKey(req));
    if(persistent){
      const completed=persistent.filter(x=>x.status==="completed");
      const balance=completed.reduce((sum,x)=>sum+Number(x.credits||0),0);
      const purchased=completed.filter(x=>Number(x.credits||0)>0).reduce((sum,x)=>sum+Number(x.credits||0),0);
      return res.json({balance:Math.max(0,balance),purchased,history:persistent.map(x=>({id:x.id,planName:x.planName,credits:Number(x.credits||0),status:x.status,createdAt:x.createdAt}))});
    }
  }catch(e){}
  const transactions=readJson("transactions.json",[]).filter(x=>String(x.userId)===String(userKey(req)));
  const completed=transactions.filter(x=>x.status==="completed");
  const balance=completed.reduce((sum,x)=>sum+Number(x.credits||0),0);
  const purchased=completed.filter(x=>Number(x.credits||0)>0).reduce((sum,x)=>sum+Number(x.credits||0),0);
  res.json({balance:Math.max(0,balance),purchased,history:transactions.slice().reverse().map(x=>({id:x.id,planName:x.planName,credits:Number(x.credits||0),status:x.status,createdAt:x.createdAt}))});
});


// Account fund top-up orders
app.post('/api/fund-orders',async(req,res)=>{
  const amount=Number(req.body?.amount||0);
  if(!Number.isFinite(amount)||amount<1||amount>1000000) return res.status(400).json({error:"Enter a valid amount between ₹1 and ₹10,00,000"});
  const row={
    id:crypto.randomUUID(),
    userId:userKey(req),
    planId:'fund_topup',
    planName:'Account Fund',
    amount,
    credits:0,
    status:'payment_pending',
    type:'fund_topup',
    orderId:crypto.randomUUID(),
    paymentMethod:'UPI',
    createdAt:new Date().toISOString()
  };
  row.orderId=row.id;
  const rows=readJson("transactions.json",[]); rows.push(row); writeJson("transactions.json",rows);
  try{await savePersistentTransaction(row);}catch(e){}
  audit(req,'fund.order.create',row.id);
  res.status(201).json({ok:true,order:row,upiId:process.env.PAYMENT_UPI_ID||'',qrUrl:'https://raw.githubusercontent.com/Bbofficia/FFGLORY/main/website/phonepe-qr.svg'});
});

app.post('/api/fund-orders/:id/confirm-payment',async(req,res)=>{
  const id=String(req.params.id||'');
  let row=await getPersistentTransactionById(id);
  const rows=readJson("transactions.json",[]);
  const local=rows.find(x=>String(x.id)===id&&String(x.userId)===String(userKey(req)));
  if(local) row=local;
  if(!row||String(row.userId)!==String(userKey(req))) return res.status(404).json({error:"Fund order not found"});
  if(row.type!=="fund_topup") return res.status(400).json({error:"Invalid fund order"});
  if(!["payment_pending","payment_submitted"].includes(row.status)) return res.status(400).json({error:"This payment cannot be submitted"});
  row.status="payment_submitted"; row.paymentSubmittedAt=new Date().toISOString();
  const existing=rows.find(x=>String(x.id)===id); if(existing) Object.assign(existing,row); else rows.push(row);
  writeJson("transactions.json",rows);
  try{await updatePersistentTransaction(row);}catch(e){}
  audit(req,'fund.payment.submit',row.id);
  res.json({ok:true,order:row});
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
  try{ await savePersistentTransaction(row); }catch(e){}
  audit(req,"transaction.create",row.id);
  res.status(201).json({transaction:row,upiId:String(process.env.PAYMENT_UPI_ID||"")});
});

app.get('/api/transactions',async(req,res)=>{
  try{
    const persistent=await getPersistentTransactions(userKey(req));
    if(persistent) return res.json({transactions:persistent});
  }catch(e){}
  const rows=readJson("transactions.json",[]);
  res.json({transactions:rows.filter(x=>String(x.userId)===String(userKey(req)))});
});

app.post('/api/transactions/refund-request',async(req,res)=>{
  const rows=readJson("transactions.json",[]);
  const id=String(req.body?.transaction_id||"");
  const row=rows.find(x=>String(x.id)===id&&String(x.userId)===String(userKey(req)));
  if(!row)return res.status(404).json({error:"Transaction not found"});
  if(row.status==="refunded")return res.status(400).json({error:"Credits already refunded"});
  if(row.status!=="completed")return res.status(400).json({error:"Only completed transactions can request a refund"});
  row.status="refund_requested";
  row.refundRequestedAt=new Date().toISOString();
  writeJson("transactions.json",rows);
  try{ await savePersistentTransaction(row); }catch(e){}
  audit(req,"transaction.refund_request",row.id);
  res.json({ok:true,transaction:row});
});

app.post('/api/transactions/cancel',async(req,res)=>{
  const rows=readJson("transactions.json",[]);
  const id=String(req.body?.transaction_id||"");
  const row=rows.find(x=>String(x.id)===id&&String(x.userId)===String(userKey(req)));
  if(!row)return res.status(404).json({error:"Transaction not found"});
  row.status="cancelled";writeJson("transactions.json",rows);
  try{ await savePersistentTransaction(row); }catch(e){}
  res.json({ok:true,transaction:row});
});

app.get('/api/history',(req,res)=>{
  const rows=readJson("history.json",[]);
  res.json({history:rows.filter(x=>String(x.userId)===String(userKey(req)))});
});

app.get('/api/activity',(req,res)=>{
  const rows=readAudit().filter(x=>String(x.actorId)===String(userKey(req)));
  res.json({activity:rows.slice(-100).reverse()});
});

app.get('/api/notifications',(req,res)=>{
  const rows=readJson("notifications.json",[]);
  res.json({notifications:rows.filter(x=>String(x.userId)===String(userKey(req)))});
});



async function getPersistentTransactions(userId){
  if(!supabaseUrl||!supabaseServiceKey) return null;
  const rows=await supabaseRequest('GET','transactions?user_id=eq.'+encodeURIComponent(userId)+'&select=id,user_id,plan_id,plan_name,amount,credits,status,type,order_id,created_at&order=created_at.desc');
  return Array.isArray(rows)?rows.map(x=>({id:x.id,userId:x.user_id,planId:x.plan_id||'',planName:x.plan_name||'',amount:Number(x.amount||0),credits:Number(x.credits||0),status:x.status||'pending',type:x.type||'payment',orderId:x.order_id||undefined,createdAt:x.created_at})):null;
}
async function savePersistentTransaction(row){
  if(!supabaseUrl||!supabaseServiceKey) return false;
  const rows=await supabaseRequest('POST','transactions',[{id:row.id,user_id:row.userId,plan_id:row.planId||'',plan_name:row.planName||'',amount:Number(row.amount||0),credits:Number(row.credits||0),status:row.status||'pending',type:row.type||'payment',order_id:row.orderId||null,created_at:row.createdAt||new Date().toISOString()}]);
  return Array.isArray(rows)&&rows.length>0;
}
async function getAllPersistentTransactions(){
  if(!supabaseUrl||!supabaseServiceKey) return null;
  const rows=await supabaseRequest('GET','transactions?select=id,user_id,plan_id,plan_name,amount,credits,status,type,order_id,created_at&order=created_at.desc');
  return Array.isArray(rows)?rows.map(x=>({id:x.id,userId:x.user_id,planId:x.plan_id||'',planName:x.plan_name||'',amount:Number(x.amount||0),credits:Number(x.credits||0),status:x.status||'pending',type:x.type||'payment',orderId:x.order_id||undefined,createdAt:x.created_at})):null;
}
async function getPersistentTransactionById(id){
  if(!supabaseUrl||!supabaseServiceKey) return null;
  const rows=await supabaseRequest('GET','transactions?id=eq.'+encodeURIComponent(id)+'&select=id,user_id,plan_id,plan_name,amount,credits,status,type,order_id,created_at');
  if(!Array.isArray(rows)||!rows[0]) return null;
  const x=rows[0];
  return {id:x.id,userId:x.user_id,planId:x.plan_id||'',planName:x.plan_name||'',amount:Number(x.amount||0),credits:Number(x.credits||0),status:x.status||'pending',type:x.type||'payment',orderId:x.order_id||undefined,createdAt:x.created_at};
}
async function updatePersistentTransaction(row){
  if(!supabaseUrl||!supabaseServiceKey) return false;
  await supabaseRequest('PATCH','transactions?id=eq.'+encodeURIComponent(row.id),{
    user_id:row.userId,plan_id:row.planId||'',plan_name:row.planName||'',amount:Number(row.amount||0),credits:Number(row.credits||0),status:row.status||'pending',type:row.type||'payment',order_id:row.orderId||null,created_at:row.createdAt||new Date().toISOString()
  });
  return true;
}

async function calculateCreditBalance(userId){
  try{
    const rows=await getPersistentTransactions(userId);
    if(Array.isArray(rows)) return rows.filter(x=>x.status==="completed").reduce((sum,x)=>sum+Number(x.credits||0),0);
  }catch(e){}
  const rows=readJson("transactions.json",[]);
  return rows.filter(x=>String(x.userId)===String(userId)&&x.status==="completed").reduce((sum,x)=>sum+Number(x.credits||0),0);
}

app.get('/admin/overview',appAuth,adminOnly,(req,res)=>{
  const users=Object.values(readUsers());
  const groups=readJson("groups.json",[]);
  const transactions=readJson("transactions.json",[]);
  res.json({
    stats:{
      users:users.length,
      activeUsers:users.filter(u=>u.active!==false).length,
      admins:users.filter(u=>u.role==="admin").length,
      groups:groups.length,
      transactions:transactions.length,
      revenue:transactions.reduce((n,x)=>n+Number(x.amount||0),0)
    }
  });
});
app.get('/admin/transactions',appAuth,adminOnly,async(req,res)=>{
  try{
    const rows=await getAllPersistentTransactions();
    if(Array.isArray(rows)) return res.json({transactions:rows});
  }catch(e){}
  res.json({transactions:readJson("transactions.json",[])});
});
app.patch('/admin/transactions/:id/verify',appAuth,adminOnly,async(req,res)=>{
  const rows=readJson("transactions.json",[]);
  let row=rows.find(x=>String(x.id)===String(req.params.id));
  if(!row) row=await getPersistentTransactionById(req.params.id);
  if(!row)return res.status(404).json({error:"Transaction not found"});
  if(!["payment_pending","payment_submitted"].includes(row.status))return res.status(400).json({error:"Only pending payments can be verified"});
  row.status="completed"; row.verifiedAt=new Date().toISOString(); row.verifiedBy=req.user.id;
  if(row.type==="product_purchase"){
    const productId=String(row.productId||String(row.planId||"").replace(/^product:/,""));
    try{
      const persistent=await getPersistentProducts();
      if(Array.isArray(persistent)){
        const p=persistent.find(x=>String(x.id)===productId);
        if(p){
          const stock=Number(p.stock??-1);
          if(stock===0) return res.status(409).json({error:"Product is out of stock"});
          if(stock>0){ p.stock=stock-1; await updatePersistentProduct({id:p.id,name:p.name,description:p.description,price:p.price,stock:p.stock,status:p.status,imageUrl:p.image_url||"",deliveryText:p.delivery_text||"",createdAt:p.created_at}); }
        }
      }else{
        const products=readJson("products.json",[]);
        const p=products.find(x=>String(x.id)===productId);
        if(p&&Number(p.stock??-1)>0) p.stock=Number(p.stock)-1;
        writeJson("products.json",products);
      }
    }catch(e){ return res.status(500).json({error:"Payment verified but stock update failed"}); }
  }
  const local=rows.find(x=>String(x.id)===String(req.params.id));
  if(local) Object.assign(local,row);
  else rows.push(row);
  writeJson("transactions.json",rows);
  try{ await updatePersistentTransaction(row); }catch(e){}
  audit(req,"admin.transaction.verify",row.id);
  res.json({ok:true,transaction:row});
});
app.patch('/admin/transactions/:id/reject',appAuth,adminOnly,async(req,res)=>{
  const rows=readJson("transactions.json",[]);
  let row=rows.find(x=>String(x.id)===String(req.params.id));
  if(!row) row=await getPersistentTransactionById(req.params.id);
  if(!row)return res.status(404).json({error:"Transaction not found"});
  if(row.status!=="payment_pending")return res.status(400).json({error:"Only pending payments can be rejected"});
  row.status="payment_rejected"; row.rejectedAt=new Date().toISOString(); row.rejectedBy=req.user.id;
  const local=rows.find(x=>String(x.id)===String(req.params.id));
  if(local) Object.assign(local,row); else rows.push(row);
  writeJson("transactions.json",rows);
  try{ await updatePersistentTransaction(row); }catch(e){}
  audit(req,"admin.transaction.reject",row.id);
  res.json({ok:true,transaction:row});
});
app.patch('/admin/transactions/:id/refund',appAuth,adminOnly,async(req,res)=>{
  const rows=readJson("transactions.json",[]);
  let row=rows.find(x=>String(x.id)===String(req.params.id));
  if(!row) row=await getPersistentTransactionById(req.params.id);
  if(!row)return res.status(404).json({error:"Transaction not found"});
  if(row.status==="refunded")return res.status(400).json({error:"Credits already refunded"});
  if(row.status!=="completed")return res.status(400).json({error:"Only completed transactions can be refunded"});
  row.status="refunded"; row.refundedAt=new Date().toISOString(); row.refundedBy=req.user.id;
  const local=rows.find(x=>String(x.id)===String(req.params.id));
  if(local) Object.assign(local,row); else rows.push(row);
  writeJson("transactions.json",rows);
  try{ await updatePersistentTransaction(row); }catch(e){}
  audit(req,"admin.transaction.refund",row.id);
  res.json({ok:true,refundedCredits:Number(row.credits||0),transaction:row});
});
app.patch('/admin/transactions/:id',appAuth,adminOnly,async(req,res)=>{
  const rows=readJson("transactions.json",[]);
  const row=rows.find(x=>String(x.id)===String(req.params.id));
  if(!row)return res.status(404).json({error:"Transaction not found"});
  if(typeof req.body?.status==="string") row.status=req.body.status.trim().slice(0,30);
  writeJson("transactions.json",rows);
  try{ await savePersistentTransaction(row); }catch(e){}
  audit(req,"admin.transaction.update",row.id);
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

app.post('/auth/change-password',appAuth,async(req,res)=>{
  try{
    const old=String(req.body?.old_password||''); const next=String(req.body?.new_password||'');
    if(next.length<8) return res.status(400).json({error:'New password must be at least 8 characters'});
    const u=await getPersistentUser(req.user.email);
    if(!u || !verifyPassword(old,u.password_hash||'')) return res.status(401).json({error:'Current password is incorrect'});
    const newHash=hashPassword(next);
    if(supabaseUrl && supabaseServiceKey) await updatePersistentPassword(req.user.email,newHash);
    const users=readUsers(); if(users[req.user.email]){ users[req.user.email].passwordHash=newHash; writeUsers(users); }
    if(supabaseUrl && supabaseServiceKey) await deletePersistentUserSessions(req.user.id);
    for(const [k,s] of sessions){ if(s?.user?.id===req.user.id) sessions.delete(k); }
    writeSessions(Object.fromEntries(sessions)); audit(req,'password.change',req.user.email); res.json({ok:true});
  }catch(e){ console.error('Password change failed:',e?.message||e); res.status(500).json({error:'Unable to change password'}); }
});

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
const server=app.listen(port,()=>console.log(`FFMAFIA.PANEL backend listening on ${port}`));
function shutdown(signal){ console.log(`${signal}: shutting down`); server.close(()=>process.exit(0)); setTimeout(()=>process.exit(1),10000).unref(); }
process.on('SIGTERM',()=>shutdown('SIGTERM'));
process.on('SIGINT',()=>shutdown('SIGINT'));
