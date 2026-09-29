const API = "https://ffglory1.onrender.com";

async function api(path, options = {}) {
  const token = localStorage.getItem("ffglory_token");
  const headers = {"Content-Type":"application/json",...(options.headers||{})};
  if(token) headers.Authorization = "Bearer " + token;

  const res = await fetch(API + path,{...options,headers});
  const data = await res.json().catch(()=>({}));

  if(!res.ok) throw new Error(data.message || data.error ? ((data.message || data.error) + (data.detail ? " — " + data.detail : "")) : "Request failed");
  return data;
}

const style = document.createElement("style");
style.textContent = `
.mf-modal{
  position:fixed;inset:0;z-index:999;
  display:none;align-items:center;justify-content:center;
  padding:20px;background:rgba(0,0,0,.78);
  backdrop-filter:blur(12px)
}
.mf-box{
  width:min(420px,100%);padding:28px;border-radius:24px;
  background:linear-gradient(145deg,#171027,#0a0812);
  border:1px solid rgba(168,85,247,.45);
  box-shadow:0 0 45px rgba(168,85,247,.25)
}
.mf-box h2{
  text-align:center;margin-bottom:8px;
  background:linear-gradient(90deg,#ffd166,#fff,#22d3ee);
  -webkit-background-clip:text;color:transparent
}
.mf-box p{text-align:center;color:#aaa4b8;margin-bottom:20px}
.mf-box input{
  width:100%;padding:14px;margin:7px 0;border-radius:12px;
  border:1px solid #302743;background:#08060d;color:#fff;
  outline:none
}
.mf-submit{
  width:100%;padding:14px;margin-top:10px;border:0;
  border-radius:13px;font-weight:800;color:#fff;
  background:linear-gradient(90deg,#a855f7,#22d3ee)
}
.mf-close{
  float:right;background:none;border:0;color:#aaa;
  font-size:24px;cursor:pointer
}
.mf-switch{text-align:center;margin-top:16px;color:#aaa4b8}
.mf-switch span{color:#22d3ee;cursor:pointer;font-weight:700}

.mf-admin-card{grid-column:1/-1;border:1px solid rgba(255,209,102,.5)!important;background:linear-gradient(145deg,rgba(255,209,102,.09),rgba(168,85,247,.08))!important}
.mf-admin-btn{padding:11px 16px;border:0;border-radius:12px;color:#0a0710;background:linear-gradient(90deg,#ffd166,#22d3ee);font-weight:900;cursor:pointer}
.mf-admin-panel{position:fixed;inset:0;z-index:100000;background:#05030b;color:#fff;overflow:auto;padding:18px}
.mf-admin-shell{max-width:1050px;margin:0 auto}
.mf-admin-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:18px}
.mf-admin-tabs{display:flex;gap:8px;overflow:auto;padding-bottom:10px}
.mf-admin-tabs button{white-space:nowrap;padding:10px 14px;border-radius:12px;border:1px solid rgba(168,85,247,.35);background:#100b1d;color:#fff}
.mf-admin-tabs button.active{background:linear-gradient(90deg,#a855f7,#22d3ee);border-color:transparent}
.mf-admin-stat{padding:16px;border-radius:16px;background:#100b1d;border:1px solid rgba(255,255,255,.1)}
.mf-admin-stat b{font-size:24px;display:block;color:#ffd166}
.mf-admin-table{width:100%;border-collapse:collapse;font-size:13px}
.mf-admin-table th,.mf-admin-table td{padding:10px;border-bottom:1px solid rgba(255,255,255,.08);text-align:left}
.mf-admin-table input,.mf-admin-table select{background:#080611;color:#fff;border:1px solid #34264d;border-radius:8px;padding:7px}
.mf-login-toast{position:fixed;left:50%;bottom:88px;transform:translateX(-50%);z-index:100000;padding:9px 16px;border-radius:999px;background:linear-gradient(90deg,#a855f7,#22d3ee);color:#fff;font-size:12px;font-weight:800;box-shadow:0 8px 25px rgba(0,0,0,.35);animation:mfToastIn .25s ease}
@keyframes mfToastIn{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
`;

document.head.appendChild(style);

function showLoginSuccess(){
  const toast=document.createElement("div");
  toast.className="mf-login-toast";
  toast.textContent="✓ Login successful";
  document.body.appendChild(toast);
  setTimeout(()=>toast.remove(),2200);
}

