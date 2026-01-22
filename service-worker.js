const cacheName = "taxinear-cache-v1";
const assets = [
  "/",
  "/driver.html",
  "/passenger.html",
  "/driver.js",
  "/passenger.js",
  "/manifest.json",
  "/assets/icons/taxi_icon_192.png",
  "/assets/icons/taxi_icon_512.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js",
  "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js"
];

self.addEventListener("install", evt => {
  evt.waitUntil(
    caches.open(cacheName).then(cache => cache.addAll(assets))
  );
});

self.addEventListener("fetch", evt => {
  evt.respondWith(
    caches.match(evt.request).then(resp => resp || fetch(evt.request))
  );
});