import { describe, expect, it } from "vitest";
import { buildSecurityActivityCsv, buildSecurityActivityExportRows } from "./securityActivityExport";

describe("securityActivityExport", () => {
  it("prepara sólo fecha, actividad y canal sin secretos ni datos personales", () => {
    const rows = buildSecurityActivityExportRows([
      { eventType: "password_changed", channel: "email", createdAt: new Date("2026-08-26T12:00:00.000Z") },
    ]);
    const csv = buildSecurityActivityCsv(rows);

    expect(rows[0]).toMatchObject({ Actividad: "Contraseña cambiada desde sesión", Canal: "Correo" });
    expect(Object.keys(rows[0]!)).toEqual(["Fecha", "Actividad", "Canal"]);
    expect(csv).not.toMatch(/correo@example|token|hash|contraseña-actual/i);
  });
});
