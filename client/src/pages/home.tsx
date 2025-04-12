import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ExternalLink, Bell } from "lucide-react";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import InstallPrompt from "@/components/install-prompt";
import { isPushNotificationSupported, requestNotificationPermission, subscribeToNotifications } from "@/lib/notifications";

const quickLinks = [
  { title: "Docenten.se", href: "https://www.hsb.se/sodertorn/brf/docenten/", useInAppBrowser: true },
  { title: "Nyheter", href: "https://www.hsb.se/sodertorn/brf/docenten/nyheter/", useInAppBrowser: true },
  { title: "Boka samlingslokalen", href: "https://mail.docenten.se/bokning/samlingslokalen/", useInAppBrowser: true },
  { title: "Boka lägenheten", href: "https://mail.docenten.se/bokning/docenten/lagenheten/", useInAppBrowser: true },
  { title: "Boka snickarboa", href: "https://mail.docenten.se/bokning/docenten/snickarboa/", useInAppBrowser: true },
  { title: "Boka tvättstugan", href: "https://docenten.pmdns.net", useInAppBrowser: true },
  { title: "Inofficiell Facebookgrupp", href: "https://www.facebook.com/groups/1233199001206234/" },
  { title: "Nyheter från styrelsen (login)", href: "https://mitthsb.hsb.se/mitthsb/oversikt/meddelanden-fran-styrelsen/", openInSystemBrowser: true },
  { title: "Mina bostadsuppgifter HSB (login)", href: "https://mitthsb.hsb.se/mitthsb/min-bostad/bostadsinformation/", openInSystemBrowser: true },
];

export default function Home() {
  const [, setLocation] = useLocation();
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if running as installed PWA
  const isInstalledPWA = window.matchMedia('(display-mode: standalone)').matches;

  // Check if running on iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  // Check if we should show notification prompt on first login after verification
  useEffect(() => {
    const shouldPrompt = sessionStorage.getItem('showNotificationPrompt') === 'true';
    
    if (shouldPrompt && user && isPushNotificationSupported()) {
      // Only show if notifications aren't already granted
      if ('Notification' in window && Notification.permission !== 'granted') {
        setShowNotificationPrompt(true);
        // Remove the flag so we don't prompt again
        sessionStorage.removeItem('showNotificationPrompt');
      }
    }
  }, [user]);

  const handleLinkClick = (link: typeof quickLinks[0]) => (e: React.MouseEvent) => {
    if (link.openInSystemBrowser) {
      e.preventDefault();
      // For iOS PWA, we need to use special handling to open Safari
      if (isIOS && isInstalledPWA) {
        window.location.href = link.href;
      } else {
        window.open(link.href, '_system');
      }
    } else if (link.useInAppBrowser) {
      e.preventDefault();
      setLocation(`/browser?url=${encodeURIComponent(link.href)}`);
    }
    // Otherwise, let the default behavior handle it (opens in new tab)
  };

  // Function to handle enabling notifications
  const handleEnableNotifications = async () => {
    if (!user || typeof user.id !== 'number') {
      toast({
        title: "Fel",
        description: "Du måste vara inloggad för att aktivera notiser",
        variant: "destructive"
      });
      setShowNotificationPrompt(false);
      return;
    }

    setLoading(true);

    try {
      // Request notification permission
      await requestNotificationPermission();
      
      // Subscribe to push notifications
      await subscribeToNotifications(user.id);
      
      toast({
        title: "Notiser aktiverade",
        description: "Du kommer nu att få push-notiser från Bergakungen.",
      });
    } catch (error: any) {
      console.error("Failed to enable notifications:", error);
      toast({
        title: "Kunde inte aktivera notiser",
        description: error.message || "Ett okänt fel inträffade.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowNotificationPrompt(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Välkommen tillbaka!</h1>

      <InstallPrompt />

      {/* Notification permission prompt */}
      {showNotificationPrompt && (
        <Alert className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <Bell className="h-4 w-4 text-blue-800 dark:text-blue-400" />
          <AlertTitle className="text-blue-800 dark:text-blue-400">Vill du aktivera notiser?</AlertTitle>
          <AlertDescription className="text-blue-700 dark:text-blue-500">
            <p className="mb-3">Få pushnotiser från BRF Docenten om viktig information från föreningen.</p>
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                className="border-blue-300 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900"
                onClick={() => setShowNotificationPrompt(false)}
              >
                Inte nu
              </Button>
              <Button 
                variant="default"
                className="bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700"
                onClick={handleEnableNotifications}
                disabled={loading}
              >
                {loading ? "Aktiverar..." : "Aktivera notiser"}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Snabblänkar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {quickLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={handleLinkClick(link)}
                target={link.useInAppBrowser ? undefined : "_blank"}
                rel={link.useInAppBrowser ? undefined : "noopener noreferrer"}
                className="flex items-center justify-between p-3 rounded-lg bg-accent hover:bg-accent/80 transition-colors"
              >
                <span>{link.title}</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}