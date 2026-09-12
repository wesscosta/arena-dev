const SHELL_CACHE = "arena-dev-shell-v0.5-1";
const STATIC_CACHE = "arena-dev-static-v0.5-1";
const SHELL_URLS = [
  "/join",
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/arena-192.png",
  "/icons/arena-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    await Promise.allSettled(SHELL_URLS.map(async (url) => {
      const response = await fetch(url, { cache: "reload" });
      if (response.ok) await cache.put(url, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, STATIC_CACHE]);
    const names = await caches.keys();
    await Promise.all(names.filter((name) => !keep.has(name)).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

function isDomainRequest(url) {
  return url.pathname.startsWith("/api/");
}

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/")
    || url.pathname.startsWith("/icons/")
    || url.pathname === "/manifest.webmanifest";
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Cache nunca é fonte de verdade do domínio.
  if (isDomainRequest(url)) return;

  if (request.mode === "navigate" && url.pathname.startsWith("/join")) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(SHELL_CACHE);
          await cache.put("/join", response.clone());
        }
        return response;
      } catch {
        return (await caches.match("/join"))
          || (await caches.match("/offline.html"))
          || Response.error();
      }
    })());
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
  }
});
