export const ENV = {
  // Identifier embedded in local session JWTs. Purely internal — any string
  // works, it never has to match anything external.
  appId: process.env.APP_ID ?? "meximoney",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Shared secret your own scheduler (cron job, GitHub Action, etc.) sends as
  // `Authorization: Bearer <cronSecret>` to trigger the daily Telegram digest
  // at POST /api/scheduled/telegram-daily-digest. See telegramSchedule.ts.
  cronSecret: process.env.CRON_SECRET ?? "",
  // Supabase Storage: server-only file storage (avatars, documents, credit
  // reports, assistant attachments). The service role key bypasses RLS and
  // must never reach the client.
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "meximoney-private",
};
