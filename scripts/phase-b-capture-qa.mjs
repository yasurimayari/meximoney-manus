const baseUrl = "http://127.0.0.1:3000";
const account = { name: "QA Fase B Captura", email: "qa-phaseb-capture-meximoney-20260824@example.invalid", password: "FaseBCaptura#2026" };

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
await call("finance.privacy.recordConsent", token, { accepted: true, policyVersion: "phase-b-capture-qa-v1" });
await call("finance.workspace.onboarding", token, { workspaceName: "Espacio QA Fase B", currency: "MXN", residenceCountry: "México", taxResidence: "México", taxRegime: "pfae_general", exchangeRatePolicy: "manual", humanReviewRequired: true, entities: [{ name: "YMC Fase B QA", shortCode: "YBQA", countryCode: "MX", legalForm: "pfae", status: "active", functionalCurrency: "MXN", taxRegime: "pfae_general", notes: null }] });
let snapshot = await query("finance.workspace.get", token);
const ymc = snapshot.entities[0];
await call("finance.accounts.save", token, { name: "Cuenta Fase B QA", type: "bank", scope: "business", entityId: ymc.id, projectId: null, currentValueCents: 100000, currency: "MXN", isLiquid: true, valuationDate: Date.now(), status: "active", notes: null });
snapshot = await query("finance.workspace.get", token);
const bank = snapshot.accounts.find(item => item.name === "Cuenta Fase B QA");
const importRow = { accountId: bank.id, categoryId: null, entityId: ymc.id, projectId: null, type: "expense", scope: "business", amountCents: 25000, currency: "MXN", reportCurrency: "MXN", reportAmountCents: 25000, exchangeRateMicros: null, exchangeRateDate: null, incomeNature: "other", occurredAt: new Date("2026-08-24T12:00:00").getTime(), isEssential: false, status: "confirmed", notes: "Notion QA", allowPossibleDuplicate: false };
const previewFirst = await call("finance.workspace.imports.preview", token, { rows: [importRow] });
await call("finance.workspace.imports.confirm", token, { rows: [importRow] });
const previewDuplicate = await call("finance.workspace.imports.preview", token, { rows: [importRow] });
let duplicateBlocked = false;
try { await call("finance.workspace.imports.confirm", token, { rows: [importRow] }); } catch { duplicateBlocked = true; }
await call("finance.workspace.recurringTemplates.save", token, { entityId: ymc.id, projectId: null, accountId: bank.id, categoryId: null, name: "Notion mensual QA", counterparty: "Notion", type: "expense", scope: "business", amountCents: 30000, currency: "MXN", incomeNature: "other", cadence: "monthly", nextOccurrenceAt: null, status: "active", notes: "Plantilla QA" });
await call("finance.workspace.recurringTemplates.save", token, { entityId: ymc.id, projectId: null, accountId: bank.id, categoryId: null, name: "Proveedor personalizado QA", counterparty: "Proveedor adicional", type: "expense", scope: "business", amountCents: 10000, currency: "MXN", incomeNature: "other", cadence: "annual", nextOccurrenceAt: null, status: "active", notes: null });
snapshot = await query("finance.workspace.get", token);
const notionTemplate = snapshot.recurringTemplates.find(item => item.name === "Notion mensual QA");
await call("finance.workspace.recurringTemplates.applyNow", token, { id: notionTemplate.id, occurredAt: Date.now() });
await call("finance.workspace.payables.save", token, { entityId: ymc.id, projectId: null, creditor: "Contador QA", origin: "Honorarios profesionales", scope: "business", amountCents: 500000, currency: "MXN", issuedAt: Date.now(), dueAt: Date.now() + 5 * 86400000, paidAt: null, status: "pending", notes: null });
snapshot = await query("finance.workspace.get", token);
const payable = snapshot.payables.find(item => item.creditor === "Contador QA");
await call("finance.workspace.transactionSave", token, { accountId: bank.id, categoryId: null, goalId: null, debtId: null, entityId: ymc.id, projectId: null, type: "expense", scope: "business", amountCents: 500000, currency: "MXN", reportCurrency: "MXN", reportAmountCents: 500000, exchangeRateMicros: null, exchangeRateDate: null, incomeNature: "other", occurredAt: Date.now(), isEssential: false, transferGroupId: null, status: "confirmed", notes: "Pago real contador QA" });
snapshot = await query("finance.workspace.get", token);
const realExpense = snapshot.transactions.find(item => item.notes === "Pago real contador QA");
await call("finance.workspace.payables.paymentSave", token, { payableId: payable.id, linkedTransactionId: null, amountCents: 200000, currency: "MXN", paidAt: Date.now(), notes: "Pago inicial" });
snapshot = await query("finance.workspace.get", token);
const firstPayment = snapshot.payablePayments.find(item => item.payableId === payable.id);
await call("finance.workspace.payables.paymentSave", token, { payableId: payable.id, linkedTransactionId: realExpense.id, amountCents: 300000, currency: "MXN", paidAt: Date.now(), notes: "Pago final" });
snapshot = await query("finance.workspace.get", token);
const paidPayable = snapshot.payables.find(item => item.id === payable.id);
await call("finance.workspace.payables.paymentSave", token, { id: firstPayment.id, payableId: payable.id, linkedTransactionId: realExpense.id, amountCents: 200000, currency: "MXN", paidAt: new Date(firstPayment.paidAt).getTime(), notes: firstPayment.notes });
snapshot = await query("finance.workspace.get", token);
const reconciledPayable = snapshot.payables.find(item => item.id === payable.id);
const report = { firstPreviewClean: previewFirst[0]?.possibleDuplicateIds.length === 0, duplicateDetectedAndBlocked: previewDuplicate[0]?.possibleDuplicateIds.length === 1 && duplicateBlocked, templatesCustomizable: snapshot.recurringTemplates.length === 2 && snapshot.transactions.some(item => item.notes?.includes("Notion mensual QA")), payableReconciled: paidPayable?.status === "paid" && reconciledPayable?.status === "reconciled" && snapshot.payablePayments.filter(item => item.payableId === payable.id).reduce((sum, item) => sum + item.amountCents, 0) === 500000 };
if (!Object.values(report).every(Boolean)) throw new Error(`QA de Fase B falló: ${JSON.stringify(report)}`);
console.log(JSON.stringify({ ...report, qaEmail: account.email }));
