const baseUrl = "http://127.0.0.1:3000";
const account = { name: "QA Traspasos CxC", email: "qa-transfers-receivables-meximoney-20260824@example.invalid", password: "TraspasosCxC#2026" };

async function call(path, token, input) {
  const response = await fetch(`${baseUrl}/api/trpc/${path}?batch=1`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { "X-Meximoney-Session": token } : {}) },
    body: JSON.stringify({ 0: { json: input } }),
  });
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
await call("finance.privacy.recordConsent", token, { accepted: true, policyVersion: "transfers-receivables-qa-v1" });
await call("finance.workspace.onboarding", token, { workspaceName: "Espacio QA Traspasos", currency: "MXN", residenceCountry: "México", taxResidence: "México", taxRegime: "pfae_general", exchangeRatePolicy: "manual", humanReviewRequired: true, entities: [
  { name: "YMC QA", shortCode: "YMCQ", countryCode: "MX", legalForm: "pfae", status: "active", functionalCurrency: "MXN", taxRegime: "pfae_general", notes: null },
  { name: "ELM QA", shortCode: "ELMQ", countryCode: "MX", legalForm: "sa_de_cv", status: "active", functionalCurrency: "MXN", taxRegime: "corporate", notes: null },
] });
let snapshot = await query("finance.workspace.get", token);
const [ymc, elm] = snapshot.entities;
await call("finance.accounts.save", token, { name: "Santander QA", type: "bank", scope: "personal", entityId: null, projectId: null, currentValueCents: 300000, currency: "MXN", isLiquid: true, valuationDate: Date.now(), status: "active", notes: null });
await call("finance.accounts.save", token, { name: "Inbursa QA", type: "bank", scope: "personal", entityId: null, projectId: null, currentValueCents: 50000, currency: "MXN", isLiquid: true, valuationDate: Date.now(), status: "active", notes: null });
snapshot = await query("finance.workspace.get", token);
const santander = snapshot.accounts.find(item => item.name === "Santander QA");
const inbursa = snapshot.accounts.find(item => item.name === "Inbursa QA");
const transfer = await call("finance.workspace.transferSave", token, { sourceAccountId: santander.id, destinationAccountId: inbursa.id, amountCents: 125000, occurredAt: Date.now(), status: "confirmed", notes: "Fondeo QA" });
await call("finance.workspace.receivables.save", token, { entityId: ymc.id, projectId: null, counterparty: "Cliente YMC QA", origin: "Servicio de consultoría YMC", scope: "business", amountCents: 500000, currency: "MXN", issuedAt: Date.now(), dueAt: Date.now() + 3 * 86400000, paidAt: null, status: "pending", notes: null });
await call("finance.workspace.receivables.save", token, { entityId: elm.id, projectId: null, counterparty: "Cliente ELM QA", origin: "Comisión ELM", scope: "business", amountCents: 240000, currency: "MXN", issuedAt: Date.now(), dueAt: null, paidAt: null, status: "overdue", notes: null });
await call("finance.workspace.receivables.save", token, { entityId: null, projectId: null, counterparty: "Persona QA", origin: "Préstamo personal", scope: "personal", amountCents: 180000, currency: "MXN", issuedAt: Date.now(), dueAt: null, paidAt: null, status: "pending", notes: null });
snapshot = await query("finance.workspace.get", token);
const transferRows = snapshot.transactions.filter(item => item.transferGroupId === transfer.groupId);
const receivableOrigins = snapshot.receivables.map(item => item.origin).sort();
const ymcReceivable = snapshot.receivables.find(item => item.counterparty === "Cliente YMC QA");
await call("finance.workspace.receivables.save", token, { id: ymcReceivable.id, entityId: ymcReceivable.entityId, projectId: null, counterparty: ymcReceivable.counterparty, origin: ymcReceivable.origin, scope: ymcReceivable.scope, amountCents: ymcReceivable.amountCents, currency: ymcReceivable.currency, issuedAt: new Date(ymcReceivable.issuedAt).getTime(), dueAt: new Date(ymcReceivable.dueAt).getTime(), paidAt: Date.now(), status: "paid", notes: null });
snapshot = await query("finance.workspace.get", token);
const paidReceivable = snapshot.receivables.find(item => item.id === ymcReceivable.id);
const report = {
  transferPair: transferRows.length === 2 && transferRows.some(item => item.type === "transfer_out" && item.accountId === santander.id) && transferRows.some(item => item.type === "transfer_in" && item.accountId === inbursa.id) && transferRows.every(item => item.amountCents === 125000),
  transferExcludedFromIncome: snapshot.dashboard.cashFlow.incomeCents === 0 && snapshot.dashboard.cashFlow.expenseCents === 0,
  receivablesByOrigin: JSON.stringify(receivableOrigins) === JSON.stringify(["Comisión ELM", "Préstamo personal", "Servicio de consultoría YMC"].sort()),
  statuses: paidReceivable?.status === "paid" && Boolean(paidReceivable?.paidAt) && snapshot.receivables.some(item => item.status === "overdue"),
  entityLinks: snapshot.receivables.some(item => item.entityId === ymc.id) && snapshot.receivables.some(item => item.entityId === elm.id) && snapshot.receivables.some(item => item.entityId === null),
};
if (!Object.values(report).every(Boolean)) throw new Error(`QA de traspasos/CxC falló: ${JSON.stringify(report)}`);
console.log(JSON.stringify({ ...report, qaEmail: account.email }));
