import { Link, useLocation } from "wouter";
import { Home, Bell, User, Settings } from "lucide-react";

const navItems = [
  { icon: Home, label: "Hem", href: "/" },
  { icon: Bell, label: "Notiser", href: "/notifications" },
  { icon: User, label: "Profil", href: "/profile" },
  { icon: Settings, label: "Inställningar", href: "/settings" },
];

export default function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t">
      <div className="grid grid-cols-4 h-16">
        {navItems.map(({ icon: Icon, label, href }) => {
          const isActive = location === href;
          return (
            <Link key={href} href={href}>
              <a className={`flex flex-col items-center justify-center gap-1 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}>
                <Icon className="h-5 w-5" />
                <span className="text-xs">{label}</span>
              </a>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}