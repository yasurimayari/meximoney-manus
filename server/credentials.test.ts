import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./credentials";

describe("credenciales locales", () => {
  it("verifica solo la contraseña que generó el hash", async () => {
    const hash = await hashPassword("UnaClaveMuyLarga#2026");

    await expect(verifyPassword("UnaClaveMuyLarga#2026", hash)).resolves.toBe(true);
    await expect(verifyPassword("OtraClaveMuyLarga#2026", hash)).resolves.toBe(false);
  });
});
