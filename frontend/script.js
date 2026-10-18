/* ===== Nova AI frontend ===== */
const CONFIG = {
    API_BASE: "http://127.0.0.1:8001",
    DEMO_MODE: false
};

const MODES = {
  "image":      { label: "Generate image", ph: "Describe the image you want…" },
  "video":      { label: "Generate video", ph: "Describe the video you want…" },
  "music":      { label: "Generate music", ph: "Describe the music, e.g. calm lo-fi piano…" },
  "edit-image": { label: "Edit image",     ph: "What should change in the photo?", file: "image" },
  "animate":    { label: "Animate photo",  ph: "What movement should I add?",      file: "image" },
  "edit-video": { label: "Edit video",     ph: "What should change in the video?", file: "video" },
  "weather":    { label: "Weather",        ph: "Which city or country?" }
};

const $ = (id) => document.getElementById(id);
const chat = $("chat"), input = $("input"), sendBtn = $("sendBtn");
const fileInput = $("fileInput"), preview = $("preview");
let mode = null, file = null, busy = false;

/* ---------- helpers ---------- */
const scrollDown = () => chat.scrollTo({ top: chat.scrollHeight });

function addMessage(role, text, opts = {}) {
  $("welcome")?.remove();
  const m = document.createElement("div");
  m.className = `msg ${role}${opts.error ? " error" : ""}`;
  const av = document.createElement("div");
  av.className = "avatar";
  av.textContent = role === "user" ? "You" : "";
  const b = document.createElement("div");
  b.className = "bubble";
  if (text) b.append(document.createTextNode(text));
  m.append(av, b);
  chat.append(m);
  scrollDown();
  return b;
}

function addMedia(bubble, type, url) {
  const wrap = document.createElement("div");
  wrap.className = "media";
  let el;
  if (type === "image") { el = new Image(); el.alt = "Generated image"; }
  else if (type === "video") { el = document.createElement("video"); el.controls = true; el.playsInline = true; }
  else { el = document.createElement("audio"); el.controls = true; }
  el.src = url;
  const dl = document.createElement("a");
  dl.href = url; dl.download = ""; dl.textContent = "Download";
  wrap.append(el, dl);
  bubble.append(wrap);
  el.addEventListener("load", scrollDown);
  el.addEventListener("loadeddata", scrollDown);
}

function showTyping() {
  const b = addMessage("ai", "");
  b.innerHTML = '<div class="typing"><i></i><i></i><i></i></div>';
  return b.parentElement;
}

/* ---------- modes & files ---------- */
function setMode(key) {
  mode = key;
  document.querySelectorAll("[data-mode]").forEach(el =>
    el.closest(".tools") && el.classList.toggle("active", el.dataset.mode === key));
  const pill = $("modePill");
  pill.hidden = !key;
  if (key) {
    $("modeLabel").textContent = MODES[key].label;
    input.placeholder = MODES[key].ph;
    if (MODES[key].file && !file) fileInput.click();
  } else {
    input.placeholder = "Message Nova…";
  }
  closeMenu();
  input.focus();
}

function setFile(f) {
  file = f;
  preview.innerHTML = "";
  preview.hidden = !f;
  if (!f) return;
  const url = URL.createObjectURL(f);
  const el = f.type.startsWith("video") ? document.createElement("video") : new Image();
  el.src = url;
  if (el.tagName === "VIDEO") el.muted = true;
  const x = document.createElement("button");
  x.textContent = "×"; x.setAttribute("aria-label", "Remove file");
  x.onclick = () => { setFile(null); fileInput.value = ""; };
  preview.append(el, x);
}

fileInput.addEventListener("change", () => fileInput.files[0] && setFile(fileInput.files[0]));

