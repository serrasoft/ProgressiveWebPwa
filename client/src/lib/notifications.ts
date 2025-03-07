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

    const response = await fetch("/api/notifications/subscribe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: 1, // TODO: Replace with actual user ID
        subscription: subscription,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to register push subscription with server");
    }

    return subscription;
  } catch (error) {
    console.error('Subscription error:', error);
    throw new Error("Failed to subscribe to push notifications: " + error.message);
  }
}