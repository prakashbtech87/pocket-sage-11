import { formatINR } from "./expense-categories";

export type BudgetStatus = {
  month: string;
  totalDays: number;
  dayOfMonth: number;
  daysLeft: number;
  budget: number | null;
  spent: number;
  avoidable: number;
  remaining: number | null;
  safeDailyLeft: number | null;
  onTrackSpend: number | null;
  byCategory: Record<string, number>;
};

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, 1)).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function buildBudgetAdvice(s: BudgetStatus): string[] {
  if (s.budget === null) {
    return [
      "Set your monthly budget to unlock a live remaining balance, a safe daily limit and savings suggestions.",
    ];
  }

  const tips: string[] = [];
  const remaining = s.remaining ?? 0;
  const over = remaining < 0;

  if (over) {
    tips.push(
      `You are ${formatINR(Math.abs(remaining))} over your ${formatINR(s.budget)} budget with ${s.daysLeft} day(s) to go. Freeze anything avoidable until the month resets.`,
    );
  } else if (s.daysLeft > 0) {
    tips.push(
      `${formatINR(remaining)} left for ${s.daysLeft} day(s) — keep spending under ${formatINR(Math.max(0, Math.round(s.safeDailyLeft ?? 0)))} a day to finish inside your budget.`,
    );
  } else {
    tips.push(
      `Month closed with ${formatINR(remaining)} unspent. Move it to savings today, before it quietly gets absorbed.`,
    );
  }

  if (s.onTrackSpend !== null) {
    const diff = s.spent - s.onTrackSpend;
    if (diff > 0) {
      tips.push(
        `You're ${formatINR(Math.round(diff))} ahead of an even spending pace. Trimming ${formatINR(Math.round(diff / Math.max(1, s.daysLeft || 1)))} a day brings you back on track.`,
      );
    } else if (diff < 0) {
      tips.push(
        `You're ${formatINR(Math.round(-diff))} below pace. Bank that gap instead of upgrading your spending.`,
      );
    }
  }

  if (s.avoidable > 0) {
    tips.push(
      `${formatINR(s.avoidable)} of this month's spend was avoidable — that's ${Math.round((s.avoidable / Math.max(1, s.budget)) * 100)}% of your budget. Halving it next month saves ${formatINR(Math.round(s.avoidable / 2))}.`,
    );
  }

  const top = Object.entries(s.byCategory).sort((a, b) => b[1] - a[1])[0];
  if (top) {
    tips.push(
      `${top[0]} is your biggest bucket at ${formatINR(Math.round(top[1]))}. A 15% cut there frees ${formatINR(Math.round(top[1] * 0.15))} for savings.`,
    );
  }

  return tips.slice(0, 4);
}
