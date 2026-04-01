const http = require("node:http");
const crypto = require("node:crypto");
const { URL } = require("node:url");

const DEFAULT_PORT = Number(process.env.PORT || 3344);
const DEFAULT_PASSWORD = process.env.ACCESS_PASSWORD || "ideabank2026";
const SESSION_COOKIE = "ideabank_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const sessions = new Set();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseCookies(header) {
  if (!header) {
    return {};
  }

  return header.split(";").reduce((cookies, part) => {
    const [rawKey, ...rawValue] = part.trim().split("=");
    if (!rawKey) {
      return cookies;
    }

    cookies[rawKey] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        reject(new Error("Payload too large"));
      }
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function json(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers
  });
  res.end(JSON.stringify(payload));
}

function html(res, statusCode, content, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers
  });
  res.end(content);
}

function redirect(res, location, headers = {}) {
  res.writeHead(302, {
    Location: location,
    "Cache-Control": "no-store",
    ...headers
  });
  res.end();
}

function isAuthenticated(req) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE] && sessions.has(cookies[SESSION_COOKIE]);
}

function createSession() {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.add(token);
  return token;
}

function clearSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[SESSION_COOKIE]) {
    sessions.delete(cookies[SESSION_COOKIE]);
  }
}

function loginPage(message = "") {
  const escapedMessage = message ? `<p class="message">${escapeHtml(message)}</p>` : "";
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>IdeaBank | Access</title>
    <style>
      :root {
        --bg-1: #f6efe6;
        --bg-2: #fffaf3;
        --card: rgba(255, 252, 247, 0.9);
        --text: #2f241d;
        --muted: #6b5c51;
        --accent: #c6632f;
        --accent-dark: #8e3e19;
        --ring: rgba(198, 99, 47, 0.25);
        --shadow: 0 24px 60px rgba(75, 40, 18, 0.14);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        font-family: "Pretendard", "Apple SD Gothic Neo", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(232, 170, 119, 0.35), transparent 34%),
          radial-gradient(circle at bottom right, rgba(124, 173, 134, 0.24), transparent 32%),
          linear-gradient(135deg, var(--bg-1), var(--bg-2));
      }
      .shell {
        width: min(100%, 430px);
        padding: 34px;
        border: 1px solid rgba(143, 103, 77, 0.12);
        border-radius: 28px;
        background: var(--card);
        box-shadow: var(--shadow);
        backdrop-filter: blur(10px);
      }
      .eyebrow {
        display: inline-flex;
        padding: 7px 12px;
        border-radius: 999px;
        background: rgba(198, 99, 47, 0.1);
        color: var(--accent-dark);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1 {
        margin: 18px 0 12px;
        font-size: clamp(2rem, 6vw, 2.7rem);
        line-height: 1;
      }
      p {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }
      form {
        display: grid;
        gap: 14px;
        margin-top: 26px;
      }
      label {
        font-size: 14px;
        font-weight: 700;
      }
      input {
        width: 100%;
        padding: 15px 16px;
        border: 1px solid rgba(143, 103, 77, 0.2);
        border-radius: 16px;
        font: inherit;
        background: rgba(255, 255, 255, 0.75);
        outline: none;
        transition: box-shadow 0.2s, border-color 0.2s;
      }
      input:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 5px var(--ring);
      }
      button {
        border: 0;
        border-radius: 16px;
        padding: 15px 18px;
        font: inherit;
        font-weight: 700;
        color: white;
        background: linear-gradient(135deg, var(--accent), var(--accent-dark));
        cursor: pointer;
      }
      .message {
        margin-top: 18px;
        padding: 12px 14px;
        border-radius: 14px;
        background: rgba(198, 99, 47, 0.1);
        color: var(--accent-dark);
        font-size: 14px;
      }
      .footer {
        margin-top: 18px;
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <span class="eyebrow">IdeaBank Access</span>
      <h1>오늘의 할일 체크리스트</h1>
      <p>비밀번호를 입력하면 오늘 해야 할 일을 빠르게 정리하고 완료 상태를 관리할 수 있습니다.</p>
      ${escapedMessage}
      <form id="login-form">
        <div>
          <label for="password">접속 비밀번호</label>
          <input id="password" name="password" type="password" autocomplete="current-password" placeholder="비밀번호 입력" required />
        </div>
        <button type="submit">체크리스트 열기</button>
      </form>
      <p class="footer">기본 비밀번호는 환경변수 <code>ACCESS_PASSWORD</code>로 바꿀 수 있습니다.</p>
    </main>
    <script>
      const form = document.getElementById("login-form");
      const passwordInput = document.getElementById("password");
      passwordInput.focus();
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const response = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: passwordInput.value })
        });

        if (response.ok) {
          window.location.href = "/app";
          return;
        }

        const data = await response.json().catch(() => ({ message: "인증에 실패했습니다." }));
        window.location.href = "/?message=" + encodeURIComponent(data.message || "인증에 실패했습니다.");
      });
    </script>
  </body>
