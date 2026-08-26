import { describe, expect, it } from "vitest";
import { askClaudeForMexi } from "./claude";

const apiKey = process.env.ANTHROPIC_API_KEY;
const shouldValidateCredential = process.env.VALIDATE_ANTHROPIC_CREDENTIAL === "true";

describe("Anthropic server credential", () => {
  it.skipIf(!apiKey || !shouldValidateCredential)("autentica una petición mínima de conteo sin exponer la clave", async () => {
    const response = await fetch("https://api.anthropic.com/v1/messages/count_tokens", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey!,
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        messages: [{ role: "user", content: "Verificación de conexión." }],
      }),
    });

    expect(response.ok).toBe(true);
    const payload = await response.json() as { input_tokens?: number };
    expect(payload.input_tokens).toBeTypeOf("number");
  }, 20_000);

  it.skipIf(!apiKey || !shouldValidateCredential)("obtiene una respuesta mínima mediante el cliente de Mexi", async () => {
    const response = await askClaudeForMexi({
      system: "Responde únicamente con la palabra: listo.",
      prompt: "Verifica la conexión.",
    });

    expect(response.trim().length).toBeGreaterThan(0);
  }, 45_000);
});
