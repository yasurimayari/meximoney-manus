const baseUrl = "http://127.0.0.1:3000";
const owner = { name: "QA Aislamiento Propietaria", email: "qa-transfer-owner-meximoney-20260824@example.invalid", password: "AislamientoPropietaria#2026" };
const other = { name: "QA Aislamiento Otra", email: "qa-transfer-other-meximoney-20260824@example.invalid", password: "AislamientoOtra#2026" };

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

async function setup(account, label) {
  let token;
  try { token = (await call("auth.register", null, account)).sessionToken; } catch { token = (await call("auth.login", null, { email: account.email, password: account.password })).sessionToken; }
  await call("finance.privacy.recordConsent", token, { accepted: true, policyVersion: "transfers-receivables-isolation-v1" });
  await call("finance.workspace.onboarding", token, { workspaceName: `Espacio ${label}`, currency: "MXN", residenceCountry: "México", taxResidence: "México", taxRegime: "pfae_general", exchangeRatePolicy: "manual", humanReviewRequired: true, entities: [{ name: `Entidad ${label}`, shortCode: label.slice(0, 3).toUpperCase(), countryCode: "MX", legalForm: "pfae", status: "active", functionalCurrency: "MXN", taxRegime: "pfae_general", notes: null }] });
  return token;
}

const ownerToken = await setup(owner, "Propietaria QA");
await call("finance.accounts.save", ownerToken, { name: "Origen aislado", type: "bank", scope: "personal", entityId: null, projectId: null, currentValueCents: 100000, currency: "MXN", isLiquid: true, valuationDate: Date.now(), status: "active", notes: null });
await call("finance.accounts.save", ownerToken, { name: "Destino aislado", type: "bank", scope: "personal", entityId: null, projectId: null, currentValueCents: 0, currency: "MXN", isLiquid: true, valuationDate: Date.now(), status: "active", notes: null });
let ownerSnapshot = await query("finance.workspace.get", ownerToken);
const transfer = await call("finance.workspace.transferSave", ownerToken, { sourceAccountId: ownerSnapshot.accounts[0].id, destinationAccountId: ownerSnapshot.accounts[1].id, amountCents: 20000, occurredAt: Date.now(), status: "confirmed", notes: "Aislamiento" });
await call("finance.workspace.receivables.save", ownerToken, { entityId: null, projectId: null, counterparty: "CxC privada", origin: "Prueba de aislamiento", scope: "personal", amountCents: 50000, currency: "MXN", issuedAt: Date.now(), dueAt: null, paidAt: null, status: "pending", notes: null });
ownerSnapshot = await query("finance.workspace.get", ownerToken);
const ownerReceivable = ownerSnapshot.receivables.find(item => item.counterparty === "CxC privada");
await call("finance.workspace.receivables.paymentSave", ownerToken, { receivableId: ownerReceivable.id, linkedTransactionId: null, amountCents: 20000, currency: "MXN", paidAt: Date.now(), notes: "Abono privado" });
ownerSnapshot = await query("finance.workspace.get", ownerToken);
const ownerPayment = ownerSnapshot.receivablePayments.find(item => item.receivableId === ownerReceivable.id);
const otherToken = await setup(other, "Otra QA");
const otherBefore = await query("finance.workspace.get", otherToken);
await call("finance.workspace.receivables.remove", otherToken, { id: ownerReceivable.id });
await call("finance.workspace.transferRemove", otherToken, { transferGroupId: transfer.groupId });
await call("finance.workspace.receivables.paymentRemove", otherToken, { id: ownerPayment.id });
let paymentSaveBlocked = false;
try { await call("finance.workspace.receivables.paymentSave", otherToken, { receivableId: ownerReceivable.id, linkedTransactionId: null, amountCents: 1, currency: "MXN", paidAt: Date.now(), notes: null }); } catch { paymentSaveBlocked = true; }
const ownerAfter = await query("finance.workspace.get", ownerToken);
const report = {
  separateViews: !otherBefore.receivables.some(item => item.counterparty === "CxC privada") && !otherBefore.receivablePayments.some(item => item.id === ownerPayment.id) && !otherBefore.transactions.some(item => item.transferGroupId === transfer.groupId),
  protectedReceivable: ownerAfter.receivables.some(item => item.id === ownerReceivable.id),
  protectedPayment: paymentSaveBlocked && ownerAfter.receivablePayments.some(item => item.id === ownerPayment.id),
  protectedTransfer: ownerAfter.transactions.filter(item => item.transferGroupId === transfer.groupId).length === 2,
};
if (!Object.values(report).every(Boolean)) throw new Error(`QA de aislamiento falló: ${JSON.stringify(report)}`);
console.log(JSON.stringify({ ...report, ownerEmail: owner.email, otherEmail: other.email }));
