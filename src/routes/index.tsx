import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ArrowRight, IndianRupee, Mail, Sparkles, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prakash Expense Tracker — Daily rupee spend log" },
      {
        name: "description",
        content:
          "Log every rupee in two taps, get automatic categories, avoidable-spend alerts and a daily 9 PM email report.",
      },
      { property: "og:title", content: "Prakash Expense Tracker" },
      {
        property: "og:description",
        content:
          "Two-tap daily expense logging in INR with automatic categories and a 9 PM email report.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: IndianRupee,
    title: "Two fields, that's it",
    body: "What you spent on, and how much. Everything else is worked out for you.",
  },
  {
    icon: Sparkles,
    title: "Categories on their own",
    body: "Chai, petrol, Swiggy, EMI — each entry is sorted and flagged as needed or avoidable.",
  },
  {
    icon: Mail,
    title: "9 PM report, every day",
    body: "A full breakdown lands in your inbox each night with honest advice for tomorrow.",
  },
  {
    icon: Smartphone,
    title: "Install on your phone",
    body: "Add it to your home screen and it opens full screen, just like any other app.",
  },
];

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home" });
    });
  }, [navigate]);

  return (
    <main className="min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklch,var(--color-primary)_18%,transparent),transparent)]" />

      <div className="relative mx-auto flex max-w-3xl flex-col px-6 pt-20 pb-24">
        <span className="text-xs font-semibold tracking-[0.25em] text-primary uppercase">
          Vibe coded by Prakash Karuppusamy
        </span>

        <h1 className="mt-5 text-4xl leading-[1.05] font-bold text-foreground sm:text-6xl">
          Know exactly where
          <br />
          your rupees went.
        </h1>

        <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
          I am Prakash Karuppusamy, and I'll be helping you build your Financial Wellbeing. Type
          what you spent on and how much — the app sorts it, spots what was avoidable, and emails
          the report to <span className="text-foreground">your own inbox</span>, every night at 9 PM.
        </p>

        <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
          Your entries stay private to your own login. I can't see them, and reports are only ever
          sent to the email address of the account you sign in with.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Button asChild size="lg" className="h-12 rounded-full px-7 text-base font-semibold">
            <Link to="/auth">
              Start tracking <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 rounded-full border-border bg-card px-7 text-base"
          >
            <Link to="/auth">I already have an account</Link>
          </Button>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
            >
              <feature.icon className="size-5 text-primary" />
              <h2 className="mt-4 text-base font-semibold text-foreground">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-14 text-xs leading-relaxed text-muted-foreground">
          Your expenses are stored privately in this app's own cloud database — not on your device —
          so the same data shows up on every phone, tablet and laptop you sign in from.
        </p>

        <p className="mt-6 text-xs text-muted-foreground">
          Created by Prakash Karuppusamy.
        </p>
      </div>
    </main>
  );
}