const modal = document.createElement("div");
modal.className = "mf-modal";
modal.innerHTML = `
<div class="mf-box">
<button class="mf-close">×</button>
<h2 id="mf-title">MafiaFF Glory</h2>
<p id="mf-subtitle">Sign in to FFGlory panel</p>

<div id="mf-name-wrap" style="display:none">
<input id="mf-name" placeholder="Full name">
</div>

<input id="mf-email" type="email" placeholder="Email address">
<input id="mf-password" type="password" placeholder="Enter your password">

<button class="mf-submit" id="mf-submit">Sign In</button>
<div style="text-align:center;margin-top:14px;color:#aaa;font-size:13px">Need help? <span style="color:#22d3ee">Contact Admin</span></div>
<div style="display:flex;justify-content:center;gap:18px;margin-top:12px">
  <a href="#" onclick="return false" style="color:#25D366;text-decoration:none">WhatsApp</a>
  <a href="https://t.me/mafiaffglory" target="_blank" style="color:#22a7f2;text-decoration:none">Telegram</a>
</div>

<div class="mf-switch">
<span id="mf-switch">Create new account</span>
</div>
</div>
`;

document.body.appendChild(modal);

let registerMode = false;

function openAuth(register=false){
  registerMode = register;
  modal.style.display="flex";

  document.getElementById("mf-title").textContent =
    register ? "Create Account" : "MafiaFF Glory";

  document.getElementById("mf-subtitle").textContent =
    register ? "Create your MafiaFF Glory account" : "Sign in to FFGlory panel";

  document.getElementById("mf-name-wrap").style.display =
    register ? "block" : "none";

  document.getElementById("mf-submit").textContent =
    register ? "Sign Up" : "Sign In";

  document.getElementById("mf-switch").textContent =
    register ? "Already have an account? Login" : "Create new account";
}

document.querySelector(".mf-close").onclick=()=>modal.style.display="none";

modal.addEventListener("click",e=>{
  if(e.target===modal) modal.style.display="none";
});

document.getElementById("mf-switch").onclick=()=>{
  openAuth(!registerMode);
};

document.getElementById("mf-submit").onclick=async()=>{
  const name=document.getElementById("mf-name").value.trim();
  const email=document.getElementById("mf-email").value.trim();
  const password=document.getElementById("mf-password").value;

  if(!email || !password || (registerMode && !name)){
    alert("Please fill all fields.");
    return;
  }

  try{
    const data=await api(registerMode?"/auth/register":"/auth/login",{
      method:"POST",
      body:JSON.stringify(registerMode?{name,email,password}:{email,password})
    });

    if(registerMode){
      alert("Account created successfully! Now login.");
      openAuth(false);
    }else{
      localStorage.setItem("ffglory_token",data.token);

      modal.style.display="none";
      location.reload();
    }
  }catch(err){
    alert(err.message);
  }
};

document.querySelectorAll("a,.btn,button").forEach(el=>{
  const text=el.textContent.trim().toLowerCase();

  if(text.includes("login")){
    el.addEventListener("click",e=>{
      e.preventDefault();
      openAuth(false);
    });
  }

  if(text.includes("get started")){
    el.addEventListener("click",e=>{
      e.preventDefault();
      openAuth(true);
    });
  }
});

document.querySelectorAll(".bottom-nav a").forEach(link=>{
  link.addEventListener("click",e=>{
    e.preventDefault();
    const target=link.getAttribute("href");

    const dash=document.getElementById("mf-dashboard");
    if(dash) dash.style.display="none";

    document.querySelectorAll("section").forEach(sec=>sec.style.display="none");

    const page=document.querySelector(target);
    if(page) page.style.display="block";

    window.scrollTo({top:0,behavior:"smooth"});
    document.querySelectorAll(".bottom-nav a").forEach(a=>a.classList.remove("active"));
    link.classList.add("active");
  });
});

const sections=document.querySelectorAll("section");
sections.forEach((s,i)=>{if(i!==0)s.style.display="none";});

