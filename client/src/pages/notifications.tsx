import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, BellOff, Send, AlertCircle, ExternalLink, BadgeCheck } from "lucide-react";
import { 
  requestNotificationPermission, 
  subscribeToNotifications, 
  clearAppBadge,
  setAppBadge,
  isBadgingSupported
} from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { isIOS, isSafari, supportsWebPushAPI } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { Notification } from "@shared/schema";

export default function Notifications() {
  // Store subscription status in local storage to maintain state between page navigations
  const [isSubscribed, setIsSubscribed] = useState(() => {
    // Initialize from local storage if available
    const savedStatus = localStorage.getItem('pushNotificationStatus');
    return savedStatus === 'subscribed';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [badgingSupported, setBadgingSupported] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [nextRefreshTime, setNextRefreshTime] = useState<Date | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const isIOSDevice = isIOS();
  const isSafariBrowser = isSafari();
  const pushSupported = supportsWebPushAPI();

  // Fetch notifications from the API
  const { data: notifications = [], refetch, error: notificationsError } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    staleTime: 10000, // Consider data fresh for 10 seconds
    refetchOnWindowFocus: true, // Refetch when tab gets focus
    queryFn: async () => {
      try {
        console.log('Fetching notifications...');
        const response = await fetch('/api/notifications');
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Notifications API response data:', data);
        
        if (!Array.isArray(data)) {
          console.warn('API response is not an array:', data);
          return [];
        }
        
        return data;
      } catch (error) {
        console.error('Error fetching notifications:', error);
        throw error;
      }
    },
  });
  
  // Custom refetch function that updates polling timestamps
  const updateNotifications = useCallback(async () => {
    // Update last refresh time
    setLastRefreshTime(new Date());
    
    // Calculate and set next refresh time (+30 seconds)
    const nextTime = new Date();
    nextTime.setSeconds(nextTime.getSeconds() + 30);
    setNextRefreshTime(nextTime);
    
    // Perform the actual refetch
    return await refetch();
  }, [refetch]);
  
  // Refetch when component mounts or is visited
  useEffect(() => {
    // Initial update when mounting
    updateNotifications();
    
    // Set up polling for iOS devices to fetch notifications periodically
    // This serves as a fallback for iOS where push notifications may not work reliably
    if (isIOSDevice) {
      console.log("Setting up iOS notification polling fallback");
      
      // Poll for new notifications every 30 seconds on iOS devices
      const pollingInterval = setInterval(() => {
        console.log("iOS notification polling: Checking for new notifications");
        updateNotifications();
      }, 30000); // 30 seconds
      
      return () => {
        clearInterval(pollingInterval);
      };
    }
  }, [updateNotifications, isIOSDevice]);

  useEffect(() => {
    if (notificationsError) {
      console.error('Failed to fetch notifications:', notificationsError);
      toast({
        title: "Fel",
        description: "Kunde inte hämta meddelanden",
        variant: "destructive",
      });
    }
  }, [notificationsError, toast]);

  // Check for badging support and clear badge when visiting page
  useEffect(() => {
    setBadgingSupported(isBadgingSupported());
    
    // Clear the app badge when the notification page is visited
    if (isBadgingSupported()) {
      // Use a small delay to ensure service worker is ready
      const clearBadgeTimer = setTimeout(async () => {
        try {
          await clearAppBadge();
          console.log('App badge cleared on notifications page visit');
          
          // Notify service worker that the badge was cleared
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'BADGE_CLEARED',
              timestamp: Date.now()
            });
            console.log('Notified service worker about badge clearing');
          }
        } catch (error) {
          console.error('Error clearing badge:', error);
        }
      }, 500); // Reduced delay for faster badge clearing
      
      return () => clearTimeout(clearBadgeTimer);
    }
  }, []);
  
  // Also clear badge when page becomes visible again (e.g., after app switching)
  useEffect(() => {
    if (!isBadgingSupported()) return;
    
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          await clearAppBadge();
          console.log('Badge cleared on visibility change to visible');
          
          // Also notify service worker
          if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'BADGE_CLEARED',
              timestamp: Date.now()
            });
          }
        } catch (error) {
          console.error('Error clearing badge on visibility change:', error);
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
  
  // Setup message listener for badge updates and notifications from service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'UPDATE_BADGE') {
        console.log(`Updating badge to ${event.data.count} from service worker message`);
        try {
          if (event.data.count > 0) {
            await setAppBadge(event.data.count);
          } else {
            await clearAppBadge();
          }
        } catch (error) {
          console.error('Failed to update badge from service worker message:', error);
        }
      } else if (event.data?.type === 'SHOW_NOTIFICATION') {
        // This is a fallback for iOS notifications - show directly in the browser
        console.log('Showing fallback in-app notification:', event.data);
        
        // Use the browser notification API as a fallback
        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            // Create a notification directly in the browser (for iOS fallback)
            new Notification(event.data.title, {
              body: event.data.body,
              icon: '/icons/Icon-192.png',
              badge: '/icons/Icon-72.png',
              tag: `notification-${Date.now()}`
            });
            console.log('Fallback notification shown successfully');
            
            // Also refresh the notifications list
            updateNotifications();
          } catch (error) {
            console.error('Failed to show fallback notification:', error);
            
            // Try to show a toast notification as last resort
            toast({
              title: event.data.title,
              description: event.data.body,
              duration: 10000, // longer duration for notification
            });
          }
        } else {
          // If Notification API is not available or permission not granted, use toast
          toast({
            title: event.data.title,
            description: event.data.body,
            duration: 10000, // longer duration for notification
          });
        }
      }
    };
    
    navigator.serviceWorker.addEventListener('message', handleMessage);
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [updateNotifications, toast]);

  useEffect(() => {
    if (!isIOSDevice && !isSafariBrowser) {
      navigator.serviceWorker.ready
        .then(registration => registration.pushManager.getSubscription())
        .then(subscription => {
          setIsSubscribed(!!subscription);
        })
        .catch(error => {
          console.error('Error checking subscription status:', error);
        });
    }
  }, [isIOSDevice, isSafariBrowser]);

  const handleSubscribe = async () => {
    if (isIOSDevice || isSafariBrowser) {
      return;
    }
    
    // For demo purposes, use a default user ID if not logged in
    // This allows testing without requiring login
    const userId = user?.id || 1; // Use ID 1 as fallback for testing

    setIsLoading(true);
    try {
      await requestNotificationPermission();
      const subscription = await subscribeToNotifications(userId);
      console.log('Push subscription created:', subscription);
      // Update state and persist to localStorage
      setIsSubscribed(true);
      localStorage.setItem('pushNotificationStatus', 'subscribed');
      toast({
        title: "Klart",
        description: "Pushnotiser har aktiverats",
      });
    } catch (error: any) {
      console.error('Notification setup error:', error);
      toast({
        title: "Fel",
        description: error.message || "Det gick inte att aktivera notiser",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (isIOSDevice || isSafariBrowser) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest("POST", "/api/notifications/send", {
        title: "Testnotis",
        body: "Detta är en test pushnotis!",
      });
      console.log('Test notification response:', response);
      toast({
        title: "Klart",
        description: "Testnotisen har skickats",
      });
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast({
        title: "Fel",
        description: "Det gick inte att skicka testnotisen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    if (isIOSDevice || isSafariBrowser) {
      return (
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-4 border rounded-lg bg-yellow-50">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800">Information för iOS-användare</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Automatiska pushnotiser fungerar tyvärr inte alltid på iOS-enheter på grund av Apple-begränsningar. 
                För att se nya meddelanden:
              </p>
              <ul className="text-sm text-yellow-700 mt-2 list-disc pl-5 space-y-1">
                <li>Besök denna sida regelbundet</li>
                <li>Installera appen på hemskärmen för bästa upplevelse</li>
                <li>Notiser uppdateras automatiskt var 30:e sekund när appen är öppen</li>
              </ul>
              <p className="text-sm text-yellow-700 mt-2">
                Observera att badge-funktionen på app-ikonen fungerar även på iOS.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (!pushSupported) {
      return (
        <div className="flex items-start gap-2 p-4 border rounded-lg bg-yellow-50">
          <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-800">Webbläsaren stöds inte</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Din webbläsare stöder inte pushnotiser. Vänligen använd en modern webbläsare 
              som Chrome, Firefox eller Edge.
            </p>
          </div>
        </div>
      );
    }

    return (
      <>
        {!isSubscribed ? (
          <Button 
            onClick={handleSubscribe} 
            className="w-full"
            disabled={isLoading}
          >
            <Bell className="mr-2 h-4 w-4" />
            {isLoading ? "Aktiverar..." : "Aktivera notiser"}
          </Button>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Du prenumererar på pushnotiser
            </p>
            <div className="flex flex-col space-y-2">
              <Button 
                onClick={sendTestNotification} 
                className="w-full"
                disabled={isLoading}
              >
                <Send className="mr-2 h-4 w-4" />
                {isLoading ? "Skickar..." : "Skicka testnotis"}
              </Button>
              <Button 
                onClick={() => {
                  setIsSubscribed(false);
                  localStorage.removeItem('pushNotificationStatus');
                  toast({
                    title: "Avaktiverad",
                    description: "Pushnotiser har avaktiverats"
                  });
                }} 
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                <BellOff className="mr-2 h-4 w-4" />
                Avaktivera notiser
              </Button>
            </div>
          </>
        )}
      </>
    );
  };

  // Function to set a test badge
  const setTestBadge = async () => {
    if (!badgingSupported) return;
    
    setIsLoading(true);
    try {
      await setAppBadge(3);
      toast({
        title: "Badge satt",
        description: "Testbadge placerad på app-ikonen",
      });
    } catch (error) {
      console.error('Failed to set app badge:', error);
      toast({
        title: "Fel",
        description: "Kunde inte sätta badge på app-ikonen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to clear the badge
  const clearBadge = async () => {
    if (!badgingSupported) return;
    
    setIsLoading(true);
    try {
      await clearAppBadge();
      toast({
        title: "Badge rensad",
        description: "Badge borttagen från app-ikonen",
      });
    } catch (error) {
      console.error('Failed to clear app badge:', error);
      toast({
        title: "Fel",
        description: "Kunde inte ta bort badge från app-ikonen",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Notiser</h1>

      {/* Push Notifications Card */}
      <Card>
        <CardHeader>
          <CardTitle>Pushnotiser</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderContent()}
        </CardContent>
      </Card>

      {/* App Badge Card - Only show if badging is supported */}
      {badgingSupported && (
        <Card>
          <CardHeader>
            <CardTitle>Appikon Badge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground mb-4">
              Denna app stödjer ikoner med märken (badges) som kan visa antalet olästa notiser
            </p>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={setTestBadge}
                disabled={isLoading}
                className="flex-1"
              >
                <Bell className="mr-2 h-4 w-4" />
                Sätt testbadge (3)
              </Button>
              <Button 
                variant="outline" 
                onClick={clearBadge}
                disabled={isLoading}
                className="flex-1"
              >
                <BadgeCheck className="mr-2 h-4 w-4" />
                Rensa badge
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Notifications Card */}
      {/* iOS Polling Status - Only show for iOS users */}
      {isIOSDevice && (
        <Card>
          <CardHeader>
            <CardTitle>Notis-status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span>Senaste uppdatering:</span>
                <span className="font-medium">
                  {lastRefreshTime ? lastRefreshTime.toLocaleTimeString('sv-SE') : 'Inte tillgänglig'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Nästa uppdatering:</span>
                <span className="font-medium">
                  {nextRefreshTime ? nextRefreshTime.toLocaleTimeString('sv-SE') : 'Inte tillgänglig'}
                </span>
              </div>
              <div className="mt-2">
                <Button 
                  onClick={() => updateNotifications()}
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={isLoading}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Uppdatera nu
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Meddelanden</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga meddelanden att visa</p>
          ) : (
            <div className="space-y-2">
              {notifications.map(notification => (
                <div
                  key={notification.id}
                  className="p-3 rounded-lg bg-accent"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{notification.title}</span>
                    {notification.link && (
                      <a 
                        href={notification.link} 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center ml-2"
                      >
                        <ExternalLink className="h-4 w-4 flex-shrink-0" />
                      </a>
                    )}
                  </div>
                  
                  {notification.body && (
                    <div className="mt-1 text-sm">{notification.body}</div>
                  )}
                  
                  <div className="mt-2 text-xs text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleString('sv-SE')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}