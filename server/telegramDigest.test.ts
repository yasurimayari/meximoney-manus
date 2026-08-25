import { describe, expect, it } from "vitest";
import { buildTelegramDailyDigest } from "./telegramDigest";

describe("resumen diario de Telegram", () => {
  it("incluye títulos de recordatorio sin montos ni datos bancarios", () => {
    const message = buildTelegramDailyDigest([{ title: "Pago próximo: HSBC Air" }, { title: "Sobregiro registrado: Klar" }], new Date("2026-08-25T12:00:00"));

    expect(message).toContain("Pago próximo: HSBC Air");
    expect(message).toContain("Sobregiro registrado: Klar");
    expect(message).not.toMatch(/\$|MXN|\d{4,}/);
  });
});
