import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isIOS() {
  return (
    typeof window !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream
  );
}

export function supportsNotifications() {
  return "Notification" in window && "serviceWorker" in navigator;
}

export function supportsWebPushAPI() {
  return supportsNotifications() && !isIOS();
}