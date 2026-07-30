import { formatINR, istToday } from "./expense-categories";
import { sendGmail } from "./gmail.server";

export type ExpenseRow = {
  id: string;
  description: string;
  amount_inr: number | string;
  category: string;
  is_avoidable: boolean;
  spent_on: string;
};

const BG = "#14161a";
const CARD = "#1d2026";
const TEXT = "#f2f3f5";
const MUTED = "#a0a4ad";
const ACCENT = "#f0b429";
const CORAL = "#f2705c";
const MINT = "#4fd1a5";

function num(value: number | string) {
  return typeof value === "string" ? parseFloat(value) : value;
}

function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function prettyDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
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
  } else if (dailyAverage > 0 && todayTotal < dailyAverage * 0.7) {
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

export function buildReportHtml(params: {
  name: string;
  date: string;
  today: ExpenseRow[];
  last30: ExpenseRow[];
}): { subject: string; html: string } {
  const { name, date, today, last30 } = params;

  const todayTotal = today.reduce((sum, e) => sum + num(e.amount_inr), 0);
  const avoidableToday = today
    .filter((e) => e.is_avoidable)
    .reduce((sum, e) => sum + num(e.amount_inr), 0);

  const monthTotal = last30.reduce((sum, e) => sum + num(e.amount_inr), 0);
  const activeDays = new Set(last30.map((e) => e.spent_on)).size || 1;
  const dailyAverage = Math.round(monthTotal / activeDays);

  const byCategory = new Map<string, number>();
  for (const row of today) {
    byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + num(row.amount_inr));
  }
  const categoryRows = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

  const tips = buildTips(today, last30, todayTotal, dailyAverage);

  const itemsHtml = today.length
    ? today
        .map(
          (e) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #2a2e36;color:${TEXT};font-size:15px;">
          ${esc(e.description)}
          <div style="color:${MUTED};font-size:12px;margin-top:2px;">${esc(e.category)}${
            e.is_avoidable
              ? ` &nbsp;•&nbsp; <span style="color:${CORAL};">avoidable</span>`
              : ""
          }</div>
        </td>
        <td align="right" style="padding:10px 0;border-bottom:1px solid #2a2e36;color:${TEXT};font-size:15px;font-weight:600;white-space:nowrap;">
          ${formatINR(num(e.amount_inr))}
        </td>
      </tr>`,
        )
        .join("")
    : `<tr><td style="padding:16px 0;color:${MUTED};font-size:15px;">No expenses logged today. Either a genuinely no-spend day, or something slipped through — log it before you forget.</td></tr>`;

  const categoryHtml = categoryRows.length
    ? categoryRows
        .map(
          ([cat, amount]) => `
      <tr>
        <td style="padding:6px 0;color:${MUTED};font-size:14px;">${esc(cat)}</td>
        <td align="right" style="padding:6px 0;color:${TEXT};font-size:14px;font-weight:600;">${formatINR(amount)}</td>
        <td align="right" style="padding:6px 0 6px 12px;color:${MUTED};font-size:12px;">${Math.round((amount / (todayTotal || 1)) * 100)}%</td>
      </tr>`,
        )
        .join("")
    : "";

  const tipsHtml = tips
    .map(
      (tip) =>
        `<li style="margin:0 0 10px;color:${TEXT};font-size:14px;line-height:1.55;">${esc(tip)}</li>`,
    )
    .join("");

  const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:28px 20px 48px;">
    <div style="color:${ACCENT};font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">Prakash Expense Tracker</div>
    <h1 style="color:${TEXT};font-size:24px;margin:8px 0 4px;font-weight:700;">Daily spend report</h1>
    <div style="color:${MUTED};font-size:14px;margin-bottom:24px;">${esc(prettyDate(date))}</div>

    <div style="background:${CARD};border-radius:16px;padding:22px;margin-bottom:16px;">
      <div style="color:${MUTED};font-size:13px;">Total spent today</div>
      <div style="color:${ACCENT};font-size:38px;font-weight:700;margin:4px 0 14px;">${formatINR(todayTotal)}</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="color:${MUTED};font-size:12px;">Daily average (30d)<div style="color:${TEXT};font-size:16px;font-weight:600;margin-top:2px;">${formatINR(dailyAverage)}</div></td>
          <td style="color:${MUTED};font-size:12px;">Last 30 days<div style="color:${TEXT};font-size:16px;font-weight:600;margin-top:2px;">${formatINR(monthTotal)}</div></td>
          <td style="color:${MUTED};font-size:12px;">Avoidable today<div style="color:${avoidableToday > 0 ? CORAL : MINT};font-size:16px;font-weight:600;margin-top:2px;">${formatINR(avoidableToday)}</div></td>
        </tr>
      </table>
    </div>

    <div style="background:${CARD};border-radius:16px;padding:22px;margin-bottom:16px;">
      <div style="color:${TEXT};font-size:16px;font-weight:700;margin-bottom:6px;">What you spent on</div>
      <table width="100%" cellpadding="0" cellspacing="0">${itemsHtml}</table>
    </div>

    ${
      categoryHtml
        ? `<div style="background:${CARD};border-radius:16px;padding:22px;margin-bottom:16px;">
      <div style="color:${TEXT};font-size:16px;font-weight:700;margin-bottom:8px;">By category</div>
      <table width="100%" cellpadding="0" cellspacing="0">${categoryHtml}</table>
    </div>`
        : ""
    }

    <div style="background:${CARD};border-left:3px solid ${ACCENT};border-radius:16px;padding:22px;">
      <div style="color:${TEXT};font-size:16px;font-weight:700;margin-bottom:12px;">Advice for tomorrow</div>
      <ul style="margin:0;padding-left:18px;">${tipsHtml}</ul>
    </div>

    <div style="color:${MUTED};font-size:12px;margin-top:24px;line-height:1.6;">
      Sent automatically at 9:00 PM IST for ${esc(name)}. Amounts in Indian Rupees.
    </div>
  </div>
</body></html>`;

  const subject = `₹${Math.round(todayTotal).toLocaleString("en-IN")} spent today — ${prettyDate(date)}`;
  return { subject, html };
}

/** Builds and sends the daily report for one user. Returns what happened. */
export async function sendDailyReportForUser(userId: string, date = istToday()) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("display_name, report_email, daily_report_enabled")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) throw new Error("Profile not found");
  if (!profile.daily_report_enabled) return { sent: false, reason: "reports_disabled" as const };

  const from30 = istToday(-29);

  const { data: rows, error } = await supabaseAdmin
    .from("expenses")
    .select("id, description, amount_inr, category, is_avoidable, spent_on")
    .eq("user_id", userId)
    .gte("spent_on", from30)
    .lte("spent_on", date)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const last30 = (rows ?? []) as ExpenseRow[];
  const today = last30.filter((r) => r.spent_on === date);

  const { subject, html } = buildReportHtml({
    name: profile.display_name ?? "Prakash",
    date,
    today,
    last30,
  });

  await sendGmail({ to: profile.report_email, subject, html });

  return { sent: true as const, to: profile.report_email, count: today.length };
}
