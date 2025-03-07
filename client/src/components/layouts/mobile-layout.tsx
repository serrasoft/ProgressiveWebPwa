import BottomNav from "../navigation/bottom-nav";
import Header from "./header";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <div className="min-h-screen pb-16">
      <Header />
      <main className="container px-4 py-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}