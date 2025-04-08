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

export async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    throw new Error("This browser does not support notifications");
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Notification permission was not granted");
    }
  } catch (error) {
    console.error('Permission request error:', error);
    throw new Error("Failed to request notification permission");
  }
}

export async function subscribeToNotifications() {
  if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) {
    console.warn("VAPID public key is not configured - push notifications are disabled");
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    console.log('Service Worker is ready');

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
      throw new Error(`Failed to register push subscription with server: ${errorData.error || response.statusText}`);
    }

    return subscription;
  } catch (error: any) {
    console.error('Subscription error:', error);
    throw new Error("Failed to subscribe to push notifications: " + (error.message || error));
  }
}