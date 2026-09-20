const OFFLINE_DATABASE = "meximoney-offline-vault";
const OFFLINE_STORE = "vault";
const OFFLINE_RECORD_ID = "personal-finance-snapshot";
const OFFLINE_SCHEMA_VERSION = 2;
const ITERATIONS = 250_000;
const MAX_FAILED_ATTEMPTS = 5;
const MAX_LOCK_MS = 15 * 60 * 1000;
const PWA_ICON_PATH = "/manus-storage/richeon-pwa-icon-192_11693d42.png";

type EncryptedOfflineRecord = {
  id: string;
  version: number;
  ownerUserId: number;
  createdAt: string;
  salt: number[];
  iv: number[];
  ciphertext: number[];
  failedAttempts: number;
  lockedUntil: number | null;
};

export type OfflineVaultStatus = {
  ownerUserId: number;
  cachedAt: string;
};

export type OfflineSnapshotSummary = {
  cachedAt: string;
  accounts: number;
  creditCards: number;
  debts: number;
  transactions: number;
  budgets: number;
  investments: number;
  calendarEvents: number;
  tasks: number;
  travelPlans: number;
};

export type OfflineSnapshot = {
  version: 2;
  cachedAt: string;
  profile: Record<string, unknown> | null;
  dashboard: unknown;
  categories: unknown[];
  accounts: unknown[];
  creditCards: unknown[];
  debts: unknown[];
  transactions: unknown[];
  budgets: unknown[];
  investments: unknown[];
  investmentOperations: unknown[];
  goals: unknown[];
  calendarEvents: unknown[];
  statements: unknown[];
  fiscalRecords: unknown[];
  documents: unknown[];
  tasks: unknown[];
  travelPlans: unknown[];
};

function openVaultDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(OFFLINE_DATABASE, OFFLINE_SCHEMA_VERSION);
    request.onerror = () => reject(request.error ?? new Error("No fue posible abrir el almacenamiento local."));
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(OFFLINE_STORE)) request.result.createObjectStore(OFFLINE_STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("No fue posible acceder al almacenamiento local."));
  });
}

async function getRecord() {
  const database = await openVaultDatabase();
  try {
    return await requestResult(database.transaction(OFFLINE_STORE, "readonly").objectStore(OFFLINE_STORE).get(OFFLINE_RECORD_ID) as IDBRequest<EncryptedOfflineRecord | undefined>);
  } finally {
    database.close();
  }
}

async function putRecord(record: EncryptedOfflineRecord) {
  const database = await openVaultDatabase();
  try {
    await requestResult(database.transaction(OFFLINE_STORE, "readwrite").objectStore(OFFLINE_STORE).put(record));
  } finally {
    database.close();
  }
}

function safeProfile(profile: any) {
  if (!profile) return null;
  const { avatarKey, avatarUrl, birthDate, contactEmail, residenceCity, residenceCountry, taxResidence, notes, ...safe } = profile;
  return safe;
}

function safeDocument(document: any) {
  const { referenceUrl, fileUrl, fileKey, notes, ...safe } = document;
  return safe;
}

export function createOfflineSnapshot(source: any): OfflineSnapshot {
  const cachedAt = new Date().toISOString();
  return {
    version: 2,
    cachedAt,
    profile: safeProfile(source?.profile),
    dashboard: source?.dashboard ?? null,
    categories: source?.categories ?? [],
    accounts: source?.accounts ?? [],
    creditCards: source?.creditCards ?? [],
    debts: source?.debts ?? [],
    transactions: source?.transactions ?? [],
    budgets: source?.budgets ?? [],
    investments: source?.investments ?? [],
    investmentOperations: source?.investmentOperations ?? [],
    goals: source?.goals ?? [],
    calendarEvents: source?.calendarEvents ?? [],
    statements: source?.statements ?? [],
    fiscalRecords: source?.fiscalRecords ?? [],
    documents: (source?.documents ?? []).map(safeDocument),
    tasks: source?.tasks ?? [],
    travelPlans: source?.travelPlans ?? [],
  };
}

export function offlineSnapshotSummary(snapshot: OfflineSnapshot) {
  return {
    cachedAt: snapshot.cachedAt,
    accounts: snapshot.accounts.length,
    creditCards: snapshot.creditCards.length,
    debts: snapshot.debts.length,
    transactions: snapshot.transactions.length,
    budgets: snapshot.budgets.length,
    investments: snapshot.investments.length,
    calendarEvents: snapshot.calendarEvents.length,
    tasks: snapshot.tasks.length,
    travelPlans: snapshot.travelPlans.length,
  };
}

