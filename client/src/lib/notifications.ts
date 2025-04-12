// Utility function to convert base64 string to Uint8Array
// Needs to be defined at the module level
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
    
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Checks if the Badging API is supported by the browser
 */
export function isBadgingSupported(): boolean {
  return 'setAppBadge' in navigator || 'clearAppBadge' in navigator;
}

/**
 * Sets a badge on the app icon with enhanced iOS support
 * @param count The number to display on the badge (0 clears the badge)
 */
export async function setAppBadge(count: number): Promise<void> {
  if (!isBadgingSupported()) {
    console.warn('Badging API is not supported in this browser');
    return;
  }

  try {
    if (count === 0) {
      await clearAppBadge();
    } else {
      // For iOS PWAs, make multiple attempts if needed
      // iOS sometimes requires multiple attempts to set badges
      const maxAttempts = isIOS() ? 3 : 1;
      let success = false;
      
      for (let attempt = 1; attempt <= maxAttempts && !success; attempt++) {
        try {
          await navigator.setAppBadge(count);
          console.log(`App badge set to ${count} (attempt ${attempt})`);
          success = true;
        } catch (error) {
          console.warn(`Badge set attempt ${attempt} failed:`, error);
          if (attempt < maxAttempts) {
            // Wait a bit before trying again
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            throw error; // Re-throw on final attempt
          }
        }
      }
      
      // If we have service worker, also notify it to confirm badge update
      if (success && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
        try {
          navigator.serviceWorker.controller.postMessage({
            type: 'BADGE_SET',
            count: count,
            timestamp: Date.now()
          });
        } catch (e) {
          console.warn('Failed to notify service worker about badge update:', e);
        }
      }
    }
  } catch (error) {
    console.error('Error setting app badge:', error);
    throw error; // Re-throw to allow caller to handle the error
  }
}

/**
 * Clears the badge from the app icon with enhanced iOS support
 */
export async function clearAppBadge(): Promise<void> {
  if (!isBadgingSupported()) {
    console.warn('Badging API is not supported in this browser');
    return;
  }

  try {
    // For iOS, make multiple attempts as iOS sometimes fails silently
    const maxAttempts = isIOS() ? 3 : 1;
    let success = false;
    
    for (let attempt = 1; attempt <= maxAttempts && !success; attempt++) {
      try {
        await navigator.clearAppBadge();
        console.log(`App badge cleared successfully (attempt ${attempt})`);
        success = true;
      } catch (error) {
        console.warn(`Badge clear attempt ${attempt} failed:`, error);
        if (attempt < maxAttempts) {
          // Wait a bit before trying again
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          throw error; // Re-throw on final attempt
        }
      }
    }
    
    // Also notify service worker that badge was cleared
    if (success && 'serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        navigator.serviceWorker.controller.postMessage({
          type: 'BADGE_CLEARED',
          timestamp: Date.now()
        });
      } catch (e) {
        console.warn('Failed to notify service worker about badge clearing:', e);
      }
    }
  } catch (error) {
    console.error('Error clearing app badge:', error);
    throw error; // Re-throw to allow caller to handle the error
  }
}

/**
 * Detects if we're running on iOS
 */
export function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

/**
 * Checks if the current device supports push notifications
 * - Takes into account iOS 16.4+ requirements
 */
export function isPushNotificationSupported(): boolean {
  // Basic requirement: Service Worker API and Notification API
  const basicSupport = 'serviceWorker' in navigator && 'Notification' in window && 'PushManager' in window;
  
  if (isIOS()) {
    // For iOS, also check if it's installed as PWA (standalone mode)
    // iOS web push only works when app is installed on home screen
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (navigator as any).standalone === true;
    
    return basicSupport && isStandalone;
  }
  
  return basicSupport;
}

