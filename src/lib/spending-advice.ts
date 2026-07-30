import { formatINR } from "./expense-categories";

export type ExpenseRow = {
  id: string;
  description: string;
  amount_inr: number | string;
  category: string;
  is_avoidable: boolean;
  spent_on: string;
};

function num(value: number | string) {
  return typeof value === "string" ? parseFloat(value) : value;
}

export function buildTips(
  today: ExpenseRow[],
  last30: ExpenseRow[],
  todayTotal: number,
  dailyAverage: number,
): string[] {
  const tips: string[] = [];

  const avoidableToday = today
    .filter((e) => e.is_avoidable)
    .reduce((sum, e) => sum + num(e.amount_inr), 0);

  if (avoidableToday > 0) {
    tips.push(
      `You spent ${formatINR(avoidableToday)} today on things that were nice-to-have. Repeating this every day costs about ${formatINR(avoidableToday * 30)} a month — try capping it at ${formatINR(Math.max(50, Math.round(avoidableToday * 0.5)))} tomorrow.`,
    );
  }

  const byCategory = new Map<string, number>();
  for (const row of last30) {
    byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + num(row.amount_inr));
  }
  const top = [...byCategory.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top) {
    tips.push(
      `${top[0]} is your biggest bucket in the last 30 days at ${formatINR(top[1])}. Cutting it by just 15% would save you ${formatINR(Math.round(top[1] * 0.15))} a month.`,
    );
  }

  if (dailyAverage > 0 && todayTotal > dailyAverage * 1.3) {
    tips.push(
      `Today was ${Math.round((todayTotal / dailyAverage - 1) * 100)}% above your usual daily spend of ${formatINR(dailyAverage)}. Keep tomorrow light to balance the week out.`,
    );
  } else if (dailyAverage > 0 && todayTotal > 0 && todayTotal < dailyAverage * 0.7) {
    tips.push(
      `Nicely done — today was well below your usual ${formatINR(dailyAverage)} a day. Move the difference into savings before it disappears.`,
    );
  }

  const smallSpends = today.filter((e) => num(e.amount_inr) <= 100).length;
  if (smallSpends >= 3) {
    tips.push(
      `${smallSpends} small spends today. Tiny amounts are the quietest leak — bundle them into one planned purchase instead.`,
    );
  }

  if (tips.length === 0) {
    tips.push(
      "Steady day. Set a weekly ceiling for the categories you can control and stick to it — consistency beats big one-off cuts.",
    );
  }

  return tips.slice(0, 3);
}
