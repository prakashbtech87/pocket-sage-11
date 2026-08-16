import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Info,
  BookOpen,
  ShieldCheck,
  Linkedin,
  Mail,
  ArrowRight,
  Smartphone,
  IndianRupee,
  Sparkles,
  CalendarClock,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/about")({
  head: () => ({
    meta: [
      { title: "About — Prakash Expense Tracker" },
      {
        name: "description",
        content:
          "What Prakash Expense Tracker is for, how to use it, and how to get in touch.",
      },
      { property: "og:title", content: "About — Prakash Expense Tracker" },
      {
        property: "og:description",
        content:
          "Purpose, guide and contact details for Prakash Expense Tracker.",
      },
    ],
  }),
  component: AboutPage,
});

const GUIDE_STEPS = [
  {
    icon: IndianRupee,
    title: "1. Log what you spend",
    body:
      "Tap Today, type what you bought and how much it cost in ₹. That's it. The app works out the category and whether it looks avoidable.",
  },
  {
    icon: Sparkles,
    title: "2. Set your monthly budget",
    body:
      "Go to Budget and enter how much money you have for the month. Every spend reduces the balance and shows you a safe daily limit.",
  },
  {
    icon: CalendarClock,
    title: "3. Review and correct",
    body:
      "Use Review to change categories or flip needed/avoidable. The app remembers your corrections and gets smarter for next time.",
  },
  {
    icon: Mail,
    title: "4. Get your report at 11:45 PM",
    body:
      "A daily, weekly or monthly report lands in your own inbox every night at 11:45 PM IST. You can also send one instantly from Home.",
  },
  {
    icon: Smartphone,
    title: "5. Install on your phone",
    body:
      "Open the app in Safari, tap Share, then Add to Home Screen. It opens full screen and works like a native app on every device.",
  },
];

function AboutPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-primary">
          <Info className="size-4" />
          <h1 className="text-sm font-semibold">Purpose of this app</h1>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Prakash Expense Tracker</strong>{" "}
          was built to answer one simple question: where did my money go today?
          Instead of linking bank accounts or filling long forms, you just type
          what you spent on and how much. The app sorts it, shows your trends,
          and emails a private report to you every night.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The goal is not to judge your spending — it is to make you aware of it.
          Small, honest tracking leads to better decisions, and better decisions
          lead to real financial wellbeing.
        </p>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-primary">
          <BookOpen className="size-4" />
          <h2 className="text-sm font-semibold">How to use it</h2>
        </div>
        <div className="mt-4 grid gap-4">
          {GUIDE_STEPS.map((step) => (
            <div
              key={step.title}
              className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/50 p-4"
            >
              <step.icon className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {step.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-success">
          <ShieldCheck className="size-4" />
          <h2 className="text-sm font-semibold">Your data is yours alone</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Every expense is tied to the account you signed in with. Row-level
          security in the database means no other user — including the app
          author — can read your rows. Reports are sent only to the email
          address of the currently logged-in user, never to anyone else.
        </p>
      </section>

      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-primary">
          <Linkedin className="size-4" />
          <h2 className="text-sm font-semibold">Contact me</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Built by{" "}
          <strong className="text-foreground">Prakash Karuppusamy</strong>. If
          you have feedback, ideas or just want to connect, reach out on
          LinkedIn.
        </p>
        <a
          href="https://www.linkedin.com/in/prakashbtech87/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Connect on LinkedIn <ArrowRight className="size-4" />
        </a>
      </section>

      <div className="flex justify-center">
        <Link
          to="/home"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Back to Home <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  );
}
