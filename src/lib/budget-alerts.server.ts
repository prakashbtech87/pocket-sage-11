import type { SupabaseClient } from "@supabase/supabase-js";
import { formatINR } from "./expense-categories";

export type BudgetAlert = {
  threshold: number;
  spent: number;
  budget: number;
  remaining: number;
};

/** 50%, then every 5% up to 100% of the monthly budget. */
const THRESHOLDS = [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];

function num(value: number | string) {
  return typeof value === "string" ? parseFloat(value) : value;
}

function istMonthRange() {
  const now = new Date(Date.now() + 5.5 * 3600 * 1000);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const from = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
  return { from, to };
}

/**
 * Checks the signed-in user's month-to-date spending against their budget and
 * records any newly crossed milestone. Each milestone fires only once a month.
 */
export async function checkBudgetAlerts(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string,
): Promise<BudgetAlert[]> {
  const { from, to } = istMonthRange();

  const [{ data: budgetRow }, { data: expenseRows }] = await Promise.all([
    supabase
      .from("monthly_budgets")
      .select("amount_inr")
      .eq("user_id", userId)
      .eq("month", from)
      .maybeSingle(),
    supabase.from("expenses").select("amount_inr").gte("spent_on", from).lte("spent_on", to),
  ]);

  const budget = budgetRow ? num(budgetRow.amount_inr) : 0;
  if (!budget) return [];

  const spent = (expenseRows ?? []).reduce(
    (sum: number, row: { amount_inr: number | string }) => sum + num(row.amount_inr),
    0,
  );
  const pct = (spent / budget) * 100;

  const reached = THRESHOLDS.filter((t) => pct >= t);
  if (!reached.length) return [];

  const { data: existing } = await supabase
    .from("budget_alerts")
    .select("threshold")
    .eq("user_id", userId)
    .eq("month", from);

  const seen = new Set((existing ?? []).map((row: { threshold: number }) => row.threshold));
  const fresh = reached.filter((t) => !seen.has(t));
  if (!fresh.length) return [];

  await supabase.from("budget_alerts").insert(
    fresh.map((threshold) => ({
      user_id: userId,
      month: from,
      threshold,
      spent_inr: spent,
      budget_inr: budget,
    })),
  );

  return fresh.map((threshold) => ({
    threshold,
    spent,
    budget,
    remaining: budget - spent,
  }));
}

/** Emails the highest freshly crossed milestone so the user is warned off-app too. */
export async function emailBudgetAlert(userId: string, alert: BudgetAlert) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sendGmail } = await import("./gmail.server");

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("display_name, report_email, daily_report_enabled")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.report_email || !profile.daily_report_enabled) return;

  const over = alert.remaining < 0;
  const html = `<!doctype html><html><body style="margin:0;background:#14161a;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:28px 20px;">
    <div style="color:#f0b429;font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">Prakash Expense Tracker</div>
    <h1 style="color:#f2f3f5;font-size:22px;margin:10px 0 6px;">You've used ${alert.threshold}% of this month's budget</h1>
    <div style="background:#1d2026;border-radius:16px;padding:20px;margin-top:16px;color:#f2f3f5;font-size:15px;line-height:1.7;">
      Spent so far: <b>${formatINR(alert.spent)}</b><br/>
      Monthly budget: <b>${formatINR(alert.budget)}</b><br/>
      ${over ? `Over budget by: <b style="color:#f2705c;">${formatINR(Math.abs(alert.remaining))}</b>` : `Left to spend: <b style="color:#4fd1a5;">${formatINR(alert.remaining)}</b>`}
    </div>
    <p style="color:#a0a4ad;font-size:13px;line-height:1.7;margin-top:18px;">
      ${
        over
          ? "You've crossed the line for this month. Pause the avoidable spends and hold the rest until the reset."
          : "Slow down the avoidable spends now and the rest of the month stays comfortable."
      }
    </p>
    <div style="color:#a0a4ad;font-size:12px;margin-top:22px;">Automatic alert for ${profile.display_name ?? "you"}. Please do not reply.</div>
  </div>
</body></html>`;

  await sendGmail({
    to: profile.report_email,
    subject: `Budget alert — ${alert.threshold}% of your monthly money is spent`,
    html,
    replyTo: profile.report_email,
  });
}
