import { describe, expect, it } from "vitest";

describe("credenciales privadas de Telegram", () => {
  it("valida el token del bot mediante el endpoint ligero getMe", async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    expect(token).toBeTruthy();

    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    expect(response.ok).toBe(true);
    const payload = await response.json() as { ok?: boolean };
    expect(payload.ok).toBe(true);
  }, 15_000);
});
