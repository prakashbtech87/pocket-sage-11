import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, BarChart3, Mail, PlusCircle, Settings, Table2, Sparkles, ShieldCheck } from "lucide-react";
import { getProfile, sendReportNow } from "@/lib/expenses.functions";
import { Button } from "@/components/ui/button";
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

const MONEY_TIPS = [
  "Wait 24 hours before any unplanned purchase above ₹500. Most wants quietly disappear overnight.",
  "Pay yourself first: move 10% into savings the day money arrives, not whatever is left at month end.",
  "Cook one extra meal at home this week. One swap a day is roughly ₹4,000 saved a month.",
  "Cancel one subscription you haven't opened in 30 days. Small leaks sink big boats.",
  "Carry a list when you shop. Lists spend money; moods burn it.",
  "Round every spend up to the next ₹100 and park the difference — painless saving.",
  "Set a weekly ceiling for food delivery instead of a daily one. It's easier to keep.",
  "Automate a small SIP. Consistency beats timing, always.",
  "Before buying, ask: does this cost me money once, or every month?",
  "Keep one no-spend day a week. It resets your habits more than any budget app can.",
];

const VIBE_TIPS = [
  "Money is a tool, not a scoreboard. You're already ahead by tracking it.",
  "Small, boring, repeated choices are what wealth is actually made of.",
  "You can't change last month. You can absolutely shape this evening.",
  "Progress over perfection — one logged expense today beats a perfect plan tomorrow.",
  "Being honest with your numbers is a form of self-respect.",
  "Calm finances make for a calm mind. You're building both.",
  "Every rupee you don't waste is a rupee of future freedom.",
  "You're not behind. You're building.",
  "Celebrate the saved ₹100 as loudly as you'd mourn the wasted ₹1,000.",
  "The best day to start was yesterday. The second best is right now.",
];

const QUICK_LINKS = [
  { to: "/track", label: "Log a spend", body: "Two fields — what and how much.", icon: PlusCircle },
  { to: "/insights", label: "Insights", body: "Daily, weekly and monthly views.", icon: BarChart3 },
  { to: "/data", label: "Your data", body: "See every row stored for you.", icon: Table2 },
  { to: "/settings", label: "Settings", body: "Reports, email and profile.", icon: Settings },
] as const;

function dayIndex() {
  return Math.floor(Date.now() / 86_400_000);
}

function HomePage() {
  const fetchProfile = useServerFn(getProfile);
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => fetchProfile() });

  const i = dayIndex();
  const tip = MONEY_TIPS[i % MONEY_TIPS.length];
  const vibe = VIBE_TIPS[i % VIBE_TIPS.length];

  return (
    <div className="space-y-6">
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
      </div>

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
