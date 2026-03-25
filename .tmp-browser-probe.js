const FRONTEND_URL = "http://127.0.0.1:3000";
const BACKEND_URL = "http://localhost:8080";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });

    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);

      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);

        if (message.error) {
          pending.reject(new Error(message.error.message));
        } else {
          pending.resolve(message.result);
        }
        return;
      }

      const key = `${message.sessionId ?? ""}:${message.method}`;
      const callbacks = this.listeners.get(key) ?? [];
      for (const callback of callbacks) {
        callback(message.params ?? {});
      }
    });
  }

  on(method, sessionId, callback) {
    const key = `${sessionId ?? ""}:${method}`;
    const callbacks = this.listeners.get(key) ?? [];
    callbacks.push(callback);
    this.listeners.set(key, callbacks);
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) {
      payload.sessionId = sessionId;
    }

    const promise = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });

    this.ws.send(JSON.stringify(payload));
    return promise;
  }
}

async function getWsUrl() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch("http://127.0.0.1:9222/json/version");
      if (response.ok) {
        const data = await response.json();
        return data.webSocketDebuggerUrl;
      }
    } catch {}

    await sleep(500);
  }

  throw new Error("No fue posible conectarse al puerto CDP 9222.");
}

async function waitForLoad(client, sessionId, url) {
  await new Promise((resolve) => {
    client.on("Page.loadEventFired", sessionId, () => resolve());
    client.send("Page.navigate", { url }, sessionId).catch(() => resolve());
  });
}

async function evaluate(client, sessionId, expression, awaitPromise = true) {
  const result = await client.send(
    "Runtime.evaluate",
    {
      expression,
      awaitPromise,
      returnByValue: true,
    },
    sessionId
  );

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "Runtime.evaluate failed");
  }

  return result.result?.value;
}

async function main() {
  const wsUrl = await getWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();

  const createdTarget = await client.send("Target.createTarget", {
    url: "about:blank",
  });
  const attached = await client.send("Target.attachToTarget", {
    targetId: createdTarget.targetId,
    flatten: true,
  });
  const sessionId = attached.sessionId;

  const networkEvents = [];
  client.on("Network.responseReceived", sessionId, (params) => {
    networkEvents.push({
      type: "response",
      url: params.response?.url,
      status: params.response?.status,
      method: params.response?.requestHeadersText,
    });
  });
  client.on("Network.loadingFailed", sessionId, (params) => {
    networkEvents.push({
      type: "failed",
      url: params?.requestId,
      errorText: params?.errorText,
      canceled: params?.canceled,
    });
  });
  client.on("Network.requestWillBeSent", sessionId, (params) => {
    networkEvents.push({
      type: "request",
      url: params.request?.url,
      method: params.request?.method,
    });
  });

  await client.send("Page.enable", {}, sessionId);
  await client.send("Runtime.enable", {}, sessionId);
  await client.send("Network.enable", {}, sessionId);

  const results = {
    loginPageLoaded: false,
    loginAttempt: null,
    cookiesAfterLogin: [],
    dashboardNavigation: null,
    protectedGet: null,
    protectedPost: null,
    refreshCall: null,
    logoutCall: null,
    browserNetwork: [],
  };

  await waitForLoad(client, sessionId, `${FRONTEND_URL}/login`);
  await sleep(2000);
  results.loginPageLoaded = true;

  await evaluate(
    client,
    sessionId,
    `(() => {
      const email = document.querySelector('input[type="email"]');
      const password = document.querySelector('input[type="password"]');
      if (!email || !password) return false;
      const setValue = (element, value) => {
        const prototype = Object.getPrototypeOf(element);
        const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
          || Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
        descriptor.set.call(element, value);
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      };
      setValue(email, 'qa.browser@nexus.local');
      setValue(password, 'Password123!');
      const button = document.querySelector('button[type="submit"]');
      if (!button) return false;
      button.click();
      return true;
    })()`
  );

  await sleep(5000);

  results.loginAttempt = await evaluate(
    client,
    sessionId,
    `(() => {
      const alert = document.querySelector('[role="alert"]');
      return {
        url: window.location.href,
        title: document.title,
        alertText: alert ? alert.textContent.trim() : null,
        readableCookies: document.cookie,
      };
    })()`
  );

  const loginCookies = await client.send(
    "Network.getCookies",
    { urls: [FRONTEND_URL, BACKEND_URL] },
    sessionId
  );
  results.cookiesAfterLogin = loginCookies.cookies ?? [];

  await waitForLoad(client, sessionId, `${FRONTEND_URL}/dashboard`);
  await sleep(2000);
  results.dashboardNavigation = await evaluate(
    client,
    sessionId,
    `(() => ({
      url: window.location.href,
      title: document.title,
      bodySnippet: document.body.innerText.slice(0, 240)
    }))()`
  );

  results.protectedGet = await evaluate(
    client,
    sessionId,
    `fetch('${BACKEND_URL}/api/users/me', { credentials: 'include' })
      .then(async (response) => ({
        ok: response.ok,
        status: response.status,
        text: await response.text()
      }))
      .catch((error) => ({ error: String(error) }))`
  );

  results.protectedPost = await evaluate(
    client,
    sessionId,
    `(() => {
      const csrfMatch = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]+)/);
      const csrfToken = csrfMatch ? decodeURIComponent(csrfMatch[1]) : '';
      return fetch('${BACKEND_URL}/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {},
      })
        .then(async (response) => ({
          ok: response.ok,
          status: response.status,
          text: await response.text(),
          sentCsrf: Boolean(csrfToken),
        }))
        .catch((error) => ({ error: String(error), sentCsrf: Boolean(csrfToken) }));
    })()`
  );

  results.refreshCall = await evaluate(
    client,
    sessionId,
    `fetch('${BACKEND_URL}/api/auth/refresh', {
      method: 'POST',
      credentials: 'include'
    })
      .then(async (response) => ({
        ok: response.ok,
        status: response.status,
        text: await response.text()
      }))
      .catch((error) => ({ error: String(error) }))`
  );

  results.logoutCall = await evaluate(
    client,
    sessionId,
    `fetch('${BACKEND_URL}/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    })
      .then(async (response) => ({
        ok: response.ok,
        status: response.status,
        text: await response.text()
      }))
      .catch((error) => ({ error: String(error) }))`
  );

  results.browserNetwork = networkEvents
    .filter((event) => {
      if (!event.url) return false;
      return String(event.url).includes("localhost:8080") || String(event.url).includes("127.0.0.1:3000");
    })
    .slice(-60);

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
