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
`;

document.head.appendChild(style);

const modal = document.createElement("div");
modal.className = "mf-modal";
modal.innerHTML = `
<div class="mf-box">
<button class="mf-close">×</button>
<h2 id="mf-title">MafiaFF Glory</h2>
<p id="mf-subtitle">Login to your account</p>

<div id="mf-name-wrap" style="display:none">
<input id="mf-name" placeholder="Full name">
</div>

<input id="mf-email" type="email" placeholder="Email address">
<input id="mf-password" type="password" placeholder="Password">

<button class="mf-submit" id="mf-submit">LOGIN</button>

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
    register ? "Join MafiaFF Glory today" : "Login to your account";

  document.getElementById("mf-name-wrap").style.display =
    register ? "block" : "none";

  document.getElementById("mf-submit").textContent =
    register ? "CREATE ACCOUNT" : "LOGIN";

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
    document.querySelectorAll("section").forEach(s=>s.style.display="none");
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
            <button class="btn mf-groups-open">Open</button>
          </div>

          <div class="card">
            <h3>💎 Pricing</h3>
            <p>View available plans.</p>
            <button class="btn" onclick="openDashboardApi('Pricing', '/api/pricing')">Open</button>
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
}


async 
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
