const CACHE_NAME = 'marine-webgis-pwa-v1';
const STATIC_CACHE_URLS = [
    '/',
    '/index.html',
    '/src/css/styles.css',
    '/src/js/app.js',
    '/src/js/map.js',
    '/src/js/data.js',
    '/src/js/offline.js',
    '/src/js/ui.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    '/manifest.json',
    '/service-worker.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(STATIC_CACHE_URLS);
            })
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // For same-origin requests, use cache-first strategy
    if (url.origin === location.origin) {
        event.respondWith(
            caches.match(request).then((response) => {
                return response || fetch(request);
            })
        );
    } else {
        // For external requests (like map tiles), use network-first strategy
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    return caches.match(request);
                })
        );
    }
});

self.addEventListener('message', (event) => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

// Background sync for data synchronization
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    try {
        const db = await openIndexedDB();
        const transaction = db.transaction(['marineData'], 'readonly');
        const objectStore = transaction.objectStore('marineData');
        const allData = await objectStore.getAll();

        if (allData.length > 0) {
            const response = await fetch('/api/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(allData)
            });

            if (response.ok) {
                const transaction = db.transaction(['marineData'], 'readwrite');
                const objectStore = transaction.objectStore('marineData');
                const requests = allData.map(item => 
                    objectStore.delete(item.id)
                );
                await Promise.all(requests);
            }
        }
    } catch (error) {
        console.error('Sync failed:', error);
    }
}

// IndexedDB helper functions
function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('MarineWebGIS', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('marineData')) {
                db.createObjectStore('marineData', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('mapTiles')) {
                db.createObjectStore('mapTiles', { keyPath: 'url' });
            }
        };
    });
}