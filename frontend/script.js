/* ===== Nova AI frontend ===== */

const CONFIG = {
    API_BASE: window.location.origin,
    DEMO_MODE: false
};

const MODES = {
    image: {
        label: "Generate image",
        ph: "Describe the image you want…"
    },
    video: {
        label: "Generate video",
        ph: "Describe the video you want…"
    },
    music: {
        label: "Generate music",
        ph: "Describe the music, e.g. calm lo-fi piano…"
    },
    "edit-image": {
        label: "Edit image",
        ph: "What should change in the photo?",
        file: "image"
    },
    animate: {
        label: "Animate photo",
        ph: "What movement should I add?",
        file: "image"
    },
    "edit-video": {
        label: "Edit video",
        ph: "What should change in the video?",
        file: "video"
    },
    weather: {
        label: "Weather",
        ph: "Which city or country?"
    }
};

const $ = (id) => document.getElementById(id);

const chat = $("chat");
const input = $("input");
const sendBtn = $("sendBtn");
const fileInput = $("fileInput");
const preview = $("preview");

let mode = null;
let file = null;
let busy = false;

/* ---------- URL helpers ---------- */

function abs(url) {
    if (!url) return "";

    if (/^(https?:|blob:|data:)/i.test(url)) {
        return url;
    }

    return new URL(url, CONFIG.API_BASE).href;
}

/* ---------- helpers ---------- */

const scrollDown = () => {
    chat.scrollTo({
        top: chat.scrollHeight,
        behavior: "smooth"
    });
};

