import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [offlineMode, setOfflineMode] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Load offline mode setting from localStorage
  useEffect(() => {
    const savedOfflineMode = localStorage.getItem('offlineMode') === 'true';
    setOfflineMode(savedOfflineMode);
  }, []);

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
        </CardContent>
      </Card>

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