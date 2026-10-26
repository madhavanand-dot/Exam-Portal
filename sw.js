/* Service worker for the installable app (PWA).
   Network-first for this site's own files, so a new deploy shows up on the next open; the cached copy is only a
   fallback when the phone is offline. Firebase, Google APIs, fonts and other sites are never touched. */
const CACHE = "aakash-portal-v2";
const SHELL = ["./", "./index.html", "./manifest.webmanifest",
  "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png", "./icons/favicon-32.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;            // Firebase, CDNs, fonts: straight to the network
  // cache: "no-cache" skips the browser's 10-minute HTTP cache of GitHub Pages and revalidates (cheap 304 when unchanged)
  e.respondWith(fetch(req, { cache: "no-cache" }).then(res => {
    if (res.ok && res.type === "basic") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req).then(hit => hit ||
    (req.mode === "navigate" ? caches.match("./index.html").then(h => h || caches.match("./")) : undefined))
    .then(r => r || new Response("Offline — connect to the internet and try again.", { status: 503, headers: { "Content-Type": "text/plain" } }))));
});
