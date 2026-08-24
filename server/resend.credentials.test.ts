import { describe, expect, it } from "vitest";

describe("credenciales de Resend", () => {
  it("pueden consultar el dominio remitente y reconocer su estado antes de permitir envíos", async () => {
    const key = process.env.RESEND_API_KEY;
    expect(key).toBeTruthy();
    const response = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } });
    expect(response.ok).toBe(true);
    const payload = await response.json() as { data?: { name?: string; status?: string }[] };
    const domain = payload.data?.find(item => item.name === "mexi.richeon.app");
    expect(domain?.status).toMatch(/^(pending|verified)$/);
  }, 20_000);
});
