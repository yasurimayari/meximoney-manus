import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { notificationPreferences } from "../drizzle/schema";
import { getFinanceSnapshot, requireDb } from "./db";
import { sdk } from "./_core/sdk";
import { creditCardAlertCandidates } from "./creditCardAlerts";
import { buildTelegramDailyDigest, mexicoCityDateKey, sendTelegramDailyDigest } from "./telegramDigest";

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
    const entries: Array<{ title: string }> = [];
    if (preferences.calendarEnabled) snapshot.calendarEvents.filter(event => event.status === "planned" && event.startsAt >= now && event.startsAt <= inSevenDays).forEach(event => entries.push({ title: `Fecha próxima: ${event.title}` }));
    if (preferences.debtsEnabled) snapshot.debts.filter(debt => debt.status === "active" && debt.nextDueAt && debt.nextDueAt >= now && debt.nextDueAt <= inSevenDays).forEach(debt => entries.push({ title: `Cuota o vencimiento próximo: ${debt.name}` }));
    if (preferences.debtsEnabled) creditCardAlertCandidates(snapshot.creditCards ?? [], now, 7).forEach(candidate => entries.push({ title: candidate.title }));
    if (preferences.taxReserveEnabled && snapshot.profile?.futureTaxDueAt && snapshot.profile.futureTaxDueAt >= now && snapshot.profile.futureTaxDueAt <= inSevenDays) entries.push({ title: "Fecha fiscal manual próxima" });

    await sendTelegramDailyDigest(buildTelegramDailyDigest(entries, now));
    return res.json({ ok: true, reminders: entries.length, dateKey });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[Telegram daily digest]", detail);
    return res.status(500).json({ error: "telegram-daily-digest-failed", detail, timestamp: new Date().toISOString() });
  }
}
