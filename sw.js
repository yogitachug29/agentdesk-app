self.addEventListener('install', function(event) {
    self.skipWaiting();
});

self.addEventListener('activate', function(event) {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET' || event.request.url.indexOf('/api/') !== -1) {
        return;
    }
    event.respondWith(
        fetch(event.request).catch(function() {
            return caches.match(event.request).then(function(cached) {
                return cached || new Response('Offline', { status: 503, statusText: 'Offline' });
            });
        })
    );
});
