import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = "http://127.0.0.1:3000";
const debugPort = 9231;
const email = "qa-mobile-meximoney-20260823@example.invalid";
const password = "MovilSegura#2026";
const outputDirectory = "/home/ubuntu/qa-mobile-meximoney";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForDebugger() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (response.ok) return response.json();
    } catch {}
    await sleep(250);
  }
  throw new Error("No se pudo iniciar el depurador de Chromium");
}

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  const loginResponse = await fetch(`${baseUrl}/api/trpc/auth.login?batch=1`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ "0": { json: { email, password } } }),
  });
  const loginPayload = await loginResponse.json();
  const sessionToken = loginPayload[0]?.result?.data?.json?.sessionToken;
  if (!sessionToken) throw new Error("No se obtuvo una sesión local para la prueba móvil");
  const chromium = spawn("/usr/bin/chromium", [
    "--headless=new",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${outputDirectory}/profile`,
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "about:blank",
  ], { stdio: "ignore" });

  try {
    const debuggerInfo = await waitForDebugger();
    const socket = new WebSocket(debuggerInfo.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.onopen = resolve;
      socket.onerror = reject;
    });

    let requestId = 0;
    const pending = new Map();
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        pending.get(message.id)(message);
        pending.delete(message.id);
      }
    };
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
      const id = ++requestId;
      pending.set(id, message => message.error ? reject(new Error(message.error.message)) : resolve(message.result));
      socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
    const target = await send("Target.createTarget", { url: "about:blank" });
    const attached = await send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
    const sessionId = attached.sessionId;
    await send("Page.enable", {}, sessionId);
    await send("Network.setCookie", { name: "app_session_id", value: sessionToken, url: baseUrl, httpOnly: true, secure: false, sameSite: "Lax", path: "/" }, sessionId);
    await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true }, sessionId);

    const evaluate = async expression => {
      const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId);
      return result.result.value;
    };
    const navigate = async path => {
      await send("Page.navigate", { url: `${baseUrl}${path}` }, sessionId);
      await sleep(900);
    };

    await navigate("/");
    const registration = await evaluate("document.body.innerText.includes('Panel')");

    const routes = ["/", "/movimientos", "/planificacion", "/calidad", "/analitica", "/asistente"];
    const reports = [];
    for (const path of routes) {
      await navigate(path);
      const report = await evaluate(`({
        path: location.pathname,
        viewportWidth: window.innerWidth,
        contentWidth: document.documentElement.scrollWidth,
        hasPrivateNavigation: Boolean(document.querySelector('[data-slot="sidebar-wrapper"]')),
        title: document.querySelector('h1')?.textContent?.trim() ?? null,
        tabs: [...document.querySelectorAll('[data-slot="tabs"], [data-slot="tabs-list"], [data-slot="tabs-trigger"]')].map(element => { const rect = element.getBoundingClientRect(); const style = getComputedStyle(element); return { slot: element.getAttribute('data-slot'), text: element.textContent?.trim(), className: element.className, left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width), scrollWidth: element.scrollWidth, overflowX: style.overflowX }; }),
        internalOverflow: [...document.querySelectorAll('*')].filter(element => element.clientWidth > 0 && element.scrollWidth > element.clientWidth + 1).map(element => ({ tag: element.tagName, className: element.className, text: element.textContent?.trim().slice(0, 80), clientWidth: element.clientWidth, scrollWidth: element.scrollWidth })).sort((a, b) => (b.scrollWidth - b.clientWidth) - (a.scrollWidth - a.clientWidth)).slice(0, 20),
        overflowElements: [...document.querySelectorAll('*')].filter(element => {
          const rect = element.getBoundingClientRect();
          return (rect.right > window.innerWidth + 1 || rect.left < -1) && !element.closest('.planning-tabs') && !element.classList.contains('cursor-col-resize');
        }).slice(0, 8).map(element => ({ tag: element.tagName, className: element.className, width: Math.round(element.getBoundingClientRect().width) }))
      })`);
      const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }, sessionId);
      await writeFile(`${outputDirectory}${path === "/" ? "/panel" : path}.png`, Buffer.from(screenshot.data, "base64"));
      reports.push(report);
    }

    await navigate("/movimientos");
    const validationBeforeTab = await evaluate(`new Promise(resolve => {
      const trigger = [...document.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Nuevo registro');
      trigger?.click();
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const form = document.querySelector('[data-slot="dialog-content"] form');
        form?.requestSubmit();
        const invalidInput = document.querySelector('input:invalid');
        resolve({
          dialogOpened: Boolean(document.querySelector('[data-slot="dialog-content"]')),
          formFound: Boolean(form),
          invalidFieldPresent: Boolean(invalidInput),
          invalidFieldFocused: document.activeElement === invalidInput,
          invalidFieldType: invalidInput?.getAttribute('type') ?? null,
        });
      }));
    })`);
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }, sessionId);
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 }, sessionId);
    const validationAfterTab = await evaluate(`({
      activeElement: document.activeElement?.tagName ?? null,
      activeElementType: document.activeElement?.getAttribute('type') ?? null,
      activeElementInDialog: Boolean(document.activeElement?.closest('[data-slot="dialog-content"]')),
      hasVisibleFocusStyle: document.activeElement?.matches(':focus-visible') ?? false,
    })`);
    const validation = { ...validationBeforeTab, ...validationAfterTab };

    const result = { registration, routes: reports, validation };
    await writeFile(`${outputDirectory}/results.json`, JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
    socket.close();
  } finally {
    chromium.kill("SIGTERM");
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
