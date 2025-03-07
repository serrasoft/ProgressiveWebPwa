import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";
import { useLocation } from "wouter";

const quickLinks = [
  { title: "Nyheter", href: "https://www.hsb.se/sodertorn/brf/docenten/nyheter/" },
  { title: "Support", href: "https://support.example.com" },
  { title: "Community", href: "https://community.example.com" },
];

export default function Home() {
  const [, setLocation] = useLocation();

  const handleLinkClick = (href: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    setLocation(`/browser?url=${encodeURIComponent(href)}`);
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Välkommen tillbaka!</h1>

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
                onClick={handleLinkClick(link.href)}
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