const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable, Writable } = require("node:stream");

const { createHandler, SESSION_COOKIE } = require("../server");

async function invoke(handler, { method = "GET", url = "/", headers = {}, body = "" } = {}) {
  const req = Readable.from(body ? [body] : []);
  req.method = method;
  req.url = url;
  req.headers = headers;

  const chunks = [];
  const res = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(Buffer.from(chunk));
      callback();
    }
  });

  res.statusCode = 200;
  res.headers = {};
  res.writeHead = (statusCode, headerMap) => {
    res.statusCode = statusCode;
    res.headers = { ...res.headers, ...headerMap };
    return res;
  };
  res.end = (chunk) => {
    if (chunk) {
      chunks.push(Buffer.from(chunk));
    }
    res.finished = true;
    return res;
  };

  await handler(req, res);

  return {
    status: res.statusCode,
    headers: res.headers,
    body: Buffer.concat(chunks).toString("utf8")
  };
}

test("root shows password page when unauthenticated", async () => {
  const handler = createHandler({ password: "secret-pass" });
  const response = await invoke(handler, { url: "/" });

  assert.equal(response.status, 200);
  assert.match(response.body, /오늘의 할일 체크리스트/);
});

test("protected route redirects to root when unauthenticated", async () => {
  const handler = createHandler({ password: "secret-pass" });
  const response = await invoke(handler, { url: "/app" });
  assert.equal(response.status, 302);
  assert.equal(response.headers.Location, "/");
});

test("login issues a session cookie and allows access to app page", async () => {
  const handler = createHandler({ password: "secret-pass" });
  const loginResponse = await invoke(handler, {
    method: "POST",
    url: "/api/login",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "secret-pass" })
  });

  assert.equal(loginResponse.status, 200);
  const cookie = loginResponse.headers["Set-Cookie"];
  assert.match(cookie, new RegExp(SESSION_COOKIE));

  const appResponse = await invoke(handler, {
    url: "/app",
    headers: { cookie }
  });

  assert.equal(appResponse.status, 200);
  assert.match(appResponse.body, /오늘의 할일/);
  assert.match(appResponse.body, /추가/);
});

test("wrong password is rejected", async () => {
  const handler = createHandler({ password: "secret-pass" });
  const response = await invoke(handler, {
    method: "POST",
    url: "/api/login",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ password: "wrong-pass" })
  });
  const json = JSON.parse(response.body);

  assert.equal(response.status, 401);
  assert.equal(json.message, "비밀번호가 올바르지 않습니다.");
});
