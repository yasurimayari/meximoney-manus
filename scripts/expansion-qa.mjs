import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = "http://127.0.0.1:3000";
const email = "qa-expansion-meximoney-20260823@example.invalid";
const password = "ExpansionSegura#2026";
const debugPort = 9232;
const outputDirectory = "/home/ubuntu/qa-expansion-meximoney";
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function call(path, token, input) {
  const response = await fetch(`${baseUrl}/api/trpc/${path}?batch=1`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { "X-Meximoney-Session": token } : {}) },
    body: JSON.stringify({ 0: { json: input } }),
  });
  const payload = await response.json();
  if (!response.ok || payload[0]?.error) throw new Error(`${path}: ${payload[0]?.error?.json?.message ?? response.status}`);
  return payload[0].result.data.json;
}

async function getToken() {
  try {
    const registered = await call("auth.register", null, { name: "QA Expansión", email, password });
    return registered.sessionToken;
  } catch (error) {
    if (!String(error).includes("Ya existe")) throw error;
    return (await call("auth.login", null, { email, password })).sessionToken;
  }
}

async function waitForDebugger() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (response.ok) return response.json();
    } catch {}
    await sleep(250);
  }
  throw new Error("No se pudo iniciar Chromium para QA");
}

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  const token = await getToken();
  await call("finance.privacy.recordConsent", token, { accepted: true, policyVersion: "qa-v1" });
  await call("finance.accounts.save", token, { name: "Fondo QA", type: "cash", scope: "personal", currency: "MXN", currentValueCents: 120000, isLiquid: true, valuationDate: Date.now(), status: "active", notes: "Dato temporal QA" });
  await call("finance.debts.save", token, { name: "Tarjeta QA", creditor: "Banco de prueba", type: "credit_card", scope: "personal", balanceCents: 30000, currency: "MXN", interestRateBps: 2400, minimumPaymentCents: 5000, nextDueAt: new Date("2026-08-28T12:00:00").getTime(), endDate: null, priority: "high", status: "active", notes: "Dato temporal QA" });
  await call("finance.transactions.save", token, { type: "income", scope: "personal", amountCents: 80000, currency: "MXN", accountId: null, categoryId: null, goalId: null, debtId: null, occurredAt: new Date("2026-08-05T12:00:00").getTime(), isEssential: false, transferGroupId: null, status: "confirmed", notes: "Ingreso temporal QA" });
  await call("finance.transactions.save", token, { type: "expense", scope: "personal", amountCents: 25000, currency: "MXN", accountId: null, categoryId: null, goalId: null, debtId: null, occurredAt: new Date("2026-08-06T12:00:00").getTime(), isEssential: true, transferGroupId: null, status: "confirmed", notes: "Gasto temporal QA" });
  await call("finance.documents.save", token, { name: "Póliza QA", type: "policy", documentClass: "insurance", scope: "personal", relatedEntityType: "insurance", relatedEntityId: null, jurisdiction: "México", referenceUrl: "https://example.invalid/poliza", issuedAt: new Date("2026-08-01T12:00:00").getTime(), expiresAt: new Date("2026-08-26T12:00:00").getTime(), reminderAt: new Date("2026-08-20T12:00:00").getTime(), verified: true, notes: "Documento temporal QA" });
  await call("finance.calendar.save", token, { title: "Pago TDC QA", eventType: "credit_card_payment", scope: "personal", startsAt: new Date("2026-08-28T12:00:00").getTime(), endsAt: null, recurrence: "monthly", amountCents: 5000, currency: "MXN", linkedDebtId: null, linkedDocumentId: null, linkedTaskId: null, status: "planned", notes: "Evento temporal QA" });
  const savedStatement = await call("finance.statements.save", token, { periodStart: new Date("2026-08-01T12:00:00").getTime(), scope: "personal", status: "closed", notes: "Cierre temporal QA" });

  const chromium = spawn("/usr/bin/chromium", ["--headless=new", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${outputDirectory}/profile`, "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "about:blank"], { stdio: "ignore" });
  try {
    const debuggerInfo = await waitForDebugger();
    const socket = new WebSocket(debuggerInfo.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let requestId = 0;
    const pending = new Map();
    socket.onmessage = event => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } };
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++requestId; pending.set(id, message => message.error ? reject(new Error(message.error.message)) : resolve(message.result)); socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); });
    const target = await send("Target.createTarget", { url: "about:blank" });
    const attached = await send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
    const sessionId = attached.sessionId;
    await send("Page.enable", {}, sessionId);
    await send("Network.setCookie", { name: "app_session_id", value: token, url: baseUrl, httpOnly: true, secure: false, sameSite: "Lax", path: "/" }, sessionId);
    await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true }, sessionId);
    const evaluate = async expression => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId)).result.value;
    const reports = [];
    for (const path of ["/calendario", "/estados", "/movimientos", "/exportar"]) {
      await send("Page.navigate", { url: `${baseUrl}${path}` }, sessionId);
      await sleep(1100);
      if (path === "/exportar") {
        for (let attempt = 0; attempt < 10; attempt += 1) {
          if (await evaluate("document.body.innerText.toLowerCase().includes('cierres mensuales')")) break;
          await sleep(400);
        }
      }
      reports.push(await evaluate(`({ path: location.pathname, title: document.querySelector('h1')?.textContent?.trim(), contentWidth: document.documentElement.scrollWidth, authenticated: Boolean(document.querySelector('[data-slot="sidebar-wrapper"]')), hasExpectedText: document.body.innerText.toLowerCase().includes(${JSON.stringify(path === "/calendario" ? "Pago TDC QA" : path === "/estados" ? "Estados financieros mensuales" : path === "/movimientos" ? "Póliza QA" : "Cierres mensuales").toLowerCase()}) })`));
      const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }, sessionId);
      await writeFile(`${outputDirectory}${path}.png`, Buffer.from(screenshot.data, "base64"));
    }
    await send("Page.navigate", { url: `${baseUrl}/calendario` }, sessionId);
    await sleep(900);
    const monthlyView = await evaluate(`({ selected: document.querySelector('button[aria-pressed="true"]')?.textContent?.trim() === 'Mensual', gridDays: document.querySelectorAll('.calendar-day').length, eventsVisible: document.body.innerText.includes('Pago TDC QA') })`);
    await evaluate(`([...document.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Semanal'))?.click()`);
    await sleep(450);
    await evaluate(`document.querySelector('button[aria-label="Semana siguiente"]')?.click()`);
    await sleep(350);
    const weeklyView = await evaluate(`({ selected: document.querySelector('button[aria-pressed="true"]')?.textContent?.trim() === 'Semanal', gridDays: document.querySelectorAll('.calendar-day').length, eventsVisible: document.body.innerText.includes('Pago TDC QA'), width: document.documentElement.scrollWidth })`);
    const weeklyScreenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }, sessionId);
    await writeFile(`${outputDirectory}/calendario-semanal.png`, Buffer.from(weeklyScreenshot.data, "base64"));
    await evaluate(`([...document.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Mensual'))?.click()`);
    await sleep(300);
    const monthInitial = await evaluate(`document.querySelector('.calendar-period-heading h2')?.textContent?.trim()`);
    await evaluate(`document.querySelector('button[aria-label="Mes siguiente"]')?.click()`);
    await sleep(260);
    const monthNext = await evaluate(`document.querySelector('.calendar-period-heading h2')?.textContent?.trim()`);
    await evaluate(`document.querySelector('button[aria-label="Mes anterior"]')?.click()`);
    await sleep(260);
    const monthPrevious = await evaluate(`document.querySelector('.calendar-period-heading h2')?.textContent?.trim()`);
    const monthSelectorChanged = await evaluate(`(() => { const input = document.querySelector('input[type="month"]'); const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set; setValue?.call(input, '2026-09'); input?.dispatchEvent(new Event('input', { bubbles: true })); input?.dispatchEvent(new Event('change', { bubbles: true })); return Boolean(input); })()`);
    await sleep(300);
    const monthSelected = await evaluate(`document.querySelector('.calendar-period-heading h2')?.textContent?.trim()`);
    await evaluate(`document.querySelector('button')?.focus()`);
    const calendarFocusTrail = [];
    for (let step = 0; step < 7; step += 1) {
      await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 }, sessionId);
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 }, sessionId);
      calendarFocusTrail.push(await evaluate(`({ tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label'), text: document.activeElement?.textContent?.trim(), type: document.activeElement?.getAttribute('type') })`));
    }
    await evaluate(`document.querySelector('input[type="month"]')?.focus()`);
    const monthlyCellFocusTrail = [];
    for (let step = 0; step < 7; step += 1) {
      await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 }, sessionId);
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 }, sessionId);
      monthlyCellFocusTrail.push(await evaluate(`({ tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label'), pressed: document.activeElement?.getAttribute('aria-pressed'), type: document.activeElement?.getAttribute('type') })`));
    }
    await evaluate(`([...document.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Semanal'))?.click()`);
    await sleep(260);
    const weeklyInitial = await evaluate(`document.querySelector('.calendar-period-heading h2')?.textContent?.trim()`);
    const weekSelectorChanged = await evaluate(`(() => { const input = document.querySelector('input[type="date"]'); const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set; setValue?.call(input, '2026-08-28'); input?.dispatchEvent(new Event('input', { bubbles: true })); input?.dispatchEvent(new Event('change', { bubbles: true })); return Boolean(input); })()`);
    await sleep(300);
    const weeklySelected = await evaluate(`document.querySelector('.calendar-period-heading h2')?.textContent?.trim()`);
    await evaluate(`document.querySelector('button[aria-label="Semana siguiente"]')?.click()`);
    await sleep(260);
    const weeklyNext = await evaluate(`document.querySelector('.calendar-period-heading h2')?.textContent?.trim()`);
    await evaluate(`document.querySelector('button[aria-label="Semana anterior"]')?.click()`);
    await sleep(260);
    const weeklyPrevious = await evaluate(`document.querySelector('.calendar-period-heading h2')?.textContent?.trim()`);
    await evaluate(`([...document.querySelectorAll('button')].find(button => button.textContent?.includes('Hoy')))?.click()`);
    await sleep(260);
    const weeklyToday = await evaluate(`document.querySelector('.calendar-period-heading h2')?.textContent?.trim()`);
    await evaluate(`document.querySelector('input[type="date"]')?.focus()`);
    const weeklyCellFocusTrail = [];
    for (let step = 0; step < 8; step += 1) {
      await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 }, sessionId);
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 }, sessionId);
      weeklyCellFocusTrail.push(await evaluate(`({ tag: document.activeElement?.tagName, label: document.activeElement?.getAttribute('aria-label'), pressed: document.activeElement?.getAttribute('aria-pressed'), type: document.activeElement?.getAttribute('type') })`));
    }
    const calendarNavigation = { monthInitial, monthNext, monthPrevious, monthSelectorChanged, monthSelected, weeklyInitial, weekSelectorChanged, weeklySelected, weeklyNext, weeklyPrevious, weeklyToday, calendarFocusTrail, monthlyCellFocusTrail, weeklyCellFocusTrail };
    await send("Page.navigate", { url: `${baseUrl}/movimientos` }, sessionId);
    await sleep(1100);
    const dialogOpened = await evaluate(`Boolean((() => { const trigger = [...document.querySelectorAll('button')].find(button => button.textContent?.includes('Nuevo registro')); trigger?.click(); return trigger; })())`);
    await sleep(600);
    const documentTabClicked = await evaluate(`Boolean((() => { const tab = [...document.querySelectorAll('[data-slot="tabs-trigger"]')].find(button => button.textContent?.trim() === 'Documento'); if (!tab) return null; ["pointerdown", "mousedown", "pointerup", "mouseup", "click"].forEach(type => tab.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 }))); return tab; })())`);
    await sleep(600);
    const documentForm = await evaluate(`({
      dialogOpened: Boolean(document.querySelector('[data-slot="dialog-content"]')),
      triggerFound: ${dialogOpened},
      documentTabFound: ${documentTabClicked},
      documentClassSelector: Boolean([...document.querySelectorAll('label')].find(label => label.textContent === 'Clasificación')),
      relationshipSelector: Boolean([...document.querySelectorAll('label')].find(label => label.textContent === 'Relación financiera')),
      reminderInput: Boolean([...document.querySelectorAll('label')].find(label => label.textContent === 'Recordatorio manual')),
    })`);
    await send("Page.navigate", { url: `${baseUrl}/calendario` }, sessionId);
    await sleep(900);
    const calendarButtonFocused = await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(item => item.textContent?.includes('Añadir evento')); button?.focus(); return document.activeElement === button; })()`);
    await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 }, sessionId);
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 }, sessionId);
    const calendarTabFocus = await evaluate(`({ tag: document.activeElement?.tagName, type: document.activeElement?.getAttribute('type') })`);
    await evaluate(`([...document.querySelectorAll('button')].find(item => item.textContent?.includes('Añadir evento')))?.click()`);
    await sleep(450);
    const calendarValidation = await evaluate(`(() => { const form = document.querySelector('[data-slot="dialog-content"] form'); form?.requestSubmit(); const invalid = document.querySelector('[data-slot="dialog-content"] input:invalid'); return { invalidField: invalid?.getAttribute('placeholder'), focusOnInvalid: document.activeElement === invalid }; })()`);
    await send("Page.navigate", { url: `${baseUrl}/estados` }, sessionId);
    await sleep(900);
    const statesInputFocused = await evaluate(`(() => { const input = document.querySelector('input[type="month"]'); input?.focus(); return document.activeElement === input; })()`);
    const statesFocusTrail = [];
    for (let step = 0; step < 4; step += 1) {
      await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 }, sessionId);
      await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 }, sessionId);
      statesFocusTrail.push(await evaluate(`({ tag: document.activeElement?.tagName, type: document.activeElement?.getAttribute('type'), value: document.activeElement?.getAttribute('value'), text: document.activeElement?.textContent?.trim() })`));
    }
    const accessibility = { calendarButtonFocused, calendarTabFocus, calendarValidation, statesInputFocused, statesFocusTrail };
    socket.close();
    await writeFile(`${outputDirectory}/results.json`, JSON.stringify({ savedStatement, reports, calendarViews: { monthlyView, weeklyView }, calendarNavigation, documentForm, accessibility }, null, 2));
    console.log(JSON.stringify({ savedStatement, reports, calendarViews: { monthlyView, weeklyView }, calendarNavigation, documentForm, accessibility }));
  } finally {
    chromium.kill("SIGTERM");
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
