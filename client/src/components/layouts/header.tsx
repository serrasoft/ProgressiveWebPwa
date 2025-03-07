import { Building } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center px-4">
        <div className="flex items-center space-x-2">
          {/* Replace with actual logo once uploaded */}
          <Building className="h-6 w-6" />
          <span className="font-semibold">BRF Docenten - "Bergakungen"</span>
        </div>
      </div>
    </header>
  );
}