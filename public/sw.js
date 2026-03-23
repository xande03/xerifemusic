const STATIC_CACHE = 'xerife-static-v9';
const MEDIA_CACHE = 'xerife-media-v9';
const CACHES = [STATIC_CACHE, MEDIA_CACHE];

const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

const isExternalApiRequest = (url) => (
  url.hostname.includes('youtube.com') ||
  url.hostname.includes('googleapis.com') ||
  url.hostname.includes('googlevideo.com') ||
  url.hostname.includes('supabase.co') ||
  url.hostname.includes('i.ytimg.com') ||
  url.hostname.includes('yt3.ggpht.com')
);

const networkFirst = async (request, cacheName) => {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw new Error('network_failed');
  }
};

const cacheFirst = async (request, cacheName) => {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
};

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => !CACHES.includes(key)).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Fetch: smart strategy per request type
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') {
    return;
  }

  const url = new URL(event.request.url);

  // Never cache OAuth redirects
  if (url.pathname.startsWith('/~oauth')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // External APIs (YouTube, Supabase, Google): always network
  if (isExternalApiRequest(url)) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Navigation: always try network first to avoid stale app-shell black screens
  if (event.request.mode === 'navigate') {
    event.respondWith(
      networkFirst(event.request, STATIC_CACHE).catch(async () => {
        const fallback = await caches.match('/');
        return fallback || new Response('Offline', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

  // Critical app assets: network first to reduce stale JS/CSS issues
  if (
    event.request.destination === 'style' ||
    event.request.destination === 'script'
  ) {
    event.respondWith(
      networkFirst(event.request, STATIC_CACHE).catch(() => new Response('', { status: 408 }))
    );
    return;
  }

  // Media/static files: cache first
  if (
    event.request.destination === 'image' ||
    event.request.destination === 'font' ||
    event.request.destination === 'audio' ||
    event.request.destination === 'video'
  ) {
    event.respondWith(
      cacheFirst(event.request, MEDIA_CACHE).catch(() => new Response('', { status: 408 }))
    );
    return;
  }

  // Everything else: Network First
  event.respondWith(
    networkFirst(event.request, STATIC_CACHE).catch(() => caches.match(event.request))
  );
});

// Background Sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-queue') {
    event.waitUntil(Promise.resolve());
  }
});

// Handle push notifications (future)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Xerife Hub', {
      body: data.body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      vibrate: [200, 100, 200],
      tag: data.tag || 'default',
      data: { url: data.url || '/' },
    })
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
