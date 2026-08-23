import { describe, expect, it } from "vitest";
import { financeNotifications, notificationPreferences } from "../drizzle/schema";

describe("notificaciones privadas", () => {
  it("declara preferencias por usuaria y una bandeja separada de los datos financieros", () => {
    expect(notificationPreferences.userId.name).toBe("userId");
    expect(notificationPreferences.inAppEnabled.name).toBe("inAppEnabled");
    expect(notificationPreferences.reviewsEnabled.name).toBe("reviewsEnabled");
    expect(financeNotifications.userId.name).toBe("userId");
    expect(financeNotifications.readAt.name).toBe("readAt");
    expect(financeNotifications.dismissedAt.name).toBe("dismissedAt");
  });
});
