import { describe, expect, it } from "vitest";
import { parseQuickCaptureDraft } from "./quickCapture";

describe("parseQuickCaptureDraft", () => {
  it("conserva sólo una propuesta válida y normaliza moneda e importe", () => {
    const draft = parseQuickCaptureDraft(JSON.stringify({ type: "expense", amountCents: 125050, currency: "mxn", occurredOn: "2026-08-25", scope: "personal", notes: "Notion", confidence: 92, needsReview: ["Confirmar categoría"] }));
    expect(draft).toMatchObject({ type: "expense", amountCents: 125050, currency: "MXN", occurredOn: "2026-08-25", scope: "personal", notes: "Notion" });
  });

  it("descarta campos ambiguos para exigir revisión humana", () => {
    const draft = parseQuickCaptureDraft(JSON.stringify({ type: "other", amountCents: -20, currency: "pesos", occurredOn: "mañana", scope: "empresa", notes: 22, confidence: 130, needsReview: ["importe", 4] }));
    expect(draft).toEqual({ type: "unknown", amountCents: null, currency: null, occurredOn: null, scope: "unknown", notes: "", confidence: 100, needsReview: ["importe"] });
  });
});
