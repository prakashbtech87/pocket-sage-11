import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart3,
  PlusCircle,
  Settings,
  LogOut,
  Table2,
  Home,
  Wallet,
  CalendarDays,
  ClipboardCheck,
  Info,
  Mic,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpendReminder } from "@/components/spend-reminder";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/track", label: "Today", icon: PlusCircle },
  { to: "/modify", label: "Modify", icon: CalendarDays },
  { to: "/voice-notes", label: "Voice", icon: Mic },
  { to: "/budget", label: "Budget", icon: Wallet },
  { to: "/review", label: "Review", icon: ClipboardCheck },
  { to: "/insights", label: "Insights", icon: BarChart3 },
  { to: "/data", label: "Data", icon: Table2 },
  { to: "/about", label: "About", icon: Info },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;



function AuthenticatedLayout() {
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background pb-24 sm:pb-0">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3.5">
          <Link to="/home" className="min-w-0">
            <span className="block text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              Prakash Expense Tracker
            </span>
            <span className="block text-[10px] text-muted-foreground">
              Idea by Prakash Karuppusamy
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-full px-3.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground [&.active]:bg-secondary [&.active]:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              aria-label="Sign out"
              className="text-muted-foreground"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6">
        <SpendReminder />
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="mx-auto flex max-w-2xl">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 py-3 text-[10px] text-muted-foreground transition-colors [&.active]:text-primary"
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
