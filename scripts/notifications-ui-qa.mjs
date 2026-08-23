import { spawn } from "node:child_process";

const baseUrl = "http://127.0.0.1:3000";
const account = { name: "QA UI Notificaciones", email: "qa-notifications-ui-meximoney-20260823@example.invalid", password: "NotificacionesUI#2026" };

async function call(path, token, input) {
  const response = await fetch(`${baseUrl}/api/trpc/${path}?batch=1`, { method: "POST", headers: { "content-type": "application/json", ...(token ? { "X-Meximoney-Session": token } : {}) }, body: JSON.stringify({ 0: { json: input } }) });
  const payload = await response.json();
  if (!response.ok || payload[0]?.error) throw new Error(payload[0]?.error?.json?.message ?? `Error ${response.status}`);
  return payload[0].result.data.json;
}
async function query(path, token) { const response = await fetch(`${baseUrl}/api/trpc/${path}?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: null } }))}`, { headers: { "X-Meximoney-Session": token } }); const payload = await response.json(); if (!response.ok || payload[0]?.error) throw new Error(payload[0]?.error?.json?.message ?? `Error ${response.status}`); return payload[0].result.data.json; }
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

let token;
try { token = (await call("auth.register", null, account)).sessionToken; } catch { token = (await call("auth.login", null, { email: account.email, password: account.password })).sessionToken; }
await call("finance.privacy.recordConsent", token, { accepted: true, policyVersion: "notifications-ui-qa-v1" });
await call("finance.workspace.onboarding", token, { workspaceName: "Espacio QA UI Notificaciones", currency: "MXN", residenceCountry: "México", taxResidence: "México", taxRegime: "pfae_general", exchangeRatePolicy: "manual", humanReviewRequired: true, entities: [{ name: "Entidad QA UI", shortCode: "NUI", countryCode: "MX", legalForm: "pfae", status: "active", functionalCurrency: "MXN", taxRegime: "pfae_general", notes: null }] });
await call("finance.notifications.savePreferences", token, { inAppEnabled: true, calendarEnabled: true, documentsEnabled: true, debtsEnabled: true, reviewsEnabled: true, budgetEnabled: true, taxReserveEnabled: true });
const workspace = await query("finance.workspace.get", token);
await call("finance.calendar.save", token, { title: "Evento visual de notificación", eventType: "review", scope: "personal", entityId: workspace.entities[0].id, projectId: null, startsAt: Date.now() + 24 * 60 * 60 * 1000, endsAt: null, recurrence: "none", amountCents: null, currency: "MXN", linkedDebtId: null, linkedDocumentId: null, linkedTaskId: null, status: "planned", notes: "QA visual privada" });