async function showDashboard(){
  const token = localStorage.getItem("ffglory_token");
  if(!token) return;

  document.querySelectorAll("section").forEach(s => s.style.display="none");

  let dash = document.getElementById("mf-dashboard");

  if(!dash){
    dash = document.createElement("section");
    dash.id = "mf-dashboard";
    dash.className = "section";
    document.body.insertBefore(dash, document.querySelector(".bottom-nav"));

    dash.innerHTML = `
      <div class="mf-dash-wrap">
        <div class="mf-dash-hero">
          <div class="mf-dash-kicker">MAFIAFF GLORY</div>
          <h2>Welcome to your<br><span>Glory Dashboard</span></h2>
          <p id="mf-user">Loading account...</p>
        </div>

        <div class="mf-wallet-card">
          <div>
            <div class="mf-wallet-label">💎 AVAILABLE CREDITS</div>
            <div id="mf-credit-balance" class="mf-wallet-balance">—</div>
            <div id="mf-credit-summary" class="mf-wallet-summary">Loading credit balance...</div>
          </div>
          <button class="mf-glow-btn" onclick="openCreditHistory()">📋 Credit History</button>
        </div>

        <div class="mf-dash-section-title">
          <span>Quick Access</span>
          <small>Everything you need</small>
        </div>

        <div class="mf-dash-grid">
          <div class="mf-dash-card mf-card-groups">
            <div class="mf-dash-icon">👥</div>
            <h3>My Groups</h3>
            <p>Manage your Free Fire groups and regions.</p>
            <button class="mf-glow-btn" onclick="document.getElementById('mf-groups-inline').style.display='block'">Open Groups</button>
            <div id="mf-groups-inline" class="mf-inline-panel" style="display:none">
              <div class="mf-inline-head">
                <h3>✨ My Groups</h3>
                <button type="button" onclick="document.getElementById('mf-groups-inline').style.display='none'" class="mf-close-circle">✕</button>
              </div>
              <div id="mf-groups-inline-list" style="margin:12px 0">Loading...</div>
              <input id="mf-inline-name" placeholder="Group name">
              <select id="mf-inline-region">
                <option value="">Select Region</option>
                <option value="India">🇮🇳 India</option>
                <option value="Bangladesh">🇧🇩 Bangladesh</option>
                <option value="Pakistan">🇵🇰 Pakistan</option>
                <option value="Other">🌍 Other</option>
              </select>
              <button class="mf-glow-btn" onclick="createInlineGroup()">Create Group</button>
              <p id="mf-inline-msg"></p>
            </div>
          </div>

          <div class="mf-dash-card mf-card-pricing">
            <div class="mf-dash-icon">💎</div>
            <h3>Pricing</h3>
            <p>Choose a plan and add credits to your account.</p>
            <button class="mf-glow-btn" onclick="openPricingManager()">View Pricing</button>
          </div>

          <div class="mf-dash-card mf-card-coupons">
            <div class="mf-dash-icon">🎟️</div>
            <h3>Coupons</h3>
            <p>Redeem coupon codes and view your rewards.</p>
            <button class="mf-glow-btn" onclick="openCouponManager()">Redeem Coupon</button>
          </div>

          <div class="mf-dash-card mf-card-transactions">
            <div class="mf-dash-icon">💳</div>
            <h3>Transactions</h3>
            <p>Check payment status, orders and credit history.</p>
            <button class="mf-glow-btn" onclick="openDashboardApi('Transactions', '/api/transactions')">View Orders</button>
          </div>
        </div>

        <div id="mf-admin-card" class="mf-admin-card mf-dash-admin" style="display:none">
          <div>
            <div class="mf-dash-icon">🛡️</div>
            <h3>Admin Control Center</h3>
            <p>Private administrator tools.</p>
          </div>
          <button class="mf-glow-btn" onclick="openAdminPanel()">Open Admin</button>
        </div>

        <button class="mf-logout-btn" onclick="logoutUser()">Logout</button>
      </div>
    `;;
  }

  dash.style.display="block";
  loadInlineGroups();
  loadCreditBalance();

  const groupsBtn = document.querySelector(".mf-groups-open");
  if(groupsBtn){
    groupsBtn.addEventListener("click", openGroupsManager);
  }

  try{
    const data = await api("/auth/me");
    const user = data.user || data;
    document.getElementById("mf-user").textContent =
      `Welcome, ${user.name || user.email || "User"} 👑`;
    const adminCard=document.getElementById("mf-admin-card");
    if(adminCard) adminCard.style.display = user.role === "admin" ? "block" : "none";
  }catch(e){
    document.getElementById("mf-user").textContent="Welcome to MafiaFF Glory 👑";
  }
}

function logoutUser(){
  localStorage.removeItem("ffglory_token");
  location.reload();
}

if(localStorage.getItem("ffglory_token")){
  window.addEventListener("load", showDashboard);
  window.addEventListener("load",()=>{
    if(sessionStorage.getItem("mf_login_success")==="1"){
      sessionStorage.removeItem("mf_login_success");
      showLoginSuccess();
    }
  });
}


async function loadCreditBalance(){
  try{
    const d=await api("/api/credit-history");
    const balance=document.getElementById("mf-credit-balance");
    const summary=document.getElementById("mf-credit-summary");
    if(balance) balance.textContent=Number(d.balance||0)+" Credits";
    if(summary) summary.textContent="Total purchased: "+Number(d.purchased||0)+" Credits";
  }catch(e){
    const summary=document.getElementById("mf-credit-summary");
    if(summary) summary.textContent="Unable to load credit balance";
  }
}

