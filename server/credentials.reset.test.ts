import { describe, expect, it } from "vitest";
import { createPasswordResetToken, hashPasswordResetToken } from "./credentials";

describe("tokens de restablecimiento", () => {
  it("genera un token aleatorio y almacena sólo su hash", () => {
    const token = createPasswordResetToken();
    expect(token.length).toBeGreaterThan(30);
    expect(hashPasswordResetToken(token)).not.toBe(token);
    expect(hashPasswordResetToken(token)).toBe(hashPasswordResetToken(token));
  });
});
