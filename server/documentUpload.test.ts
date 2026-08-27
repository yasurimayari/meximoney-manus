import { describe, expect, it } from "vitest";
import { decodePdfUpload } from "./documentUpload";

describe("carga privada de PDF", () => {
  it("acepta un PDF con firma válida y limpia su nombre para almacenamiento", () => {
    const result = decodePdfUpload({ fileName: "Contrato moto 2026.pdf", mimeType: "application/pdf", base64: Buffer.from("%PDF-1.7 ejemplo").toString("base64") });
    expect(result.safeFileName).toBe("Contrato_moto_2026.pdf");
    expect(result.bytes.toString("ascii")).toContain("%PDF");
  });

  it("rechaza tipos y contenido que no corresponden a PDF", () => {
    expect(() => decodePdfUpload({ fileName: "imagen.png", mimeType: "image/png", base64: "aG9sYQ==" })).toThrow("únicamente un archivo PDF");
    expect(() => decodePdfUpload({ fileName: "falso.pdf", mimeType: "application/pdf", base64: Buffer.from("texto").toString("base64") })).toThrow("firma PDF");
  });
});
