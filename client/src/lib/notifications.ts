/**
 * Checks if the Badging API is supported by the browser
 */
export function isBadgingSupported(): boolean {
  return 'setAppBadge' in navigator || 'clearAppBadge' in navigator;
}

/**
 * Sets a badge on the app icon
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
    } else if ('setAppBadge' in navigator) {
      await navigator.setAppBadge(count);
      console.log('App badge set to', count);
    }
  } catch (error) {
    console.error('Error setting app badge:', error);
  }
}

/**
 * Clears the badge from the app icon
 */
export async function clearAppBadge(): Promise<void> {
  if (!isBadgingSupported()) {
    console.warn('Badging API is not supported in this browser');
    return;
  }

  try {
    if ('clearAppBadge' in navigator) {
      await navigator.clearAppBadge();
      console.log('App badge cleared');
    }
  } catch (error) {
    console.error('Error clearing app badge:', error);
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
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Behörighet för notiser avslogs");
    }
  } catch (error) {
    console.error('Permission request error:', error);
    throw new Error("Det gick inte att begära behörighet för notiser");
  }
}

export async function subscribeToNotifications() {
  if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) {
    console.warn("VAPID public key is not configured - push notifications are disabled");
    return null;
  }

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
    await requestNotificationPermission();
    
    // Make sure service worker is ready - this is especially important for iOS
    const registration = await navigator.serviceWorker.ready;
    console.log('Service Worker is ready');

    // Check for existing subscription
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      console.log('Using existing push subscription');
      return existingSubscription;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
    });

    console.log('Push subscription created:', subscription);

    // Get the test user ID from our earlier insert
    const userResponse = await fetch("/api/users/test");
    const userData = await userResponse.json();

    const response = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userData.id,
        subscription: subscription.toJSON(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Det gick inte att registrera push-notiser: ${errorData.error || response.statusText}`);
    }

    return subscription;
  } catch (error: any) {
    console.error('Subscription error:', error);
    throw new Error("Det gick inte att prenumerera på push-notiser: " + (error.message || error));
  }
}