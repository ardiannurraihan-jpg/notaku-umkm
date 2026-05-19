// ============================================
//   NOTAKU - SERVICE WORKER
//   Untuk PWA (Install sebagai App)
// ============================================

const CACHE_NAME = 'notaku-v1';

// File yang akan di-cache
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/premium.js',
  '/manifest.json',
  '/favicon.ico',
  '/favicon-16.png',
  '/favicon-32.png',
  '/favicon-72.png',
  '/favicon-96.png',
  '/favicon-128.png',
  '/favicon-144.png',
  '/favicon-152.png',
  '/favicon-192.png',
  '/favicon-384.png',
  '/favicon-512.png',
  '/favicon-180.png',
  '/favicon.png'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.log('Cache failed:', err))
  );
});

// Fetch dari cache
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        // Clone request karena stream hanya bisa dibaca sekali
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Cek response valid
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone response karena stream hanya bisa dibaca sekali
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
  );
});

// Update cache (hapus cache lama)
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