async function openCreditHistory(){
  try{
    const d=await api("/api/credit-history");
    let box=document.getElementById("mf-credit-history");
    if(box) box.remove();
    box=document.createElement("div");
    box.id="mf-credit-history";
    box.style.cssText="position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.86);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:18px";
    const rows=d.history||[];
    box.innerHTML='<div style="width:min(650px,100%);max-height:85vh;overflow:auto;background:#100b1d;border:1px solid rgba(168,85,247,.5);border-radius:24px;padding:22px;color:white">'+
      '<div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">💎 Credit History</h2><button class="mf-admin-btn" onclick="this.closest(\'#mf-credit-history\').remove()">✕</button></div>'+
      '<div style="margin:16px 0;padding:16px;border-radius:16px;background:#171025"><small style="color:#aaa">CURRENT BALANCE</small><div style="font-size:30px;font-weight:900;color:#ffd166">'+Number(d.balance||0)+' Credits</div><small style="color:#aaa">Purchased: '+Number(d.purchased||0)+' Credits</small></div>'+
      (rows.length?rows.map(x=>'<div style="padding:13px;margin:8px 0;border-radius:14px;background:#171025;border:1px solid rgba(168,85,247,.25)"><b>'+String(x.planName||"Credit Order")+'</b><br>🎟️ '+Number(x.credits||0)+' Credits &nbsp; • &nbsp; <span style="color:#22d3ee">'+String(x.status||"")+'</span><br><small style="color:#888">'+new Date(x.createdAt).toLocaleString()+'</small></div>').join(""):'<div style="color:#aaa">No credit history yet.</div>')+
      '</div>';
    document.body.appendChild(box);
  }catch(e){ alert("Credit history error: "+e.message); }
}

async function loadInlineGroups(){
  const list=document.getElementById("mf-groups-inline-list");
  if(!list) return;

  try{
    const data=await api("/api/groups");
    const groups=data.groups||[];

    if(!groups.length){
      list.innerHTML='<div style="color:#aaa">No groups yet.</div>';
      return;
    }

    list.innerHTML=groups.map(g=>`
      <div style="padding:14px;margin:8px 0;background:#100b1d;border:1px solid rgba(168,85,247,.35);border-radius:14px">
        <strong>👥 ${g.name||"Unnamed Group"}</strong>
        <div style="color:#22d3ee;margin-top:5px">
          🌍 Region: ${g.region||"Not set"}
        </div>
        <div style="color:#999;font-size:12px;margin-top:4px">
          Status: ${g.status||"active"}
        </div>
      </div>
    `).join("");
  }catch(e){
    list.innerHTML='<div style="color:#ff6b6b">❌ '+e.message+'</div>';
  }
}

async function createInlineGroup(){
  const msg=document.getElementById("mf-inline-msg");
  msg.textContent="Creating...";

  try{
    const name=document.getElementById("mf-inline-name").value.trim() || "My FF Group";
    const region=document.getElementById("mf-inline-region").value.trim();

    const r=await api("/api/groups",{
      method:"POST",
      body:JSON.stringify({name,region})
    });

    msg.textContent="✅ Group created: "+(r.group?.name||"Done");
    document.getElementById("mf-inline-name").value="";
    document.getElementById("mf-inline-region").value="";

    await loadInlineGroups();
  }catch(e){
    msg.textContent="❌ "+e.message;
  }
}

async function openGroupsManager(){
  const old=document.getElementById("mf-api-modal");
  if(old) old.remove();

  const wrap=document.createElement("div");
  wrap.id="mf-api-modal";
  wrap.className="mf-modal";
  wrap.style.cssText="position:fixed;inset:0;z-index:99999;background:#05030b;color:white;padding:24px;overflow:auto;"
  wrap.innerHTML=`
    <div class="mf-modal-card" style="max-width:700px;margin:40px auto;background:#100b1d;border:1px solid #a855f7;border-radius:20px;padding:24px;">
      <button class="mf-close" onclick="this.closest('.mf-modal').remove()">✕</button>
      <h2>✨ My Groups</h2>
      <div id="mf-groups-list">Loading...</div>
      <hr>
      <h3>Create New Group</h3>
      <input id="mf-group-name" placeholder="Group name">
      <input id="mf-group-region" placeholder="Region (optional)">
      <input id="mf-group-clan" placeholder="Clan ID (optional)">
      <button class="mf-primary" onclick="createMafiaGroup()">Create Group</button>
      <p id="mf-group-msg"></p>
    </div>`;
  document.body.appendChild(wrap);

  try{
    const data=await api("/api/groups");
    const groups=data.groups||[];
    document.getElementById("mf-groups-list").innerHTML=groups.length
      ? groups.map(g=>`<div class="mf-row"><b>${String(g.name||"Group")}</b></div>`).join("")
      : "<p>No groups yet.</p>";
  }catch(e){
    document.getElementById("mf-groups-list").textContent="Error: "+e.message;
  }
}

