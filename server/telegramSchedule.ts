import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { notificationPreferences } from "../drizzle/schema";
import { getFinanceSnapshot, requireDb } from "./db";
import { sdk } from "./_core/sdk";
import { creditCardAlertCandidates } from "./creditCardAlerts";
import { buildTelegramDailyDigest, mexicoCityDateKey, sendTelegramDailyDigest } from "./telegramDigest";

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 2 }).format(cents / 100);
}

function mexicoCityDayParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value ?? 0);
  return { year: read("year"), month: read("month"), day: read("day") };
}

function deadlineDetails(date: Date, now: Date) {
  const target = mexicoCityDayParts(date);
  const today = mexicoCityDayParts(now);
  const days = Math.round((Date.UTC(target.year, target.month - 1, target.day) - Date.UTC(today.year, today.month - 1, today.day)) / 86_400_000);
  const label = new Intl.DateTimeFormat("es-MX", { timeZone: "America/Mexico_City", day: "numeric", month: "long" }).format(date);
  const relative = days === 0 ? "hoy" : days === 1 ? "mañana" : `en ${days} días`;
  return `Fecha: ${label} (${relative})`;
}

export async function telegramDailyDigestHandler(req: Request, res: Response) {
  try {
    const cronUser = await sdk.authenticateRequest(req);
    if (!cronUser.isCron || !cronUser.taskUid) return res.status(403).json({ error: "cron-only" });

    const db = await requireDb();
    const [preferences] = await db.select().from(notificationPreferences).where(eq(notificationPreferences.telegramScheduleCronTaskUid, cronUser.taskUid)).limit(1);
    if (!preferences || !preferences.telegramEnabled) return res.json({ ok: true, skipped: "disabled-or-orphan" });

    const now = new Date();
    const dateKey = mexicoCityDateKey(now);
    if (preferences.telegramLastDigestDate === dateKey) return res.json({ ok: true, skipped: "already-claimed", dateKey });

    // Reserve the local day before calling Telegram. If the platform retries after a timeout,
    // the handler will skip rather than duplicate a potentially delivered external message.
    await db.update(notificationPreferences).set({ telegramLastDigestDate: dateKey }).where(eq(notificationPreferences.id, preferences.id));

    const snapshot = await getFinanceSnapshot(preferences.userId);
    const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const entries: Array<{ title: string; details?: string[] }> = [];
    if (preferences.calendarEnabled) snapshot.calendarEvents.filter(event => event.status === "planned" && event.startsAt >= now && event.startsAt <= inSevenDays).forEach(event => entries.push({ title: `Fecha próxima: ${event.title}`, details: [deadlineDetails(event.startsAt, now)] }));
    if (preferences.debtsEnabled) snapshot.debts.filter(debt => debt.status === "active" && debt.nextDueAt && debt.nextDueAt >= now && debt.nextDueAt <= inSevenDays).forEach(debt => {
      const scheduledPayment = debt.installmentCents || debt.minimumPaymentCents;
      entries.push({
        title: `Cuota o vencimiento próximo: ${debt.name}`,
        details: [
          deadlineDetails(debt.nextDueAt!, now),
          scheduledPayment > 0 ? `Importe registrado: ${formatMoney(scheduledPayment, debt.currency)}` : "",
          `Saldo pendiente: ${formatMoney(debt.balanceCents, debt.currency)}`,
        ],
      });
    });
    if (preferences.debtsEnabled) creditCardAlertCandidates(snapshot.creditCards ?? [], now, 7).forEach(candidate => {
      const card = snapshot.creditCards?.find(item => item.id === candidate.relatedEntityId);
      const details = [candidate.message];
      if (card) details.push(`Saldo registrado: ${formatMoney(card.balanceCents, card.currency)}`);
      entries.push({ title: candidate.title, details });
    });
    if (preferences.taxReserveEnabled && snapshot.profile?.futureTaxDueAt && snapshot.profile.futureTaxDueAt >= now && snapshot.profile.futureTaxDueAt <= inSevenDays) entries.push({ title: "Fecha fiscal manual próxima", details: [deadlineDetails(snapshot.profile.futureTaxDueAt, now)] });

    await sendTelegramDailyDigest(buildTelegramDailyDigest(entries, now));
    return res.json({ ok: true, reminders: entries.length, dateKey });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[Telegram daily digest]", detail);
    return res.status(500).json({ error: "telegram-daily-digest-failed", detail, timestamp: new Date().toISOString() });
  }
}
