import { describe, expect, it } from "vitest";
import { filterNotificationInbox, notificationDestination } from "./notificationInbox";

describe("bandeja de notificaciones", () => {
  const notifications = [{ type: "calendar", readAt: null, occurredAt: new Date() }, { type: "debt", readAt: new Date(), occurredAt: new Date() }, { type: "budget", readAt: null, occurredAt: new Date() }];

  it("filtra por avisos no leídos y categoría sin alterar la lista original", () => {
    expect(filterNotificationInbox(notifications, true, "all")).toHaveLength(2);
    expect(filterNotificationInbox(notifications, false, "budget")).toEqual([notifications[2]]);
    expect(notifications).toHaveLength(3);
  });

  it("dirige cada aviso hacia una vista privada relevante", () => {
    expect(notificationDestination("calendar")).toBe("/calendario");
    expect(notificationDestination("tax_reserve")).toBe("/calidad");
    expect(notificationDestination("unknown")).toBe("/notificaciones");
  });
});
