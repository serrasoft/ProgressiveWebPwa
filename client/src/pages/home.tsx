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
    icon: Map,
    color: "text-green-600 dark:text-green-400"
  },
  { 
    title: "Docenten.se", 
    href: "https://www.hsb.se/sodertorn/brf/docenten/", 
    useInAppBrowser: true,
    icon: HomeIcon,
    color: "text-blue-600 dark:text-blue-400"
  },
  { 
    title: "Nyheter", 
    href: "https://www.hsb.se/sodertorn/brf/docenten/nyheter/", 
    useInAppBrowser: true,
    icon: Newspaper,
    color: "text-orange-600 dark:text-orange-400"
  },
  { 
    title: "Boka samlingslokalen", 
    href: "https://mail.docenten.se/bokning/samlingslokalen/", 
    useInAppBrowser: true,
    icon: Calendar,
    color: "text-indigo-600 dark:text-indigo-400"
  },
  { 
    title: "Boka lägenheten", 
    href: "https://mail.docenten.se/bokning/docenten/lagenheten/", 
    useInAppBrowser: true,
    icon: Bed,
    color: "text-violet-600 dark:text-violet-400"
  },
  { 
    title: "Boka snickarboa", 
    href: "https://mail.docenten.se/bokning/docenten/snickarboa/", 
    useInAppBrowser: true,
    icon: Hammer,
    color: "text-amber-600 dark:text-amber-400"
  },
  { 
    title: "Boka tvättstugan", 
    href: "https://docenten.pmdns.net", 
    useInAppBrowser: true,
    icon: Clock,
    color: "text-cyan-600 dark:text-cyan-400"
  },
  { 
    title: "Inofficiell Facebookgrupp", 
    href: "https://www.facebook.com/groups/1233199001206234/",
    icon: Facebook,
    color: "text-blue-600 dark:text-blue-400"
  },
  { 
    title: "Nyheter från styrelsen (login)", 
    href: "https://mitthsb.hsb.se/mitthsb/oversikt/meddelanden-fran-styrelsen/", 
    openInSystemBrowser: true,
    icon: MessageSquare,
    color: "text-emerald-600 dark:text-emerald-400"
  },
  { 
    title: "Mina bostadsuppgifter HSB (login)", 
    href: "https://mitthsb.hsb.se/mitthsb/min-bostad/bostadsinformation/", 
    openInSystemBrowser: true,
    icon: User,
    color: "text-purple-600 dark:text-purple-400"
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
                className={`flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm border-l-4 border border-gray-200 dark:border-gray-700 ${link.color.replace('text', 'border-l')}`}
              >
                <div className="flex items-center gap-3">
                  {link.icon && <link.icon className={`h-5 w-5 ${link.color}`} />}
                  <span>{link.title}</span>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-500" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}