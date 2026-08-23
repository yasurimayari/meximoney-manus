const baseUrl = "http://127.0.0.1:3000";
const account = { name: "QA Perfil Privado", email: "qa-profile-meximoney-20260823@example.invalid", password: "PerfilPrivadoQA#2026" };
const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLixQAAAABJRU5ErkJggg==";

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
await call("finance.privacy.recordConsent", token, { accepted: true, policyVersion: "profile-qa-v1" });
let rejectedWithoutConsent = false;
try { await call("finance.profile.save", token, { currency: "MXN", displayName: "Perfil QA", contactEmail: "qa-profile@example.invalid", householdSize: 1, dependents: 0, minimumLiquidityCents: 0, referenceEssentialExpensesCents: 0, futureTaxReserveCents: 0, personalProfileConsent: false }); } catch { rejectedWithoutConsent = true; }
await call("finance.profile.save", token, { currency: "MXN", displayName: "Perfil QA", birthDate: Date.UTC(1990, 0, 2, 12), residenceCity: "Ciudad de México", contactEmail: "qa-profile@example.invalid", householdSize: 1, dependents: 0, minimumLiquidityCents: 0, referenceEssentialExpensesCents: 0, futureTaxReserveCents: 0, personalProfileConsent: true });
const saved = await query("finance.profile.get", token);
const upload = await call("finance.profile.uploadAvatar", token, { dataUrl: tinyPng, confirmedPersonalDataConsent: true });
const withAvatar = await query("finance.profile.get", token);
await call("finance.profile.removeAvatar", token, null);
const removedAvatar = await query("finance.profile.get", token);
const report = { rejectedWithoutConsent, personalFieldsPersisted: saved.displayName === "Perfil QA" && saved.residenceCity === "Ciudad de México" && saved.contactEmail === "qa-profile@example.invalid" && saved.personalProfileConsent === true, avatarStored: Boolean(upload.url && withAvatar.avatarUrl === upload.url && withAvatar.avatarKey), avatarRemoved: removedAvatar.avatarUrl === null && removedAvatar.avatarKey === null };
if (!Object.values(report).every(Boolean)) throw new Error(`QA de perfil privado falló: ${JSON.stringify(report)}`);
console.log(JSON.stringify(report));
