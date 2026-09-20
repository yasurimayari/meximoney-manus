const CACHE_NAME = "meximoney-personal-shell-v96";
const PWA_ICON_PATHS = [
  "/manus-storage/richeon-pwa-icon-192_11693d42.png",
  "/manus-storage/richeon-pwa-icon-512_1feed5d4.png",
  "/manus-storage/richeon-pwa-icon-180_f8b383eb.png",
];
const APP_SHELL = ["/offline", "/manifest.webmanifest", ...PWA_ICON_PATHS];

function isCacheablePath(url) {
  return url.origin === self.location.origin && !url.pathname.startsWith("/api/") && (!url.pathname.startsWith("/manus-storage/") || PWA_ICON_PATHS.includes(url.pathname));
}

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("meximoney-personal-shell-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("message", event => {
  if (event.data?.type !== "CACHE_PERSONAL_SHELL") return;
  const urls = (event.data.urls ?? []).filter(url => typeof url === "string" && isCacheablePath(new URL(url, self.location.origin)));
  event.waitUntil(caches.open(CACHE_NAME).then(cache => Promise.all(urls.map(url => cache.add(url).catch(() => undefined)))));
});

self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  if (!isCacheablePath(url)) return;
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match("/offline")));
    return;
  }
  if (["script", "style", "font", "image"].includes(request.destination)) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(() => caches.match(request)));
  }
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const destination = event.notification.data?.path || "/notificaciones";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(openClients => {
    const existing = openClients.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) return existing.focus();
    return clients.openWindow(destination);
  }));
});
