import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isIOS() {
  try {
    return (
      typeof window !== "undefined" &&
      (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
      !(window as any).MSStream
    );
  } catch (e) {
    console.error('Error detecting iOS:', e);
    return false;
  }
}

export function isSafari() {
  try {
    return (
      typeof window !== "undefined" &&
      /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
    );
  } catch (e) {
    console.error('Error detecting Safari:', e);
    return false;
  }
}

export function supportsNotifications() {
  try {
    return "Notification" in window && "serviceWorker" in navigator;
  } catch (e) {
    console.error('Error checking notification support:', e);
    return false;
  }
}

export function supportsWebPushAPI() {
  try {
    return supportsNotifications() && !isIOS();
  } catch (e) {
    console.error('Error checking Web Push API support:', e);
    return false;
  }
}