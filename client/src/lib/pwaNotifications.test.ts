import { describe, expect, it } from "vitest";
import { pwaInboxNotificationContent, shouldShowPwaInboxNotification } from "./pwaNotifications";

describe("pwaInboxNotificationContent", () => {
  it("mantiene el aviso genérico y sólo expone el conteo de recordatorios", () => {
    expect(pwaInboxNotificationContent(1)).toEqual({ title: "Richeon", body: "Tienes 1 recordatorio nuevo para revisar." });
    expect(pwaInboxNotificationContent(3)).toEqual({ title: "Richeon", body: "Tienes 3 recordatorios nuevos para revisar." });
    expect(pwaInboxNotificationContent(3).body).not.toMatch(/\$|MXN|Santander|deuda|saldo|movimiento/i);
  });

  it("nunca entrega un aviso si falta una condición de consentimiento o no hay recordatorios nuevos", () => {
    expect(shouldShowPwaInboxNotification({ createdCount: 2, enabledOnDevice: true, permission: "granted", serviceWorkerSupported: true })).toBe(true);
    expect(shouldShowPwaInboxNotification({ createdCount: 0, enabledOnDevice: true, permission: "granted", serviceWorkerSupported: true })).toBe(false);
    expect(shouldShowPwaInboxNotification({ createdCount: 2, enabledOnDevice: false, permission: "granted", serviceWorkerSupported: true })).toBe(false);
    expect(shouldShowPwaInboxNotification({ createdCount: 2, enabledOnDevice: true, permission: "default", serviceWorkerSupported: true })).toBe(false);
    expect(shouldShowPwaInboxNotification({ createdCount: 2, enabledOnDevice: true, permission: "granted", serviceWorkerSupported: false })).toBe(false);
  });
});
