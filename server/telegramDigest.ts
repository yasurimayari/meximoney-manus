export type TelegramDigestEntry = { title: string; details?: string[] };

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function mexicoCityDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function buildTelegramDailyDigest(entries: TelegramDigestEntry[], date = new Date()) {
  const day = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", weekday: "long", day: "numeric", month: "long" }).format(date);
  const header = `<b>Meximoney · resumen diario</b>\n<i>${escapeHtml(day)}</i>`;
  if (!entries.length) return `${header}\n\n<b>Sin pendientes próximos</b>\nNo hay recordatorios financieros configurados para los siguientes 7 días.`;
  const redactTitle = (title: string) => title.replace(/\b\d{4,}\b/g, "••••");
  const items = entries.slice(0, 3).map((entry, index) => {
    const details = entry.details?.filter(Boolean).slice(0, 2).map(detail => `<i>${escapeHtml(detail)}</i>`).join(" · ") ?? "";
    return `<b>${index + 1}. ${escapeHtml(redactTitle(entry.title))}</b>${details ? `\n${details}` : ""}`;
  });
  const extra = entries.length > 3 ? `\n\n<i>+ ${entries.length - 3} recordatorios más en Meximoney.</i>` : "";
  return `${header}\n\n<b>${entries.length} ${entries.length === 1 ? "pendiente próximo" : "pendientes próximos"}</b>\n${items.join("\n\n")}${extra}\n\n<i>Revisa el detalle y confirma cualquier pago manualmente en Meximoney.</i>`;
}

export async function sendTelegramDailyDigest(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error("Telegram no está configurado en este proyecto.");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  if (!response.ok) throw new Error(`Telegram rechazó el envío (${response.status}).`);
  const payload = await response.json() as { ok?: boolean };
  if (!payload.ok) throw new Error("Telegram no confirmó el envío.");
}
