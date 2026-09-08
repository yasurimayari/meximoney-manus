import { describe, expect, it } from "vitest";
import { decodeAssistantAttachment } from "./assistantAttachmentUpload";

const pngBase64 = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0]).toString("base64");
const jpegBase64 = Buffer.from([255, 216, 255, 0]).toString("base64");
const pdfBase64 = Buffer.from("%PDF-1.7 nota").toString("base64");

describe("decodeAssistantAttachment", () => {
  it("acepta JPG, PNG y PDF con nombres seguros", () => {
    expect(decodeAssistantAttachment({ fileName: "foto familiar.JPG", mimeType: "image/jpeg", base64: jpegBase64 }).safeFileName).toBe("foto_familiar.jpg");
    expect(decodeAssistantAttachment({ fileName: "idea.png", mimeType: "image/png", base64: pngBase64 }).mimeType).toBe("image/png");
    expect(decodeAssistantAttachment({ fileName: "reporte.pdf", mimeType: "application/pdf", base64: pdfBase64 }).safeFileName).toBe("reporte.pdf");
  });

  it("rechaza tipos no permitidos y firmas que no coinciden", () => {
    expect(() => decodeAssistantAttachment({ fileName: "nota.txt", mimeType: "text/plain", base64: Buffer.from("texto").toString("base64") })).toThrow("JPG, PNG o PDF");
    expect(() => decodeAssistantAttachment({ fileName: "falso.pdf", mimeType: "application/pdf", base64: Buffer.from("texto").toString("base64") })).toThrow("no coincide");
  });
});