const dz = $("dropzone");
["dragenter", "dragover"].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("drag"); }));
["dragleave", "drop"].forEach(ev => document.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("drag"); }));
document.addEventListener("drop", e => {
  const f = e.dataTransfer.files[0];
  if (f && /^(image|video)\//.test(f.type)) setFile(f);
});

document.querySelectorAll("[data-mode]").forEach(el =>
  el.addEventListener("click", () => setMode(mode === el.dataset.mode && el.closest(".tools") ? null : el.dataset.mode)));
$("modeClear").onclick = () => setMode(null);
document.querySelectorAll("[data-quick]").forEach(el =>
  el.addEventListener("click", () => { closeMenu(); send(el.dataset.quick, true); }));

/* ---------- sending ---------- */
async function send(textOverride, quick = false) {
  const text = (textOverride ?? input.value).trim();
  if (busy || (!text && !file)) return;

  const needs = mode && MODES[mode].file;
  if (needs && !file) { addMessage("ai", `Add a ${needs} first using the 📎 button, then describe the change.`, { error: true }); return; }
  if (needs && file && !file.type.startsWith(needs)) { addMessage("ai", `This tool needs a ${needs} file.`, { error: true }); return; }

  const bubble = addMessage("user", text || "(file attached)");
  if (file) {
    const u = URL.createObjectURL(file);
    addMedia(bubble, file.type.startsWith("video") ? "video" : "image", u);
    bubble.querySelector("a")?.remove();
  }

  const fd = new FormData();
  fd.append("message", text);
  if (mode) fd.append("mode", mode);
  if (file) fd.append("file", file);

  if (!quick) { input.value = ""; autosize(); }
  const sentMode = mode;
  setFile(null); fileInput.value = ""; setMode(null);

  busy = true; sendBtn.disabled = true;
  const typing = showTyping();
  try {
    const data = CONFIG.DEMO_MODE ? await demo(text, sentMode) : await callApi(fd);
    typing.remove();
    const b = addMessage("ai", data.reply || "");
    if (data.media) addMedia(b, data.media.type, abs(data.media.url));
  } catch (err) {
    typing.remove();
    addMessage("ai", `Couldn't reach Nova's server. Check that your backend is running at ${CONFIG.API_BASE}. (${err.message})`, { error: true });
  } finally {
    busy = false; sendBtn.disabled = false; input.focus();
  }
}

const abs = (u) => /^(https?:|blob:|data:)/.test(u) ? u : CONFIG.API_BASE + u;

async function callApi(fd) {
  const r = await fetch(`${CONFIG.API_BASE}/api/chat`, { method: "POST", body: fd });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();   // { reply: "text", media: { type: "image|video|audio", url: "/files/x.png" } }
}

function demo(text, m) {
  return new Promise(res => setTimeout(() => res({
    reply: m ? `Demo: the "${MODES[m].label}" tool would run with “${text}”.` : `Demo reply to: ${text}`
  }), 900));
}

/* ---------- input behaviour ---------- */
function autosize() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 160) + "px"; }
input.addEventListener("input", autosize);
input.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
sendBtn.addEventListener("click", () => send());

/* ---------- chrome ---------- */
const openMenu = () => { $("sidebar").classList.add("open"); $("scrim").classList.add("show"); };
const closeMenu = () => { $("sidebar").classList.remove("open"); $("scrim").classList.remove("show"); };
$("menuBtn").onclick = openMenu;
$("scrim").onclick = closeMenu;

function reset() {
  chat.querySelectorAll(".msg").forEach(m => m.remove());
  if (!$("welcome")) location.reload();
  setMode(null); setFile(null);
}
$("newChat").onclick = () => { closeMenu(); location.reload(); };
$("clearBtn").onclick = () => { if (confirm("Clear this chat?")) location.reload(); };

/* ---------- server status ---------- */
async function ping() {
  const dot = $("statusDot"), txt = $("statusText");
  if (CONFIG.DEMO_MODE) { dot.className = "dot"; txt.textContent = "Demo mode"; return; }
  try {
    const r = await fetch(`${CONFIG.API_BASE}/api/health`, { cache: "no-store" });
    if (!r.ok) throw 0;
    dot.className = "dot on"; txt.textContent = "Connected";
  } catch { dot.className = "dot off"; txt.textContent = "Server offline"; }
}
ping(); setInterval(ping, 15000);