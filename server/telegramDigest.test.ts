import { describe, expect, it } from "vitest";
import { buildTelegramDailyDigest, mexicoCityDateKey } from "./telegramDigest";

describe("resumen diario de Telegram", () => {
  it("incluye títulos de recordatorio sin montos ni datos bancarios", () => {
    const message = buildTelegramDailyDigest([{ title: "Pago próximo: HSBC Air" }, { title: "Sobregiro registrado: Klar" }], new Date("2026-08-25T12:00:00Z"));
    expect(message).toContain("Pago próximo: HSBC Air");
    expect(message).toContain("Sobregiro registrado: Klar");
    expect(message).not.toMatch(/\$|MXN|\d{4,}/);
  });

  it("deriva la clave diaria desde la hora de Ciudad de México", () => {
    expect(mexicoCityDateKey(new Date("2026-08-25T05:30:00Z"))).toBe("2026-08-24");
    expect(mexicoCityDateKey(new Date("2026-08-25T06:30:00Z"))).toBe("2026-08-25");
  });
});