async function createMafiaGroup(){
  const msg=document.getElementById("mf-group-msg");
  msg.textContent="Creating...";
  try{
    await api("/api/groups",{
      method:"POST",
      body:JSON.stringify({
        name:document.getElementById("mf-group-name").value,
        region:document.getElementById("mf-group-region").value,
        clan_id:document.getElementById("mf-group-clan").value
      })
    });
    msg.textContent="✅ Group created!";
    setTimeout(openGroupsManager,500);
  }catch(e){
    msg.textContent="❌ "+e.message;
  }
}

async function openPricingManager(){
  try{
    const data=await api("/api/pricing");
    const plans=data.plans||[];

    let box=document.getElementById("mf-pricing-box");
    if(!box){
      box=document.createElement("div");
      box.id="mf-pricing-box";
      box.style.cssText="position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.86);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto";
      document.body.appendChild(box);
    }

    box.innerHTML=`
      <div style="width:min(850px,100%);background:#100b1d;border:1px solid rgba(168,85,247,.5);border-radius:24px;padding:22px;color:white">
        <h2>💎 MafiaFF Glory Pricing</h2>
        <p style="color:#bbb">Choose your plan</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:15px;margin:20px 0">
          ${plans.map(plan=>`
            <div style="background:#080611;border:1px solid rgba(34,211,238,.35);border-radius:18px;padding:18px;text-align:center">
              <h3>${plan.name}</h3>
              <div style="font-size:28px;font-weight:800;color:#ffd166">₹${plan.price}</div>
              <p>🎟️ ${plan.credits} Credits</p>
              <button class="btn" onclick="buyPricingPlan('${plan.id}')">🛒 Buy Now</button>
            </div>
          `).join("")}
        </div>
        <p id="mf-pricing-msg"></p>
        <button class="btn" onclick="document.getElementById('mf-pricing-box').remove()">Close</button>
      </div>
    `;
  }catch(e){
    alert("Pricing error: "+e.message);
  }
}

async function buyPricingPlan(planId){
  const msg=document.getElementById("mf-pricing-msg");
  if(msg) msg.textContent="⏳ Creating payment order...";
  try{
    const data=await api("/api/transactions",{method:"POST",body:JSON.stringify({plan_id:planId})});
    const t=data.transaction||{};
    const upi=data.upiId||"";
    const upiLink=upi?("upi://pay?pa="+encodeURIComponent(upi)+"&pn="+encodeURIComponent("MafiaFF Glory")+"&am="+encodeURIComponent(t.amount)+"&cu=INR&tn="+encodeURIComponent("MafiaFF "+t.id)):"";
    if(msg){
      msg.innerHTML='<div style="padding:16px;border:1px solid rgba(168,85,247,.35);border-radius:16px;background:#171025"><b>💳 Payment Pending</b><br><span>Pay ₹'+t.amount+' for '+t.credits+' Credits.</span><br><small>Order: '+t.id+'</small><br><button class="mf-admin-btn" style="margin-top:10px" '+(upiLink?'onclick="location.href=\''+upiLink+'\'"':'disabled')+'>📲 Pay Now</button><button class="mf-admin-btn" style="margin:10px 0 0 8px" onclick="openDashboardApi(\'Transactions\',\'/api/transactions\')">📋 View Order</button><p style="color:#aaa;margin:10px 0 0">'+(upi?'After payment, Admin will verify it and your credits will be added.':'Payment UPI is not configured yet. Admin must configure PAYMENT_UPI_ID.')+'</p></div>';
      msg.style.color="#fff";
    }
  }catch(e){
    if(msg){msg.textContent="❌ "+e.message;msg.style.color="#ff6b6b";}
  }
}


