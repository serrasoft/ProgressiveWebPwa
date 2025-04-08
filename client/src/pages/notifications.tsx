import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Send, AlertCircle, ExternalLink, BadgeCheck } from "lucide-react";
import { 
  requestNotificationPermission, 
  subscribeToNotifications, 
  clearAppBadge,
  setAppBadge,
  isBadgingSupported
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

  // Check for badging support
  useEffect(() => {
    setBadgingSupported(isBadgingSupported());
    
    // Clear the app badge when the notification page is visited
    if (isBadgingSupported()) {
      clearAppBadge().then(() => {
        console.log('App badge cleared on notifications page visit');
      });
    }
  }, []);

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
            <Button 
              onClick={sendTestNotification} 
              className="w-full"
              disabled={isLoading}
            >
              <Send className="mr-2 h-4 w-4" />
              {isLoading ? "Skickar..." : "Skicka testnotis"}
            </Button>
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