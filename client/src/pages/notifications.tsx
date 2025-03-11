import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Send, AlertCircle, ExternalLink } from "lucide-react";
import { requestNotificationPermission, subscribeToNotifications } from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isIOS, isSafari, supportsWebPushAPI } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { Notification } from "@shared/schema";

export default function Notifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const isIOSDevice = isIOS();
  const isSafariBrowser = isSafari();
  const pushSupported = supportsWebPushAPI();

  // Fetch notifications from the API
  const { data: notifications = [], error: notificationsError } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/notifications');
      console.log('Notifications API response:', response);
      if (!Array.isArray(response)) {
        console.warn('Expected array of notifications, got:', response);
        return [];
      }
      return response;
    },
  });

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
                <a
                  key={notification.id}
                  href={notification.link || '#'}
                  target={notification.link ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 rounded-lg bg-accent hover:bg-accent/80 transition-colors"
                >
                  <span>{notification.title}</span>
                  {notification.link && <ExternalLink className="h-4 w-4" />}
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}