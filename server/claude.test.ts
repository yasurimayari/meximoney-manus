import { afterEach, describe, expect, it, vi } from "vitest";
import { askClaudeForMexi, askClaudeForMexiAnalysis, formatMexiAnalysis, MEXI_CLAUDE_MODEL } from "./claude";

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

  it("parsea una respuesta estructurada y siempre conserva canExecute en false", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "clave-de-prueba-no-publica");
    const structured = { answer: "Tu flujo neto es positivo.", facts: [{ label: "Ingresos", value: "$10,000 MXN", source: "Panel de Meximoney" }], calculations: [{ name: "Flujo neto", formula: "ingresos - gastos", substitution: "10,000 - 7,000", result: "3,000 MXN", source: "Panel de Meximoney" }], assumptions: ["Se usan movimientos confirmados."], recommendations: [{ title: "Revisar presupuesto", rationale: "Hay una desviación.", priority: "media", nextStep: "Abrir Presupuesto y confirmar manualmente." }], warnings: [], sources: [{ label: "Registros internos", type: "internal", detail: "Snapshot privado de la usuaria." }], canExecute: true };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content: JSON.stringify(structured) } }] }), { status: 200 })));

    const analysis = await askClaudeForMexiAnalysis({ system: "Instrucciones", prompt: "Datos manuales" });
    expect(analysis.canExecute).toBe(false);
    expect(formatMexiAnalysis(analysis)).toContain("Fórmula: `ingresos - gastos`");
    expect(formatMexiAnalysis(analysis)).toContain("Recomendaciones (sin ejecutar)");
  });

  it("rechaza respuestas no estructuradas", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "clave-de-prueba-no-publica");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content: "respuesta libre" } }] }), { status: 200 })));
    await expect(askClaudeForMexiAnalysis({ system: "Instrucciones", prompt: "Datos manuales" })).rejects.toThrow("estructurada válida");
  });

  it("acepta JSON estructurado encapsulado sin relajar la validación", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "clave-de-prueba-no-publica");
    const structured = { answer: "Respuesta recuperada.", facts: [], calculations: [], assumptions: [], recommendations: [], warnings: [], sources: [], canExecute: false };
    const wrapped = "Aquí está el análisis:\n```json\n" + JSON.stringify(structured) + "\n```";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content: wrapped } }] }), { status: 200 })));

    await expect(askClaudeForMexiAnalysis({ system: "Instrucciones", prompt: "Datos manuales" })).resolves.toMatchObject({ answer: "Respuesta recuperada.", canExecute: false });
  });

  it("reintenta una respuesta transitoria de Claude antes de fallar", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "clave-de-prueba-no-publica");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("temporal", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ content: [{ type: "text", text: "Análisis recuperado." }] }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(askClaudeForMexi({ system: "Instrucciones", prompt: "Datos manuales" })).resolves.toBe("Análisis recuperado.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falla sin revelar la clave cuando Claude rechaza la petición", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "clave-de-prueba-no-publica");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("no autorizado", { status: 401 })));

    await expect(askClaudeForMexi({ system: "Instrucciones", prompt: "Datos manuales" })).rejects.toThrow("estado 401");
  });
});
