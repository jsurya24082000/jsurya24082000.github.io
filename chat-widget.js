(function () {
  const script = document.currentScript;
  const API_URL = (script && script.dataset && script.dataset.apiUrl) || "http://localhost:8000/chat";
  const HEALTH_URL = API_URL.replace(/\/chat\/?$/, "/health");
  const HEALTH_TIMEOUT_MS = 15000;
  const CHAT_TIMEOUT_MS = 120000;
  const POLL_INTERVAL_MS = 3000;
  const MAX_HEALTH_ATTEMPTS = 30;

  let backendReadyPromise = null;

  const css = `
    #chat-widget-button {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 56px;
      height: 56px;
      background: #111;
      color: #fff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-family: sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      z-index: 9999;
    }
    #chat-widget-panel {
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 320px;
      height: 420px;
      background: #fff;
      border: 1px solid #ddd;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: none;
      flex-direction: column;
      z-index: 9999;
      font-family: sans-serif;
    }
    .chat-header {
      background: #111;
      color: #fff;
      padding: 12px 16px;
      border-radius: 8px 8px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: bold;
    }
    .chat-status {
      padding: 6px 12px;
      font-size: 12px;
      color: #555;
      background: #f9f9f9;
      border-bottom: 1px solid #ddd;
      text-align: center;
      display: none;
    }
    .chat-close {
      cursor: pointer;
    }
    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      color: #111;
    }
    .chat-message {
      margin-bottom: 10px;
      line-height: 1.4;
      padding: 8px 12px;
      border-radius: 12px;
      max-width: 85%;
      word-wrap: break-word;
      color: #111;
    }
    .chat-message.user {
      background: #e3f2fd;
      align-self: flex-end;
    }
    .chat-message.agent {
      background: #f5f5f5;
      align-self: flex-start;
    }
    .chat-input {
      display: flex;
      padding: 10px;
      border-top: 1px solid #ddd;
    }
    .chat-input input {
      flex: 1;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      color: #111;
    }
    .chat-input input::placeholder { color: #888; }
    .chat-input input:disabled,
    .chat-input button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .chat-input button {
      margin-left: 8px;
      padding: 10px 16px;
      background: #111;
      color: #fff;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
  `;

  const styleEl = document.createElement("style");
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  const widget = document.createElement("div");
  widget.innerHTML = `
    <div id="chat-widget-button">Chat</div>
    <div id="chat-widget-panel">
      <div class="chat-header">
        <span>Portfolio Assistant</span>
        <span class="chat-close">X</span>
      </div>
      <div class="chat-status" id="chat-status"></div>
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-input">
        <input type="text" id="chat-input" placeholder="Ask a question..." autocomplete="off">
        <button id="chat-send">Send</button>
      </div>
    </div>
  `;
  document.body.appendChild(widget);

  const button = document.getElementById("chat-widget-button");
  const panel = document.getElementById("chat-widget-panel");
  const closeBtn = document.querySelector(".chat-close");
  const messagesEl = document.getElementById("chat-messages");
  const inputEl = document.getElementById("chat-input");
  const sendBtn = document.getElementById("chat-send");
  const statusEl = document.getElementById("chat-status");

  function setStatus(text) {
    if (!text) {
      statusEl.style.display = "none";
      return;
    }
    statusEl.textContent = text;
    statusEl.style.display = "block";
  }

  function togglePanel() {
    const isOpen = panel.style.display === "flex";
    panel.style.display = isOpen ? "none" : "flex";
    if (!isOpen) {
      ensureAwake();
    }
  }

  function appendMessage(text, sender) {
    const msg = document.createElement("div");
    msg.className = "chat-message " + sender;
    msg.textContent = text;
    messagesEl.appendChild(msg);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, Object.assign({ signal: controller.signal }, options));
      return res;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function ensureAwake() {
    if (backendReadyPromise) return backendReadyPromise;
    setStatus("Waking up backend...");
    inputEl.disabled = true;
    sendBtn.disabled = true;

    backendReadyPromise = (async () => {
      for (let attempt = 1; attempt <= MAX_HEALTH_ATTEMPTS; attempt++) {
        try {
          const res = await fetchWithTimeout(HEALTH_URL, { method: "GET" }, HEALTH_TIMEOUT_MS);
          if (res.ok) return true;
        } catch (e) {}
        setStatus("Waking up backend... (attempt " + attempt + "/" + MAX_HEALTH_ATTEMPTS + ")");
        if (attempt < MAX_HEALTH_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        }
      }
      throw new Error("Backend did not wake up in time");
    })();

    backendReadyPromise
      .then(() => {
        setStatus("");
      })
      .catch((err) => {
        setStatus("Backend could not wake up. Please try again later.");
      })
      .finally(() => {
        inputEl.disabled = false;
        sendBtn.disabled = false;
        inputEl.focus();
      });

    return backendReadyPromise;
  }

  async function sendMessage() {
    const question = inputEl.value.trim();
    if (!question) return;

    try {
      await ensureAwake();
    } catch (err) {
      appendMessage("Backend is not ready yet. Please wait and try again.", "agent");
      return;
    }

    inputEl.value = "";
    appendMessage(question, "user");

    setStatus("");
    inputEl.disabled = true;
    sendBtn.disabled = true;

    try {
      const res = await fetchWithTimeout(
        API_URL,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        },
        CHAT_TIMEOUT_MS
      );
      if (!res.ok) throw new Error("Server error " + res.status);
      const data = await res.json();
      appendMessage(data.answer || "No answer", "agent");
    } catch (err) {
      appendMessage("Sorry, I could not reach the assistant. The backend may still be waking up. Wait a few seconds and try again.", "agent");
    } finally {
      inputEl.disabled = false;
      sendBtn.disabled = false;
      inputEl.focus();
    }
  }

  button.addEventListener("click", togglePanel);
  closeBtn.addEventListener("click", () => (panel.style.display = "none"));
  sendBtn.addEventListener("click", sendMessage);
  inputEl.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
  });
})();
