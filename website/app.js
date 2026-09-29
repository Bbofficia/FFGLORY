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
@keyframes mfToastIn{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
`;

document.head.appendChild(style);
.mf-payment-box{max-width:540px!important}.mf-pay-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.mf-pay-head small{color:#22d3ee;letter-spacing:2px;font-size:10px;font-weight:900}.mf-pay-head h2{margin:4px 0 0}.mf-pay-product{display:flex;justify-content:space-between;align-items:center;padding:14px;margin:16px 0;border-radius:15px;background:#100b1d;border:1px solid rgba(168,85,247,.28)}.mf-pay-product strong{font-size:25px;color:#ffd166}.mf-pay-qr-wrap{display:flex;flex-direction:column;align-items:center;gap:7px;color:#aaa;font-size:11px}.mf-pay-qr{width:230px;height:230px;object-fit:contain;background:#fff;padding:10px;border-radius:18px;box-shadow:0 0 35px rgba(34,211,238,.15)}.mf-upi-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px;margin-top:14px;border-radius:14px;background:#090711;border:1px solid rgba(34,211,238,.25)}.mf-upi-row small{display:block;color:#888;font-size:9px}.mf-upi-row b{display:block;color:#22d3ee;margin-top:3px;word-break:break-all}.mf-copy-upi{padding:8px 11px;border:0;border-radius:9px;background:#22d3ee;color:#061016;font-weight:900;cursor:pointer}.mf-pay-now,.mf-paid-btn{display:block;width:100%;box-sizing:border-box;text-align:center;padding:13px;margin-top:12px;border:0;border-radius:12px;font-weight:900;cursor:pointer;text-decoration:none}.mf-pay-now{background:linear-gradient(90deg,#22d3ee,#a855f7);color:#fff}.mf-paid-btn{background:linear-gradient(90deg,#ffd166,#a855f7);color:#090611}.mf-order-id{display:flex;justify-content:space-between;gap:10px;margin-top:13px;padding:10px;border-radius:11px;background:#0b0811;color:#aaa;font-size:10px}.mf-order-id b{color:#fff;word-break:break-all}.mf-pay-note{color:#85808f!important;font-size:10px!important;line-height:1.5;margin-top:12px!important}

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
<h2 id="mf-title">FFMAFIA.PANEL</h2>
<p id="mf-subtitle">Sign in to FFMAFIA.PANEL panel</p>

<div id="mf-name-wrap" style="display:none">
<input id="mf-name" placeholder="Full name">
</div>

<input id="mf-email" type="email" placeholder="Email address">
<input id="mf-password" type="password" placeholder="Enter your password">

<button class="mf-submit" id="mf-submit">Sign In</button>
<div style="text-align:center;margin-top:14px;color:#aaa;font-size:13px">Need help? <span style="color:#22d3ee">Contact Admin</span></div>
<div style="display:flex;justify-content:center;gap:18px;margin-top:12px;flex-wrap:wrap">
  <a href="https://t.me/TeamPro78" target="_blank" style="color:#22d3ee;text-decoration:none">💬 @TeamPro78 Support</a>
  <a href="https://t.me/mafiaffglory" target="_blank" style="color:#a855f7;text-decoration:none">📢 Telegram Group</a>
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
    register ? "Create Account" : "FFMAFIA.PANEL";

  document.getElementById("mf-subtitle").textContent =
    register ? "Create your FFMAFIA.PANEL account" : "Sign in to FFMAFIA.PANEL panel";

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
      sessionStorage.setItem("mf_login_success","1");

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
          <div class="mf-dash-kicker">FFMAFIA.PANEL</div>
          <h2>Welcome to your<br><span>Panel Dashboard</span></h2>
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
          <div class="mf-dash-card"><div class="mf-dash-icon">🛍️</div><h3>Panel Store</h3><p>Browse products and place orders.</p><button class="mf-glow-btn" onclick="openProductStore()">🛒 Browse Products</button></div>
          <div class="mf-dash-card mf-card-pricing"><div class="mf-dash-icon">💳</div><h3>Payment</h3><p>Buy credits and complete payments.</p><button class="mf-glow-btn" onclick="openPricingManager()">💎 Payment Options</button></div>
          <div class="mf-dash-card mf-card-transactions"><div class="mf-dash-icon">📦</div><h3>My Orders</h3><p>Track payments and purchase history.</p><button class="mf-glow-btn" onclick="openDashboardApi('My Orders','/api/transactions')">📋 View Orders</button></div>
          <div class="mf-dash-card"><div class="mf-dash-icon">💬</div><h3>Support</h3><p>Direct Telegram support: @TeamPro78</p><button class="mf-glow-btn" onclick="window.open('https://t.me/TeamPro78','_blank')">💬 @TeamPro78</button></div>
          <div class="mf-dash-card"><div class="mf-dash-icon">📢</div><h3>Telegram Group</h3><p>Join the official FFMAFIA.PANEL Telegram group.</p><button class="mf-glow-btn" onclick="window.open('https://t.me/mafiaffglory','_blank')">📢 Join Group</button></div>
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

  try{
    const data = await api("/auth/me");
    const user = data.user || data;
    document.getElementById("mf-user").textContent =
      `Welcome, ${user.name || user.email || "User"} 👑`;
    const adminCard=document.getElementById("mf-admin-card");
    if(adminCard) adminCard.style.display = user.role === "admin" ? "block" : "none";
  }catch(e){
    document.getElementById("mf-user").textContent="Welcome to FFMAFIA.PANEL 👑";
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

async function openProductStore(){
  let box=document.getElementById("mf-product-store"); if(box)box.remove();
  box=document.createElement("div"); box.id="mf-product-store"; box.className="mf-product-modal";
  box.innerHTML='<div class="mf-product-box"><div style="display:flex;justify-content:space-between;align-items:center"><div><div style="color:#22d3ee;font-weight:900">FFMAFIA.PANEL STORE</div><h2>🛍️ Panel Products</h2></div><button class="mf-admin-btn" onclick="this.closest(\'#mf-product-store\').remove()">✕</button></div><div id="mf-product-list" class="mf-product-grid" style="margin-top:18px">Loading...</div></div>';
  document.body.appendChild(box);
  try{const d=await api("/api/products");const rows=d.products||[];document.getElementById("mf-product-list").innerHTML=rows.length?rows.map(p=>'<div class="mf-product-card">'+(p.imageUrl?'<img src="'+p.imageUrl+'" alt="">':'')+'<h3>'+p.name+'</h3><p>'+(p.description||'Premium panel product.')+'</p><strong>₹'+p.price+'</strong><button class="mf-glow-btn" onclick="orderPanelProduct(\''+p.id+'\')">🛒 Buy / Order</button></div>').join(""):"<p>No products available yet.</p>";}catch(e){document.getElementById("mf-product-list").textContent="❌ "+e.message;}
}
async function orderPanelProduct(id){
  try{
    const d=await api("/api/products/"+encodeURIComponent(id)+"/order",{method:"POST"});
    let box=document.getElementById("mf-product-pay"); if(box)box.remove();
    box=document.createElement("div"); box.id="mf-product-pay"; box.className="mf-product-modal";
    const upi=d.upiId||"";
    const amount=Number(d.order?.amount||d.product?.price||0);
    const orderId=d.order?.id||"";
    const link=upi?"upi://pay?pa="+encodeURIComponent(upi)+"&pn="+encodeURIComponent("FFMAFIA.PANEL")+"&am="+encodeURIComponent(amount)+"&cu=INR&tn="+encodeURIComponent(orderId):"";
    box.innerHTML='<div class="mf-product-box mf-payment-box">'+
      '<div class="mf-pay-head"><div><small>SECURE CHECKOUT</small><h2>💳 Pay for your order</h2></div><button class="mf-admin-btn" onclick="this.closest(\'#mf-product-pay\').remove()">✕</button></div>'+
      '<div class="mf-pay-product"><b>'+String(d.product.name||"Panel Product")+'</b><strong>₹'+amount+'</strong></div>'+
      (d.qrUrl?'<div class="mf-pay-qr-wrap"><img class="mf-pay-qr" src="'+d.qrUrl+'" alt="Payment QR"><span>Scan with any UPI app</span></div>':'')+
      (upi?'<div class="mf-upi-row"><div><small>UPI ID</small><b id="mf-pay-upi">'+upi+'</b></div><button class="mf-copy-upi" onclick="copyPanelUpi()">COPY</button></div><a class="mf-pay-now" href="'+link+'">📲 Pay Now with UPI App</a>':'')+
      '<div class="mf-order-id"><span>Order ID</span><b>'+orderId+'</b></div>'+
      '<button class="mf-paid-btn" onclick="confirmProductPayment(\''+orderId+'\')">✓ I Have Paid</button>'+
      '<p class="mf-pay-note">Payment complete করার পরে “I Have Paid” চাপুন। Admin verify করার পর order process/delivery হবে.</p>'+
      '</div>';
    document.body.appendChild(box);
  }catch(e){alert("❌ "+e.message);}
}
function copyPanelUpi(){
  const el=document.getElementById("mf-pay-upi");
  if(!el)return;
  navigator.clipboard?.writeText(el.textContent).then(()=>alert("✅ UPI ID copied")).catch(()=>alert("UPI ID: "+el.textContent));
}
async function confirmProductPayment(orderId){
  try{
    await api("/api/product-orders/"+encodeURIComponent(orderId)+"/confirm-payment",{method:"POST"});
    alert("✅ Payment confirmation sent. Admin will verify your order.");
    const b=document.getElementById("mf-product-pay"); if(b)b.remove();
  }catch(e){alert("❌ "+e.message);}
}
async function adminCreateProduct(){try{await api("/admin/products",{method:"POST",body:JSON.stringify({name:document.getElementById("new-p-name").value,price:Number(document.getElementById("new-p-price").value),stock:Number(document.getElementById("new-p-stock").value),image_url:document.getElementById("new-p-image").value,description:document.getElementById("new-p-desc").value,delivery_text:document.getElementById("new-p-delivery").value})});alert("✅ Product added");loadAdminTab("products");}catch(e){alert("❌ "+e.message);}}
async function adminUpdateProduct(id){
  try{
    await api("/admin/products/"+encodeURIComponent(id),{method:"PATCH",body:JSON.stringify({
      name:document.getElementById("pn-"+id)?.value||"",
      price:Number(document.getElementById("pp-"+id)?.value||0),
      stock:Number(document.getElementById("ps-"+id)?.value??-1),
      status:document.getElementById("pt-"+id)?.value||"active"
    })});
    loadAdminTab("products");
  }catch(e){alert("❌ "+e.message);}
}
async function adminDeleteProduct(id){if(!confirm("Delete this product?"))return;try{await api("/admin/products/"+encodeURIComponent(id),{method:"DELETE"});loadAdminTab("products");}catch(e){alert("❌ "+e.message);}}

async function openAdminPanel(){
  try{ await api("/admin/overview"); }catch(e){ alert("Admin access denied"); return; }
  let old=document.getElementById("mf-admin-panel"); if(old) old.remove();
  const panel=document.createElement("div"); panel.id="mf-admin-panel"; panel.className="mf-admin-panel";
  panel.innerHTML=`
    <div class="mf-admin-shell">
      <div class="mf-admin-head"><div><h2 style="margin:0">🛡️ FFMAFIA.PANEL Admin</h2><small style="color:#aaa">Private control center</small></div><button class="mf-admin-btn" onclick="document.getElementById('mf-admin-panel').remove()">✕ Close</button></div>
      <div id="mf-admin-tabs" class="mf-admin-tabs">
        <button onclick="loadAdminTab('overview')">📊 Overview</button><button onclick="loadAdminTab('users')">👥 Users</button><button onclick="loadAdminTab('products')">🛍️ Products</button><button onclick="loadAdminTab('transactions')">📦 Orders & Payments</button><button onclick="loadAdminTab('audit')">📝 Audit</button>
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
    }else if(tab==="products"){
      const d=await api("/admin/products");
      box.innerHTML='<div style="display:grid;gap:14px"><div class="mf-admin-stat"><h3>🛍️ Add Product</h3><input id="new-p-name" placeholder="Product name"><input id="new-p-price" type="number" placeholder="Price ₹"><input id="new-p-stock" type="number" value="-1" placeholder="Stock (-1 unlimited)"><input id="new-p-image" placeholder="Image URL"><textarea id="new-p-desc" placeholder="Description"></textarea><textarea id="new-p-delivery" placeholder="Delivery instructions"></textarea><button class="mf-admin-btn" onclick="adminCreateProduct()">➕ Add Product</button></div><div style="overflow:auto"><table class="mf-admin-table"><tr><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr>'+(d.products||[]).map(p=>'<tr><td><input id="pn-'+p.id+'" value="'+String(p.name||"").replace(/"/g,"&quot;")+'"></td><td><input id="pp-'+p.id+'" type="number" value="'+Number(p.price||0)+'"></td><td><input id="ps-'+p.id+'" type="number" value="'+Number(p.stock??-1)+'"></td><td><select id="pt-'+p.id+'"><option value="active" '+(p.status==="active"?"selected":"")+'>active</option><option value="inactive" '+(p.status==="inactive"?"selected":"")+'>inactive</option></select></td><td><button class="mf-admin-btn" onclick="adminUpdateProduct(\''+p.id+'\')">Save</button> <button class="mf-admin-btn" onclick="adminDeleteProduct(\''+p.id+'\')">Delete</button></td></tr>').join("")+'</table></div></div>';
    }else if(tab==="pricing"){
      const d=await api("/admin/pricing");
      box.innerHTML=`<div style="display:grid;gap:12px">${d.plans.map((p,i)=>`<div class="mf-admin-stat"><input id="apn${i}" value="${p.name}"> <input id="app${i}" type="number" value="${p.price}"> <input id="apc${i}" type="number" value="${p.credits}"> <input id="api${i}" value="${p.id}" disabled></div>`).join("")}<button class="mf-admin-btn" onclick="saveAdminPricing()">💾 Save Pricing</button></div>`;
      panelPricingCache=d.plans;
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

/* FFMAFIA storefront product loader */
let homeProductsCache=[],homeProductFilter="all";
function homeProductCategory(p){const s=((p.name||"")+" "+(p.description||"")).toLowerCase();if(s.includes("non root")||s.includes("non-root"))return"non-root";if(s.includes("root"))return"root";if(s.includes("ios"))return"ios";if(s.includes("android"))return"android";return"other";}
function renderHomeProducts(){const box=document.getElementById("home-product-grid");if(!box)return;const rows=homeProductFilter==="all"?homeProductsCache:homeProductsCache.filter(p=>homeProductCategory(p)===homeProductFilter);if(!rows.length){box.innerHTML='<div class="product-loading">No products found in this category.</div>';return;}box.innerHTML=rows.map(p=>{const stock=Number(p.stock),soldOut=stock===0||String(p.status||"").toLowerCase()!=="active",img=p.imageUrl||p.image_url,id=String(p.id||"").replace(/'/g,"\\'");return '<article class="store-product-card">'+(img?'<img class="store-product-img" src="'+img+'" alt="">':'<div class="store-product-placeholder">⚡</div>')+'<h3>'+String(p.name||"Panel Product")+'</h3><p>'+String(p.description||"Premium digital panel product.")+'</p><div class="store-stock '+(soldOut?"out":"")+'">'+(soldOut?"● OUT OF STOCK":(stock>0?"● "+stock+" AVAILABLE":"● AVAILABLE"))+'</div><div class="store-product-bottom"><div class="store-product-price">₹'+Number(p.price||0)+'</div><button class="store-buy" '+(soldOut?"disabled":"onclick=\"buyHomeProduct('"+id+"')\"")+'>'+(soldOut?"Unavailable":"BUY NOW")+'</button></div></article>';}).join("");}
function filterHomeProducts(filter,btn){homeProductFilter=filter;document.querySelectorAll(".filter-btn").forEach(b=>b.classList.remove("active"));if(btn)btn.classList.add("active");renderHomeProducts();}
async function loadHomeProducts(){const box=document.getElementById("home-product-grid");if(!box)return;box.innerHTML='<div class="product-loading">Loading products...</div>';try{const d=await api("/api/products");homeProductsCache=(d.products||[]).filter(p=>String(p.status||"active")==="active");renderHomeProducts();}catch(e){box.innerHTML='<div class="product-loading">❌ Unable to load products. Please refresh.</div>';}}
function buyHomeProduct(id){if(!localStorage.getItem("ffglory_token")){openAuth(false);return;}orderPanelProduct(id);}
document.addEventListener("DOMContentLoaded",()=>{loadHomeProducts();});
