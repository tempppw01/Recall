const STATIC_CACHE = "recall-static-v4";
const RUNTIME_CACHE = "recall-runtime-v4";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key)))
    )
  );
  event.waitUntil(self.clients.claim());
});

const isHtmlRequest = (request) =>
  request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html");

const fetchAndCache = async (request) => {
  const response = await fetch(request);
  if (response && response.ok) {
    const clone = response.clone();
    caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
  }
  return response;
};

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "SHOW_NOTIFICATION") {
    const payload = event.data.payload || {};
    const title = payload.title || "Recall";
    const options = {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      data: payload.data,
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl)) {
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  if (isHtmlRequest(event.request)) {
    event.respondWith(
      fetch(event.request).catch(async () => {
        const cachedPage = await caches.match(event.request);
        if (cachedPage) return cachedPage;
        const appShell = await caches.match("/");
        if (appShell) return appShell;
        return new Response("Offline", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      })
    );
    return;
  }

  event.respondWith(
    fetchAndCache(event.request).catch(async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      return new Response("", { status: 504 });
    })
  );
});