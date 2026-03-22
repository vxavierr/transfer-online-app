Deno.serve(async (req) => {
  // Satisfy async requirement
  await Promise.resolve();

  const swCode = `
    self.addEventListener('install', (event) => {
      self.skipWaiting();
    });
    
    self.addEventListener('activate', (event) => {
      event.waitUntil(clients.claim());
    });

    self.addEventListener('push', (event) => {
      if (!event.data) return;
      try {
        const data = event.data.json();
        event.waitUntil(
          self.registration.showNotification(data.title || 'TransferOnline', {
            body: data.body || 'Nova notificação',
            icon: 'https://cdn-icons-png.flaticon.com/512/1048/1048315.png',
            badge: 'https://cdn-icons-png.flaticon.com/512/1048/1048315.png',
            data: data.data,
            tag: data.tag || 'transfer-notification',
            vibrate: [100, 50, 100]
          })
        );
      } catch (e) { console.error('Push processing error', e); }
    });

    self.addEventListener('notificationclick', (event) => {
      event.notification.close();
      const urlToOpen = event.notification.data?.url || '/';
      
      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
          // Tenta focar numa janela já aberta
          for (const client of windowClients) {
            if (client.url.includes(urlToOpen) && 'focus' in client) {
              return client.focus();
            }
          }
          // Se não, abre uma nova
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
      );
    });
  `;

  return Response.json({ script: swCode });
});