const chrome = spawn("chromium", ["--headless", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=9223", "--user-data-dir=/tmp/meximoney-notifications-ui-qa", "about:blank"], { stdio: "ignore" });
try {
  let target;
  for (let attempt = 0; attempt < 25; attempt += 1) { try { target = (await (await fetch("http://127.0.0.1:9223/json")).json()).find(item => item.type === "page"); if (target?.webSocketDebuggerUrl) break; } catch {} await pause(200); }
  if (!target?.webSocketDebuggerUrl) throw new Error("No se pudo iniciar el navegador de QA.");
  const socket = new WebSocket(target.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let nextId = 1; const pending = new Map(); socket.onmessage = event => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } };
  const cdp = (method, params = {}) => new Promise((resolve, reject) => { const id = nextId++; pending.set(id, message => message.error ? reject(new Error(message.error.message)) : resolve(message.result)); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => (await cdp("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;
  await cdp("Network.enable");
  await cdp("Network.setExtraHTTPHeaders", { headers: { "X-Meximoney-Session": token } });
  await cdp("Page.addScriptToEvaluateOnNewDocument", { source: `sessionStorage.setItem("meximoney-local-session", ${JSON.stringify(token)});` });
  await cdp("Page.navigate", { url: `${baseUrl}/notificaciones` });
  for (let attempt = 0; attempt < 20; attempt += 1) { if (await evaluate(`document.querySelector("h1")?.textContent`)) break; await pause(250); }
  const checkViewport = async (width, height) => { await cdp("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width <= 375 }); await pause(350); return evaluate(`({ width: document.documentElement.scrollWidth, viewport: window.innerWidth, heading: document.querySelector("h1")?.textContent, toggles: document.querySelectorAll('[role="switch"]').length, hasReadButton: Boolean(document.querySelector('button[aria-label="Marcar como leído"]')), hasInboxFilters: Array.from(document.querySelectorAll("button")).some(button => button.textContent?.includes("No leídas")) && Array.from(document.querySelectorAll("button")).some(button => button.textContent === "Categoría"), notificationAria: document.querySelector('[aria-label^="Notificaciones."]')?.getAttribute("aria-label"), badge: Array.from(document.querySelectorAll('[aria-label^="Notificaciones."] span')).map(element => element.textContent?.trim()).find(value => /^(?:[1-9]\\d*|99\\+)$/.test(value ?? "")) })`); };
  const desktop = await checkViewport(1280, 720);
  const mobile = await checkViewport(375, 812);
  await evaluate(`document.querySelector('button[data-sidebar="trigger"]')?.click(); true`); await pause(350);
  const mobileBadge = await evaluate(`({ aria: document.querySelector('[aria-label^="Notificaciones."]')?.getAttribute("aria-label"), badge: Array.from(document.querySelectorAll('[aria-label^="Notificaciones."] span')).map(element => element.textContent?.trim()).find(value => /^(?:[1-9]\d*|99\+)$/.test(value ?? "")) })`);
  await evaluate(`document.querySelector('[role="switch"]')?.focus(); document.activeElement?.getAttribute("aria-label")`);
  const focusedLabel = await evaluate(`document.activeElement?.getAttribute("aria-label")`);
  const prior = await evaluate(`document.querySelector('[role="switch"]')?.getAttribute("aria-checked")`);
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space" }); await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space" }); await pause(500);
  const toggled = await evaluate(`document.querySelector('[role="switch"]')?.getAttribute("aria-checked") !== ${JSON.stringify(prior)}`);
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", key: " ", code: "Space" }); await cdp("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space" }); await pause(650);
  await evaluate(`document.querySelector('button[aria-label="Marcar como leído"]')?.click(); true`); await pause(450);
  const markedRead = await evaluate(`document.body.textContent?.includes("Leído")`);
  await evaluate(`Array.from(document.querySelectorAll("button")).find(button => button.textContent?.includes("Abrir contexto relacionado"))?.click(); true`); await pause(400);
  const contextLink = await evaluate(`location.pathname === "/calendario"`);
  await evaluate(`history.back(); true`); await pause(450);
  const beforeDismiss = await evaluate(`document.querySelectorAll('button[aria-label="Descartar notificación"]').length`);
  await evaluate(`document.querySelector('button[aria-label="Descartar notificación"]')?.click(); true`); await pause(450);
  const discarded = await evaluate(`document.querySelectorAll('button[aria-label="Descartar notificación"]').length < ${beforeDismiss}`);
  const report = { desktop: desktop.heading === "Lo importante, sin ruido." && desktop.toggles === 7 && desktop.hasReadButton && desktop.hasInboxFilters && desktop.width <= desktop.viewport && Boolean(desktop.badge) && /sin leer/.test(desktop.notificationAria ?? ""), mobile: mobile.heading === "Lo importante, sin ruido." && mobile.toggles === 7 && mobile.hasInboxFilters && mobile.width <= mobile.viewport && Boolean(mobileBadge.badge) && /sin leer/.test(mobileBadge.aria ?? ""), keyboardFocus: focusedLabel === "Bandeja dentro de Meximoney", keyboardToggle: toggled, markRead: markedRead, dismiss: discarded, contextLink };
  if (!Object.values(report).every(Boolean)) throw new Error(`QA visual de notificaciones falló: ${JSON.stringify({ report, desktop, mobile, mobileBadge, focusedLabel, prior, url: await evaluate("location.href"), text: await evaluate("document.body.innerText.slice(0, 500)") })}`);
  console.log(JSON.stringify(report));
  socket.close();
} finally { chrome.kill("SIGTERM"); }
