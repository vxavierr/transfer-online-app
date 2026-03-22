const SW_CODE = `const CACHE_NAME = 'to-sw-v6-optimized';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  'https://cdn-icons-png.flaticon.com/512/1048/1048315.png'
];

// Install Event - Precache static assets
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(err => console.warn('Cache addAll error:', err));
    })
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// Fetch Event - Stale-While-Revalidate for static, Network First for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignore non-GET requests
  if (event.request.method !== 'GET') return;

  // 1. API Calls & Dynamic Content -> Network First, Fallback to Cache (if available)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/functions/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone and cache successful responses for offline usage
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // 2. Static Assets (JS, CSS, Images, Fonts) -> Stale-While-Revalidate
  // This ensures speed by serving from cache immediately, while updating in background
  if (
    url.pathname.match(/\\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2)$/) ||
    STATIC_ASSETS.includes(url.pathname)
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        }).catch(err => console.warn('Fetch error for static asset:', err));

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 3. Navigation Requests (HTML) -> Network First (to get fresh app), Fallback to Cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request)
            .then((response) => {
              return response || caches.match('/');
            });
        })
    );
    return;
  }
});

// Push Notifications
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
        requireInteraction: true,
        actions: payload.actions || []
      };

      await self.registration.showNotification(title, options);
    } catch (e) {
      console.error('SW Push Error:', e);
    }
  })());
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  
  event.waitUntil((async () => {
    const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      if (client.url && 'focus' in client) {
        if (url !== '/' && client.navigate) {
            client.navigate(url);
        }
        return client.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(url);
  })());
});`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS"
      }
    });
  }

  return new Response(SW_CODE, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript",
      "Service-Worker-Allowed": "/",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store, max-age=0"
    }
  });
});