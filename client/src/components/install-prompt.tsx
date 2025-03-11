import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { isIOS } from "@/lib/utils";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const isIOSDevice = isIOS();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if the app is already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    if (!isInstalled) {
      setShowPrompt(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <Card className="mb-4">
      <CardContent className="pt-6">
        {isIOSDevice ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              <h3 className="font-medium">Lägg till på hemskärmen</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              För att installera appen på din iPhone eller iPad:
            </p>
            <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2">
              <li>Tryck på delningsknappen i Safari</li>
              <li>Välj "Lägg till på hemskärmen"</li>
              <li>Tryck på "Lägg till"</li>
            </ol>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              <h3 className="font-medium">Installera appen</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Installera appen på din enhet för snabbare åtkomst och bättre funktionalitet.
            </p>
            <Button onClick={handleInstallClick} className="w-full">
              Installera
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