async function openCouponManager(){
  let box=document.getElementById("mf-coupon-panel"); if(box)box.remove();
  box=document.createElement("div"); box.id="mf-coupon-panel";
  box.style.cssText="position:fixed;inset:0;z-index:1100;background:rgba(0,0,0,.84);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:18px";
  box.innerHTML='<div style="width:min(560px,100%);max-height:85vh;overflow:auto;background:#100b1d;border:1px solid rgba(168,85,247,.5);border-radius:24px;padding:22px;color:white">'+
    '<div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">🎟️ Coupon Center</h2><button class="mf-admin-btn" onclick="document.getElementById(\'mf-coupon-panel\').remove()">✕</button></div>'+
    '<p style="color:#aaa">Enter your coupon code below.</p>'+
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><input id="mf-coupon-code" placeholder="Enter coupon code" style="flex:1;min-width:220px;padding:13px;border-radius:12px;border:1px solid #a855f7;background:#080611;color:white;text-transform:uppercase"><button class="mf-admin-btn" onclick="redeemCustomerCoupon()">🎁 Redeem</button></div>'+
    '<p id="mf-coupon-msg"></p><h3>📋 My Redeemed Coupons</h3><div id="mf-coupon-list">Loading...</div>'+
    '</div>';
  document.body.appendChild(box);
  loadCustomerCoupons();
}
async function loadCustomerCoupons(){
  const list=document.getElementById("mf-coupon-list"); if(!list)return;
  try{
    const d=await api("/api/coupons/redeemed"); const rows=d.coupons||[];
    list.innerHTML=rows.length?rows.map(c=>'<div style="padding:12px;margin:8px 0;border-radius:14px;background:#171025;border:1px solid rgba(168,85,247,.3)"><b>🎟️ '+c.code+'</b><br><small>Status: '+c.status+'</small></div>').join(""):'<div style="color:#aaa">No redeemed coupons yet.</div>';
  }catch(e){list.innerHTML='<div style="color:#ff6b6b">❌ '+e.message+'</div>';}
}
async function redeemCustomerCoupon(){
  const input=document.getElementById("mf-coupon-code"), msg=document.getElementById("mf-coupon-msg"); if(!input||!msg)return;
  const code=input.value.trim().toUpperCase(); if(!code){msg.textContent="⚠️ Enter a coupon code";return;}
  msg.textContent="⏳ Redeeming...";
  try{
    const d=await api("/api/coupons/redeem",{method:"POST",body:JSON.stringify({code})});
    msg.textContent="✅ Coupon redeemed successfully!";
    input.value=""; loadCustomerCoupons();
  }catch(e){msg.textContent="❌ "+e.message;}
}

async function openDashboardApi(title, path){
  if(path === "/api/groups"){ openGroupsManager(); return; }
  try{
    const data = await api(path);
    let box = document.getElementById("mf-api-result");
    if(!box){
      box = document.createElement("div");
      box.id = "mf-api-result";
      box.style.cssText =
        "position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.82);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:20px";
      box.innerHTML =
        '<div style="width:min(700px,100%);max-height:85vh;overflow:auto;background:#100b1d;border:1px solid rgba(168,85,247,.5);border-radius:24px;padding:22px;color:white">'+
        '<h2 id="mf-api-title"></h2><div id="mf-api-data" style="font-size:13px;line-height:1.5"></div>'+
        '<button class="btn" style="margin-top:14px" onclick="document.getElementById(\'mf-api-result\').remove()">Close</button></div>';
      document.body.appendChild(box);
    }
    document.getElementById("mf-api-title").textContent = title;
    const dataBox=document.getElementById("mf-api-data");

    if(path === "/api/coupons"){
      const rows=data.coupons||[];
      dataBox.innerHTML =
        '<div style="padding:16px;border-radius:18px;background:#171025;border:1px solid rgba(168,85,247,.35)">'+
        '<div style="font-size:18px;font-weight:800">🎟️ Redeem Coupon</div>'+
        '<p style="color:#aaa;margin:6px 0 14px">Enter your coupon code below.</p>'+
        '<div style="display:flex;gap:8px;flex-wrap:wrap">'+
        '<input id="mf-coupon-code" placeholder="Enter coupon code" style="flex:1;min-width:200px;padding:12px;border-radius:12px;background:#080611;color:white;border:1px solid #a855f7">'+
        '<button class="mf-admin-btn" onclick="redeemCustomerCoupon()">🎁 Redeem Coupon</button></div>'+
        '<p id="mf-coupon-msg" style="margin:10px 0"></p></div>'+
        '<div style="margin-top:18px"><h3>📋 My Coupons</h3>'+
        (rows.length?rows.map(c=>'<div style="padding:12px;margin:8px 0;border-radius:14px;background:#100b1d;border:1px solid rgba(168,85,247,.25)"><b>'+c.code+'</b><br><small>Status: '+c.status+'</small></div>').join(""):'<div style="color:#aaa">No coupons found yet.</div>')+
        '</div>';
    }else if(path === "/api/transactions"){
      const rows=data.transactions||[];
      dataBox.innerHTML=rows.length?rows.map(t=>`<div style="padding:14px;margin:10px 0;border:1px solid rgba(168,85,247,.35);border-radius:16px;background:#171025"><b>${t.planName}</b><br>💰 ₹${t.amount} &nbsp; 🎟️ ${Number(t.credits||0)} Credits<br><small>${t.status}</small> ${t.status==="completed"?`<button class="mf-admin-btn" style="margin-left:8px" onclick="customerRefundRequest('${t.id}',${Number(t.credits||0)})">💰 Request Credit Refund</button>`:""}</div>`).join(""):"No transactions yet.";
    }else{
      dataBox.textContent=JSON.stringify(data,null,2);
    }
  }catch(e){
    alert(title + " error: " + e.message);
  }
}

