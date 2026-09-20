// Storage helpers backed by Supabase Storage.
// Uploads and downloads go through the Supabase service-role client, so files
// stay private by default; reads are served via short-lived signed URLs
// (see /manus-storage/{key} in server/_core/storageProxy.ts).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ENV } from "./_core/env";

let cachedClient: SupabaseClient | null = null;

function getStorageClient(): SupabaseClient {
  if (!ENV.supabaseUrl || !ENV.supabaseServiceRoleKey) {
    throw new Error(
      "Storage config missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  if (!cachedClient) {
    cachedClient = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });
  }

  return cachedClient;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

function toUint8Array(data: Buffer | Uint8Array | string): Uint8Array {
  return typeof data === "string" ? new TextEncoder().encode(data) : data;
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const client = getStorageClient();
  const key = appendHashSuffix(normalizeKey(relKey));

  const { error } = await client.storage
    .from(ENV.supabaseStorageBucket)
    .upload(key, toUint8Array(data), { contentType, upsert: false });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return { key, url: `/manus-storage/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const client = getStorageClient();
  const key = normalizeKey(relKey);

  const { data, error } = await client.storage
    .from(ENV.supabaseStorageBucket)
    .createSignedUrl(key, 300);

  if (error || !data?.signedUrl) {
    throw new Error(`Storage signed URL failed: ${error?.message ?? "empty response"}`);
  }

  return data.signedUrl;
}
