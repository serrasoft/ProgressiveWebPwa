import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";
import { useState, useEffect } from "react";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [offlineMode, setOfflineMode] = useState(false);

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
    </div>
  );
}