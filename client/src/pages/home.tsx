import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ExternalLink, 
  Home as HomeIcon, 
  Newspaper, 
  Calendar, 
  Bed, 
  Hammer, 
  Clock, 
  Facebook, 
  MessageSquare, 
  User,
  Map
} from "lucide-react";
import { useLocation } from "wouter";
import InstallPrompt from "@/components/install-prompt";

const quickLinks = [
  { 
    title: "Översiktskarta", 
    href: "https://karta-bergakungen.replit.app", 
    useInAppBrowser: true,
    icon: Map
  },
  { 
    title: "Docenten.se", 
    href: "https://www.hsb.se/sodertorn/brf/docenten/", 
    useInAppBrowser: true,
    icon: HomeIcon
  },
  { 
    title: "Nyheter", 
    href: "https://www.hsb.se/sodertorn/brf/docenten/nyheter/", 
    useInAppBrowser: true,
    icon: Newspaper
  },
  { 
    title: "Boka samlingslokalen", 
    href: "https://mail.docenten.se/bokning/samlingslokalen/", 
    useInAppBrowser: true,
    icon: Calendar
  },
  { 
    title: "Boka lägenheten", 
    href: "https://mail.docenten.se/bokning/docenten/lagenheten/", 
    useInAppBrowser: true,
    icon: Bed
  },
  { 
    title: "Boka snickarboa", 
    href: "https://mail.docenten.se/bokning/docenten/snickarboa/", 
    useInAppBrowser: true,
    icon: Hammer
  },
  { 
    title: "Boka tvättstugan", 
    href: "https://docenten.pmdns.net", 
    useInAppBrowser: true,
    icon: Clock
  },
  { 
    title: "Inofficiell Facebookgrupp", 
    href: "https://www.facebook.com/groups/1233199001206234/",
    icon: Facebook
  },
  { 
    title: "Nyheter från styrelsen (login)", 
    href: "https://mitthsb.hsb.se/mitthsb/oversikt/meddelanden-fran-styrelsen/", 
    openInSystemBrowser: true,
    icon: MessageSquare
  },
  { 
    title: "Mina bostadsuppgifter HSB (login)", 
    href: "https://mitthsb.hsb.se/mitthsb/min-bostad/bostadsinformation/", 
    openInSystemBrowser: true,
    icon: User
  },
];

export default function Home() {
  const [, setLocation] = useLocation();

  // Check if running as installed PWA
  const isInstalledPWA = window.matchMedia('(display-mode: standalone)').matches;

  // Check if running on iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

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

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Välkommen tillbaka!</h1>

      <InstallPrompt />

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
                <div className="flex items-center gap-3">
                  {link.icon && <link.icon className="h-5 w-5 text-primary" />}
                  <span>{link.title}</span>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}