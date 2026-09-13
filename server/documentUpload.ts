export const MAX_DOCUMENT_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENT_PDF_BYTES = MAX_DOCUMENT_FILE_BYTES;

export type DocumentUploadInput = { fileName: string; mimeType: string; base64: string };
export type PdfUploadInput = DocumentUploadInput;

const supportedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);

function hasKnownSignature(bytes: Buffer, mimeType: string) {
  if (!bytes.length) return false;
  if (mimeType === "application/pdf") return bytes.subarray(0, 4).toString("ascii") === "%PDF";
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return false;
}

export function decodeDocumentUpload(input: DocumentUploadInput) {
  if (!supportedMimeTypes.has(input.mimeType)) throw new Error("Selecciona un archivo JPG, PNG o PDF.");
  const bytes = Buffer.from(input.base64, "base64");
  if (!hasKnownSignature(bytes, input.mimeType)) throw new Error("El archivo no coincide con el tipo declarado.");
  if (bytes.byteLength > MAX_DOCUMENT_FILE_BYTES) throw new Error("El archivo supera el límite de 10 MB.");
  const extension = input.mimeType === "application/pdf" ? ".pdf" : input.mimeType === "image/png" ? ".png" : ".jpg";
  const cleaned = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 180) || `documento${extension}`;
  const safeFileName = cleaned.toLowerCase().endsWith(extension) ? cleaned : `${cleaned}${extension}`;
  return { bytes, safeFileName, mimeType: input.mimeType };
}

export function decodePdfUpload(input: PdfUploadInput) {
  if (input.mimeType !== "application/pdf") throw new Error("Selecciona únicamente un archivo PDF.");
  return decodeDocumentUpload(input);
}
