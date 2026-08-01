import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, Wallet, TrendingDown, PiggyBank, Sparkles } from "lucide-react";
import { SetBudgetDialog, useBudgetStatus } from "@/components/budget";
import { buildBudgetAdvice, monthLabel } from "@/lib/budget-advice";
import { formatINR } from "@/lib/expense-categories";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/budget")({
  head: () => ({
    meta: [
      { title: "Monthly Budget — Prakash Expense Tracker" },
      {
        name: "description",
        content:
          "Set how much money you have for the month, watch it reduce with every spend, and get suggestions on how to save the rest.",
      },
      { property: "og:title", content: "Monthly Budget — Prakash Expense Tracker" },
      {
        property: "og:description",
        content: "Set your monthly money, track what's left, and get personalised saving tips.",
      },
    ],
  }),
  component: BudgetPage,
});

function BudgetPage() {
  const { data, isPending } = useBudgetStatus();
  const [open, setOpen] = useState(false);

  if (isPending || !data) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const advice = buildBudgetAdvice(data);
  const pct = data.budget ? Math.min(100, (data.spent / data.budget) * 100) : 0;
  const over = (data.remaining ?? 0) < 0;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
              {monthLabel(data.month)}
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold text-foreground">
              Money for this month
            </h1>
          </div>
          <Button onClick={() => setOpen(true)} className="rounded-xl font-semibold">
            <Wallet className="size-4" />
            {data.budget === null ? "Set budget" : "Change amount"}
          </Button>
        </div>

        {data.budget === null ? (
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            You haven't told me how much you have to spend this month. Set it once and every expense
            you log is deducted from it automatically.
          </p>
        ) : (
          <div className="mt-5 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">Left to spend</p>
              <p
                className={`font-display text-4xl font-bold tabular-nums ${over ? "text-destructive" : "text-foreground"}`}
              >
                {formatINR(data.remaining ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                of {formatINR(data.budget)} · {data.daysLeft} day(s) remaining
              </p>
            </div>

            <Progress value={pct} className="h-2.5" />

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Spent", value: formatINR(data.spent), icon: TrendingDown },
                {
                  label: "Safe per day",
                  value: formatINR(Math.max(0, Math.round(data.safeDailyLeft ?? 0))),
                  icon: PiggyBank,
                },
                { label: "Avoidable", value: formatINR(data.avoidable), icon: Sparkles },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-secondary px-4 py-3">
                  <stat.icon className="size-4 text-muted-foreground" />
                  <p className="mt-2 text-sm font-semibold tabular-nums text-foreground">
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-3xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold text-foreground">How to save from here</h2>
        {advice.map((tip) => (
          <p
            key={tip}
            className="rounded-2xl bg-secondary px-4 py-3 text-sm leading-relaxed text-foreground"
          >
            {tip}
          </p>
        ))}
      </section>

      <SetBudgetDialog open={open} onOpenChange={setOpen} month={data.month} current={data.budget} />
    </div>
  );
}
