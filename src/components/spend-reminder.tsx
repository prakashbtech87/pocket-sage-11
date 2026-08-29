import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { PiggyBank, TrendingDown, Wallet } from "lucide-react";
import { useBudgetStatus } from "@/components/budget";
import { buildBudgetAdvice, monthLabel } from "@/lib/budget-advice";
import { formatINR } from "@/lib/expense-categories";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const KEY = "pet-spend-reminder-day";

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Once-a-day interactive nudge: "you've spent X so far — here's how to save." */
export function SpendReminder() {
  const { data } = useBudgetStatus();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!data) return;
    try {
      if (window.localStorage.getItem(KEY) === today()) return;
    } catch {
      return;
    }
    setOpen(true);
  }, [data]);

  function dismiss() {
    try {
      window.localStorage.setItem(KEY, today());
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  if (!data) return null;

  const advice = buildBudgetAdvice(data).slice(0, 2);
  const pct = data.budget ? Math.min(100, (data.spent / data.budget) * 100) : 0;
  const remaining = data.remaining ?? 0;
  const over = remaining < 0;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : dismiss())}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            You've spent {formatINR(data.spent)} so far
          </DialogTitle>
          <DialogDescription>
            That's your total for {monthLabel(data.month)}
            {data.budget !== null
              ? ` out of ${formatINR(data.budget)}. ${data.daysLeft} day(s) still to cover — let's plan to save.`
              : ". Set your monthly money so I can plan the savings with you."}
          </DialogDescription>
        </DialogHeader>

        {data.budget !== null && (
          <div className="space-y-4">
            <Progress value={pct} className="h-2.5" />
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Spent", value: formatINR(data.spent), icon: TrendingDown },
                {
                  label: over ? "Over by" : "Left",
                  value: formatINR(Math.abs(remaining)),
                  icon: Wallet,
                },
                {
                  label: "Safe / day",
                  value: formatINR(Math.max(0, Math.round(data.safeDailyLeft ?? 0))),
                  icon: PiggyBank,
                },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl bg-secondary px-3 py-3">
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

        <div className="space-y-2">
          {advice.map((tip) => (
            <p
              key={tip}
              className="rounded-2xl bg-secondary px-4 py-3 text-sm leading-relaxed text-foreground"
            >
              {tip}
            </p>
          ))}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={dismiss} className="rounded-xl">
            Got it
          </Button>
          <Button asChild onClick={dismiss} className="rounded-xl font-semibold">
            <Link to="/budget">Plan my savings</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
