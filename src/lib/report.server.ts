import { formatINR, istToday } from "./expense-categories";
import { buildTips, type ExpenseRow } from "./spending-advice";

export type { ExpenseRow };
import { sendGmail } from "./gmail.server";

export type ReportPeriod = "daily" | "weekly" | "monthly";

const BG = "#14161a";
const CARD = "#1d2026";
const TEXT = "#f2f3f5";
const MUTED = "#a0a4ad";
const ACCENT = "#f0b429";
const CORAL = "#f2705c";
const MINT = "#4fd1a5";

const PERIOD_LABEL: Record<ReportPeriod, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

const PERIOD_DAYS: Record<ReportPeriod, number> = { daily: 1, weekly: 7, monthly: 30 };

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

function shortDate(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function buildReportHtml(params: {
  name: string;
  period: ReportPeriod;
  from: string;
  to: string;
  rows: ExpenseRow[];
  last30: ExpenseRow[];
}): { subject: string; html: string } {
  const { name, period, from, to, rows, last30 } = params;

  const periodTotal = rows.reduce((sum, e) => sum + num(e.amount_inr), 0);
  const avoidableTotal = rows
    .filter((e) => e.is_avoidable)
    .reduce((sum, e) => sum + num(e.amount_inr), 0);

  const monthTotal = last30.reduce((sum, e) => sum + num(e.amount_inr), 0);
  const activeDays = new Set(last30.map((e) => e.spent_on)).size || 1;
  const dailyAverage = Math.round(monthTotal / activeDays);

  const byCategory = new Map<string, number>();
  for (const row of rows) {
    byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + num(row.amount_inr));
  }
  const categoryRows = [...byCategory.entries()].sort((a, b) => b[1] - a[1]);

  const tips = buildTips(rows, last30, periodTotal, dailyAverage * PERIOD_DAYS[period]);

  const rangeLabel =
    period === "daily" ? prettyDate(to) : `${shortDate(from)} – ${shortDate(to)}`;

  const itemsHtml = rows.length
    ? rows
        .map(
          (e) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #2a2e36;color:${TEXT};font-size:15px;">
          ${esc(e.description)}
          <div style="color:${MUTED};font-size:12px;margin-top:2px;">${esc(e.category)}${
            period === "daily" ? "" : ` &nbsp;•&nbsp; ${shortDate(e.spent_on)}`
          }${
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
    : `<tr><td style="padding:16px 0;color:${MUTED};font-size:15px;">No expenses logged in this period. Either a genuinely no-spend stretch, or something slipped through — log it before you forget.</td></tr>`;

  const categoryHtml = categoryRows
    .map(
      ([cat, amount]) => `
      <tr>
        <td style="padding:6px 0;color:${MUTED};font-size:14px;">${esc(cat)}</td>
        <td align="right" style="padding:6px 0;color:${TEXT};font-size:14px;font-weight:600;">${formatINR(amount)}</td>
        <td align="right" style="padding:6px 0 6px 12px;color:${MUTED};font-size:12px;">${Math.round((amount / (periodTotal || 1)) * 100)}%</td>
      </tr>`,
    )
    .join("");

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
    <h1 style="color:${TEXT};font-size:24px;margin:8px 0 4px;font-weight:700;">${PERIOD_LABEL[period]} spend report</h1>
    <div style="color:${MUTED};font-size:14px;margin-bottom:24px;">${esc(rangeLabel)}</div>

    <div style="background:${CARD};border-radius:16px;padding:22px;margin-bottom:16px;">
      <div style="color:${MUTED};font-size:13px;">Total spent</div>
      <div style="color:${ACCENT};font-size:38px;font-weight:700;margin:4px 0 14px;">${formatINR(periodTotal)}</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="color:${MUTED};font-size:12px;">Daily average (30d)<div style="color:${TEXT};font-size:16px;font-weight:600;margin-top:2px;">${formatINR(dailyAverage)}</div></td>
          <td style="color:${MUTED};font-size:12px;">Last 30 days<div style="color:${TEXT};font-size:16px;font-weight:600;margin-top:2px;">${formatINR(monthTotal)}</div></td>
          <td style="color:${MUTED};font-size:12px;">Avoidable<div style="color:${avoidableTotal > 0 ? CORAL : MINT};font-size:16px;font-weight:600;margin-top:2px;">${formatINR(avoidableTotal)}</div></td>
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
      <div style="color:${TEXT};font-size:16px;font-weight:700;margin-bottom:12px;">Advice</div>
      <ul style="margin:0;padding-left:18px;">${tipsHtml}</ul>
    </div>

    <div style="color:${MUTED};font-size:12px;margin-top:24px;line-height:1.6;">
      ${PERIOD_LABEL[period]} report for ${esc(name)}. Amounts in Indian Rupees. Please do not reply to this message.
    </div>
  </div>
</body></html>`;

  const subject = `${PERIOD_LABEL[period]} report — ₹${Math.round(periodTotal).toLocaleString("en-IN")} · ${rangeLabel}`;
  return { subject, html };
}

/** Builds and sends a report for one user over the requested period. */
export async function sendReportForUser(
  userId: string,
  period: ReportPeriod = "daily",
  endDate = istToday(),
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("display_name, report_email, daily_report_enabled")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!profile) throw new Error("Profile not found");

  const from = istToday(-(PERIOD_DAYS[period] - 1));
  const windowStart = istToday(-29);

  const { data: rows, error } = await supabaseAdmin
    .from("expenses")
    .select("id, description, amount_inr, category, is_avoidable, spent_on")
    .eq("user_id", userId)
    .gte("spent_on", windowStart)
    .lte("spent_on", endDate)
    .order("spent_on", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;

  const last30 = (rows ?? []) as ExpenseRow[];
  const periodRows = last30.filter((r) => r.spent_on >= from && r.spent_on <= endDate);

  const { subject, html } = buildReportHtml({
    name: profile.display_name ?? "Prakash",
    period,
    from,
    to: endDate,
    rows: periodRows,
    last30,
  });

  await sendGmail({
    to: profile.report_email,
    subject,
    html,
    replyTo: profile.report_email,
  });

  return { sent: true as const, to: profile.report_email, count: periodRows.length, period };
}

/** Scheduled 9 PM job entry point — respects the user's on/off switch. */
export async function sendDailyReportForUser(userId: string, date = istToday()) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("daily_report_enabled")
    .eq("id", userId)
    .maybeSingle();

  if (profile && !profile.daily_report_enabled) {
    return { sent: false, reason: "reports_disabled" as const };
  }

  return sendReportForUser(userId, "daily", date);
}