async function redeemCustomerCoupon(){
  const input=document.getElementById("mf-coupon-code");
  const msg=document.getElementById("mf-coupon-msg");
  const code=(input?.value||"").trim();
  if(!code){ if(msg) msg.textContent="⚠️ Enter a coupon code"; return; }
  try{
    const d=await api("/api/coupons/redeem",{method:"POST",body:JSON.stringify({code})});
    if(msg){msg.textContent="✅ Coupon redeemed successfully!";msg.style.color="#22d3ee";}
    setTimeout(()=>openDashboardApi("Coupons","/api/coupons"),500);
  }catch(e){
    if(msg){msg.textContent="❌ "+e.message;msg.style.color="#ff6b6b";}
  }
}

async function customerRefundRequest(id,credits){
  if(!confirm("Request refund of "+credits+" credits?"))return;
  try{
    await api("/api/transactions/refund-request",{method:"POST",body:JSON.stringify({transaction_id:id})});
    alert("✅ Refund request sent to Admin");
    openDashboardApi("Transactions","/api/transactions");
  }catch(e){alert("❌ Refund request failed: "+e.message);}
}



let panelPricingCache=[];

async function openAdminPanel(){
  try{ await api("/admin/overview"); }catch(e){ alert("Admin access denied"); return; }
  let old=document.getElementById("mf-admin-panel"); if(old) old.remove();
  const panel=document.createElement("div"); panel.id="mf-admin-panel"; panel.className="mf-admin-panel";
  panel.innerHTML=`
    <div class="mf-admin-shell">
      <div class="mf-admin-head"><div><h2 style="margin:0">🛡️ MafiaFF Glory Admin</h2><small style="color:#aaa">Private control center</small></div><button class="mf-admin-btn" onclick="document.getElementById('mf-admin-panel').remove()">✕ Close</button></div>
      <div id="mf-admin-tabs" class="mf-admin-tabs">
        <button onclick="loadAdminTab('overview')">📊 Overview</button><button onclick="loadAdminTab('users')">👥 Users</button><button onclick="loadAdminTab('groups')">🎮 Groups</button><button onclick="loadAdminTab('pricing')">💎 Pricing</button><button onclick="loadAdminTab('coupons')">🎟️ Coupons</button><button onclick="loadAdminTab('transactions')">💳 Transactions</button><button onclick="loadAdminTab('audit')">📝 Audit</button>
      </div>
      <div id="mf-admin-content" style="margin-top:12px">Loading...</div>
    </div>`;
  document.body.appendChild(panel); loadAdminTab("overview");
}
async function loadAdminTab(tab){
  const box=document.getElementById("mf-admin-content"); if(!box)return;
  document.querySelectorAll("#mf-admin-tabs button").forEach(b=>b.classList.toggle("active",b.textContent.toLowerCase().includes(tab)));
  try{
    if(tab==="overview"){
      const d=await api("/admin/overview"),s=d.stats||{};
      box.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">${Object.entries(s).map(([k,v])=>`<div class="mf-admin-stat"><small>${k}</small><b>${v}</b></div>`).join("")}</div>`;
    }else if(tab==="users"){
      const d=await api("/admin/users");
      box.innerHTML=`<div style="overflow:auto"><table class="mf-admin-table"><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr>${d.users.map(u=>`<tr><td>${u.name||"-"}</td><td>${u.email}</td><td><select onchange="adminUserRole('${u.id}',this.value)"><option ${u.role==="user"?"selected":""}>user</option><option ${u.role==="admin"?"selected":""}>admin</option></select></td><td>${u.active?"Active":"Disabled"}</td><td><button class="mf-admin-btn" onclick="adminUserToggle('${u.id}',${!u.active})">${u.active?"Disable":"Enable"}</button></td></tr>`).join("")}</table></div>`;
    }else if(tab==="groups"){
      const d=await api("/admin/groups");
      box.innerHTML=`<div style="overflow:auto"><table class="mf-admin-table"><tr><th>Name</th><th>Region</th><th>Status</th><th>Action</th></tr>${d.groups.map(g=>`<tr><td>${g.name}</td><td>${g.region||"-"}</td><td>${g.status||"-"}</td><td><button class="mf-admin-btn" onclick="adminDelete('/admin/groups/${g.id}','groups')">Delete</button></td></tr>`).join("")}</table></div>`;
    }else if(tab==="pricing"){
      const d=await api("/admin/pricing");
      box.innerHTML=`<div style="display:grid;gap:12px">${d.plans.map((p,i)=>`<div class="mf-admin-stat"><input id="apn${i}" value="${p.name}"> <input id="app${i}" type="number" value="${p.price}"> <input id="apc${i}" type="number" value="${p.credits}"> <input id="api${i}" value="${p.id}" disabled></div>`).join("")}<button class="mf-admin-btn" onclick="saveAdminPricing()">💾 Save Pricing</button></div>`;
      panelPricingCache=d.plans;
    }else if(tab==="coupons"){
      const d=await api("/admin/coupons"); box.innerHTML=`<div style="overflow:auto"><table class="mf-admin-table"><tr><th>Code</th><th>User</th><th>Status</th></tr>${d.coupons.map(c=>`<tr><td>${c.code}</td><td>${c.userId}</td><td>${c.status}</td></tr>`).join("")}</table></div>`;
    }else if(tab==="transactions"){
      const d=await api("/admin/transactions");
      box.innerHTML=`<div style="display:flex;justify-content:flex-end;margin-bottom:12px"><button class="mf-admin-btn" onclick="loadAdminTab('transactions')">🔄 Refresh Transactions</button></div><div style="overflow:auto"><table class="mf-admin-table"><tr><th>Plan</th><th>Amount</th><th>Credits</th><th>User</th><th>Status</th><th>Action</th></tr>${d.transactions.map(t=>`<tr><td>${t.planName}</td><td>₹${t.amount}</td><td>🎟️ ${Number(t.credits||0)}</td><td>${t.userId}</td><td><b>${t.status}</b></td><td>${t.status==="payment_pending"?`<button class="mf-admin-btn" onclick="adminVerifyPayment('${t.id}')">✅ Verify Payment</button> <button class="mf-admin-btn" onclick="adminRejectPayment('${t.id}')">❌ Reject</button>`:(t.status==="completed"?`<button class="mf-admin-btn" onclick="adminRefundCredits('${t.id}',${Number(t.credits||0)})">💰 Refund Credits</button>`:(t.status==="refunded"?"↩️ Refunded":"—"))}</td></tr>`).join("")}</table></div>`;
    }else if(tab==="audit"){
      const d=await api("/admin/audit?limit=200"); box.innerHTML=`<pre style="white-space:pre-wrap;background:#100b1d;padding:14px;border-radius:14px;max-height:65vh;overflow:auto">${JSON.stringify(d.events||[],null,2)}</pre>`;
    }
  }catch(e){box.innerHTML=`<div style="color:#ff6b6b">❌ ${e.message}</div>`;}
}
async function saveAdminPricing(){
  try{
    const plans=panelPricingCache.map((p,i)=>({
      id:p.id,
      name:document.getElementById("apn"+i).value.trim(),
      price:Number(document.getElementById("app"+i).value),
      credits:Number(document.getElementById("apc"+i).value)
    }));
    const data=await api("/admin/pricing",{method:"PUT",body:JSON.stringify({plans})});
    panelPricingCache=data.plans||plans;
    await loadAdminTab("pricing");
    alert("✅ Pricing saved successfully");
  }catch(e){
    alert("❌ Pricing save failed: "+e.message);
  }
}
async function adminUserRole(id,role){await api("/admin/users/"+id,{method:"PATCH",body:JSON.stringify({role})});}
async function adminUserToggle(id,active){await api("/admin/users/"+id,{method:"PATCH",body:JSON.stringify({active})});loadAdminTab("users");}
async function adminDelete(path,tab){if(!confirm("Delete this item?"))return;await api(path,{method:"DELETE"});loadAdminTab(tab);}

