const baseUrl = "http://127.0.0.1:3000";
const account = { name: "QA Notificaciones", email: "qa-notifications-meximoney-20260823@example.invalid", password: "NotificacionesQA#2026" };
const secondAccount = { name: "QA Notificaciones Dos", email: "qa-notifications-second-meximoney-20260823@example.invalid", password: "NotificacionesQA#2026" };

async function call(path, token, input) {
  const response = await fetch(`${baseUrl}/api/trpc/${path}?batch=1`, { method: "POST", headers: { "content-type": "application/json", ...(token ? { "X-Meximoney-Session": token } : {}) }, body: JSON.stringify({ 0: { json: input } }) });
  const payload = await response.json();
  if (!response.ok || payload[0]?.error) throw new Error(payload[0]?.error?.json?.message ?? `Error ${response.status}`);
  return payload[0].result.data.json;
}
async function query(path, token) { const response = await fetch(`${baseUrl}/api/trpc/${path}?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: { json: null } }))}`, { headers: { "X-Meximoney-Session": token } }); const payload = await response.json(); if (!response.ok || payload[0]?.error) throw new Error(payload[0]?.error?.json?.message ?? `Error ${response.status}`); return payload[0].result.data.json; }
async function register(person) { try { return (await call("auth.register", null, person)).sessionToken; } catch { return (await call("auth.login", null, { email: person.email, password: person.password })).sessionToken; } }

const token = await register(account);
const secondToken = await register(secondAccount);
let consentRequired = false;
try { await query("finance.notifications.get", secondToken); } catch { consentRequired = true; }
await call("finance.privacy.recordConsent", token, { accepted: true, policyVersion: "notifications-qa-v1" });
await call("finance.workspace.onboarding", token, { workspaceName: "Espacio QA Notificaciones", currency: "MXN", residenceCountry: "México", taxResidence: "México", taxRegime: "pfae_general", exchangeRatePolicy: "manual", humanReviewRequired: true, entities: [{ name: "Entidad QA", shortCode: "NQA", countryCode: "MX", legalForm: "pfae", status: "active", functionalCurrency: "MXN", taxRegime: "pfae_general", notes: null }] });
const workspace = await query("finance.workspace.get", token);
await call("finance.calendar.save", token, { title: "Evento QA de notificación", eventType: "review", scope: "personal", entityId: workspace.entities[0].id, projectId: null, startsAt: Date.now() + 24 * 60 * 60 * 1000, endsAt: null, recurrence: "none", amountCents: null, currency: "MXN", linkedDebtId: null, linkedDocumentId: null, linkedTaskId: null, status: "planned", notes: "QA privada" });
const first = await query("finance.notifications.get", token);
const calendarNotification = first.notifications.find(item => item.type === "calendar");
await call("finance.notifications.savePreferences", token, { inAppEnabled: true, calendarEnabled: true, documentsEnabled: true, debtsEnabled: true, reviewsEnabled: true });
await call("finance.privacy.recordConsent", secondToken, { accepted: true, policyVersion: "notifications-qa-v1" });
await call("finance.notifications.savePreferences", secondToken, { inAppEnabled: false, calendarEnabled: false, documentsEnabled: false, debtsEnabled: false, reviewsEnabled: false });
await call("finance.notifications.markRead", secondToken, { id: calendarNotification.id });
const isolated = await query("finance.notifications.get", token);
await call("finance.notifications.savePreferences", token, { inAppEnabled: true, calendarEnabled: true, documentsEnabled: false, debtsEnabled: false, reviewsEnabled: true });
await call("finance.notifications.markRead", token, { id: calendarNotification.id });
const read = await query("finance.notifications.get", token);
await call("finance.notifications.dismiss", token, { id: calendarNotification.id });
const dismissed = await query("finance.notifications.get", token);
const silenced = await query("finance.notifications.get", secondToken);
const report = { consentRequired, defaultsLoaded: first.preferences.inAppEnabled === true, calendarCreated: Boolean(calendarNotification), ownerIsolation: isolated.preferences.inAppEnabled && isolated.notifications.some(item => item.id === calendarNotification.id && !item.readAt), preferencesSaved: read.preferences.documentsEnabled === false && read.preferences.debtsEnabled === false, markRead: read.notifications.some(item => item.id === calendarNotification.id && item.readAt), dismiss: !dismissed.notifications.some(item => item.id === calendarNotification.id), globalSilence: silenced.notifications.length === 0 };
if (!Object.values(report).every(Boolean)) throw new Error(`QA de notificaciones falló: ${JSON.stringify(report)}`);
console.log(JSON.stringify(report));