</html>`;
}

function appPage() {
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>IdeaBank | Checklist</title>
    <style>
      :root {
        --bg: #f4f1ea;
        --panel: rgba(255, 255, 255, 0.8);
        --text: #1f1d1a;
        --muted: #6d655e;
        --line: rgba(64, 55, 46, 0.12);
        --accent: #1f7a5d;
        --accent-soft: rgba(31, 122, 93, 0.12);
        --danger: #b54831;
        --shadow: 0 20px 48px rgba(31, 29, 26, 0.12);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Pretendard", "Apple SD Gothic Neo", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top right, rgba(146, 199, 174, 0.35), transparent 28%),
          radial-gradient(circle at bottom left, rgba(255, 183, 122, 0.28), transparent 32%),
          linear-gradient(180deg, #faf7f1, var(--bg));
      }
      .layout {
        width: min(100%, 840px);
        margin: 0 auto;
        padding: 28px 20px 40px;
      }
      .hero {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
        margin-bottom: 24px;
      }
      .hero h1 {
        margin: 0;
        font-size: clamp(2rem, 6vw, 3.4rem);
        line-height: 0.95;
        letter-spacing: -0.04em;
      }
      .hero p {
        margin: 12px 0 0;
        color: var(--muted);
        line-height: 1.6;
      }
      .ghost {
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.55);
        color: var(--text);
        border-radius: 999px;
        padding: 12px 16px;
        font: inherit;
        cursor: pointer;
      }
      .card {
        background: var(--panel);
        border: 1px solid rgba(255, 255, 255, 0.55);
        box-shadow: var(--shadow);
        border-radius: 28px;
        padding: 22px;
        backdrop-filter: blur(12px);
      }
      form {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 12px;
      }
      input {
        width: 100%;
        padding: 16px 18px;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.8);
        font: inherit;
      }
      button.primary {
        border: 0;
        border-radius: 18px;
        padding: 16px 20px;
        font: inherit;
        font-weight: 700;
        color: white;
        background: linear-gradient(135deg, #1f7a5d, #15523f);
        cursor: pointer;
      }
      .meta {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        margin: 18px 0;
        color: var(--muted);
        font-size: 14px;
      }
      ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 10px;
      }
      .item {
        display: grid;
        grid-template-columns: auto 1fr auto;
        gap: 14px;
        align-items: center;
        padding: 16px 18px;
        border-radius: 20px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.7);
      }
      .item.done {
        background: var(--accent-soft);
      }
      .item.done .text {
        text-decoration: line-through;
        color: #557668;
      }
      .check {
        width: 22px;
        height: 22px;
        accent-color: var(--accent);
      }
      .text {
        font-size: 16px;
        word-break: break-word;
      }
      .delete {
        border: 0;
        background: transparent;
        color: var(--danger);
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }
      .empty {
        padding: 28px;
        text-align: center;
        color: var(--muted);
        border: 1px dashed var(--line);
        border-radius: 20px;
        background: rgba(255, 255, 255, 0.45);
      }
      .error {
        margin-top: 12px;
        color: var(--danger);
        font-size: 14px;
      }
      @media (max-width: 640px) {
        .hero {
          flex-direction: column;
        }
        form {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="layout">
      <section class="hero">
        <div>
          <h1>오늘의 할일</h1>
          <p>추가, 완료, 삭제만 남긴 단순한 체크리스트입니다. 데이터는 현재 브라우저에 저장됩니다.</p>
        </div>
        <button class="ghost" id="logout-button" type="button">잠금</button>
      </section>

      <section class="card">
        <form id="task-form">
          <input id="task-input" maxlength="120" placeholder="예: 배포 체크, 회의 준비, 회고 작성" aria-label="새 할일" />
          <button class="primary" type="submit">추가</button>
        </form>
        <p class="error" id="error-message" hidden></p>
        <div class="meta">
          <span id="remaining-count">남은 할일 0개</span>
          <span id="completed-count">완료 0개</span>
        </div>
        <div id="task-container"></div>
      </section>
    </main>

    <script>
      const STORAGE_KEY = "ideabank-today-checklist";
      const taskForm = document.getElementById("task-form");
      const taskInput = document.getElementById("task-input");
      const taskContainer = document.getElementById("task-container");
      const remainingCount = document.getElementById("remaining-count");
      const completedCount = document.getElementById("completed-count");
      const errorMessage = document.getElementById("error-message");
      const logoutButton = document.getElementById("logout-button");

      let items = loadItems();

      function loadItems() {
        try {
          const saved = localStorage.getItem(STORAGE_KEY);
          return saved ? JSON.parse(saved) : [];
        } catch {
          return [];
        }
      }

      function saveItems() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      }

      function sanitize(value) {
        return String(value || "").replace(/\\s+/g, " ").trim().slice(0, 120);
      }

      function setError(message) {
        errorMessage.hidden = !message;
        errorMessage.textContent = message || "";
      }

      function render() {
        const remaining = items.filter((item) => !item.completed).length;
        const completed = items.length - remaining;

        remainingCount.textContent = "남은 할일 " + remaining + "개";
        completedCount.textContent = "완료 " + completed + "개";

        if (items.length === 0) {
          taskContainer.innerHTML = '<div class="empty">아직 등록된 할일이 없습니다. 가장 먼저 끝낼 일을 적어보세요.</div>';
          return;
        }

        const list = document.createElement("ul");
        items.forEach((item) => {
          const row = document.createElement("li");
          row.className = "item" + (item.completed ? " done" : "");

          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.className = "check";
          checkbox.checked = Boolean(item.completed);
          checkbox.setAttribute("aria-label", item.text + " 완료 여부");
          checkbox.addEventListener("change", () => {
            items = items.map((candidate) => candidate.id === item.id ? { ...candidate, completed: !candidate.completed } : candidate);
            saveItems();
            render();
          });

          const text = document.createElement("span");
          text.className = "text";
          text.textContent = item.text;

          const removeButton = document.createElement("button");
          removeButton.type = "button";
          removeButton.className = "delete";
          removeButton.textContent = "삭제";
          removeButton.addEventListener("click", () => {
            items = items.filter((candidate) => candidate.id !== item.id);
            saveItems();
            render();
          });

          row.appendChild(checkbox);
          row.appendChild(text);
          row.appendChild(removeButton);
          list.appendChild(row);
        });

        taskContainer.replaceChildren(list);
      }

      taskForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const text = sanitize(taskInput.value);
        if (!text) {
          setError("할일을 한 글자 이상 입력해 주세요.");
          taskInput.focus();
          return;
        }

        setError("");
        items = [
          {
            id: "task-" + Date.now() + "-" + Math.random().toString(16).slice(2, 8),
            text,
            completed: false,
            createdAt: new Date().toISOString()
          },
          ...items
        ];
        saveItems();
        render();
        taskForm.reset();
        taskInput.focus();
      });

      logoutButton.addEventListener("click", async () => {
        await fetch("/api/logout", { method: "POST" });
        window.location.href = "/";
      });

      render();
      taskInput.focus();
    </script>
  </body>
</html>`;
}

