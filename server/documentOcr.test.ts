import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeLLM } = vi.hoisted(() => ({ invokeLLM: vi.fn() }));
vi.mock("./_core/llm", () => ({ invokeLLM }));

import { extractDocumentOcr } from "./documentOcr";

describe("extractDocumentOcr", () => {
  beforeEach(() => invokeLLM.mockReset());

  it("devuelve una propuesta estructurada y no contiene instrucciones de creación de movimientos", async () => {
    invokeLLM.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({
      suggestedName: "Factura proveedor", suggestedType: "invoice", issuer: "Proveedor SA", documentNumber: "A-102", issuedOn: "2026-09-10", dueOn: null, totalCents: 125000, currency: "MXN", taxIdentifier: null, reference: "REF-1", summary: "Factura de servicios", confidence: "high", warnings: [], fields: [{ label: "Total", value: "$1,250.00", confidence: "high" }],
    }) } }] });
    const result = await extractDocumentOcr({ signedUrl: "https://private.example/file.png", mimeType: "image/png", fileName: "factura.png" });
    expect(result.suggestedName).toBe("Factura proveedor");
    expect(result.totalCents).toBe(125000);
    expect(invokeLLM.mock.calls[0][0].messages[0].content).toContain("Nunca sugieras ni ejecutes crear movimientos");
  });
});
