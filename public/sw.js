const CACHE_NAME = 'petshop-cache-v1';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/admin.html',
    '/almacen.html',
    '/pos.html',
    '/css/style.css',
    '/mobile.css',
    '/js/api.js',
    '/js/login.js',
    '/js/admin.js',
    '/js/almacen.js',
    '/js/pos.js',
    '/manifest.json',
    '/img/icon-192.png',
    '/img/icon-512.png',
    'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css',
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap'
];

// Instalación: almacenar en caché recursos estáticos básicos
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.warn('Algunos recursos iniciales no pudieron cachearse:', err);
            });
        })
    );
    self.skipWaiting();
});

// Activación: limpiar cachés obsoletas y reclamar clientes
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
        }).then(() => self.clients.claim())
    );
});

// Intercepción de peticiones (Fetch)
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 1. Peticiones a la API REST: Estrategia Network-First (siempre datos frescos)
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request).catch(async () => {
                const cached = await caches.match(request);
                if (cached) return cached;
                return new Response(
                    JSON.stringify({ offline: true, mensaje: 'Sin conexión a internet. Verifique su red.' }),
                    { headers: { 'Content-Type': 'application/json' }, status: 503 }
                );
            })
        );
        return;
    }

    // 2. Recursos estáticos e interfaces: Estrategia Cache-First con fallback a red
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // Actualizar en segundo plano (stale-while-revalidate)
                fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
                    }
                }).catch(() => {});
                return cachedResponse;
            }

            return fetch(request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(request, responseToCache);
                });
                return networkResponse;
            }).catch(() => {
                // Fallback para navegación offline si se solicita HTML
                if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
