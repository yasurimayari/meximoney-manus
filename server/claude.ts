const CLAUDE_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_VERSION = "2023-06-01";
export const MEXI_CLAUDE_MODEL = "claude-sonnet-4-5";

type ClaudeTextBlock = {
  type: "text";
  text: string;
};

type ClaudeMessagesResponse = {
  content?: ClaudeTextBlock[];
};

export type MexiAnalysis = {
  answer: string;
  facts: Array<{ label: string; value: string; source: string; date?: string }>;
  calculations: Array<{ name: string; formula: string; substitution: string; result: string; source: string }>;
  assumptions: string[];
  recommendations: Array<{ title: string; rationale: string; priority: "alta" | "media" | "baja"; nextStep: string }>;
  warnings: string[];
  sources: Array<{ label: string; type: "internal" | "user" | "external"; detail: string }>;
  canExecute: false;
};

export class ClaudeRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaudeRequestError";
  }
}

function extractText(payload: ClaudeMessagesResponse) {
  const content = payload.content
    ?.filter((block): block is ClaudeTextBlock => block.type === "text" && typeof block.text === "string")
    .map(block => block.text.trim())
    .filter(Boolean)
    .join("\n\n");
  if (!content) throw new ClaudeRequestError("Claude no devolvió texto utilizable.");
  return content;
}

function parseAnalysis(content: string): MexiAnalysis {
  const candidate = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  let parsed: Partial<MexiAnalysis>;
  try {
    parsed = JSON.parse(candidate) as Partial<MexiAnalysis>;
  } catch {
    throw new ClaudeRequestError("Claude no devolvió una respuesta estructurada válida.");
  }

  if (typeof parsed.answer !== "string" || !parsed.answer.trim()) throw new ClaudeRequestError("La respuesta de Mexi no contiene un análisis válido.");
  const facts = Array.isArray(parsed.facts) ? parsed.facts.filter(item => item && typeof item === "object" && typeof item.label === "string" && typeof item.value === "string" && typeof item.source === "string") as MexiAnalysis["facts"] : [];
  const calculations = Array.isArray(parsed.calculations) ? parsed.calculations.filter(item => item && typeof item === "object" && typeof item.name === "string" && typeof item.formula === "string" && typeof item.substitution === "string" && typeof item.result === "string" && typeof item.source === "string") as MexiAnalysis["calculations"] : [];
  const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations.filter(item => item && typeof item === "object" && typeof item.title === "string" && typeof item.rationale === "string" && typeof item.nextStep === "string" && ["alta", "media", "baja"].includes(item.priority as string)) as MexiAnalysis["recommendations"] : [];
  const sources = Array.isArray(parsed.sources) ? parsed.sources.filter(item => item && typeof item === "object" && typeof item.label === "string" && typeof item.detail === "string" && ["internal", "user", "external"].includes(item.type as string)) as MexiAnalysis["sources"] : [];
  const assumptions = Array.isArray(parsed.assumptions) ? parsed.assumptions.filter(item => typeof item === "string") : [];
  const warnings = Array.isArray(parsed.warnings) ? parsed.warnings.filter(item => typeof item === "string") : [];
  return { answer: parsed.answer.trim(), facts, calculations, assumptions, recommendations, warnings, sources, canExecute: false };
}

export function formatMexiAnalysis(analysis: MexiAnalysis) {
  const section = (title: string, rows: string[]) => rows.length ? `\n\n### ${title}\n${rows.join("\n")}` : "";
  return [
    analysis.answer.trim(),
    section("Datos utilizados", analysis.facts.map(item => `- **${item.label}:** ${item.value} _(fuente: ${item.source}${item.date ? `; ${item.date}` : ""})_`)),
    section("Cálculos visibles", analysis.calculations.map(item => `- **${item.name}:**\n  - Fórmula: \`${item.formula}\`\n  - Sustitución: \`${item.substitution}\`\n  - Resultado: **${item.result}**\n  - Fuente: ${item.source}`)),
    section("Supuestos", analysis.assumptions.map(item => `- ${item}`)),
    section("Recomendaciones (sin ejecutar)", analysis.recommendations.map(item => `- **${item.title}** · prioridad ${item.priority}\n  - ${item.rationale}\n  - Próximo paso manual: ${item.nextStep}`)),
    section("Advertencias", analysis.warnings.map(item => `- ${item}`)),
    section("Fuentes", analysis.sources.map(item => `- **${item.label}** (${item.type}): ${item.detail}`)),
    "\n\n> Mexi IA solo analiza tus registros. No ejecuta pagos, transferencias, inversiones, compras, eliminaciones ni cambios de datos.",
  ].filter(Boolean).join("");
}

async function callClaude(input: { system: string; prompt: string; maxTokens?: number }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new ClaudeRequestError("La clave de Claude no está configurada en el servidor.");

  const response = await fetch(CLAUDE_MESSAGES_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": CLAUDE_VERSION,
      "x-api-key": apiKey,
    },
    signal: AbortSignal.timeout(45_000),
    body: JSON.stringify({
      model: MEXI_CLAUDE_MODEL,
      max_tokens: input.maxTokens ?? 2_400,
      system: input.system,
      messages: [{ role: "user", content: input.prompt }],
    }),
  });

  if (!response.ok) throw new ClaudeRequestError(`Claude respondió con estado ${response.status}.`);
  return extractText(await response.json() as ClaudeMessagesResponse);
}

export async function askClaudeForMexi(input: { system: string; prompt: string }) {
  return callClaude(input);
}

export async function askClaudeForMexiAnalysis(input: { system: string; prompt: string }) {
  const content = await callClaude({
    ...input,
    system: `${input.system}\n\nDevuelve exclusivamente un objeto JSON válido, sin markdown ni texto adicional, con esta forma exacta:\n{"answer":"string","facts":[{"label":"string","value":"string","source":"string","date":"string opcional"}],"calculations":[{"name":"string","formula":"string","substitution":"string","result":"string","source":"string"}],"assumptions":["string"],"recommendations":[{"title":"string","rationale":"string","priority":"alta|media|baja","nextStep":"string"}],"warnings":["string"],"sources":[{"label":"string","type":"internal|user|external","detail":"string"}],"canExecute":false}. No incluyas propiedades adicionales.\n\nReglas: solo usa datos suministrados; no inventes cifras; toda recomendación debe ser manual; muestra la fórmula cuando calcules; si faltan datos, dilo en warnings o assumptions; canExecute debe ser false.`,
  });
  return parseAnalysis(content);
}
