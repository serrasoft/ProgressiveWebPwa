import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Send, AlertCircle, ExternalLink, BadgeCheck, RefreshCw } from "lucide-react";
import { 
  requestNotificationPermission, 
  subscribeToNotifications, 
  clearAppBadge,
  setAppBadge,
  isBadgingSupported,
  isPushNotificationSupported,
  isIOS as isIOSDevice
} from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isIOS, isSafari, supportsWebPushAPI } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { Notification } from "@shared/schema";

export default function Notifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [badgingSupported, setBadgingSupported] = useState(false);
  const { toast } = useToast();
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
  
  // Refetch when component mounts or is visited
  useEffect(() => {
    refetch();
  }, [refetch]);

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
  
  // Setup message listener for badge updates and fallback notifications from service worker
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    
    const handleMessage = async (event: MessageEvent) => {
      // Handle badge updates
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
      }
      
      // Handle fallback notifications from service worker
      if (event.data?.type === 'SHOW_NOTIFICATION') {
        console.log('Showing fallback notification from service worker', event.data);
        
        // Show notification using the toast system
        toast({
          title: event.data.title || 'Ny notis',
          description: event.data.body || 'Nytt meddelande från Bergakungen',
          duration: 5000,
        });
        
        // Also show an in-app notification (useful for iOS)
        const notification = document.createElement('div');
        notification.className = 'fixed top-16 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 w-80 z-50 border border-accent';
        notification.innerHTML = `
          <div class="font-medium text-lg">${event.data.title || 'Ny notis'}</div>
          <div class="text-sm mt-1">${event.data.body || 'Nytt meddelande från Bergakungen'}</div>
          <div class="text-xs text-muted-foreground mt-2">${new Date().toLocaleString('sv-SE')}</div>
          <button class="absolute top-2 right-2 text-muted-foreground hover:text-foreground">&times;</button>
        `;
        
        // Add click handler
        const closeButton = notification.querySelector('button');
        if (closeButton) {
          closeButton.addEventListener('click', () => {
            if (document.body.contains(notification)) {
              document.body.removeChild(notification);
            }
          });
        }
        
        // Handle link if available
        if (event.data.data?.link) {
          notification.addEventListener('click', () => {
            window.open(event.data.data.link, '_blank');
            if (document.body.contains(notification)) {
              document.body.removeChild(notification);
            }
          });
          notification.style.cursor = 'pointer';
        }
        
        // Auto-remove after 5 seconds
        document.body.appendChild(notification);
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 5000);
        
        // Refresh notification list
        refetch();
      }
    };
    
    navigator.serviceWorker.addEventListener('message', handleMessage);
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [refetch, toast]);

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

    setIsLoading(true);
    try {
      await requestNotificationPermission();
      const subscription = await subscribeToNotifications();
      console.log('Push subscription created:', subscription);
      setIsSubscribed(true);
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

  // Function to refresh the push subscription
  const refreshSubscription = async () => {
    if (!isSubscribed || isIOSDevice || isSafariBrowser || !pushSupported) {
      return;
    }

    setIsLoading(true);
    try {
      if (!('serviceWorker' in navigator)) {
        throw new Error("Service Worker stöds inte i din webbläsare");
      }
      
      console.log("Förnyar push-prenumeration...");
      
      // Get the service worker registration
      const registration = await navigator.serviceWorker.ready;
      
      // Get current subscription and unsubscribe
      const currentSubscription = await registration.pushManager.getSubscription();
      if (currentSubscription) {
        console.log("Avsluter nuvarande prenumeration...");
        await currentSubscription.unsubscribe();
      }
      
      // Create a new subscription
      console.log("Skapar ny prenumeration...");
      const newSubscription = await subscribeToNotifications();
      
      console.log("Prenumeration förnyad:", newSubscription);
      toast({
        title: "Klart",
        description: "Push-prenumerationen har förnyats",
      });
    } catch (error: any) {
      console.error("Fel vid förnyande av prenumeration:", error);
      toast({
        title: "Fel",
        description: error.message || "Kunde inte förnya push-prenumerationen",
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
      
      // Also show an in-app fallback notification for iOS or in case the push fails
      toast({
        title: "Klart",
        description: "Testnotisen har skickats",
      });
      
      // Create an in-app notification as fallback
      const notification = document.createElement('div');
      notification.className = 'fixed top-16 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 w-80 z-50 border border-accent';
      notification.innerHTML = `
        <div class="font-medium text-lg">Testnotis</div>
        <div class="text-sm mt-1">Detta är en test pushnotis!</div>
        <div class="text-xs text-muted-foreground mt-2">${new Date().toLocaleString('sv-SE')}</div>
        <button class="absolute top-2 right-2 text-muted-foreground hover:text-foreground">&times;</button>
      `;
      
      // Add click handler to close
      const closeButton = notification.querySelector('button');
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          document.body.removeChild(notification);
        });
      }
      
      // Auto-remove after 5 seconds
      document.body.appendChild(notification);
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 5000);
      
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
              <h3 className="font-medium text-yellow-800">Safari/iOS Begränsningar</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Pushnotiser stöds inte i Safari eller på iOS-enheter. För bästa upplevelse, 
                vänligen lägg till denna app på hemskärmen eller använd en annan webbläsare som Chrome eller Edge.
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
                onClick={refreshSubscription} 
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {isLoading ? "Förnyar..." : "Förnya prenumeration"}
              </Button>
              
              <div className="text-xs text-muted-foreground mt-1">
                Om du inte får notiser, prova att förnya prenumerationen. Detta kan hjälpa speciellt på iOS-enheter.
              </div>
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