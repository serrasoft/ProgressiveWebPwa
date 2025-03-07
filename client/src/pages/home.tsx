import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink } from "lucide-react";

const quickLinks = [
  { title: "Documentation", href: "https://docs.example.com" },
  { title: "Support", href: "https://support.example.com" },
  { title: "Community", href: "https://community.example.com" },
];

export default function Home() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Welcome Back!</h1>

      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {quickLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
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