export async function requestNotificationPermission() {
  if (!isPushNotificationSupported()) {
    // For iOS, give a more specific message
    if (isIOS()) {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          (navigator as any).standalone === true;
      
      if (!isStandalone) {
        throw new Error(
          "För att aktivera push-notiser på iOS, lägg till appen på startskärmen först genom att klicka på 'Dela' och sedan 'Lägg till på hemskärmen'"
        );
      } else if (parseInt(navigator.userAgent.match(/OS (\d+)_/)?.[1] || "0", 10) < 16) {
        throw new Error("Push-notiser kräver iOS 16.4 eller senare");
      }
    } else {
      throw new Error("Din enhet stöder inte push-notiser");
    }
  }

  try {
    // Check current permission first
    if (Notification.permission === "granted") {
      console.log("Notification permission already granted");
      return;
    }
    
    if (Notification.permission === "denied") {
      throw new Error("Behörighet för notiser har redan avslagits. Återställ behörigheter i webbläsarinställningarna.");
    }

    // Special handling for iOS
    if (isIOS()) {
      console.log("Requesting notification permission on iOS...");
      
      // iOS needs special handling for permission request
      const permission = await new Promise<NotificationPermission>((resolve) => {
        // Set a timeout in case the permission request gets stuck (happens on some iOS versions)
        const timeoutId = setTimeout(() => {
          console.warn("Permission request timed out");
          resolve("default");
        }, 5000);
        
        Notification.requestPermission().then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        }).catch((error) => {
          clearTimeout(timeoutId);
          console.error("Error requesting permission:", error);
          resolve("default");
        });
      });
      
      if (permission !== "granted") {
        throw new Error("Behörighet för notiser avslogs");
      }
      
      console.log("iOS notification permission granted!");
    } else {
      // Standard flow for other browsers
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Behörighet för notiser avslogs");
      }
    }
  } catch (error) {
    console.error('Permission request error:', error);
    throw new Error("Det gick inte att begära behörighet för notiser");
  }
}

export async function subscribeToNotifications(userId: number) {
  // Check if VAPID public key is configured
  if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) {
    console.error("VAPID_PUBLIC_KEY saknas");
    throw new Error("Push-notiser är inte konfigurerade på servern.");
  }

  // Log VAPID key (masked for security) to confirm it's available
  const vapidKeyStart = import.meta.env.VITE_VAPID_PUBLIC_KEY.substring(0, 6);
  const vapidKeyEnd = import.meta.env.VITE_VAPID_PUBLIC_KEY.substring(import.meta.env.VITE_VAPID_PUBLIC_KEY.length - 6);
  console.log(`VAPID nyckel är tillgänglig: ${vapidKeyStart}...${vapidKeyEnd}`);

  // Verify device support first
  if (!isPushNotificationSupported()) {
    if (isIOS()) {
      // For iOS users, provide specific guidance
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                          (navigator as any).standalone === true;
      
      if (!isStandalone) {
        throw new Error(
          "För att få push-notiser på iOS, installera först appen på startskärmen"
        );
      }
      
      // Check iOS version
      const iosVersion = parseInt(navigator.userAgent.match(/OS (\d+)_/)?.[1] || "0", 10);
      if (iosVersion < 16) {
        throw new Error("Push-notiser kräver iOS 16.4 eller senare");
      } else if (iosVersion === 16) {
        // For iOS 16, need to check minor version (16.4+)
        console.log("För iOS 16 behöver du iOS 16.4 eller senare för att få push-notiser");
      }
    } else {
      throw new Error("Din enhet stöder inte push-notiser");
    }
  }

  try {
    // First, ensure notification permission
    console.log("Begär notisbehörighet...");
    await requestNotificationPermission();
    console.log("Notisbehörighet beviljad.");
    
    // Make sure service worker is ready - this is especially important for iOS
    console.log("Väntar på att service worker ska bli redo...");
    const registration = await navigator.serviceWorker.ready;
    console.log('Service Worker är redo');

    // Check for existing subscription to avoid re-subscribing
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('Använder befintlig push-prenumeration');
      return existingSubscription;
    }

    // Create new subscription with properly formatted application server key
    console.log("Skapar ny push-prenumeration...");
    const applicationServerKey = urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY);
    
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    });

    console.log('Push-prenumeration skapad:', subscription);

    // Using the userId parameter passed to this function

    console.log("Registrerar prenumerationen på servern...");
    const response = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userId,
        subscription: subscription.toJSON(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Serverfel:", errorText);
      throw new Error(`Det gick inte att registrera push-notiser: ${response.status} ${response.statusText}`);
    }

    console.log("Push-notiser aktiverade framgångsrikt!");
    return subscription;
  } catch (error: any) {
    console.error('Prenumerationsfel:', error);
    throw new Error("Det gick inte att prenumerera på push-notiser: " + (error.message || error));
  }
}