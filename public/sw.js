self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("recall-static-v1").then((cache) => {
      return cache.addAll(["/", "/manifest.webmanifest", "/icon.svg"]);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const clone = response.clone();
        caches.open("recall-runtime-v1").then((cache) => cache.put(event.request, clone));
        return response;
      });
    })
  );
});