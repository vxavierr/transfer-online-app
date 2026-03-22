const SW_CODE = `
/* TransferOnline Service Worker v8.0 */
const CACHE_NAME = 'to-sw-v8';

self.addEventListener('install', (event) => {
  console.log('[SW] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  event.waitUntil((async () => {
    try {
      let payload = {};
      try {
        payload = event.data.json();
      } catch (e) {
        payload = { title: 'TransferOnline', body: event.data.text() || 'Nova notificação' };
      }

      const title = payload.title || 'TransferOnline';
      const options = {
        body: payload.body || 'Nova mensagem',
        icon: 'https://cdn-icons-png.flaticon.com/512/1048/1048315.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/1048/1048315.png',
        data: payload.data || {},
        tag: payload.tag || 'notif-' + Date.now(),
        vibrate: [100, 50, 100],
        requireInteraction: true
      };

      await self.registration.showNotification(title, options);
    } catch (e) {
      console.error('SW Push Error:', e);
    }
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  
  event.waitUntil((async () => {
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      if (client.url && 'focus' in client) return client.focus();
    }
    if (clients.openWindow) return clients.openWindow(url);
  })());
});
`;

// Encode to binary to avoid platform auto-sniffing to text/plain
const BODY = new TextEncoder().encode(SW_CODE);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Max-Age": "86400"
      }
    });
  }

  return new Response(BODY, {
    status: 200,
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Service-Worker-Allowed": "/",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
    }
  });
});