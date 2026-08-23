export function unreadNotificationCount(notifications: Array<{ readAt: Date | string | null }>) {
  return notifications.reduce((count, notification) => count + (notification.readAt ? 0 : 1), 0);
}

export function notificationBadgeLabel(count: number) {
  return count > 99 ? "99+" : String(count);
}
