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
      clients.claim().then(() => {
        console.log('Service worker claimed all clients');
        
        // Notify all clients that the service worker is active
        return self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => {
            client.postMessage({ 
              type: 'SW_ACTIVATED',
              timestamp: Date.now()
            });
          });
          console.log(`Notified ${clients.length} clients about service worker activation`);
        });
      }),
      
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
  // Only handle GET requests and http/https schemes
  if (event.request.method !== 'GET' || 
      !event.request.url.startsWith('http')) {
    return;
  }

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
                    try {
                      cache.put(event.request, freshResponse.clone());
                    } catch (e) {
                      console.error('Failed to cache response:', e);
                    }
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
              try {
                cache.put(event.request, responseToCache);
              } catch (e) {
                console.error('Failed to cache response:', e);
              }
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
  console.log('Service worker received message:', event.data);

  // Handle skip waiting message to activate new service worker immediately
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SKIP_WAITING message received, activating new service worker');
    self.skipWaiting();
  }

  // Handle badge cleared message from client
  if (event.data && event.data.type === 'BADGE_CLEARED') {
    console.log('BADGE_CLEARED message received, ensuring badge is cleared');
    
    // Try to clear badge directly from the service worker
    if ('setAppBadge' in self.navigator) {
      self.navigator.clearAppBadge()
        .then(() => console.log('Badge cleared successfully in service worker'))
        .catch(error => console.error('Failed to clear badge in service worker:', error));
    }
    
    // Also notify all other clients to clear their badges
    self.clients.matchAll({ type: 'window' })
      .then(clients => {
        clients.forEach(client => {
          // Don't send back to the same client that sent the message
          if (event.source && client.id !== event.source.id) {
            client.postMessage({
              type: 'UPDATE_BADGE',
              count: 0 // 0 means clear the badge
            });
          }
        });
      })
      .catch(error => console.error('Error notifying clients about badge clearing:', error));
  }

  // Handle offline mode enabling
  if (event.data && event.data.type === 'ENABLE_OFFLINE_MODE') {
    console.log('Enabling offline mode');
    // Cache all responses when offline mode is enabled
    caches.open(OFFLINE_MODE_CACHE).then(cache => {
      // Cache API responses
      fetch('/api/profile')
        .then(response => {
          try {
            cache.put('/api/profile', response.clone());
            console.log('Cached profile for offline use');
          } catch (error) {
            console.error('Failed to cache profile:', error);
          }
        })
        .catch(error => console.error('Failed to fetch profile for caching:', error));
    }).catch(error => console.error('Failed to open cache:', error));
  }

  // Echo any other messages back to client for testing
  if (event.source) {
    event.source.postMessage({
      type: 'ECHO_RESPONSE',
      originalMessage: event.data,
      timestamp: Date.now()
    });
  }
});

