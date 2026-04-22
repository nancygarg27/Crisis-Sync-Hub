import { Link, useLocation } from "wouter";
import { ShieldAlert, Activity, Map as MapIcon, Users } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const tabs = [
    { href: "/", label: "Guest", icon: ShieldAlert },
    { href: "/alert/current", label: "My Alert", icon: Activity, dynamic: true },
    { href: "/floor-map", label: "Floor Map", icon: MapIcon },
    { href: "/staff", label: "Staff", icon: Users },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <span className="font-bold text-xl tracking-tight">RAPID</span>
            </div>
            
            <nav className="flex items-center space-x-1 sm:space-x-4 overflow-x-auto">
              {tabs.map((tab) => {
                const isActive = tab.dynamic 
                  ? location.startsWith("/alert/") 
                  : location === tab.href;
                
                // For the "My Alert" tab, if we're not on an alert page, don't link to /alert/current (it would just 404 or show empty), unless we want a placeholder.
                // We'll just link to / if they click it without an ID, or maybe just render it visually disabled if no ID is present, but for simplicity let's just make it a link.
                const href = (tab.dynamic && !location.startsWith("/alert/")) ? "/" : tab.href;

                return (
                  <Link key={tab.label} href={href} className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors whitespace-nowrap ${isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                    <tab.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
