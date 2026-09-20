import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { financeNotifications, notificationPreferences } from "../drizzle/schema";
import { getFinanceSnapshot, requireDb } from "./db";
import { ENV } from "./_core/env";
import { creditCardAlertCandidates } from "./creditCardAlerts";
import { payableAlertCandidates, upcomingTravelAlertCandidates } from "./scheduledAlertCandidates";
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

function isAuthorizedCronRequest(req: Request): boolean {
  if (!ENV.cronSecret) return false;
  const authHeader = req.headers.authorization;
  const providedSecret = typeof authHeader === "string" && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  return providedSecret === ENV.cronSecret;
}

async function sendDigestForUser(preferences: typeof notificationPreferences.$inferSelect, now: Date, dateKey: string, db: Awaited<ReturnType<typeof requireDb>>) {
  const snapshot = await getFinanceSnapshot(preferences.userId);
  const reminderDays = Math.min(30, Math.max(1, preferences.reminderDays || 7));
  const horizon = new Date(now.getTime() + reminderDays * 24 * 60 * 60 * 1000);
  const travelAlerts = preferences.travelsEnabled ? upcomingTravelAlertCandidates(snapshot.travelPlans ?? [], now, reminderDays) : [];
  const payableAlerts = preferences.debtsEnabled ? payableAlertCandidates(snapshot.payables ?? [], now, reminderDays) : [];
  const debtAlerts = preferences.debtsEnabled ? snapshot.debts
    .filter(debt => debt.status === "active" && debt.nextDueAt && debt.nextDueAt >= now && debt.nextDueAt <= horizon)
    .map(debt => ({ type: "debt", title: `Vencimiento próximo: ${debt.name}`, message: "Revisa esta deuda y confirma manualmente su siguiente pago.", relatedEntityType: "debt", relatedEntityId: debt.id })) : [];
  const cardAlerts = preferences.debtsEnabled ? creditCardAlertCandidates(snapshot.creditCards ?? [], now, reminderDays) : [];
  const automaticCandidates = [...travelAlerts, ...payableAlerts, ...debtAlerts, ...cardAlerts];

  let createdCount = 0;
  if (preferences.inAppEnabled && automaticCandidates.length) {
    const existing = await db.select().from(financeNotifications).where(eq(financeNotifications.userId, preferences.userId));
    const existingKeys = new Set(existing.map(notification => `${notification.type}:${notification.relatedEntityType}:${notification.relatedEntityId}`));
    const pending = automaticCandidates.filter(candidate => !existingKeys.has(`${candidate.type}:${candidate.relatedEntityType}:${candidate.relatedEntityId}`));
    if (pending.length) await db.insert(financeNotifications).values(pending.map(candidate => ({ userId: preferences.userId, ...candidate })));
    createdCount = pending.length;
  }

  if (!preferences.telegramEnabled) return { userId: preferences.userId, skipped: "telegram-disabled", createdCount };
  if (preferences.telegramLastDigestDate === dateKey) return { userId: preferences.userId, skipped: "already-claimed", createdCount };

  // Reserve the local day before calling Telegram. If the trigger retries after
  // a timeout, the handler will skip rather than duplicate a potentially
  // delivered external message.
  await db.update(notificationPreferences).set({ telegramLastDigestDate: dateKey }).where(eq(notificationPreferences.id, preferences.id));

  const entries: Array<{ title: string; details?: string[] }> = [];
  if (preferences.calendarEnabled) snapshot.calendarEvents.filter(event => event.status === "planned" && event.startsAt >= now && event.startsAt <= horizon).forEach(event => entries.push({ title: `Fecha próxima: ${event.title}`, details: [deadlineDetails(event.startsAt, now)] }));
  if (preferences.travelsEnabled) travelAlerts.forEach(alert => entries.push({ title: alert.title, details: [alert.message] }));
  if (preferences.debtsEnabled) snapshot.debts.filter(debt => debt.status === "active" && debt.nextDueAt && debt.nextDueAt >= now && debt.nextDueAt <= horizon).forEach(debt => {
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
  if (preferences.debtsEnabled) creditCardAlertCandidates(snapshot.creditCards ?? [], now, reminderDays).forEach(candidate => {
    const card = snapshot.creditCards?.find(item => item.id === candidate.relatedEntityId);
    const details = [candidate.message];
    if (card) details.push(`Saldo registrado: ${formatMoney(card.balanceCents, card.currency)}`);
    entries.push({ title: candidate.title, details });
  });
  if (preferences.debtsEnabled) payableAlerts.forEach(alert => entries.push({ title: alert.title, details: [alert.message] }));
  if (preferences.taxReserveEnabled && snapshot.profile?.futureTaxDueAt && snapshot.profile.futureTaxDueAt >= now && snapshot.profile.futureTaxDueAt <= horizon) entries.push({ title: "Fecha fiscal manual próxima", details: [deadlineDetails(snapshot.profile.futureTaxDueAt, now)] });

  await sendTelegramDailyDigest(buildTelegramDailyDigest(entries, now));
  return { userId: preferences.userId, reminders: entries.length, createdCount };
}

/**
 * Triggered by your own scheduler (a system cron job, a GitHub Action, a
 * hosting provider's cron add-on) once a day, authenticated with
 * `Authorization: Bearer <CRON_SECRET>`. Runs the digest for every user who
 * has notification preferences saved, regardless of whether they enabled
 * Telegram — non-Telegram users just get their in-app notifications created.
 */
export async function telegramDailyDigestHandler(req: Request, res: Response) {
  if (!isAuthorizedCronRequest(req)) {
    return res.status(403).json({ error: "unauthorized" });
  }

  try {
    const db = await requireDb();
    const allPreferences = await db.select().from(notificationPreferences);
    if (!allPreferences.length) return res.json({ ok: true, skipped: "no-preferences", results: [] });

    const now = new Date();
    const dateKey = mexicoCityDateKey(now);
    const results = [];
    for (const preferences of allPreferences) {
      try {
        results.push(await sendDigestForUser(preferences, now, dateKey, db));
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        console.error(`[Telegram daily digest] userId=${preferences.userId}`, detail);
        results.push({ userId: preferences.userId, error: detail });
      }
    }
    return res.json({ ok: true, results, dateKey });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[Telegram daily digest]", detail);
    return res.status(500).json({ error: "telegram-daily-digest-failed", detail, timestamp: new Date().toISOString() });
  }
}