function addMessage(role, text, opts = {}) {
    $("welcome")?.remove();

    const message = document.createElement("div");
    message.className = `msg ${role}${opts.error ? " error" : ""}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = role === "user" ? "You" : "";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    if (text) {
        bubble.append(document.createTextNode(text));
    }

    message.append(avatar, bubble);
    chat.append(message);

    scrollDown();

    return bubble;
}

function addMedia(bubble, type, url) {
    const wrap = document.createElement("div");
    wrap.className = "media";

    let element;

    if (type === "image") {
        element = new Image();
        element.alt = "Generated image";
    } else if (type === "video") {
        element = document.createElement("video");
        element.controls = true;
        element.playsInline = true;
    } else {
        element = document.createElement("audio");
        element.controls = true;
    }

    element.src = abs(url);
    element.addEventListener("load", scrollDown);
    element.addEventListener("loadeddata", scrollDown);

    const download = document.createElement("a");
    download.href = abs(url);
    download.download = "";
    download.textContent = "Download";

    wrap.append(element, download);
    bubble.append(wrap);
}

function showTyping() {
    const bubble = addMessage("ai", "");

    bubble.innerHTML =
        '<div class="typing"><i></i><i></i><i></i></div>';

    return bubble.parentElement;
}

/* ---------- modes and files ---------- */

function setMode(key) {
    mode = key;

    document.querySelectorAll("[data-mode]").forEach((element) => {
        if (element.closest(".tools")) {
            element.classList.toggle(
                "active",
                element.dataset.mode === key
            );
        }
    });

    const pill = $("modePill");
    pill.hidden = !key;

    if (key) {
        $("modeLabel").textContent = MODES[key].label;
        input.placeholder = MODES[key].ph;

        if (MODES[key].file && !file) {
            fileInput.click();
        }
    } else {
        input.placeholder = "Message Nova…";
    }

    closeMenu();
    input.focus();
}

function setFile(selectedFile) {
    if (file && preview.querySelector("img, video")) {
        const oldUrl = preview.querySelector("img, video").src;

        if (oldUrl.startsWith("blob:")) {
            URL.revokeObjectURL(oldUrl);
        }
    }

    file = selectedFile;
    preview.innerHTML = "";
    preview.hidden = !selectedFile;

    if (!selectedFile) return;

    const url = URL.createObjectURL(selectedFile);

    const element = selectedFile.type.startsWith("video/")
        ? document.createElement("video")
        : new Image();

    element.src = url;

    if (element.tagName === "VIDEO") {
        element.muted = true;
        element.controls = true;
    }

    const removeButton = document.createElement("button");
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", "Remove file");

    removeButton.onclick = () => {
        setFile(null);
        fileInput.value = "";
    };

    preview.append(element, removeButton);
}

fileInput.addEventListener("change", () => {
    if (fileInput.files[0]) {
        setFile(fileInput.files[0]);
    }
});

/* ---------- drag and drop ---------- */

const dropzone = $("dropzone");

["dragenter", "dragover"].forEach((eventName) => {
    document.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone?.classList.add("drag");
    });
});

["dragleave", "drop"].forEach((eventName) => {
    document.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropzone?.classList.remove("drag");
    });
});

document.addEventListener("drop", (event) => {
    const selectedFile = event.dataTransfer.files[0];

    if (
        selectedFile &&
        /^(image|video)\//.test(selectedFile.type)
    ) {
        setFile(selectedFile);
    }
});

document.querySelectorAll("[data-mode]").forEach((element) => {
    element.addEventListener("click", () => {
        const key = element.dataset.mode;

        setMode(
            mode === key && element.closest(".tools")
                ? null
                : key
        );
    });
});

$("modeClear").onclick = () => setMode(null);

document.querySelectorAll("[data-quick]").forEach((element) => {
    element.addEventListener("click", () => {
        closeMenu();
        send(element.dataset.quick, true);
    });
});

/* ---------- API requests ---------- */

async function callApi(formData) {
    const response = await fetch(
        `${CONFIG.API_BASE}/api/chat`,
        {
            method: "POST",
            body: formData
        }
    );

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
}

async function checkHealth() {
    const response = await fetch(
        `${CONFIG.API_BASE}/api/health`,
        {
            cache: "no-store"
        }
    );

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
}

/* ---------- demo ---------- */

function demo(text, selectedMode) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                reply: selectedMode
                    ? `Demo: ${MODES[selectedMode].label} would run with "${text}".`
                    : `Demo reply to: ${text}`
            });
        }, 900);
    });
}

/* ---------- send message ---------- */

async function send(textOverride, quick = false) {
    const text = (textOverride ?? input.value).trim();

    if (busy || (!text && !file)) return;

    const selectedMode = mode;
    const selectedFile = file;

    const requirements = selectedMode
        ? MODES[selectedMode]?.file
        : null;

    if (requirements && !selectedFile) {
        addMessage(
            "ai",
            `Attach a ${requirements} file first.`,
            { error: true }
        );
        return;
    }

    if (
        requirements &&
        selectedFile &&
        !selectedFile.type.startsWith(`${requirements}/`)
    ) {
        addMessage(
            "ai",
            `This tool needs a ${requirements} file.`,
            { error: true }
        );
        return;
    }

    const userBubble = addMessage(
        "user",
        text || "(file attached)"
    );

    if (selectedFile) {
        const previewUrl = URL.createObjectURL(selectedFile);

        addMedia(
            userBubble,
            selectedFile.type.startsWith("video/")
                ? "video"
                : "image",
            previewUrl
        );

        userBubble.querySelector(".media a")?.remove();
    }

    const formData = new FormData();

    formData.append("message", text);

    if (selectedMode) {
        formData.append("mode", selectedMode);
    }

    if (selectedFile) {
        formData.append("file", selectedFile);
    }

    if (!quick) {
        input.value = "";
        autosize();
    }

    setFile(null);
    fileInput.value = "";
    setMode(null);

    busy = true;
    sendBtn.disabled = true;

    const typing = showTyping();

    try {
        const data = CONFIG.DEMO_MODE
            ? await demo(text, selectedMode)
            : await callApi(formData);

        typing.remove();

        const replyBubble = addMessage(
            "ai",
            data.reply || "Nova received an empty response."
        );

        if (data.media) {
            addMedia(
                replyBubble,
                data.media.type,
                data.media.url
            );
        }
    } catch (error) {
        typing.remove();

        addMessage(
            "ai",
            `Couldn't reach Nova's server. Please check the backend. (${error.message})`,
            { error: true }
        );
    } finally {
        busy = false;
        sendBtn.disabled = false;
        input.focus();
    }
}

/* ---------- input behaviour ---------- */

function autosize() {
    input.style.height = "auto";

    input.style.height =
        Math.min(input.scrollHeight, 160) + "px";
}

input.addEventListener("input", autosize);

input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        send();
    }
});

sendBtn.addEventListener("click", () => send());

/* ---------- sidebar ---------- */

const openMenu = () => {
    $("sidebar").classList.add("open");
    $("scrim").classList.add("show");
};

const closeMenu = () => {
    $("sidebar").classList.remove("open");
    $("scrim").classList.remove("show");
};

$("menuBtn").onclick = openMenu;
$("scrim").onclick = closeMenu;

$("newChat").onclick = () => {
    closeMenu();
    location.reload();
};

$("clearBtn").onclick = () => {
    if (confirm("Clear this chat?")) {
        location.reload();
    }
};

/* ---------- server status ---------- */

async function ping() {
    const dot = $("statusDot");
    const statusText = $("statusText");

    if (CONFIG.DEMO_MODE) {
        dot.className = "dot";
        statusText.textContent = "Demo mode";
        return;
    }

    try {
        await checkHealth();

        dot.className = "dot on";
        statusText.textContent = "Connected";
    } catch {
        dot.className = "dot off";
        statusText.textContent = "Server offline";
    }
}

ping();
setInterval(ping, 15000);
