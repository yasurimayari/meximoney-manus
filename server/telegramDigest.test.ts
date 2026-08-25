import { describe, expect, it } from "vitest";
import { buildTelegramDailyDigest, mexicoCityDateKey } from "./telegramDigest";

describe("resumen diario de Telegram", () => {
  it("incluye los importes y saldos autorizados, pero elimina números con aspecto de cuenta desde títulos", () => {
    const message = buildTelegramDailyDigest([
      { title: "Pago próximo: HSBC Air", details: ["Fecha: 27 de agosto (en 2 días)", "Saldo registrado: $39,057.64"] },
      { title: "Sobregiro registrado: Klar 123456", details: ["Saldo registrado: $2,400.00"] },
    ], new Date("2026-08-25T12:00:00Z"));
    expect(message).toContain("Pago próximo: HSBC Air");
    expect(message).toContain("Saldo registrado: $39,057.64");
    expect(message).toContain("Fecha: 27 de agosto (en 2 días)");
    expect(message).toContain("Sobregiro registrado: Klar ••••");
    expect(message).not.toContain("123456");
  });

  it("deriva la clave diaria desde la hora de Ciudad de México", () => {
    expect(mexicoCityDateKey(new Date("2026-08-25T05:30:00Z"))).toBe("2026-08-24");
    expect(mexicoCityDateKey(new Date("2026-08-25T06:30:00Z"))).toBe("2026-08-25");
  });
});
