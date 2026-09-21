const PWA_ICON_PATH = "/manus-storage/richeon-pwa-icon-192_11693d42.png";
const PWA_NOTIFICATIONS_ENABLED_KEY = "meximoney:pwa-notifications-enabled";

export type PwaNotificationPermission = NotificationPermission | "unsupported";

export function getPwaNotificationPermission(): PwaNotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function isPwaStandalone() {
  if (typeof window === "undefined") return false;
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia?.("(display-mode: standalone)").matches || navigatorWithStandalone.standalone === true;
}

export function isPwaNotificationsEnabled() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(PWA_NOTIFICATIONS_ENABLED_KEY) === "true";
}

export function setPwaNotificationsEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PWA_NOTIFICATIONS_ENABLED_KEY, String(enabled));
}

export function clearPwaNotificationsEnabled() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PWA_NOTIFICATIONS_ENABLED_KEY);
}

export function pwaInboxNotificationContent(createdCount: number) {
  const count = Math.max(0, Math.floor(createdCount));
  return {
    title: "Richeon",
    body: count === 1 ? "Tienes 1 recordatorio nuevo para revisar." : `Tienes ${count} recordatorios nuevos para revisar.`,
  };
}

export async function requestPwaNotificationPermission(): Promise<PwaNotificationPermission> {
  if (getPwaNotificationPermission() === "unsupported") return "unsupported";
  return Notification.requestPermission();
}

export function shouldShowPwaInboxNotification(input: { createdCount: number; enabledOnDevice: boolean; permission: PwaNotificationPermission; serviceWorkerSupported: boolean }) {
  return input.createdCount > 0 && input.enabledOnDevice && input.permission === "granted" && input.serviceWorkerSupported;
}

export async function showPwaInboxNotification(createdCount: number) {
  if (!shouldShowPwaInboxNotification({ createdCount, enabledOnDevice: isPwaNotificationsEnabled(), permission: getPwaNotificationPermission(), serviceWorkerSupported: "serviceWorker" in navigator })) return false;
  const registration = await navigator.serviceWorker.ready;
  const content = pwaInboxNotificationContent(createdCount);
  await registration.showNotification(content.title, {
    body: content.body,
    icon: PWA_ICON_PATH,
    badge: PWA_ICON_PATH,
    tag: "meximoney-inbox-update",
    data: { path: "/notificaciones" },
  });
  return true;
}

export async function updatePwaBadge(unreadCount: number) {
  if (typeof navigator === "undefined") return;
  const badgeNavigator = navigator as Navigator & { setAppBadge?: (count?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  if (unreadCount > 0 && badgeNavigator.setAppBadge) await badgeNavigator.setAppBadge(unreadCount);
  if (unreadCount === 0 && badgeNavigator.clearAppBadge) await badgeNavigator.clearAppBadge();
}