function cryptoBuffer(bytes: Uint8Array | number[]) {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy.buffer;
}

async function deriveKey(pin: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: cryptoBuffer(salt), iterations: ITERATIONS, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

function requireSecureLocalEnvironment() {
  if (!globalThis.isSecureContext || !globalThis.crypto?.subtle || !globalThis.indexedDB) throw new Error("La bóveda offline requiere un navegador moderno y una conexión HTTPS segura.");
}

export async function saveOfflineSnapshot(source: any, pin: string, ownerUserId: number) {
  requireSecureLocalEnvironment();
  if (pin.length < 8) throw new Error("Usa un código local de al menos 8 caracteres.");
  if (!Number.isInteger(ownerUserId) || ownerUserId <= 0) throw new Error("No se pudo vincular la copia con tu cuenta.");
  const snapshot = createOfflineSnapshot(source);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: cryptoBuffer(iv) }, key, new TextEncoder().encode(JSON.stringify(snapshot))));
  const record: EncryptedOfflineRecord = { id: OFFLINE_RECORD_ID, version: OFFLINE_SCHEMA_VERSION, ownerUserId, createdAt: snapshot.cachedAt, salt: Array.from(salt), iv: Array.from(iv), ciphertext: Array.from(ciphertext), failedAttempts: 0, lockedUntil: null };
  await putRecord(record);
  cachePersonalAppShell();
  return offlineSnapshotSummary(snapshot);
}

export async function getOfflineVaultStatus(): Promise<OfflineVaultStatus | null> {
  const record = await getRecord();
  if (!record || record.version !== OFFLINE_SCHEMA_VERSION || !record.ownerUserId) return null;
  return { ownerUserId: record.ownerUserId, cachedAt: record.createdAt };
}

export async function getOfflineVaultOwnerId() {
  return (await getOfflineVaultStatus())?.ownerUserId ?? null;
}

export async function unlockOfflineSnapshot(pin: string, expectedOwnerUserId?: number): Promise<OfflineSnapshot> {
  requireSecureLocalEnvironment();
  const record = await getRecord();
  if (!record || record.version !== OFFLINE_SCHEMA_VERSION) throw new Error("La copia offline necesita actualizarse desde Meximoney en línea.");
  if (expectedOwnerUserId && record.ownerUserId !== expectedOwnerUserId) throw new Error("Esta copia offline pertenece a otra cuenta y fue bloqueada para protegerla.");
  if (record.lockedUntil && record.lockedUntil > Date.now()) {
    const seconds = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    throw new Error(`La bóveda está temporalmente bloqueada. Inténtalo de nuevo en ${seconds} segundos.`);
  }
  try {
    const key = await deriveKey(pin, new Uint8Array(record.salt));
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: cryptoBuffer(record.iv) }, key, cryptoBuffer(record.ciphertext));
    return JSON.parse(new TextDecoder().decode(decrypted)) as OfflineSnapshot;
  } catch {
    const failedAttempts = record.failedAttempts + 1;
    const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;
    const lockDuration = shouldLock ? Math.min(MAX_LOCK_MS, 30_000 * 2 ** Math.min(failedAttempts - MAX_FAILED_ATTEMPTS, 5)) : 0;
    await putRecord({ ...record, failedAttempts, lockedUntil: shouldLock ? Date.now() + lockDuration : null });
    throw new Error(shouldLock ? "Código incorrecto. La bóveda se bloqueó temporalmente por demasiados intentos." : "El código local no coincide o la copia offline no puede abrirse.");
  }
}

export async function clearOfflineVault() {
  if (!globalThis.indexedDB) return;
  const database = await openVaultDatabase();
  try {
    await requestResult(database.transaction(OFFLINE_STORE, "readwrite").objectStore(OFFLINE_STORE).delete(OFFLINE_RECORD_ID));
  } finally {
    database.close();
  }
}

export function cachePersonalAppShell() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.ready.then(registration => {
    const resources = performance.getEntriesByType("resource").map(entry => entry.name).filter(url => url.startsWith(window.location.origin) && !url.includes("/api/") && !url.includes("/manus-storage/"));
    registration.active?.postMessage({ type: "CACHE_PERSONAL_SHELL", urls: Array.from(new Set(["/offline", "/manifest.webmanifest", PWA_ICON_PATH, ...resources])) });
  }).catch(() => undefined);
}
