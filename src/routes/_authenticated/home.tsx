import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, BarChart3, Mail, PlusCircle, Settings, Table2, Sparkles, ShieldCheck, Wallet, Info, Mic } from "lucide-react";
import { getProfile, sendReportNow } from "@/lib/expenses.functions";
import { Button } from "@/components/ui/button";
import { BudgetBanner } from "@/components/budget";
import { dailyPicks } from "@/lib/daily-tips";
import heroImg from "@/assets/home-hero.png";
import savingsImg from "@/assets/home-savings.png";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — Prakash Expense Tracker" },
      {
        name: "description",
        content:
          "Your financial wellbeing home: a daily money-saving tip, a positive thought and quick links to log spends and see insights.",
      },
      { property: "og:title", content: "Home — Prakash Expense Tracker" },
      {
        property: "og:description",
        content: "A daily money-saving tip, a positive thought, and your spending at a glance.",
      },
    ],
  }),
  component: HomePage,
});


const QUICK_LINKS = [
  { to: "/track", label: "Log a spend", body: "Two fields — what and how much.", icon: PlusCircle },
  { to: "/voice-notes", label: "Voice notes", body: "Just say it — we log it.", icon: Mic },
  { to: "/budget", label: "Monthly budget", body: "Set your money, see what's left.", icon: Wallet },
  { to: "/insights", label: "Insights", body: "Daily, weekly and monthly views.", icon: BarChart3 },
  { to: "/data", label: "Your data", body: "See every row stored for you.", icon: Table2 },
  { to: "/about", label: "About", body: "Purpose, guide and contact.", icon: Info },
  { to: "/settings", label: "Settings", body: "Reports, email and profile.", icon: Settings },
] as const;


function HomePage() {
  const fetchProfile = useServerFn(getProfile);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });
  const sendReport = useServerFn(sendReportNow);
  const [sending, setSending] = useState<null | "daily" | "weekly" | "monthly">(null);

  async function send(period: "daily" | "weekly" | "monthly") {
    setSending(period);
    try {
      const res = await sendReport({ data: { period } });
      toast.success(`${period[0].toUpperCase()}${period.slice(1)} report sent to ${res.to}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the report");
    } finally {
      setSending(null);
    }
  }

  const { tip, vibe, advice } = dailyPicks();

  return (
    <div className="space-y-6">
      <BudgetBanner />
      <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              Welcome{profile?.display_name ? `, ${profile.display_name}` : ""}
            </p>
            <h1 className="mt-3 font-display text-2xl leading-tight font-bold text-foreground sm:text-3xl">
              I am Prakash Karuppusamy, and I'll be helping you build your Financial Wellbeing.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Log what you spend, see where it goes, and get a report in your own inbox. One honest
              rupee at a time.
            </p>
            <Link
              to="/track"
              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Log today's spend <ArrowRight className="size-4" />
            </Link>
          </div>
          <img
            src={heroImg}
            alt="Cartoon of a smiling man with a rupee coin and a piggy bank"
            width={1024}
            height={1024}
            className="hidden w-40 shrink-0 sm:block"
          />
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="size-4" />
            <h2 className="text-sm font-semibold">Today's money-saving tip</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground">{tip}</p>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-success">
            <Sparkles className="size-4" />
            <h2 className="text-sm font-semibold">Positive vibes</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground">{vibe}</p>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 sm:col-span-2">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="size-4" />
            <h2 className="text-sm font-semibold">Today's advice</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground">{advice}</p>
        </section>
      </div>

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-primary">
          <Mail className="size-4" />
          <h2 className="text-sm font-semibold">Send a report now</h2>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Goes only to {profile?.report_email ?? "your signed-in email"} — the address you logged in
          with.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["daily", "weekly", "monthly"] as const).map((period) => (
            <Button
              key={period}
              variant="secondary"
              size="sm"
              disabled={sending !== null}
              onClick={() => send(period)}
              className="rounded-full capitalize"
            >
              {sending === period ? "Sending…" : period}
            </Button>
          ))}
        </div>
      </section>



      <section className="rounded-3xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">Where to next</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/50 p-4 transition-colors hover:border-primary/40"
            >
              <link.icon className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">{link.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{link.body}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex items-start gap-4 rounded-3xl border border-border bg-card p-6">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-success" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">Your data is yours alone</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Every expense is tied to the account you signed in with, and row-level security means no
            other user — including me — can read your rows. Reports are emailed to{" "}
            <span className="text-foreground">
              {profile?.report_email ?? "your own signed-in email address"}
            </span>
            , the address on your account. Nothing is ever sent to anyone else's inbox.
          </p>
        </div>
        <img
          src={savingsImg}
          alt="Cartoon piggy bank collecting rupee coins"
          loading="lazy"
          width={1024}
          height={1024}
          className="hidden w-24 shrink-0 sm:block"
        />
      </section>
    </div>
  );
}
