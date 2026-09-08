export const MAX_ASSISTANT_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const ASSISTANT_ATTACHMENT_MIME_TYPES = ["image/jpeg", "image/png", "application/pdf"] as const;
export type AssistantAttachmentMimeType = (typeof ASSISTANT_ATTACHMENT_MIME_TYPES)[number];
export type AssistantAttachmentUploadInput = { fileName: string; mimeType: string; base64: string };

function hasValidSignature(bytes: Buffer, mimeType: AssistantAttachmentMimeType) {
  if (mimeType === "application/pdf") return bytes.subarray(0, 4).toString("ascii") === "%PDF";
  if (mimeType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
}

export function decodeAssistantAttachment(input: AssistantAttachmentUploadInput) {
  if (!ASSISTANT_ATTACHMENT_MIME_TYPES.includes(input.mimeType as AssistantAttachmentMimeType)) {
    throw new Error("El Diario sólo admite archivos JPG, PNG o PDF.");
  }
  const mimeType = input.mimeType as AssistantAttachmentMimeType;
  const bytes = Buffer.from(input.base64, "base64");
  if (!bytes.length) throw new Error("El archivo adjunto está vacío.");
  if (bytes.byteLength > MAX_ASSISTANT_ATTACHMENT_BYTES) throw new Error("El adjunto supera el límite de 10 MB.");
  if (!hasValidSignature(bytes, mimeType)) throw new Error("El contenido del archivo no coincide con su tipo declarado.");
  const extension = mimeType === "image/jpeg" ? ".jpg" : mimeType === "image/png" ? ".png" : ".pdf";
  const safeFileName = (input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 160) || `adjunto${extension}`).replace(/\.(jpg|jpeg|png|pdf)$/i, "") + extension;
  return { bytes, mimeType, safeFileName };
}
