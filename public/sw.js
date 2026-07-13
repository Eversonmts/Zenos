// Service Worker básico para instalabilidade do PWA ZenOS
const CACHE_NAME = 'zenos-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Apenas atende ao requisito de interceptação para PWA instalável
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