self.addEventListener('push', event => {
  console.log('==================== PUSH NOTIFICATION RECEIVED ====================');
  console.log('Push event received with data:', event.data ? event.data.text() : 'no payload');
  console.log('User Agent:', navigator.userAgent);
  console.log('iOS Detection:', /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'iOS Device Detected' : 'Not iOS');
  console.log('Service Worker Scope:', self.registration.scope);
  console.log('Service Worker State:', self.registration.active?.state);
  console.log('==================================================================');

  // Immediately wake all clients to ensure they receive the badge update
  const wakeClients = async () => {
    try {
      const allClients = await self.clients.matchAll({ type: 'window' });
      console.log(`Found ${allClients.length} clients to wake`);
      allClients.forEach(client => {
        client.postMessage({
          type: 'WAKE_UP',
          timestamp: Date.now()
        });
      });
    } catch (err) {
      console.error('Error waking clients:', err);
    }
  };

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

  // Define unique tag for this notification to avoid duplicates
  const uniqueTag = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Enhanced notification options with special attention to iOS support
  const options = {
    body: notificationData.body || 'Ny notis från Bergakungen',
    icon: '/icons/Icon-192.png',
    badge: '/icons/Icon-72.png',
    // Vibration pattern (not supported on iOS but used on Android)
    vibrate: [100, 50, 100],
    // Ensure sound is enabled
    silent: false,
    // Allow multiple notifications with same tag to be shown
    renotify: true,
    // Each notification gets a unique tag to avoid collapsing
    tag: notificationData.tag || uniqueTag,
    // Make sure notification is shown in foreground
    requireInteraction: true,
    // Data to pass to notification click handler
    data: {
      url: notificationData.url || '/',
      link: notificationData.link || null, // Include the link if it exists
      dateOfArrival: Date.now(),
      notificationId: notificationData.id || 1,
      isiOS: /iPad|iPhone|iPod/.test(navigator.userAgent) && !self.MSStream
    },
    // Action buttons
    actions: [
      {
        action: 'view',
        title: 'Visa'
      }
    ]
  };

  console.log('Showing notification with options:', options);

  // Handle badge updates - both on service worker and clients
  const updateBadge = async () => {
    try {
      // First try to get all notifications
      const response = await fetch('/api/notifications');
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const notificationsData = await response.json();
      // Make sure we always have at least 1 for a new notification, if API fails
      const count = Array.isArray(notificationsData) ? notificationsData.length : 1;
      
      console.log(`Setting badge count to ${count}`);
      
      // Update badge through all possible methods
      
      // Method 1: Try direct service worker API
      if ('setAppBadge' in self.navigator) {
        try {
          await self.navigator.setAppBadge(count);
          console.log(`Service worker set app badge to ${count}`);
        } catch (err) {
          console.error('Failed to set badge in service worker:', err);
        }
      }
      
      // Method 2: Always message all clients to ensure badge is updated
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
        console.log('No window clients available to message for badge update');
      }
      
      return count;
    } catch (error) {
      console.error('Error updating badge:', error);
      return 1; // Default to 1 if we can't determine the count
    }
  };

  // Try to use notification as persistent as possible to maximize chance of it showing
  const showNotification = async () => {
    try {
      // Check if we have permission
      if (self.Notification && self.Notification.permission) {
        console.log('iOS Notification Permission State:', self.Notification.permission);
      }

      // Log the permission state for debugging
      if (self.registration.pushManager) {
        try {
          const subscription = await self.registration.pushManager.getSubscription();
          console.log('Push Subscription Status:', subscription ? 'Active' : 'Not Active');
          if (subscription) {
            // Only log parts of the subscription for security
            console.log('Subscription endpoint available:', !!subscription.endpoint);
          }
        } catch (e) {
          console.error('Error checking subscription:', e);
        }
      }

      // Now try to show the notification
      await self.registration.showNotification(notificationData.title || 'Bergakungen', options);
      console.log('Notification shown successfully');
      
      // Some browsers might need a second attempt for iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !self.MSStream;
      if (isIOS) {
        // On iOS, also message clients to show a fallback notification
        const allClients = await self.clients.matchAll({ type: 'window' });
        allClients.forEach(client => {
          client.postMessage({
            type: 'SHOW_NOTIFICATION',
            title: notificationData.title || 'Bergakungen',
            body: notificationData.body || 'Ny notis från Bergakungen',
            data: options.data
          });
        });
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  };

  // Ensure event.waitUntil gets a proper promise chain
  event.waitUntil(
    Promise.all([
      wakeClients(),
      showNotification(),
      updateBadge()
    ]).catch(err => console.error('Push handling failed:', err))
  );
});

// Handle notification actions 
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked:', event);
  
  // Close the notification
  event.notification.close();

  // Get the notification data
  // First check if there's a link in the notification data
  const notificationLink = event.notification.data?.link;
  // If we have a link in the notification data, use it, otherwise fallback to the default URL or notifications page
  const url = notificationLink || event.notification.data?.url || '/notifications';
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