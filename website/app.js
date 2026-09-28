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
