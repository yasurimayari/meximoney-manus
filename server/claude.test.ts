import { afterEach, describe, expect, it, vi } from "vitest";
import { askClaudeForMexi, MEXI_CLAUDE_MODEL } from "./claude";

describe("askClaudeForMexi", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("llama a Claude sólo desde el servidor y devuelve bloques de texto", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "clave-de-prueba-no-publica");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ content: [{ type: "text", text: "Análisis manual." }, { type: "text", text: "Sin acciones." }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(askClaudeForMexi({ system: "Instrucciones", prompt: "Datos manuales" })).resolves.toBe("Análisis manual.\n\nSin acciones.");
    expect(fetchMock).toHaveBeenCalledWith("https://api.anthropic.com/v1/messages", expect.objectContaining({
      method: "POST",
      headers: expect.objectContaining({ "x-api-key": "clave-de-prueba-no-publica", "anthropic-version": "2023-06-01" }),
    }));
    const [, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(request.body))).toMatchObject({ model: MEXI_CLAUDE_MODEL, system: "Instrucciones", messages: [{ role: "user", content: "Datos manuales" }] });
  });

  it("falla sin revelar la clave cuando Claude rechaza la petición", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "clave-de-prueba-no-publica");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("no autorizado", { status: 401 })));

    await expect(askClaudeForMexi({ system: "Instrucciones", prompt: "Datos manuales" })).rejects.toThrow("estado 401");
  });
});
