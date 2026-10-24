
/* ===== Nova AI Frontend ===== */

const CONFIG = {
    // Uses the same Render domain as the frontend and FastAPI backend.
    API_BASE: window.location.origin,
    DEMO_MODE: false
};

const MODES = {
    "image": {
        label: "Generate image",
        ph: "Describe the image you want…"
    },
    "video": {
        label: "Generate video",
        ph: "Describe the video you want…"
    },
    "music": {
        label: "Generate music",
        ph: "Describe the music, e.g. calm lo-fi piano…"
    },
    "edit-image": {
        label: "Edit image",
        ph: "What should change in the photo?",
        file: "image"
    },
    "animate": {
        label: "Animate photo",
        ph: "What movement should I add?",
        file: "image"
    },
    "edit-video": {
        label: "Edit video",
        ph: "What should change in the video?",
        file: "video"
    },
    "weather": {
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

/* ---------- Helpers ---------- */

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

    const mediaUrl = resolveUrl(url);
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

    element.src = mediaUrl;

    const download = document.createElement("a");
    download.href = mediaUrl;
    download.download = "";
    download.textContent = "Download";
    download.target = "_blank";
    download.rel = "noopener";

    wrap.append(element, download);
    bubble.append(wrap);

    element.addEventListener("load", scrollDown);
    element.addEventListener("loadeddata", scrollDown);

    element.addEventListener("error", () => {
        console.error("Failed to load generated media:", mediaUrl);
    });
}

function resolveUrl(url) {
    if (!url) return "";

    // Keep absolute URLs and local preview URLs unchanged.
    if (/^(https?:|blob:|data:)/i.test(url)) {
        return url;
    }

    // Correctly handles paths such as /files/generated.wav.
    return new URL(url, CONFIG.API_BASE).href;
}

function showTyping() {
    const bubble = addMessage("ai", "");

    bubble.innerHTML =
        '<div class="typing"><i></i><i></i><i></i></div>';

    return bubble.parentElement;
}

function showError(message) {
    addMessage("ai", message, { error: true });
}

/* ---------- Modes and Files ---------- */

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

    if (pill) {
        pill.hidden = !key;
    }

    if (key && MODES[key]) {
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
    // Release an existing preview URL if present.
    if (preview.dataset.objectUrl) {
        URL.revokeObjectURL(preview.dataset.objectUrl);
        delete preview.dataset.objectUrl;
    }

    file = selectedFile;

    preview.innerHTML = "";
    preview.hidden = !selectedFile;

    if (!selectedFile) return;

    const url = URL.createObjectURL(selectedFile);
    preview.dataset.objectUrl = url;

    let element;

    if (selectedFile.type.startsWith("video/")) {
        element = document.createElement("video");
        element.muted = true;
        element.playsInline = true;
    } else {
        element = new Image();
    }

    element.src = url;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "×";
    removeButton.setAttribute("aria-label", "Remove file");

    removeButton.onclick = () => {
        setFile(null);
        fileInput.value = "";
    };

    preview.append(element, removeButton);
}

fileInput.addEventListener("change", () => {
    const selectedFile = fileInput.files?.[0];

    if (selectedFile) {
        setFile(selectedFile);
    }
});

/* ---------- Drag and Drop ---------- */

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
    const selectedFile = event.dataTransfer?.files?.[0];

    if (
        selectedFile &&
        /^(image|video)\//i.test(selectedFile.type)
    ) {
        setFile(selectedFile);
    }
});

/* ---------- Mode Buttons ---------- */

document.querySelectorAll("[data-mode]").forEach((element) => {
    element.addEventListener("click", () => {
        const clickedMode = element.dataset.mode;

        setMode(
            mode === clickedMode && element.closest(".tools")
                ? null
                : clickedMode
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

/* ---------- API Requests ---------- */

async function callApi(formData) {
    const response = await fetch(
        `${CONFIG.API_BASE}/api/chat`,
        {
            method: "POST",
            body: formData
        }
    );

    if (!response.ok) {
        let details = "";

        try {
            details = await response.text();
        } catch {
            // Response body unavailable.
        }

        throw new Error(
            `HTTP ${response.status}` +
            (details ? `: ${details.slice(0, 250)}` : "")
        );
    }

    return response.json();
}

/* ---------- Sending Messages ---------- */

async function send(textOverride, quick = false) {
    const text = (textOverride ?? input.value).trim();

    if (busy || (!text && !file)) return;

    const selectedMode = mode;
    const selectedFile = file;
    const modeConfig = selectedMode ? MODES[selectedMode] : null;

    if (!quick && modeConfig?.file && !selectedFile) {
        showError(
            `Please attach a ${modeConfig.file} first, then describe the change.`
        );
        return;
    }

    if (modeConfig?.file && selectedFile) {
        const requiredType = modeConfig.file;

        if (!selectedFile.type.startsWith(`${requiredType}/`)) {
            showError(`This tool needs a ${requiredType} file.`);
            return;
        }
    }

    // Display the user's message.
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

        // The preview is not a generated downloadable file.
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
        let data;

        if (CONFIG.DEMO_MODE) {
            data = await demo(text, selectedMode);
        } else {
            data = await callApi(formData);
        }

        typing.remove();

        const responseBubble = addMessage(
            "ai",
            data.reply || "Nova finished processing your request."
        );

        if (data.media) {
            addMedia(
                responseBubble,
                data.media.type,
                data.media.url
            );
        }
    } catch (error) {
        console.error("Nova API error:", error);

        typing.remove();

        showError(
            `Nova's request failed: ${error.message}. ` +
            "Check the Render logs for the /api/chat request."
        );
    } finally {
        busy = false;
        sendBtn.disabled = false;
        input.focus();
    }
}

/* ---------- Demo Mode ---------- */

function demo(text, selectedMode) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                reply: selectedMode
                    ? `Demo: "${MODES[selectedMode].label}" would run with "${text}".`
                    : `Demo reply to: ${text}`
            });
        }, 900);
    });
}

/* ---------- Input Behaviour ---------- */

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

/* ---------- Sidebar ---------- */

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

/* ---------- Backend Status ---------- */

async function ping() {
    const dot = $("statusDot");
    const statusText = $("statusText");

    if (CONFIG.DEMO_MODE) {
        dot.className = "dot";
        statusText.textContent = "Demo mode";
        return;
    }

    try {
        const response = await fetch(
            `${CONFIG.API_BASE}/api/health`,
            { cache: "no-store" }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.ok !== true) {
            throw new Error("Health check did not return ok");
        }

        dot.className = "dot on";
        statusText.textContent = "Connected";
    } catch (error) {
        console.error("Nova health check failed:", error);

        dot.className = "dot off";
        statusText.textContent = "Server offline";
    }
}

// Check immediately, then periodically.
ping();
setInterval(ping, 15000);
