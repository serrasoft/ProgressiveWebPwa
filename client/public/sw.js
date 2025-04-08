const CACHE_NAME = 'pwa-cache-v1';
const OFFLINE_MODE_CACHE = 'pwa-offline-mode-cache';

const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo1.png',
  '/icons/Icon-16.png',
  '/icons/Icon-32.png',
  '/icons/Icon-64.png',
  '/icons/Icon-128.png',
  '/icons/Icon-192.png',
  '/icons/Icon-512.png',
  '/icons/Icon-180.png',
  '/icons/Icon-152.png',
  '/icons/Icon-167.png',
  '/icons/Icon-1024.png',
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
    icon: '/icons/Icon-192.png',
    badge: '/icons/Icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: notificationData.url || '/',
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  // Handle badging - set a badge on the app icon
  const showBadge = async () => {
    try {
      // First try to get all notifications
      const notifications = await self.registration.getNotifications();
      const count = notifications.length + 1; // Add 1 for the new notification
      
      // Check if the Badging API is supported
      if ('setAppBadge' in navigator) {
        // We're in a service worker, so we need to use clients to get the window client
        const windowClients = await clients.matchAll({ type: 'window' });
        
        // For each client (window), set the badge
        windowClients.forEach(windowClient => {
          windowClient.navigate(windowClient.url); // Refresh the client to apply badge
        });
        
        // Try to set the badge directly if possible
        if (self.navigator && 'setAppBadge' in self.navigator) {
          self.navigator.setAppBadge(count);
        }
      }
    } catch (error) {
      console.error('Error setting badge:', error);
    }
  };

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(notificationData.title || 'Bergakungen', options),
      showBadge()
    ])
  );
});

self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  event.notification.close();

  // Get the URL from the notification data
  const url = event.notification.data?.url || '/';

  // Clear or update the badge when notification is clicked
  const updateBadge = async () => {
    try {
      // Check remaining notifications
      const notifications = await self.registration.getNotifications();
      
      if ('setAppBadge' in navigator) {
        // We're in a service worker, so we need to use clients to get the window client
        const windowClients = await clients.matchAll({ type: 'window' });
        
        // For each client, update the badge
        windowClients.forEach(windowClient => {
          // If no more notifications, clear the badge, otherwise update count
          if (notifications.length === 0) {
            if (self.navigator && 'clearAppBadge' in self.navigator) {
              self.navigator.clearAppBadge();
            }
          } else {
            if (self.navigator && 'setAppBadge' in self.navigator) {
              self.navigator.setAppBadge(notifications.length);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error updating badge:', error);
    }
  };

  event.waitUntil(
    Promise.all([
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
      }),
      updateBadge()
    ])
  );
});