const CACHE_NAME = 'studioflow-v1.0.8';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// Install Event: pre-cache critical shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-cache core shell with robust fallback for any missing optional icons
      return Promise.allSettled(
        STATIC_ASSETS.map((asset) => cache.add(asset).catch((err) => console.log('Asset cache skip:', asset, err)))
      );
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event: purge old caches and claim clients immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event: Network first for navigation with guaranteed index.html fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // STRICT RULE: NEVER cache Supabase API calls, auth tokens, or dynamic business data
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/api/') ||
    event.request.method !== 'GET'
  ) {
    return; // Let browser handle network request natively
  }

  // 1. Navigation Requests (PWA launch, deep links like /agendar/xyz, /planos, page refreshes)
  const isNavigation = event.request.mode === 'navigate' ||
    (event.request.method === 'GET' && event.request.headers.get('accept')?.includes('text/html'));

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If network returned a valid 200 response
          if (response && response.ok && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            return response;
          }

          // If server returned 404, 403 or other error, fallback to index.html immediately so SPA client router takes over
          return caches.match('/index.html')
            .then((cachedIndex) => cachedIndex || caches.match('/'))
            .then((fallback) => fallback || fetch('/index.html'))
            .catch(() => caches.match('/index.html'));
        })
        .catch(() => {
          // If offline or network error, always serve cached index.html
          return caches.match('/index.html')
            .then((cachedIndex) => cachedIndex || caches.match('/'))
            .then((fallback) => {
              if (fallback) return fallback;
              return new Response(
                '<!DOCTYPE html><html><head><meta charset="utf-8"><title>StudioFlow</title><meta http-equiv="refresh" content="2;url=/"></head><body style="background:#0f172a;color:#fff;font-family:sans-serif;text-align:center;padding:40px;"><h2>Carregando StudioFlow...</h2><p>Restaurando conexão...</p></body></html>',
                { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
              );
            });
        })
    );
    return;
  }

  // 2. Cache-first strategy for static assets (JS, CSS, SVGs, Fonts, Images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to revalidate cache quietly
        fetch(event.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {/* Offline, ignore */});

        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse.status === 200 && event.request.method === 'GET') {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return networkResponse;
      });
    })
  );
});

// Message Listener for SW Skip Waiting
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Push Event listener (prepared for future Web Push API triggers)
self.addEventListener('push', (event) => {
  let data = { title: 'StudioFlow Notification', body: 'Você tem uma nova atualização no StudioFlow.' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (err) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'Novo agendamento ou alerta do estúdio.',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    vibrate: [100, 50, 100],
    data: data.data || { url: '/' },
    actions: [
      { action: 'open', title: 'Abrir App' },
      { action: 'dismiss', title: 'Fechar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'StudioFlow', options)
  );
});

// Notification Click Listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
