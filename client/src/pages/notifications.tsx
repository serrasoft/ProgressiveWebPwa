import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Send } from "lucide-react";
import { requestNotificationPermission, subscribeToNotifications } from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Notifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      await requestNotificationPermission();
      await subscribeToNotifications();
      setIsSubscribed(true);
      toast({
        title: "Success",
        description: "Push notifications have been enabled",
      });
    } catch (error) {
      console.error('Notification setup error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to enable notifications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/notifications/send", {
        title: "Test Notification",
        body: "This is a test push notification!",
      });
      toast({
        title: "Success",
        description: "Test notification sent successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send test notification",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Notifications</h1>

      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSubscribed ? (
            <Button 
              onClick={handleSubscribe} 
              className="w-full"
              disabled={isLoading}
            >
              <Bell className="mr-2 h-4 w-4" />
              {isLoading ? "Enabling..." : "Enable Notifications"}
            </Button>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">
                You are subscribed to push notifications
              </p>
              <Button 
                onClick={sendTestNotification} 
                className="w-full"
                disabled={isLoading}
              >
                <Send className="mr-2 h-4 w-4" />
                {isLoading ? "Sending..." : "Send Test Notification"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}