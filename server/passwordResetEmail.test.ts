import { afterEach, describe, expect, it, vi } from "vitest";
import { sendPasswordResetEmail } from "./passwordResetEmail";

describe("sendPasswordResetEmail", () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.RESEND_API_KEY;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });

  it("incluye un límite de espera para que el proveedor no bloquee la recuperación", async () => {
    process.env.RESEND_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    globalThis.fetch = fetchMock;

    await sendPasswordResetEmail({ to: "persona@example.com", resetUrl: "https://mexifinance-stkndi6z.manus.space/restablecer-contrasena?token=token-de-prueba" });

    expect(fetchMock).toHaveBeenCalledWith("https://api.resend.com/emails", expect.objectContaining({
      method: "POST",
      signal: expect.any(AbortSignal),
    }));
  });

  it("propaga un rechazo del proveedor para que el flujo elimine el token y conserve una respuesta no enumerativa", async () => {
    process.env.RESEND_API_KEY = "test-key";
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));

    await expect(sendPasswordResetEmail({ to: "persona@example.com", resetUrl: "https://mexifinance-stkndi6z.manus.space/restablecer-contrasena?token=token-de-prueba" })).rejects.toThrow("(503)");
  });
});
