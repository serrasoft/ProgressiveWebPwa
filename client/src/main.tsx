import React from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/components/theme-provider";
import App from "./App";
import "./index.css";
import { setAppBadge } from "@/lib/notifications";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Failed to find the root element");
}

// Setup service worker message handler for badge updates
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', async (event) => {
    console.log('Message from service worker:', event.data);
    
    if (event.data.type === 'UPDATE_BADGE') {
      console.log(`Received badge update request: count=${event.data.count}`);
      try {
        await setAppBadge(event.data.count);
        console.log(`Updated badge count to ${event.data.count}`);
      } catch (error) {
        console.error('Failed to update badge:', error);
      }
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