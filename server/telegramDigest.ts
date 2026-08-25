export type TelegramDigestEntry = { title: string };

export function mexicoCityDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function buildTelegramDailyDigest(entries: TelegramDigestEntry[], date = new Date()) {
  const day = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", weekday: "long", day: "numeric", month: "long" }).format(date);
  const header = `Meximoney · recordatorio diario\n${day}`;
  if (!entries.length) return `${header}\n\nNo hay recordatorios financieros próximos en los siguientes 7 días.`;
  const items = entries.slice(0, 12).map(entry => `• ${entry.title}`);
  const extra = entries.length > 12 ? `\n• Y ${entries.length - 12} recordatorios más en Meximoney.` : "";
  return `${header}\n\n${items.join("\n")}${extra}\n\nRevisa el detalle y confirma cualquier pago manualmente en Meximoney.`;
}

export async function sendTelegramDailyDigest(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error("Telegram no está configurado en este proyecto.");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, disable_web_page_preview: true }),
  });
  if (!response.ok) throw new Error(`Telegram rechazó el envío (${response.status}).`);
  const payload = await response.json() as { ok?: boolean };
  if (!payload.ok) throw new Error("Telegram no confirmó el envío.");
}
