import { mkdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";

const baseUrl = "http://127.0.0.1:3000";
const outputDirectory = "/home/ubuntu/qa-onboarding-meximoney";
const qaAccount = { name: "QA Onboarding Meximoney", email: "qa-onboarding-meximoney-20260823@example.invalid", password: "OnboardingQA#2026" };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function tokenForQaAccount() {
  const request = async (path, input) => { const response = await fetch(`${baseUrl}/api/trpc/${path}?batch=1`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ 0: { json: input } }) }); const payload = await response.json(); if (!response.ok || payload[0]?.error) throw new Error(payload[0]?.error?.json?.message ?? `Error ${response.status}`); return payload[0].result.data.json; };
  try { return (await request("auth.register", qaAccount)).sessionToken; } catch { return (await request("auth.login", { email: qaAccount.email, password: qaAccount.password })).sessionToken; }
}

async function inspectViewport(name, width, height, debugPort, token) {
  const browserProfile = `${outputDirectory}/${name}-browser`;
  await rm(browserProfile, { recursive: true, force: true });
  const chromium = spawn("/usr/bin/chromium", ["--headless=new", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${browserProfile}`, "--no-sandbox", "--disable-gpu", "about:blank"], { stdio: "ignore" });
  try {
    let info;
    for (let attempt = 0; attempt < 30; attempt += 1) { try { const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`); if (response.ok) { info = await response.json(); break; } } catch {} await sleep(200); }
    if (!info) throw new Error(`Chromium no respondió para ${name}`);
    const socket = new WebSocket(info.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let requestId = 0; const pending = new Map(); socket.onmessage = event => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } };
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++requestId; pending.set(id, message => message.error ? reject(new Error(message.error.message)) : resolve(message.result)); socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); });
    const target = await send("Target.createTarget", { url: "about:blank" }); const attached = await send("Target.attachToTarget", { targetId: target.targetId, flatten: true }); const sessionId = attached.sessionId;
    await send("Page.enable", {}, sessionId); await send("Network.setCookie", { name: "app_session_id", value: token, url: baseUrl, httpOnly: true, secure: false, sameSite: "Lax", path: "/" }, sessionId); await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 700 }, sessionId);
    const evaluate = async expression => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId)).result.value;
    const waitFor = async text => { for (let attempt = 0; attempt < 24; attempt += 1) { if (await evaluate(`document.querySelector('h2')?.textContent?.includes(${JSON.stringify(text)})`)) return; await sleep(200); } throw new Error(`No apareció ${text} en ${name}`); };
    await send("Page.navigate", { url: baseUrl }, sessionId); await waitFor("Tu marco de control");
    const results = [];
    for (const [step, expected] of [[1, "Tu marco de control"], [2, "Entidades y monedas"], [3, "Confirma tu control humano"]]) {
      await waitFor(expected);
      const inspection = await evaluate(`(() => { const card = document.querySelector('.onboarding-flow-card'); const controls = Array.from(card?.querySelectorAll('input, select, textarea, button') ?? []); const cardRect = card?.getBoundingClientRect(); return { step: ${step}, title: document.querySelector('h2')?.textContent?.trim(), width: document.documentElement.scrollWidth, controls: controls.length, withinCard: Boolean(cardRect) && controls.every(element => { const rect = element.getBoundingClientRect(); return rect.left >= cardRect.left - 1 && rect.right <= cardRect.right + 1; }), labels: card?.querySelectorAll('label').length ?? 0, focusable: controls.filter(element => !element.disabled).length }; })()`);
      await evaluate("document.querySelector('.onboarding-flow-card input, .onboarding-flow-card select, .onboarding-flow-card textarea, .onboarding-flow-card button')?.focus()");
      const focusedBefore = await evaluate("document.activeElement?.tagName");
      await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 }, sessionId); await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 }, sessionId);
      const focusedAfter = await evaluate("document.activeElement?.tagName");
      inspection.keyboardNavigation = Boolean(focusedBefore && focusedAfter && focusedBefore !== "BODY" && focusedAfter !== "BODY");
      const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }, sessionId); await writeFile(`${outputDirectory}/${name}-step-${step}.png`, Buffer.from(screenshot.data, "base64"));
      results.push(inspection);
      if (step < 3) { await evaluate("Array.from(document.querySelectorAll('.onboarding-flow-card button')).find(button => button.textContent?.includes('Continuar'))?.click()"); await sleep(250); }
    }
    socket.close(); return results;
  } finally { chromium.kill("SIGTERM"); }
}

await mkdir(outputDirectory, { recursive: true });
const token = await tokenForQaAccount();
const report = { desktop: await inspectViewport("desktop", 1280, 800, 9341, token), mobile: await inspectViewport("mobile", 375, 812, 9342, token) };
await writeFile(`${outputDirectory}/results.json`, JSON.stringify(report, null, 2));
if (![...report.desktop, ...report.mobile].every(item => item.withinCard && item.controls > 0 && item.focusable > 0 && item.keyboardNavigation)) throw new Error("La QA de layout del onboarding detectó controles fuera de la tarjeta o no navegables por teclado.");
console.log(JSON.stringify(report));
