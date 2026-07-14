// ZenOS PWA Service Worker
const CACHE_NAME = 'zenos-pwa-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// O listener de 'fetch' é obrigatório para o Chrome no Windows considerar o PWA instalável.
// Respondemos diretamente com a rede para evitar travamento de arquivos em cache.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
