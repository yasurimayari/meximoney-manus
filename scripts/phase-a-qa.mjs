import { writeFile, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import { readdir, readFile, rm } from "node:fs/promises";

const baseUrl = "http://127.0.0.1:3000";
const owner = { name: "QA Fase A Propietaria", email: "qa-phase-a-owner-meximoney-20260823@example.invalid", password: "FaseAPropietaria#2026" };
const manager = { name: "QA Fase A Gestor", email: "qa-phase-a-manager-meximoney-20260823@example.invalid", password: "FaseAGestorSeguro#2026" };
const outputDirectory = "/home/ubuntu/qa-phase-a-meximoney";
const debugPort = 9234;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const extractPdfText = path => new Promise((resolve, reject) => { const process = spawn("pdftotext", [path, "-"]); const chunks = []; process.stdout.on("data", chunk => chunks.push(chunk)); process.on("error", reject); process.on("close", code => code === 0 ? resolve(Buffer.concat(chunks).toString("utf8")) : reject(new Error(`pdftotext terminó con código ${code}`))); });

async function call(path, token, input) {
  const response = await fetch(`${baseUrl}/api/trpc/${path}?batch=1`, { method: "POST", headers: { "content-type": "application/json", ...(token ? { "X-Meximoney-Session": token } : {}) }, body: JSON.stringify({ 0: { json: input } }) });
  const payload = await response.json();
  if (!response.ok || payload[0]?.error) throw new Error(`${path}: ${payload[0]?.error?.json?.message ?? response.status}`);
  return payload[0].result.data.json;
}

async function query(path, token, input = null) {
  const response = await fetch(`${baseUrl}/api/trpc/${path}?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: input } }))}`, { headers: { "X-Meximoney-Session": token } });
  const payload = await response.json();
  if (!response.ok || payload[0]?.error) throw new Error(`${path}: ${payload[0]?.error?.json?.message ?? response.status}`);
  return payload[0].result.data.json;
}

async function tokenFor(account) {
  try { return (await call("auth.register", null, account)).sessionToken; }
  catch (error) { if (!String(error).includes("Ya existe")) throw error; return (await call("auth.login", null, { email: account.email, password: account.password })).sessionToken; }
}

async function captureMobileViews(token) {
  const chromium = spawn("/usr/bin/chromium", ["--headless=new", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${outputDirectory}/browser-profile`, "--no-sandbox", "--disable-gpu", "about:blank"], { stdio: "ignore" });
  try {
    let info;
    for (let attempt = 0; attempt < 30; attempt += 1) { try { const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`); if (response.ok) { info = await response.json(); break; } } catch {} await sleep(200); }
    if (!info) throw new Error("Chromium no respondió durante QA de Fase A");
    const socket = new WebSocket(info.webSocketDebuggerUrl); await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let requestId = 0; const pending = new Map(); socket.onmessage = event => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); } };
    const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const id = ++requestId; pending.set(id, message => message.error ? reject(new Error(message.error.message)) : resolve(message.result)); socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); });
    const downloadDirectory = `${outputDirectory}/downloads`; await rm(downloadDirectory, { recursive: true, force: true }); await mkdir(downloadDirectory, { recursive: true }); await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: downloadDirectory });
    const target = await send("Target.createTarget", { url: "about:blank" }); const attached = await send("Target.attachToTarget", { targetId: target.targetId, flatten: true }); const sessionId = attached.sessionId;
    await send("Page.enable", {}, sessionId); await send("Network.setCookie", { name: "app_session_id", value: token, url: baseUrl, httpOnly: true, secure: false, sameSite: "Lax", path: "/" }, sessionId); await send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true }, sessionId);
    const evaluate = async expression => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true }, sessionId)).result.value;
    const reports = []; let exportFilesVerified = null;
    for (const path of ["/espacio", "/revision", "/movimientos", "/analitica", "/estados", "/exportar"]) {
      await send("Page.navigate", { url: `${baseUrl}${path}` }, sessionId);
      for (let attempt = 0; attempt < 16; attempt += 1) { if (await evaluate("Boolean(document.querySelector('h1'))")) break; await sleep(250); }
      let functionalFiltersApplied = true;
      if (["/movimientos", "/analitica", "/estados", "/exportar"].includes(path)) { functionalFiltersApplied = await evaluate(`(() => { const selectFor = text => Array.from(document.querySelectorAll('label')).filter(label => label.textContent?.trim() === text).at(-1)?.nextElementSibling; const entity = selectFor('Entidad'); const project = selectFor('Proyecto'); const currency = selectFor('Moneda'); const review = selectFor('Revisión'); if (!entity || !project || !currency || !review) return false; entity.value = Array.from(entity.options).find(option => option.textContent?.includes('YMC'))?.value || ''; entity.dispatchEvent(new Event('change', { bubbles: true })); project.value = Array.from(project.options).find(option => option.textContent?.includes('Proyecto QA Fase A'))?.value || ''; project.dispatchEvent(new Event('change', { bubbles: true })); currency.value = 'USD'; currency.dispatchEvent(new Event('change', { bubbles: true })); review.value = 'approved'; review.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`); await sleep(350); functionalFiltersApplied = functionalFiltersApplied && await evaluate(`(() => { const selectFor = text => Array.from(document.querySelectorAll('label')).filter(label => label.textContent?.trim() === text).at(-1)?.nextElementSibling; return selectFor('Entidad')?.value && selectFor('Proyecto')?.value && selectFor('Moneda')?.value === 'USD' && selectFor('Revisión')?.value === 'approved'; })()`); if (path === "/movimientos") functionalFiltersApplied = functionalFiltersApplied && await evaluate("document.body.innerText.includes('Cobro técnico en USD') && document.body.innerText.includes('Referencia Drive QA') && document.body.innerText.includes('Cuenta QA filtrable')"); }
      if (path === "/exportar") { await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent?.includes('Descargar CSV'))?.click()"); await sleep(500); await evaluate("Array.from(document.querySelectorAll('button')).find(button => button.textContent?.includes('Descargar PDF'))?.click()"); for (let attempt = 0; attempt < 20; attempt += 1) { const files = await readdir(downloadDirectory); if (files.some(file => file.endsWith('.csv')) && files.some(file => file.endsWith('.pdf'))) break; await sleep(250); } const files = await readdir(downloadDirectory); const csv = await readFile(`${downloadDirectory}/${files.find(file => file.endsWith('.csv'))}`, "utf8"); const pdfPath = `${downloadDirectory}/${files.find(file => file.endsWith('.pdf'))}`; const pdf = await readFile(pdfPath); const pdfText = await extractPdfText(pdfPath); exportFilesVerified = { csvFiltered: csv.includes("Cobro técnico en USD") && !csv.includes("Gasto técnico sin conversión"), pdfDownloaded: pdf.subarray(0, 4).toString() === "%PDF", pdfFiltered: pdfText.includes("$2,250.00") && /Gastos\s+\$0\.00/.test(pdfText) && /Partidas sin conversión\s+0/.test(pdfText) && !pdfText.includes("Gasto técnico sin conversión") }; }
      reports.push(await evaluate(`({ path: location.pathname, title: document.querySelector('h1')?.textContent?.trim(), width: document.documentElement.scrollWidth, onboardingVisible: document.body.innerText.includes('Construyamos un espacio'), expected: document.body.innerText.includes(${JSON.stringify(path === "/espacio" ? "YMC QA" : path === "/revision" ? "Bandeja de revisión" : path === "/movimientos" ? "Movimientos y recursos" : path === "/analitica" ? "Entiende las tendencias" : path === "/estados" ? "Estados financieros mensuales" : "Convierte tus registros")}), filtersVisible: ${JSON.stringify(["/movimientos", "/analitica", "/estados", "/exportar"].includes(path))} ? document.body.innerText.includes("Entidad") && document.body.innerText.includes("Proyecto") && document.body.innerText.includes("Moneda") : true, functionalFiltersApplied: ${JSON.stringify(functionalFiltersApplied)} })`));
      const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }, sessionId); await writeFile(`${outputDirectory}${path}.png`, Buffer.from(screenshot.data, "base64"));
    }
    await send("Page.navigate", { url: `${baseUrl}/` }, sessionId);
    for (let attempt = 0; attempt < 16; attempt += 1) { if (await evaluate("Boolean(document.querySelector('h1'))")) break; await sleep(250); }
    const dashboardFiltersApplied = await evaluate(`(() => { const selectFor = text => Array.from(document.querySelectorAll('label')).filter(label => label.textContent?.trim() === text).at(-1)?.nextElementSibling; const entity = selectFor('Entidad'); const project = selectFor('Proyecto'); const currency = selectFor('Moneda'); const review = selectFor('Revisión'); if (!entity || !project || !currency || !review) return false; entity.value = Array.from(entity.options).find(option => option.textContent?.includes('YMC'))?.value || ''; entity.dispatchEvent(new Event('change', { bubbles: true })); project.value = Array.from(project.options).find(option => option.textContent?.includes('Proyecto QA Fase A'))?.value || ''; project.dispatchEvent(new Event('change', { bubbles: true })); currency.value = 'USD'; currency.dispatchEvent(new Event('change', { bubbles: true })); review.value = 'approved'; review.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await sleep(350);
    reports.push(await evaluate(`({ path: location.pathname, title: document.querySelector('h1')?.textContent?.trim(), width: document.documentElement.scrollWidth, dashboardFiltersApplied: ${JSON.stringify(dashboardFiltersApplied)} && Boolean(document.body.innerText.match(/2[,.]?250/)) })`));
    await send("Page.navigate", { url: `${baseUrl}/calendario` }, sessionId);
    for (let attempt = 0; attempt < 16; attempt += 1) { if (await evaluate("Boolean(document.querySelector('h1'))")) break; await sleep(250); }
    const calendarFiltersApplied = await evaluate(`(() => { const selectFor = text => Array.from(document.querySelectorAll('label')).filter(label => label.textContent?.trim() === text).at(-1)?.nextElementSibling; const entity = selectFor('Entidad'); const project = selectFor('Proyecto'); const currency = selectFor('Moneda'); const status = selectFor('Estado del evento'); if (!entity || !project || !currency || !status) return false; entity.value = Array.from(entity.options).find(option => option.textContent?.includes('YMC'))?.value || ''; entity.dispatchEvent(new Event('change', { bubbles: true })); project.value = Array.from(project.options).find(option => option.textContent?.includes('Proyecto QA Fase A'))?.value || ''; project.dispatchEvent(new Event('change', { bubbles: true })); currency.value = 'USD'; currency.dispatchEvent(new Event('change', { bubbles: true })); status.value = 'planned'; status.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    await sleep(350);
    reports.push(await evaluate(`({ path: location.pathname, title: document.querySelector('h1')?.textContent?.trim(), width: document.documentElement.scrollWidth, calendarFiltersApplied: ${JSON.stringify(calendarFiltersApplied)} && document.body.innerText.includes('Evento QA filtrable') })`));
    socket.close(); return { reports, exportFilesVerified };
  } finally { chromium.kill("SIGTERM"); }
}

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  const ownerToken = await tokenFor(owner);
  await call("finance.privacy.recordConsent", ownerToken, { accepted: true, policyVersion: "qa-fase-a-v1" });
  await call("finance.workspace.onboarding", ownerToken, {
    workspaceName: "Espacio QA Fase A", currency: "MXN", residenceCountry: "México", taxResidence: "México", taxRegime: "pfae_general", exchangeRatePolicy: "manual", humanReviewRequired: true,
    entities: [
      { name: "YMC QA", shortCode: "YMC", countryCode: "MX", legalForm: "pfae", status: "active", functionalCurrency: "MXN", taxRegime: "pfae_general", notes: "Entidad técnica" },
      { name: "ELE QA", shortCode: "ELE", countryCode: "ES", legalForm: "sl", status: "inactive", functionalCurrency: "EUR", taxRegime: "other", notes: "Entidad técnica" },
    ],
  });
  let ownerSnapshot = await query("finance.workspace.get", ownerToken);
  const ymc = ownerSnapshot.entities.find(entity => entity.shortCode === "YMC");
  await call("finance.workspace.projectSave", ownerToken, { entityId: ymc.id, name: "Proyecto QA Fase A", status: "active", notes: "Proyecto técnico" });
  ownerSnapshot = await query("finance.workspace.get", ownerToken);
  const project = ownerSnapshot.projects.find(item => item.name === "Proyecto QA Fase A");
  await call("finance.accounts.save", ownerToken, { name: "Cuenta QA filtrable", type: "bank", scope: "business", entityId: ymc.id, projectId: project.id, currency: "USD", currentValueCents: 50000, isLiquid: true, valuationDate: Date.now(), status: "active", notes: "Cuenta técnica para filtros" });
  await call("finance.calendar.save", ownerToken, { title: "Evento QA filtrable", eventType: "review", scope: "business", entityId: ymc.id, projectId: project.id, startsAt: Date.now(), endsAt: null, recurrence: "none", amountCents: 1000, currency: "USD", linkedDebtId: null, linkedDocumentId: null, linkedTaskId: null, status: "planned", notes: "Evento técnico para filtros" });
  await call("finance.workspace.exchangeRateSave", ownerToken, { fromCurrency: "USD", toCurrency: "MXN", rateMicros: 18000000, rateDate: Date.now(), source: "manual", notes: "Tipo de cambio técnico" });
  await call("finance.workspace.transactionSave", ownerToken, {
    type: "expense", scope: "personal", amountCents: 5000, currency: "EUR", reportCurrency: "MXN", reportAmountCents: null, exchangeRateMicros: null, exchangeRateDate: null, incomeNature: "other", entityId: null, projectId: null, accountId: null, categoryId: null, goalId: null, debtId: null, occurredAt: Date.now(), isEssential: false, status: "confirmed", transferGroupId: null, notes: "Gasto técnico sin conversión",
  });
  const pendingConversionSnapshot = await query("finance.workspace.get", ownerToken);
  await call("finance.workspace.invite", ownerToken, { email: manager.email, role: "manager", canCreateDrafts: true, canReview: false });
  ownerSnapshot = await query("finance.workspace.get", ownerToken);
  const invite = ownerSnapshot.collaborators.find(item => item.invitedEmail === manager.email);
  const managerToken = await tokenFor(manager);
  let managerSnapshot = await query("finance.workspace.get", managerToken);
  if (managerSnapshot.workspaceAccess?.role !== "manager") {
    await call("finance.workspace.acceptInvite", managerToken, { inviteId: invite.id });
    managerSnapshot = await query("finance.workspace.get", managerToken);
  }
  const saved = await call("finance.workspace.transactionSave", managerToken, {
    type: "income", scope: "business", amountCents: 12500, currency: "USD", reportCurrency: "MXN", reportAmountCents: 225000, exchangeRateMicros: 18000000, exchangeRateDate: Date.now(), incomeNature: "business_revenue", entityId: ymc.id, projectId: project.id, accountId: null, categoryId: null, goalId: null, debtId: null, occurredAt: Date.now(), isEssential: false, status: "confirmed", transferGroupId: null, notes: "Cobro técnico en USD",
  });
  ownerSnapshot = await query("finance.workspace.get", ownerToken);
  const draft = ownerSnapshot.transactions.filter(item => item.notes === "Cobro técnico en USD").sort((left, right) => right.id - left.id)[0];
  await call("finance.workspace.reviewTransaction", ownerToken, { id: draft.id, approve: true });
  const reviewed = await query("finance.workspace.get", ownerToken);
  const statementFilter = { periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12).getTime(), scope: "business", entityId: ymc.id, projectId: project.id, currency: "MXN", reviewStatus: "approved" };
  const filteredStatement = await query("finance.statements.preview", ownerToken, statementFilter);
  await call("finance.statements.save", ownerToken, { ...statementFilter, status: "draft", notes: "Cierre técnico filtrado" });
  const statementSnapshot = await query("finance.workspace.get", ownerToken);
  const savedFilteredStatement = statementSnapshot.statements.find(item => item.entityId === ymc.id && item.projectId === project.id && item.filterCurrency === "MXN" && item.filterReviewStatus === "approved");
  await call("finance.documents.save", ownerToken, { name: "Referencia Drive QA", type: "receipt", documentClass: "general", scope: "business", entityId: ymc.id, projectId: project.id, relatedEntityType: "none", relatedEntityId: null, jurisdiction: "México", referenceUrl: "https://drive.google.com/file/d/qa-reference", referenceProvider: "google_drive", issuedAt: null, expiresAt: null, reminderAt: null, verified: false, notes: "Metadato técnico" });
  const documentSnapshot = await query("finance.workspace.get", ownerToken);
  const qaViews = await captureMobileViews(ownerToken);
  const report = {
    onboardingCompleted: ownerSnapshot.profile?.onboardingCompleted === true,
    workspaceName: ownerSnapshot.profile?.workspaceName,
    entities: ownerSnapshot.entities.map(entity => ({ shortCode: entity.shortCode, currency: entity.functionalCurrency, status: entity.status })),
    exchangeRateRecorded: ownerSnapshot.exchangeRates.some(rate => rate.fromCurrency === "USD" && rate.toCurrency === "MXN" && rate.rateMicros === 18000000),
    pendingConversionExcluded: pendingConversionSnapshot.dashboard.cashFlow.expenseCents === 0 && pendingConversionSnapshot.dashboard.cashFlow.pendingConversionCount === 1,
    inviteAccepted: managerSnapshot.workspaceAccess?.role === "manager" && managerSnapshot.workspaceAccess?.ownerId !== undefined,
    inviteDeduplicated: ownerSnapshot.collaborators.filter(item => item.invitedEmail === manager.email).length === 1,
    managerDraft: saved.success === true && draft.reviewStatus === "pending_review" && draft.status === "needs_review" && draft.createdByUserId !== null,
    ownerApproval: reviewed.transactions.some(item => item.id === draft.id && item.reviewStatus === "approved" && item.reviewedByUserId !== null),
    filteredStatement: filteredStatement.incomeCents === 225000 && filteredStatement.expenseCents === 0 && Boolean(savedFilteredStatement),
    driveReferenceTagged: documentSnapshot.documents.some(document => document.name === "Referencia Drive QA" && document.referenceProvider === "google_drive" && document.entityId === ymc.id && document.projectId === project.id),
    mobileViews: qaViews.reports,
    exportFilesVerified: qaViews.exportFilesVerified,
  };
  await writeFile(`${outputDirectory}/results.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
