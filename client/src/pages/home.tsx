import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

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
              <Link key={link.href} href={link.href}>
                <a className="block p-3 rounded-lg bg-accent hover:bg-accent/80 transition-colors">
                  {link.title}
                </a>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
