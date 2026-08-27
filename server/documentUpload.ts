export const MAX_DOCUMENT_PDF_BYTES = 10 * 1024 * 1024;

export type PdfUploadInput = { fileName: string; mimeType: string; base64: string };

export function decodePdfUpload(input: PdfUploadInput) {
  if (input.mimeType !== "application/pdf") throw new Error("Selecciona únicamente un archivo PDF.");
  const bytes = Buffer.from(input.base64, "base64");
  if (!bytes.length || bytes.subarray(0, 4).toString("ascii") !== "%PDF") throw new Error("El archivo no tiene una firma PDF válida.");
  if (bytes.byteLength > MAX_DOCUMENT_PDF_BYTES) throw new Error("El PDF supera el límite de 10 MB.");
  const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || "documento.pdf";
  return { bytes, safeFileName };
}
