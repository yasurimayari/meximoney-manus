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

export class ClaudeRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaudeRequestError";
  }
}

export async function askClaudeForMexi(input: { system: string; prompt: string }) {
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
      max_tokens: 1_200,
      system: input.system,
      messages: [{ role: "user", content: input.prompt }],
    }),
  });

  if (!response.ok) throw new ClaudeRequestError(`Claude respondió con estado ${response.status}.`);

  const payload = await response.json() as ClaudeMessagesResponse;
  const content = payload.content
    ?.filter((block): block is ClaudeTextBlock => block.type === "text" && typeof block.text === "string")
    .map(block => block.text.trim())
    .filter(Boolean)
    .join("\n\n");

  if (!content) throw new ClaudeRequestError("Claude no devolvió texto utilizable.");
  return content;
}