async function adminTransactionStatus(id,status){try{await api("/admin/transactions/"+id,{method:"PATCH",body:JSON.stringify({status})});await loadAdminTab("transactions");alert(status==="cancelled"?"↩️ Transaction cancelled":"✅ Transaction completed");}catch(e){alert("❌ Transaction update failed: "+e.message);}}

async function adminRefundCredits(id,credits){if(!confirm("Refund "+credits+" credits to this user? This can only be done once."))return;try{const d=await api("/admin/transactions/"+id+"/refund",{method:"PATCH"});await loadAdminTab("transactions");alert("✅ "+(d.refundedCredits||credits)+" credits refunded to the user");}catch(e){alert("❌ Credit refund failed: "+e.message);}}

async function customerRefundRequest(id,credits){if(!confirm("Request refund of "+credits+" credits?"))return;try{await api("/api/transactions/refund-request",{method:"POST",body:JSON.stringify({transaction_id:id})});alert("✅ Refund request sent to Admin");openDashboardApi("Transactions","/api/transactions");}catch(e){alert("❌ Refund request failed: "+e.message);}}

async function adminVerifyPayment(id){if(!confirm("Confirm payment received and add credits?"))return;try{await api("/admin/transactions/"+id+"/verify",{method:"PATCH"});await loadAdminTab("transactions");alert("✅ Payment verified and credits added");}catch(e){alert("❌ Verify failed: "+e.message);}}
async function adminRejectPayment(id){if(!confirm("Reject this payment order?"))return;try{await api("/admin/transactions/"+id+"/reject",{method:"PATCH"});await loadAdminTab("transactions");alert("❌ Payment rejected");}catch(e){alert("❌ Reject failed: "+e.message);}}
