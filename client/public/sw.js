const CACHE_NAME = 'pwa-cache-v2';
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
  console.log('Push event received with data:', event.data ? event.data.text() : 'no payload');

  let notificationData = {};
  if (event.data) {
    try {
      const text = event.data.text();
      console.log('Received raw push data:', text);
      notificationData = JSON.parse(text);
      console.log('Parsed notification data:', notificationData);
    } catch (e) {
      console.error('Error parsing notification data:', e);
      notificationData = {
        title: 'Ny notis',
        body: event.data.text() || 'Ny notis från Bergakungen'
      };
    }
  }

  // Enhanced notification options - better iOS support
  const options = {
    body: notificationData.body || 'Ny notis från Bergakungen',
    icon: '/icons/Icon-192.png',
    badge: '/icons/Icon-72.png',
    // iOS doesn't support vibration patterns
    vibrate: [100, 50, 100],
    // Sound is supported on iOS
    silent: false,
    renotify: true,
    // iOS uses the 'tag' value to group notifications
    tag: notificationData.tag || 'new-notification',
    // iOS treats 'requireInteraction' differently
    requireInteraction: true,
    // Data to pass to notification click handler
    data: {
      url: notificationData.url || '/',
      dateOfArrival: Date.now(),
      primaryKey: notificationData.id || 1,
      isiOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !self.MSStream
    },
    // iOS supports 'actions'  
    actions: [
      {
        action: 'view',
        title: 'Visa'
      }
    ]
  };

  console.log('Showing notification with options:', options);

  // Handle badging - set a badge on the app icon
  const showBadge = async () => {
    try {
      // First try to get all notifications
      const response = await fetch('/api/notifications');
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const notificationsData = await response.json();
      const count = Array.isArray(notificationsData) ? notificationsData.length : 1; // Fallback to 1 if we can't get count
      
      console.log(`Setting badge count to ${count}`);
      
      // For iOS, we need to handle badge updates through the client
      if ('setAppBadge' in self.navigator) {
        try {
          await self.navigator.setAppBadge(count);
          console.log(`Service worker set app badge to ${count}`);
        } catch (err) {
          console.error('Failed to set badge in service worker:', err);
          // Fallback: notify all clients to update the badge
          const allClients = await self.clients.matchAll({ type: 'window' });
          allClients.forEach(client => {
            client.postMessage({
              type: 'UPDATE_BADGE',
              count: count
            });
          });
        }
      } else {
        console.log('Badging API not available in SW, messaging clients');
        
        // Message all clients to update the badge
        const allClients = await self.clients.matchAll({ type: 'window' });
        if (allClients.length > 0) {
          console.log(`Messaging ${allClients.length} clients to update badge`);
          allClients.forEach(client => {
            client.postMessage({
              type: 'UPDATE_BADGE',
              count: count
            });
          });
        } else {
          console.log('No clients available to message');
        }
      }
    } catch (error) {
      console.error('Error setting badge:', error);
    }
  };

  // Ensure event.waitUntil gets a proper promise
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(notificationData.title || 'Bergakungen', options),
      showBadge().catch(err => console.error('Badge update failed:', err))
    ])
  );
});

// Handle notification actions 
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  
  // Close the notification
  event.notification.close();

  // Get the URL from the notification data
  const url = event.notification.data?.url || '/';
  const isIOS = event.notification.data?.isiOS || false;
  
  // Check if a specific action was clicked
  let actionUrl = url;
  if (event.action === 'view') {
    actionUrl = url; // Use the default URL for 'view' action
  }

  // Clear or update the badge when notification is clicked
  const updateBadge = async () => {
    try {
      // Check if we can fetch remaining unread notifications 
      let count = 0;
      
      try {
        // Try to fetch notifications from the API
        const response = await fetch('/api/notifications');
        if (response.ok) {
          const notificationsData = await response.json();
          count = Array.isArray(notificationsData) ? notificationsData.length : 0;
          console.log(`Fetched ${count} notifications for badge update`);
        } else {
          console.warn('Could not fetch notifications for badge, falling back to notification count');
          const notifications = await self.registration.getNotifications();
          count = notifications.length;
        }
      } catch (error) {
        console.error('Error fetching notifications for badge update:', error);
        // Fallback to notification count if API fetch failed
        const notifications = await self.registration.getNotifications();
        count = notifications.length;
      }
      
      console.log(`Setting badge to ${count}`);
      
      // First try to directly update badge with ServiceWorker API
      if (self.navigator && 'setAppBadge' in self.navigator) {
        try {
          if (count > 0) {
            await self.navigator.setAppBadge(count);
            console.log(`Badge set to ${count}`);
          } else {
            await self.navigator.clearAppBadge();
            console.log('Badge cleared');
          }
        } catch (badgeError) {
          console.error('Failed to update badge directly:', badgeError);
          // Fallback to client messaging
          const windowClients = await clients.matchAll({ type: 'window' });
          console.log(`Messaging ${windowClients.length} clients to update badge`);
          
          windowClients.forEach(client => {
            client.postMessage({
              type: 'UPDATE_BADGE',
              count: count
            });
          });
        }
      } else {
        // Otherwise message all clients to update the badge
        const windowClients = await clients.matchAll({ type: 'window' });
        console.log(`Messaging ${windowClients.length} clients to update badge`);
        
        windowClients.forEach(client => {
          client.postMessage({
            type: 'UPDATE_BADGE',
            count: count
          });
        });
      }
    } catch (error) {
      console.error('Error updating badge:', error);
    }
  };

  // Special handling for iOS
  const openUrl = async () => {
    try {
      // Get all open windows/tabs
      const windowClients = await clients.matchAll({ type: 'window' });
      
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === actionUrl && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window/tab is available, open one
      if (clients.openWindow) {
        return clients.openWindow(actionUrl);
      }
      
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  };

  // Execute both tasks in parallel
  event.waitUntil(
    Promise.all([
      openUrl(),
      updateBadge()
    ])
  );
});