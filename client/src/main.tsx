import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/components/theme-provider";
import App from "./App";
import "./index.css";
import { setAppBadge, clearAppBadge } from "@/lib/notifications";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Failed to find the root element");
}

// Setup service worker registration and enhanced messaging
if ('serviceWorker' in navigator) {
  // Register service worker with better error handling
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('ServiceWorker registration successful:', registration);
      
      // Try to activate any waiting service worker
      if (registration.waiting) {
        console.log('New service worker waiting, activating...');
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('Service worker update found, installing...');
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            console.log('Service worker state changed to:', newWorker.state);
          });
        }
      });
    } catch (error) {
      console.error('Service worker registration failed:', error);
    }
  });
  
  // Handle messages from service worker
  navigator.serviceWorker.addEventListener('message', async (event) => {
    console.log('Message from service worker:', event.data);
    
    // Handle badge updates
    if (event.data.type === 'UPDATE_BADGE') {
      console.log(`Received badge update request: count=${event.data.count}`);
      try {
        const count = event.data.count || 0;
        if (count > 0) {
          await setAppBadge(count);
          console.log(`Updated badge count to ${count}`);
        } else {
          await clearAppBadge();
          console.log('Cleared badge');
        }
      } catch (error) {
        console.error('Failed to update badge:', error);
      }
    }
    
    // Handle service worker activation message
    if (event.data.type === 'SW_ACTIVATED') {
      console.log('Service worker has been activated');
      
      // Sync badge state with the service worker
      try {
        // Get notifications to set the correct badge count
        const response = await fetch('/api/notifications');
        if (response.ok) {
          const notifications = await response.json();
          if (Array.isArray(notifications) && notifications.length > 0) {
            // Set badge based on notifications count
            await setAppBadge(notifications.length);
            console.log(`Badge count synchronized to ${notifications.length} after SW activation`);
          } else {
            // Clear badge if no notifications
            await clearAppBadge();
            console.log('Badge cleared during SW activation sync');
          }
        }
      } catch (error) {
        console.error('Failed to sync badge state after SW activation:', error);
      }
    }
    
    // Handle fallback notification display (for iOS)
    if (event.data.type === 'SHOW_NOTIFICATION') {
      console.log('Received request to show fallback notification');
      
      // Special handling for iOS devices
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      
      // First try to use the standard Notification API if available
      if ('Notification' in window) {
        try {
          // Request permission if needed
          if (Notification.permission !== 'granted') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
              throw new Error('Notification permission denied');
            }
          }
          
          // Show native notification with more iOS-compatible options
          const notification = new Notification(event.data.title, {
            body: event.data.body,
            icon: '/icons/Icon-192.png',
            badge: '/icons/Icon-72.png',
            data: event.data.data,
            // iOS specific settings
            tag: `notification-${Date.now()}`, // Ensure unique tag for iOS
            // TypeScript type definitions are incomplete for Web Notifications API
            // Use type assertion to handle browser-specific options
            ...(({
              requireInteraction: true,
              vibrate: [100, 50, 100],
            } as unknown) as NotificationOptions)
          });
          
          console.log('Fallback notification shown successfully');
          
          // Also update badge count when showing notification
          // This is especially important for iOS where the service worker might not be able to do it
          if (isIOS && 'setAppBadge' in navigator) {
            try {
              // Try to get current badge count from API
              const response = await fetch('/api/notifications');
              if (response.ok) {
                const notifications = await response.json();
                const count = Array.isArray(notifications) ? notifications.length : 1;
                
                await navigator.setAppBadge(count);
                console.log(`Badge count set to ${count} after showing notification`);
              }
            } catch (badgeError) {
              console.error('Failed to update badge:', badgeError);
            }
          }
          
          // Add click handler for the notification if created successfully
          notification.onclick = () => {
            console.log('Fallback notification clicked');
            
            // Close the notification
            notification.close();
            
            // Check if there's a direct link to open instead of navigation within the app
            const link = event.data.data?.link;
            const url = link || event.data.data?.url || '/notifications';
            
            window.focus();
            
            // If we have a specific link, open it in the browser
            if (link) {
              // For external links, open in a new tab/window
              window.open(link, '_blank');
            } else {
              // For internal app navigation, use normal navigation
              window.location.href = url;
            }
          };
        } catch (error) {
          console.error('Failed to show fallback notification:', error);
          
          // If native notification fails on iOS, try one last fallback for iOS
          if (isIOS) {
            // For iOS, at least make sure we update the badge
            try {
              if ('setAppBadge' in navigator) {
                navigator.setAppBadge(1).then(() => {
                  console.log('Set badge as fallback for failed notification');
                });
              }
            } catch (e) {
              console.error('All notification methods failed:', e);
            }
          }
        }
      }
    }
    
    // Handle wake up messages (used to ensure client is responsive)
    if (event.data.type === 'WAKE_UP') {
      console.log('Received wake up from service worker');
    }
  });
}

const root = createRoot(container);

root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);