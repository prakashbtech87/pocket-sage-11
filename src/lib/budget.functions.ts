import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const MonthInput = z
  .object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() })
  .optional();

const SetInput = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  amount: z.number().positive().max(100_000_000),
});

function monthStart(month: string) {
  return `${month}-01`;
}

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const from = new Date(Date.UTC(y!, m! - 1, 1));
  const to = new Date(Date.UTC(y!, m!, 0));
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function currentMonthIST() {
  const now = new Date(Date.now() + 5.5 * 3600 * 1000);
  return now.toISOString().slice(0, 7);
}

export const getBudgetStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MonthInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const month = data?.month ?? currentMonthIST();
    const { from, to } = monthRange(month);

    const [{ data: budget, error: bErr }, { data: rows, error: eErr }] = await Promise.all([
      supabase
        .from("monthly_budgets")
        .select("amount_inr")
        .eq("user_id", userId)
        .eq("month", monthStart(month))
        .maybeSingle(),
      supabase
        .from("expenses")
        .select("amount_inr, is_avoidable, category, spent_on")
        .gte("spent_on", from)
        .lte("spent_on", to),
    ]);

    if (bErr) throw new Error(bErr.message);
    if (eErr) throw new Error(eErr.message);

    const num = (v: number | string) => (typeof v === "string" ? parseFloat(v) : v);
    const expenses = rows ?? [];
    const spent = expenses.reduce((s, r) => s + num(r.amount_inr), 0);
    const avoidable = expenses
      .filter((r) => r.is_avoidable)
      .reduce((s, r) => s + num(r.amount_inr), 0);

    const byCategory: Record<string, number> = {};
    for (const r of expenses) byCategory[r.category] = (byCategory[r.category] ?? 0) + num(r.amount_inr);

    const totalDays = Number(to.slice(8));
    const todayIST = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
    const dayOfMonth =
      todayIST >= from && todayIST <= to ? Number(todayIST.slice(8)) : totalDays;
    const daysLeft = Math.max(0, totalDays - dayOfMonth);

    const amount = budget ? num(budget.amount_inr) : null;

    return {
      month,
      totalDays,
      dayOfMonth,
      daysLeft,
      budget: amount,
      spent,
      avoidable,
      remaining: amount === null ? null : amount - spent,
      safeDailyLeft: amount === null ? null : (amount - spent) / Math.max(1, daysLeft || 1),
      onTrackSpend: amount === null ? null : (amount / totalDays) * dayOfMonth,
      byCategory,
    };
  });

export const setBudget = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SetInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("monthly_budgets").upsert(
      {
        user_id: context.userId,
        month: monthStart(data.month),
        amount_inr: data.amount,
      },
      { onConflict: "user_id,month" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
