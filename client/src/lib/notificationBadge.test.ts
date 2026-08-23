import { describe, expect, it } from "vitest";
import { notificationBadgeLabel, unreadNotificationCount } from "./notificationBadge";

describe("contador de notificaciones", () => {
  it("cuenta sólo los avisos aún no leídos", () => {
    expect(unreadNotificationCount([{ readAt: null }, { readAt: new Date() }, { readAt: null }])).toBe(2);
  });

  it("limita la etiqueta visual a 99+ para conservar el menú compacto", () => {
    expect(notificationBadgeLabel(4)).toBe("4");
    expect(notificationBadgeLabel(100)).toBe("99+");
  });
});
