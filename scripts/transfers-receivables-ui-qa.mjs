import { spawn } from "node:child_process";

const baseUrl = "http://127.0.0.1:3000";
const account = { name: "QA UI Traspasos CxC", email: "qa-ui-transfers-receivables-meximoney-20260824@example.invalid", password: "UITraspasosCxC#2026" };
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

async function call(path, token, input) {
  const response = await fetch(`${baseUrl}/api/trpc/${path}?batch=1`, { method: "POST", headers: { "content-type": "application/json", ...(token ? { "X-Meximoney-Session": token } : {}) }, body: JSON.stringify({ 0: { json: input } }) });
  const payload = await response.json();
  if (!response.ok || payload[0]?.error) throw new Error(payload[0]?.error?.json?.message ?? `Error ${response.status}`);
  return payload[0].result.data.json;
}

async function query(path, token) {
  const response = await fetch(`${baseUrl}/api/trpc/${path}?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: null } }))}`, { headers: { "X-Meximoney-Session": token } });
  const payload = await response.json();
  if (!response.ok || payload[0]?.error) throw new Error(payload[0]?.error?.json?.message ?? `Error ${response.status}`);
  return payload[0].result.data.json;
}

let token;
try { token = (await call("auth.register", null, account)).sessionToken; } catch { token = (await call("auth.login", null, { email: account.email, password: account.password })).sessionToken; }
await call("finance.privacy.recordConsent", token, { accepted: true, policyVersion: "transfers-receivables-ui-qa-v1" });
await call("finance.workspace.onboarding", token, { workspaceName: "Espacio QA UI Traspasos", currency: "MXN", residenceCountry: "México", taxResidence: "México", taxRegime: "pfae_general", exchangeRatePolicy: "manual", humanReviewRequired: true, entities: [{ name: "YMC UI QA", shortCode: "YUI", countryCode: "MX", legalForm: "pfae", status: "active", functionalCurrency: "MXN", taxRegime: "pfae_general", notes: null }, { name: "ELM UI QA", shortCode: "EUI", countryCode: "MX", legalForm: "sa_de_cv", status: "active", functionalCurrency: "MXN", taxRegime: "corporate", notes: null }] });
await call("finance.accounts.save", token, { name: "Santander UI QA", type: "bank", scope: "personal", entityId: null, projectId: null, currentValueCents: 300000, currency: "MXN", isLiquid: true, valuationDate: Date.now(), status: "active", notes: null });
await call("finance.accounts.save", token, { name: "Inbursa UI QA", type: "bank", scope: "personal", entityId: null, projectId: null, currentValueCents: 50000, currency: "MXN", isLiquid: true, valuationDate: Date.now(), status: "active", notes: null });
const workspace = await query("finance.workspace.get", token);
const santanderId = workspace.accounts.find(item => item.name === "Santander UI QA")?.id;
const inbursaId = workspace.accounts.find(item => item.name === "Inbursa UI QA")?.id;
if (!santanderId || !inbursaId) throw new Error("La QA no pudo localizar sus cuentas técnicas.");

