export type NotificationInboxItem = { type: string; readAt: Date | string | null; occurredAt: Date | string };

export function filterNotificationInbox<T extends NotificationInboxItem>(notifications: T[], onlyUnread: boolean, category: string) {
  return notifications.filter(notification => (!onlyUnread || !notification.readAt) && (category === "all" || notification.type === category));
}

export function notificationDestination(type: string) {
  return ({ calendar: "/calendario", document: "/movimientos", debt: "/planificacion", budget: "/planificacion", tax_reserve: "/calidad", review: "/revision" } as Record<string, string>)[type] ?? "/notificaciones";
}
