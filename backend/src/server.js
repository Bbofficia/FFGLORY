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
app.use(cors({ origin: (origin, cb) => {
  if (!origin) return cb(null, true);
  if (!isProduction && allowedOrigins.length === 0) return cb(null, true);
  if (allowedOrigins.includes(origin)) return cb(null, true);
  return cb(new Error('Origin not allowed'));
}, methods: ['GET','POST','PATCH','OPTIONS'], allowedHeaders: ['Content-Type','Authorization','X-Request-ID'] }));
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

const base=(process.env.FFGLORY_BASE||"https://ffglory.pro").replace(//$/,"");
const accountKey=process.env.FFGLORY_API_KEY; const masterKey=process.env.FFGLORY_MASTER_KEY;
const appToken=process.env.APP_ACCESS_TOKEN;
const dataDir=process.env.DATA_DIR || path.resolve(process.cwd(),'data');
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

app.use('/api',appAuth);
app.get('/api/me',proxy('/api/auth/me'));
app.get('/api/pricing',proxy('/api/pricing'));
app.get('/api/groups',proxy('/api/client/my-groups'));
app.post('/api/groups',proxy(()=>'/api/client/auto-clan-group','POST',r=>({region:String(r.body?.region||''),clan_id:String(r.body?.clan_id||'')})));
app.post('/api/groups/action',proxy(()=>'/api/client/group-action','POST',r=>({action:String(r.body?.action||''),group_id:String(r.body?.group_id||'')})));
app.get('/api/coupons',proxy('/api/client/my-coupons'));
app.post('/api/coupons',proxy(()=>'/api/client/create-coupon','POST',r=>({basic_credits:Number(r.body?.basic_credits||0),premium_credits:Number(r.body?.premium_credits||0)})));
app.get('/api/coupons/redeemed',proxy('/api/client/redeemed-coupons'));
app.post('/api/coupons/redeem',proxy(()=>'/api/client/redeem-coupon','POST',r=>({code:String(r.body?.code||'')})));
app.post('/api/coupons/cancel',proxy(()=>'/api/client/cancel-coupon','POST',r=>({code:String(r.body?.code||'')})));
app.get('/api/transactions',proxy('/api/client/transactions'));
app.post('/api/transactions/cancel',proxy(()=>'/api/client/cancel-transaction','POST',r=>({transaction_id:String(r.body?.transaction_id||'')})));
app.get('/api/history',proxy('/api/client/group-history'));
app.get('/api/glory-progression',async(req,res)=>{try{const x=await ff('GET','/api/client/glory-progression?group_id='+encodeURIComponent(String(req.query.group_id||'')));res.status(x.status).json(x.data)}catch{res.status(502).json({error:'Upstream API unavailable'})}});
app.get('/api/activity',proxy('/api/client/activity-log'));
app.get('/api/notifications',proxy('/api/client/notifications'));
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
