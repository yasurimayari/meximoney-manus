import { describe, expect, it } from "vitest";
import { decodeDocumentUpload, decodePdfUpload } from "./documentUpload";

describe("carga privada de PDF", () => {
  it("acepta un PDF con firma válida y limpia su nombre para almacenamiento", () => {
    const result = decodePdfUpload({ fileName: "Contrato moto 2026.pdf", mimeType: "application/pdf", base64: Buffer.from("%PDF-1.7 ejemplo").toString("base64") });
    expect(result.safeFileName).toBe("Contrato_moto_2026.pdf");
    expect(result.bytes.toString("ascii")).toContain("%PDF");
  });

  it("rechaza tipos y contenido que no corresponden a PDF", () => {
    expect(() => decodePdfUpload({ fileName: "imagen.png", mimeType: "image/png", base64: "aG9sYQ==" })).toThrow("únicamente un archivo PDF");
    expect(() => decodePdfUpload({ fileName: "falso.pdf", mimeType: "application/pdf", base64: Buffer.from("texto").toString("base64") })).toThrow("no coincide con el tipo declarado");
  });
});

describe("carga de comprobantes compatibles con OCR", () => {
  it("acepta PNG y JPG con sus firmas reales", () => {
    const png = decodeDocumentUpload({ fileName: "ticket tienda", mimeType: "image/png", base64: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]).toString("base64") });
    const jpg = decodeDocumentUpload({ fileName: "ticket.jpg", mimeType: "image/jpeg", base64: Buffer.from([0xff, 0xd8, 0xff, 0x00]).toString("base64") });
    expect(png.mimeType).toBe("image/png");
    expect(png.safeFileName).toBe("ticket_tienda.png");
    expect(jpg.mimeType).toBe("image/jpeg");
  });

  it("rechaza archivos cuya firma no corresponde al tipo declarado", () => {
    expect(() => decodeDocumentUpload({ fileName: "falso.png", mimeType: "image/png", base64: Buffer.from("texto").toString("base64") })).toThrow("no coincide con el tipo declarado");
  });
});
