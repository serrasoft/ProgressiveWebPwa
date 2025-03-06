import BottomNav from "../navigation/bottom-nav";

interface MobileLayoutProps {
  children: React.ReactNode;
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  return (
    <div className="min-h-screen pb-16">
      <main className="container px-4 py-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
