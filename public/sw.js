const CACHE_NAME = 'studioflow-v1.0.7';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// Install Event: pre-cache critical shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event: purge old caches
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

// Fetch Event: Network first for API/Supabase/Auth, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // STRICT RULE: NEVER cache Supabase API calls, auth tokens, or dynamic business data
  if (
    url.hostname.includes('supabase.co') ||
    url.pathname.startsWith('/rest/') ||
    url.pathname.startsWith('/auth/') ||
    event.request.method !== 'GET'
  ) {
    return; // Let browser handle network request natively
  }

  // Network-first strategy for HTML pages / navigation to catch new deployments
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html') || caches.match(event.request);
        })
    );
    return;
  }

  // Cache-first strategy for static assets (JS, CSS, SVGs, Fonts)
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
