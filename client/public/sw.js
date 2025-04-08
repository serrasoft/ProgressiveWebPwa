const CACHE_NAME = 'pwa-cache-v1';
const OFFLINE_MODE_CACHE = 'pwa-offline-mode-cache';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/logo1.png',
  '/src/main.tsx',
  '/src/index.css',
  '/api/profile'  // Cache profile data for offline use
];

self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  // Force activation of the new service worker
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    Promise.all([
      // Take control of all clients/pages immediately
      clients.claim(),
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== OFFLINE_MODE_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

self.addEventListener('fetch', event => {
  const isApiRequest = event.request.url.includes('/api/');

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if available
        if (response) {
          // For API requests, also check for fresh data
          if (isApiRequest) {
            fetch(event.request.clone())
              .then(freshResponse => {
                if (freshResponse && freshResponse.status === 200) {
                  caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, freshResponse.clone());
                  });
                }
              })
              .catch(() => {/* Use cached response */});
          }
          return response;
        }

        // Clone the request because it can only be used once
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if response is valid
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response because it can only be used once
          const responseToCache = response.clone();

          // Cache static assets and API responses when offline mode is enabled
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        })
        .catch(error => {
          // If offline and it's an API request, try to return cached data
          if (isApiRequest) {
            return caches.match(event.request);
          }
          throw error;
        });
      })
  );
});

self.addEventListener('message', event => {
  if (event.data.type === 'ENABLE_OFFLINE_MODE') {
    // Cache all responses when offline mode is enabled
    caches.open(OFFLINE_MODE_CACHE).then(cache => {
      // Cache API responses
      fetch('/api/profile')
        .then(response => {
          cache.put('/api/profile', response.clone());
        })
        .catch(console.error);
    });
  }
});

self.addEventListener('push', event => {
  console.log('Push event received:', event);

  let notificationData = {};
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData = {
        title: 'New Notification',
        body: event.data.text()
      };
    }
  }

  const options = {
    body: notificationData.body || 'New notification',
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [100, 50, 100],
    data: {
      url: notificationData.url || '/',
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title || 'Bergakungen', options)
  );
});

self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  event.notification.close();

  // Get the URL from the notification data
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Check if there is already a window/tab open with the target URL
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window/tab is available, open one
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});