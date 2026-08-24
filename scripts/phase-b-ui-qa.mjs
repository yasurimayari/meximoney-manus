import { spawn } from "node:child_process";

const baseUrl = "http://127.0.0.1:3000";
const account = { name: "QA UI Fase B", email: "qa-phaseb-ui-meximoney-20260824@example.invalid", password: "FaseBUI#2026" };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function call(path, token, input) {
  const response = await fetch(`${baseUrl}/api/trpc/${path}?batch=1`, { method: "POST", headers: { "content-type": "application/json", ...(token ? { "X-Meximoney-Session": token } : {}) }, body: JSON.stringify({ 0: { json: input } }) });
  const payload = await response.json();
  if (!response.ok || payload[0]?.error) throw new Error(payload[0]?.error?.json?.message ?? `Error ${response.status}`);
  return payload[0].result.data.json;
}

let token;
try { token = (await call("auth.register", null, account)).sessionToken; } catch { token = (await call("auth.login", null, { email: account.email, password: account.password })).sessionToken; }
await call("finance.privacy.recordConsent", token, { accepted: true, policyVersion: "phase-b-ui-qa-v1" });
await call("finance.workspace.onboarding", token, { workspaceName: "Espacio QA UI Fase B", currency: "MXN", residenceCountry: "México", taxResidence: "México", taxRegime: "pfae_general", exchangeRatePolicy: "manual", humanReviewRequired: true, entities: [{ name: "YMC UI Fase B", shortCode: "YBUI", countryCode: "MX", legalForm: "pfae", status: "active", functionalCurrency: "MXN", taxRegime: "pfae_general", notes: null }] });

const chrome = spawn("chromium", ["--headless", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=9228", "--user-data-dir=/tmp/meximoney-phase-b-ui-qa", "about:blank"], { stdio: "ignore" });
try {
  let target;
  for (let attempt = 0; attempt < 25; attempt += 1) { try { target = (await (await fetch("http://127.0.0.1:9228/json")).json()).find(item => item.type === "page"); if (target?.webSocketDebuggerUrl) break; } catch {} await pause(200); }
  if (!target?.webSocketDebuggerUrl) throw new Error("No se pudo iniciar el navegador de QA.");
  const socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 1; const pending = new Map(); socket.onmessage = event => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } };
  const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = nextId++; pending.set(id, message => message.error ? reject(new Error(message.error.message)) : resolve(message.result)); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => (await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;
  const clickTab = async label => { const point = await evaluate(`(() => { const tab = Array.from(document.querySelectorAll('[data-slot="tabs-trigger"], [role="tab"]')).find(node => node.textContent?.trim() === ${JSON.stringify(label)}); if (!tab) return null; const r = tab.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`); if (!point) throw new Error(`No se encontró la pestaña ${label}.`); await cdp("Input.dispatchMouseEvent", { type: "mousePressed", x: point.x, y: point.y, button: "left", clickCount: 1 }); await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", x: point.x, y: point.y, button: "left", clickCount: 1 }); await pause(350); };
  await cdp("Network.enable"); await cdp("Network.setExtraHTTPHeaders", { headers: { "X-Meximoney-Session": token } }); await cdp("Page.addScriptToEvaluateOnNewDocument", { source: `sessionStorage.setItem("meximoney-local-session", ${JSON.stringify(token)});` });
  await cdp("Page.navigate", { url: `${baseUrl}/movimientos` });
  for (let attempt = 0; attempt < 30; attempt += 1) { if (await evaluate(`location.pathname === '/movimientos' && document.querySelector('h1')?.textContent?.includes('Movimientos')`)) break; await pause(250); }
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent?.includes('Importar CSV/Excel'))?.click(); true`); await pause(300);
  const importDialog = await evaluate(`document.body.textContent?.includes('El archivo se procesa localmente') && Boolean(document.querySelector('input[type="file"]'))`);
  await evaluate(`document.querySelector('[role="dialog"] button[aria-label="Close"]')?.click(); true`);
  await cdp("Page.navigate", { url: `${baseUrl}/planificacion` });
  for (let attempt = 0; attempt < 30; attempt += 1) { if (await evaluate(`location.pathname === '/planificacion' && document.querySelector('h1')?.textContent === 'Presupuesto mensual'`)) break; await pause(250); }
  await clickTab("Por pagar");
  const payablesTab = await evaluate(`document.querySelector('h1')?.textContent === 'Cuentas por pagar'`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent?.includes('Registrar CxP'))?.click(); true`); await pause(250);
  const payableForm = await evaluate(`Boolean(Array.from(document.querySelectorAll('label')).find(label => label.textContent?.trim() === 'Acreedor')) && Boolean(Array.from(document.querySelectorAll('label')).find(label => label.textContent?.trim() === 'Origen de la CxP'))`);
  await evaluate(`Array.from(document.querySelectorAll('[role="dialog"] input')).find(input => input.parentElement?.querySelector('label')?.textContent?.trim() === 'Acreedor')?.focus(); true`);
  const payableFocus = await evaluate(`document.activeElement?.tagName === 'INPUT'`);
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab" }); await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab" });
  const payableTab = await evaluate(`document.activeElement?.tagName === 'INPUT'`);
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" }); await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" }); await pause(300);
  await clickTab("Recurrentes");
  const recurringTab = await evaluate(`document.querySelector('h1')?.textContent === 'Plantillas recurrentes'`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent?.includes('Crear plantilla'))?.click(); true`); await pause(250);
  const templateForm = await evaluate(`document.body.textContent?.includes('No generan cargos ni movimientos por sí solas') && Boolean(Array.from(document.querySelectorAll('label')).find(label => label.textContent?.trim() === 'Nombre de plantilla'))`);
  await evaluate(`Array.from(document.querySelectorAll('[role="dialog"] input')).find(input => input.parentElement?.querySelector('label')?.textContent?.trim() === 'Nombre de plantilla')?.focus(); true`);
  const templateFocus = await evaluate(`document.activeElement?.tagName === 'INPUT'`);
  await cdp("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true }); await pause(300);
  const mobile = await evaluate(`({ width: document.documentElement.scrollWidth, viewport: window.innerWidth, heading: document.querySelector('h1')?.textContent })`);
  const report = { importDialog, payablesTab, payableForm, payableFocus, payableTab, recurringTab, templateForm, templateFocus, mobile: mobile.width <= mobile.viewport && mobile.heading === "Plantillas recurrentes" };
  if (!Object.values(report).every(Boolean)) throw new Error(`QA visual Fase B falló: ${JSON.stringify({ report, mobile, text: await evaluate('document.body.innerText.slice(0, 900)') })}`);
  console.log(JSON.stringify({ ...report, qaEmail: account.email })); socket.close();
} finally { chrome.kill("SIGTERM"); }
