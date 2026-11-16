const CACHE_NAME = 'agentdesk-v10';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.map((key) => caches.delete(key)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        fetch(event.request)
            .then((networkResponse) => {
                const copy = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                return networkResponse;
            })
            .catch(() => caches.match(event.request))
    );
});