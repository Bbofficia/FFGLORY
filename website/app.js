const API = "https://ffglory1.onrender.com";

async function api(path, options = {}) {
  const token = localStorage.getItem("ffglory_token");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };

  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) throw new Error(data.message || data.error || "Request failed");
  return data;
}

document.querySelectorAll(".bottom-nav a").forEach(link => {
  link.addEventListener("click", e => {
    e.preventDefault();

    const target = link.getAttribute("href");

    document.querySelectorAll("section").forEach(section => {
      section.style.display = "none";
    });

    const page = document.querySelector(target);

    if (page) {
      page.style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    document.querySelectorAll(".bottom-nav a").forEach(a => {
      a.classList.remove("active");
    });

    link.classList.add("active");
  });
});

const sections = document.querySelectorAll("section");
sections.forEach((section, index) => {
  if (index !== 0) section.style.display = "none";
});

function openLogin(){
  const email = prompt("Enter your email:");
  if(!email) return;

  const password = prompt("Enter your password:");
  if(!password) return;

  api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  })
  .then(data => {
    if(data.token){
      localStorage.setItem("ffglory_token", data.token);
      alert("Login successful!");
      location.reload();
    }
  })
  .catch(err => alert("Login failed: " + err.message));
}

document.querySelectorAll(".btn").forEach(btn => {
  if(btn.textContent.trim().toLowerCase() === "login"){
    btn.onclick = openLogin;
  }
});
