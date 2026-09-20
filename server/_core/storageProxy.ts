import type { Express } from "express";
import { sdk } from "./sdk";
import { isPrivateStorageKeyOwned } from "../db";
import { storageGetSignedUrl } from "../storage";

const PUBLIC_STORAGE_KEY = /^richeon-pwa-icon-(?:192|512|180)_[a-z0-9]+\.png$/i;

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key || key.includes("..") || key.includes("\\")) {
      res.status(400).send("Invalid storage key");
      return;
    }

    if (!PUBLIC_STORAGE_KEY.test(key)) {
      try {
        const user = await sdk.authenticateRequest(req);
        if (!(await isPrivateStorageKeyOwned(user.id, key))) {
          res.status(403).send("Storage access denied");
          return;
        }
      } catch {
        res.status(401).send("Authentication required");
        return;
      }
    }

    try {
      const url = await storageGetSignedUrl(key);
      res.set("Cache-Control", "private, no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
