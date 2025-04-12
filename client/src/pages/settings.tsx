import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";
import { isIOS, isPushNotificationSupported, requestNotificationPermission, subscribeToNotifications } from "@/lib/notifications";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [offlineMode, setOfflineMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  // Check notifications status and device type
  useEffect(() => {
    // Check if this is an iOS device
    const iosDevice = isIOS();
    setIsIOSDevice(iosDevice);
    
    // Check if app is running in standalone mode (installed on home screen)
    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
                      (navigator as any).standalone === true;
    setIsStandalone(standalone);
    
    // Check if notifications are supported
    const supported = isPushNotificationSupported();
    setNotificationsSupported(supported);
    
    // Check if notifications are enabled
    if ('Notification' in window) {
      setNotificationsEnabled(Notification.permission === 'granted');
    }
    
    // Add event listener for standalone mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  // Load offline mode setting from localStorage
  useEffect(() => {
    const savedOfflineMode = localStorage.getItem('offlineMode') === 'true';
    setOfflineMode(savedOfflineMode);
  }, []);
  
  // Handle enabling notifications
  const handleNotificationsChange = async (enabled: boolean) => {
    if (!enabled) {
      setNotificationsEnabled(false);
      toast({
        title: "Notiser inaktiverade",
        description: "Du kommer inte längre att få push-notiser. Du kan aktivera dem igen senare.",
      });
      return;
    }
    
    if (!notificationsSupported) {
      if (isIOSDevice && !isStandalone) {
        toast({
          title: "Lägg till på hemskärmen först",
          description: "För att aktivera notiser på iOS, lägg till appen på hemskärmen först genom att klicka på 'Dela' och sedan 'Lägg till på hemskärmen'.",
          duration: 6000,
        });
      } else {
        toast({
          title: "Notiser stöds inte",
          description: "Din enhet eller webbläsare stöder inte push-notiser.",
          variant: "destructive",
        });
      }
      return;
    }
    
    setLoading(true);
    
    try {
      // Request permission
      await requestNotificationPermission();
      
      // Subscribe to push notifications
      const subscription = await subscribeToNotifications();
      
      if (subscription) {
        setNotificationsEnabled(true);
        toast({
          title: "Notiser aktiverade",
          description: "Du kommer nu att få push-notiser från Bergakungen.",
        });
      }
    } catch (error: any) {
      console.error("Failed to enable notifications:", error);
      toast({
        title: "Kunde inte aktivera notiser",
        description: error.message || "Ett okänt fel inträffade.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOfflineModeChange = (enabled: boolean) => {
    setOfflineMode(enabled);
    localStorage.setItem('offlineMode', enabled.toString());

    if (enabled) {
      // Cache important resources for offline use
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.active?.postMessage({
            type: 'ENABLE_OFFLINE_MODE'
          });
        });
      }
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        // Clear offline auth data
        localStorage.removeItem('offlineAuth');

        toast({
          title: "Utloggad",
          description: "Du har loggats ut",
        });

        // Redirect to auth page
        setLocation("/auth");
      } else {
        throw new Error("Kunde inte logga ut");
      }
    } catch (error) {
      toast({
        title: "Fel",
        description: "Kunde inte logga ut",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Inställningar</h1>

      <Card>
        <CardHeader>
          <CardTitle>App-inställningar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Mörkt läge</Label>
              <p className="text-sm text-muted-foreground">
                Aktivera mörkt läge för appen
              </p>
            </div>
            <Switch 
              checked={theme === 'dark'}
              onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Offline-läge</Label>
              <p className="text-sm text-muted-foreground">
                Aktivera offline-funktionalitet
              </p>
            </div>
            <Switch 
              checked={offlineMode}
              onCheckedChange={handleOfflineModeChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Push-notiser</Label>
              <p className="text-sm text-muted-foreground">
                Få pushnotiser från Bergakungen
              </p>
            </div>
            <Switch 
              checked={notificationsEnabled}
              onCheckedChange={handleNotificationsChange}
              disabled={loading}
            />
          </div>
        </CardContent>
      </Card>

      {isIOSDevice && (
        <Card>
          <CardHeader>
            <CardTitle>iOS-information</CardTitle>
            <CardDescription>
              Viktig information för iOS-användare
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isStandalone && (
              <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-md border border-amber-200 dark:border-amber-800">
                <h3 className="font-medium text-amber-800 dark:text-amber-400">
                  Installera appen på din hemskärm
                </h3>
                <p className="text-sm mt-1 text-amber-700 dark:text-amber-500">
                  För bästa upplevelse och för att få push-notiser, lägg till Bergakungen på din hemskärm:
                </p>
                <ol className="text-sm mt-2 space-y-1 text-amber-700 dark:text-amber-500 list-decimal pl-5">
                  <li>Tryck på delningsikonen <span className="inline-block mx-1">ᐃ</span> i Safari</li>
                  <li>Välj "Lägg till på hemskärmen"</li>
                  <li>Bekräfta genom att trycka på "Lägg till"</li>
                </ol>
              </div>
            )}

            {isStandalone && (
              <div className="bg-green-50 dark:bg-green-950 p-3 rounded-md border border-green-200 dark:border-green-800">
                <h3 className="font-medium text-green-800 dark:text-green-400">
                  Appen är installerad på din hemskärm
                </h3>
                <p className="text-sm mt-1 text-green-700 dark:text-green-500">
                  Bra! Du använder Bergakungen från din hemskärm, vilket ger bästa upplevelse och stöd för push-notiser.
                </p>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-md border border-blue-200 dark:border-blue-800">
              <h3 className="font-medium text-blue-800 dark:text-blue-400">
                Push-notiser på iOS
              </h3>
              <p className="text-sm mt-1 text-blue-700 dark:text-blue-500">
                Push-notiser på iOS 16.4 eller senare kräver att:
              </p>
              <ul className="text-sm mt-2 space-y-1 text-blue-700 dark:text-blue-500 list-disc pl-5">
                <li>Appen är installerad på hemskärmen</li>
                <li>Du använder appen från hemskärmen (inte i Safari)</li>
                <li>Du ger behörighet när appen ber om det</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <Button 
            variant="destructive" 
            className="w-full"
            onClick={handleLogout}
          >
            Logga ut
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}