const chrome = spawn("chromium", ["--headless", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=9224", "--user-data-dir=/tmp/meximoney-transfers-receivables-ui-qa", "about:blank"], { stdio: "ignore" });
try {
  let target;
  for (let attempt = 0; attempt < 25; attempt += 1) { try { target = (await (await fetch("http://127.0.0.1:9224/json")).json()).find(item => item.type === "page"); if (target?.webSocketDebuggerUrl) break; } catch {} await pause(200); }
  if (!target?.webSocketDebuggerUrl) throw new Error("No se pudo iniciar el navegador de QA.");
  const socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 1; const pending = new Map(); socket.onmessage = event => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } };
  const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = nextId++; pending.set(id, message => message.error ? reject(new Error(message.error.message)) : resolve(message.result)); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => (await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;
  const setValue = async (label, value) => evaluate(`(() => { const label = Array.from(document.querySelectorAll('label')).find(node => node.textContent?.trim() === ${JSON.stringify(label)}); const field = label?.parentElement?.querySelector('input, select, textarea'); if (!field) return false; const setter = Object.getOwnPropertyDescriptor(field.__proto__, 'value')?.set; setter?.call(field, ${JSON.stringify(value)}); field.dispatchEvent(new Event('input', { bubbles: true })); field.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  await cdp("Network.enable");
  await cdp("Network.setExtraHTTPHeaders", { headers: { "X-Meximoney-Session": token } });
  await cdp("Page.addScriptToEvaluateOnNewDocument", { source: `sessionStorage.setItem("meximoney-local-session", ${JSON.stringify(token)});` });
  await cdp("Page.navigate", { url: `${baseUrl}/movimientos` });
  for (let attempt = 0; attempt < 30; attempt += 1) { if (await evaluate(`location.pathname === '/movimientos' && document.querySelector('h1')?.textContent?.includes('Movimientos')`)) break; await pause(250); }
  await pause(500);
  await evaluate(`Array.from(document.querySelectorAll('.shortcut-card')).find(button => button.textContent?.includes('Traspaso'))?.click(); true`); await pause(500);
  const transferForm = await evaluate(`document.body.textContent?.includes('Registra las dos partes del movimiento') && Boolean(Array.from(document.querySelectorAll('label')).find(label => label.textContent?.trim() === 'Cuenta de origen')) && Boolean(Array.from(document.querySelectorAll('label')).find(label => label.textContent?.trim() === 'Cuenta de destino'))`);
  const transferVisible = await evaluate(`Array.from(document.querySelectorAll('option')).some(option => option.textContent?.includes('Santander UI QA')) && Array.from(document.querySelectorAll('option')).some(option => option.textContent?.includes('Inbursa UI QA'))`);
  await evaluate(`Array.from(document.querySelectorAll('[role="dialog"] select')).find(select => select.parentElement?.querySelector('label')?.textContent?.trim() === 'Cuenta de origen')?.focus(); true`);
  const transferFocus = await evaluate(`document.activeElement?.tagName === 'SELECT'`);
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab" }); await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab" });
  const transferTab = await evaluate(`document.activeElement?.tagName === 'SELECT'`);
  await evaluate(`document.querySelector('[role="dialog"] button[aria-label="Close"]')?.click(); true`); await pause(200);
  await cdp("Page.navigate", { url: `${baseUrl}/planificacion` });
  for (let attempt = 0; attempt < 30; attempt += 1) { if (await evaluate(`location.pathname === '/planificacion' && document.querySelector('h1')?.textContent === 'Presupuesto mensual'`)) break; await pause(250); }
  await pause(500);
  const tabDebug = await evaluate(`Array.from(document.querySelectorAll('button')).filter(button => button.textContent?.trim() === 'Por cobrar').map(button => ({ html: button.outerHTML, role: button.getAttribute('role'), slot: button.getAttribute('data-slot') }))`);
  const tabRect = await evaluate(`(() => { const tab = Array.from(document.querySelectorAll('[data-slot="tabs-trigger"], [role="tab"]')).find(node => node.textContent?.trim() === 'Por cobrar'); if (!tab) return null; const rect = tab.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; })()`);
  if (!tabRect) throw new Error("No se encontró la pestaña Por cobrar.");
  await cdp("Input.dispatchMouseEvent", { type: "mousePressed", x: tabRect.x, y: tabRect.y, button: "left", clickCount: 1 });
  await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", x: tabRect.x, y: tabRect.y, button: "left", clickCount: 1 });
  await pause(500);
  const tabVisible = await evaluate(`document.querySelector('h1')?.textContent === 'Cuentas por cobrar'`);
  await evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent?.includes('Registrar CxC'))?.click(); true`); await pause(250);
  const receivableForm = await evaluate(`document.body.textContent?.includes('Una CxC registra un importe que te deben')`);
  const receivableVisible = await evaluate(`Boolean(Array.from(document.querySelectorAll('label')).find(label => label.textContent?.trim() === 'Cliente o persona')) && Boolean(Array.from(document.querySelectorAll('label')).find(label => label.textContent?.trim() === 'Origen de la CxC')) && Boolean(Array.from(document.querySelectorAll('label')).find(label => label.textContent?.trim() === 'Fecha esperada de cobro'))`);
  await evaluate(`Array.from(document.querySelectorAll('[role="dialog"] input')).find(input => input.parentElement?.querySelector('label')?.textContent?.trim() === 'Cliente o persona')?.focus(); true`);
  const receivableFocus = await evaluate(`document.activeElement?.tagName === 'INPUT'`);
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab" }); await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab" });
  const receivableTab = await evaluate(`document.activeElement?.tagName === 'INPUT'`);
  await cdp("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true }); await pause(400);
  const mobile = await evaluate(`({ width: document.documentElement.scrollWidth, viewport: window.innerWidth, heading: document.querySelector('h1')?.textContent })`);
  const report = { transferForm, transferVisible, transferFocus, transferTab, tabVisible, receivableForm, receivableVisible, receivableFocus, receivableTab, mobile: mobile.width <= mobile.viewport && mobile.heading === "Cuentas por cobrar" };
  if (!Object.values(report).every(Boolean)) throw new Error(`QA visual de traspasos/CxC falló: ${JSON.stringify({ report, tabDebug, mobile, text: await evaluate('document.body.innerText.slice(0, 700)') })}`);
  console.log(JSON.stringify({ ...report, qaEmail: account.email }));
  socket.close();
} finally { chrome.kill("SIGTERM"); }
