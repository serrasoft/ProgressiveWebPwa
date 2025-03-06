import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { requestNotificationPermission, subscribeToNotifications } from "@/lib/notifications";
import { useToast } from "@/hooks/use-toast";

export default function Notifications() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const { toast } = useToast();

  const handleSubscribe = async () => {
    try {
      await requestNotificationPermission();
      await subscribeToNotifications();
      setIsSubscribed(true);
      toast({
        title: "Notifications enabled",
        description: "You will now receive push notifications",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to enable notifications",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Notifications</h1>

      <Card>
        <CardHeader>
          <CardTitle>Push Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          {!isSubscribed ? (
            <Button onClick={handleSubscribe} className="w-full">
              <Bell className="mr-2 h-4 w-4" />
              Enable Notifications
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              You are subscribed to push notifications
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
