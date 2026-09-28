const API = "https://ffglory1.onrender.com";

async function api(path, options = {}) {
  const token = localStorage.getItem("ffglory_token");
  const headers = {"Content-Type":"application/json",...(options.headers||{})};
  if(token) headers.Authorization = "Bearer " + token;

  const res = await fetch(API + path,{...options,headers});
  const data = await res.json().catch(()=>({}));

  if(!res.ok) throw new Error(data.message || data.error || "Request failed");
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
      alert("Login successful!");
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
      <div style="max-width:900px;margin:auto">
        <div class="card" style="margin-bottom:20px">
          <h2>🔥 MafiaFF Glory Dashboard</h2>
          <p id="mf-user">Loading account...</p>
        </div>

        <div class="grid">
          <div class="card">
            <h3>👥 Groups</h3>
            <p>Manage your FF groups.</p>
            <button class="btn" onclick="document.getElementById('mf-groups-inline').style.display='block'">Open</button>
              <div id="mf-groups-inline" style="display:none;margin-top:15px;padding:18px;background:#080611;border:1px solid #a855f7;border-radius:16px">
                <h3 style="position:relative;padding-right:50px">✨ My Groups
<button type="button" onclick="document.getElementById('mf-groups-inline').style.display='none'" style="position:absolute;right:0;top:-8px;width:38px;height:38px;background:#ff4d6d;color:white;border:0;border-radius:50%;font-size:20px;font-weight:bold;cursor:pointer">✕</button>
</h3>
                <div id="mf-groups-inline-list" style="margin:12px 0">Loading...</div>
                <input id="mf-inline-name" placeholder="Group name" style="width:100%;padding:12px;margin:6px 0">
                <select id="mf-inline-region" style="width:100%;padding:12px;margin:6px 0;border-radius:10px;background:#080611;color:white;border:1px solid #a855f7">
  <option value="">Select Region</option>
  <option value="India">🇮🇳 India</option>
  <option value="Bangladesh">🇧🇩 Bangladesh</option>
  <option value="Pakistan">🇵🇰 Pakistan</option>
  <option value="Other">🌍 Other</option>
</select>
                <button class="btn" onclick="createInlineGroup()">Create Group</button>
                <p id="mf-inline-msg"></p>
              </div>
          </div>

          <div class="card">
            <h3>💎 Pricing</h3>
            <p>View available plans.</p>
            <button class="btn" onclick="openPricingManager()">Open</button>
          </div>

          <div class="card">
            <h3>🎟️ Coupons</h3>
            <p>Redeem your coupons.</p>
            <button class="btn" onclick="openDashboardApi('Coupons', '/api/coupons')">Open</button>
          </div>

          <div class="card">
            <h3>💳 Transactions</h3>
            <p>View your transactions.</p>
            <button class="btn" onclick="openDashboardApi('Transactions', '/api/transactions')">Open</button>
          </div>
        </div>

        <button class="btn" style="margin-top:25px" onclick="logoutUser()">Logout</button>
      </div>
    `;
  }

  dash.style.display="block";
  loadInlineGroups();

  const groupsBtn = document.querySelector(".mf-groups-open");
  if(groupsBtn){
    groupsBtn.addEventListener("click", openGroupsManager);
  }

  try{
    const data = await api("/auth/me");
    const user = data.user || data;
    document.getElementById("mf-user").textContent =
      `Welcome, ${user.name || user.email || "User"} 👑`;
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


async 
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
  if(msg) msg.textContent="⏳ Processing purchase...";

  try{
    const data=await api("/api/transactions",{
      method:"POST",
      body:JSON.stringify({plan_id:planId})
    });

    if(msg){
      msg.textContent="✅ Purchase successful! Transaction ID: "+(data.transaction?.id||"Done");
      msg.style.color="#22d3ee";
    }
  }catch(e){
    if(msg){
      msg.textContent="❌ "+e.message;
      msg.style.color="#ff6b6b";
    }
  }
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
        "position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.82);"+
        "backdrop-filter:blur(10px);display:flex;align-items:center;"+
        "justify-content:center;padding:20px";

      box.innerHTML =
        '<div style="width:min(700px,100%);max-height:85vh;overflow:auto;'+
        'background:#100b1d;border:1px solid rgba(168,85,247,.5);'+
        'border-radius:24px;padding:22px;color:white">'+
        '<h2 id="mf-api-title"></h2>'+
        '<pre id="mf-api-data" style="white-space:pre-wrap;word-break:break-word;'+
        'font-size:13px;line-height:1.5"></pre>'+
        '<button class="btn" onclick="document.getElementById(\'mf-api-result\').remove()">Close</button>'+
        '</div>';

      document.body.appendChild(box);
    }

    document.getElementById("mf-api-title").textContent = title;
    document.getElementById("mf-api-data").textContent =
      JSON.stringify(data,null,2);

  }catch(e){
    alert(title + " error: " + e.message);
  }
}