function createHandler(options = {}) {
  const password = options.password || DEFAULT_PASSWORD;

  return async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const authenticated = isAuthenticated(req);

    if (req.method === "GET" && url.pathname === "/") {
      if (authenticated) {
        redirect(res, "/app");
        return;
      }

      html(res, 200, loginPage(url.searchParams.get("message") || ""));
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/login") {
      const bodyText = await readBody(req).catch(() => "");
      let payload = {};

      try {
        payload = bodyText ? JSON.parse(bodyText) : {};
      } catch {
        json(res, 400, { message: "잘못된 요청입니다." });
        return;
      }

      if (String(payload.password || "") !== password) {
        json(res, 401, { message: "비밀번호가 올바르지 않습니다." });
        return;
      }

      const token = createSession();
      json(res, 200, { ok: true }, {
        "Set-Cookie": `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${SESSION_MAX_AGE}; SameSite=Lax`
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/logout") {
      clearSession(req);
      json(res, 200, { ok: true }, {
        "Set-Cookie": `${SESSION_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/app") {
      if (!authenticated) {
        redirect(res, "/");
        return;
      }

      html(res, 200, appPage());
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/session") {
      if (!authenticated) {
        json(res, 401, { authenticated: false });
        return;
      }

      json(res, 200, { authenticated: true });
      return;
    }

    if (!authenticated) {
      redirect(res, "/");
      return;
    }

    html(res, 404, "<h1>Not Found</h1>");
  };
}

function createServer(options = {}) {
  return http.createServer(createHandler(options));
}

if (require.main === module) {
  createServer().listen(DEFAULT_PORT, () => {
    console.log(`IdeaBank checklist server running on http://localhost:${DEFAULT_PORT}`);
  });
}

module.exports = {
  createHandler,
  createServer,
  SESSION_COOKIE
};
