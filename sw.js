// Este Service Worker foi propositalmente convertido em um "kill switch".
// A versão antiga (stale-while-revalidate) estava travando dispositivos em
// builds antigos mesmo após deploys novos. Este SW se auto-remove, limpa
// todo o cache e força os clientes a recarregar direto da rede.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Apaga todos os caches que o SW antigo criou
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));

      // Remove este próprio Service Worker do navegador
      await self.registration.unregister();

      // Força todas as abas abertas a recarregar direto da rede
      const clientsList = await self.clients.matchAll({ type: 'window' });
      clientsList.forEach((client) => client.navigate(client.url));
    })()
  );
});

// Sem handler de 'fetch' -> tudo passa direto pela rede, sem cache.
