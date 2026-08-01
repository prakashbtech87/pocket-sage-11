import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis } from "recharts";
import { listExpenses, sendReportNow } from "@/lib/expenses.functions";
import { CATEGORY_COLORS, formatINR, istToday } from "@/lib/expense-categories";
import { buildTips } from "@/lib/spending-advice";
import { Button } from "@/components/ui/button";

type Period = "daily" | "weekly" | "monthly";

const PERIODS: { id: Period; label: string; days: number; blurb: string }[] = [
  { id: "daily", label: "Daily", days: 1, blurb: "Today" },
  { id: "weekly", label: "Weekly", days: 7, blurb: "Last 7 days" },
  { id: "monthly", label: "Monthly", days: 30, blurb: "Last 30 days" },
];

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "Daily, weekly & monthly insights — Prakash Expense Tracker" },
      {
        name: "description",
        content:
          "See daily, weekly and monthly spending insights by category, spot avoidable spending and email yourself a report.",
      },
      { property: "og:title", content: "Spending insights" },
      {
        property: "og:description",
        content: "Daily, weekly and monthly rupee spending breakdowns with saving advice.",
      },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  const today = istToday();
  const from = istToday(-29);
  const fetchExpenses = useServerFn(listExpenses);
  const sendReport = useServerFn(sendReportNow);
  const [period, setPeriod] = useState<Period>("daily");

  const { data: rows = [], isPending } = useQuery({
    queryKey: ["expenses", from, today],
    queryFn: () => fetchExpenses({ data: { from, to: today } }),
  });

  const sendMutation = useMutation({
    mutationFn: (p: Period) => sendReport({ data: { period: p } }),
    onSuccess: (result) =>
      toast.success(
        "to" in result && result.to
          ? `${period} report sent to ${result.to}`
          : "Report sent",
      ),
    onError: (error: Error) => toast.error(error.message),
  });

  if (isPending) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const config = PERIODS.find((p) => p.id === period)!;
  const periodFrom = istToday(-(config.days - 1));
  const periodRows = rows.filter((row) => row.spent_on >= periodFrom);

  const total = periodRows.reduce((sum, row) => sum + Number(row.amount_inr), 0);
  const avoidable = periodRows
    .filter((row) => row.is_avoidable)
    .reduce((sum, row) => sum + Number(row.amount_inr), 0);
  const monthTotal = rows.reduce((sum, row) => sum + Number(row.amount_inr), 0);
  const activeDays = new Set(rows.map((row) => row.spent_on)).size || 1;
  const dailyAverage = Math.round(monthTotal / activeDays);

  const byCategory = new Map<string, number>();
  for (const row of periodRows) {
    byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + Number(row.amount_inr));
  }
  const pieData = [...byCategory.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const trendDays = config.days === 1 ? 7 : config.days;
  const trend = Array.from({ length: Math.min(trendDays, 30) }, (_, index) => {
    const date = istToday(index - (Math.min(trendDays, 30) - 1));
    const amount = rows
      .filter((row) => row.spent_on === date)
      .reduce((sum, row) => sum + Number(row.amount_inr), 0);
    return {
      date,
      label: new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
        ...(trendDays > 10 ? { day: "numeric" as const } : { weekday: "short" as const }),
        timeZone: "UTC",
      }),
      amount,
    };
  });

  const tips = buildTips(periodRows, rows, total, dailyAverage * config.days);

  return (
    <div className="space-y-6">
      <div className="flex rounded-2xl border border-border bg-card p-1">
        {PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPeriod(item.id)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              period === item.id
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="grid grid-cols-3 gap-3">
        <Stat label={config.blurb} value={formatINR(total)} />
        <Stat label="Daily average" value={formatINR(dailyAverage)} />
        <Stat
          label="Avoidable"
          value={formatINR(avoidable)}
          color={avoidable > 0 ? "var(--color-destructive)" : "var(--color-success)"}
        />
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Email this {config.label.toLowerCase()} report
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Sends the {config.blurb.toLowerCase()} summary to your report address. It is a
            no-reply message — replies aren't monitored.
          </p>
        </div>
        <Button
          onClick={() => sendMutation.mutate(period)}
          disabled={sendMutation.isPending}
          className="rounded-xl font-semibold"
        >
          {sendMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Mail className="size-4" />
          )}
          Send report
        </Button>
      </section>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Log a few expenses and your insights will appear here.
        </div>
      ) : (
        <>
          <section className="rounded-3xl border border-border bg-card p-6">
            <h2 className="text-base font-semibold text-foreground">
              {trendDays > 10 ? "Last 30 days" : "Last 7 days"}
            </h2>
            <div className="mt-4 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend}>
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]} fill="var(--color-primary)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {pieData.length > 0 && (
            <section className="rounded-3xl border border-border bg-card p-6">
              <h2 className="text-base font-semibold text-foreground">Where it goes</h2>
              <div className="mt-4 flex flex-col items-center gap-6 sm:flex-row">
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={48}
                        outerRadius={78}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {pieData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={CATEGORY_COLORS[entry.name] ?? "var(--color-muted)"}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="w-full space-y-2">
                  {pieData.map((entry) => (
                    <li key={entry.name} className="flex items-center gap-2.5 text-sm">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: CATEGORY_COLORS[entry.name] ?? "var(--color-muted)" }}
                      />
                      <span className="flex-1 text-muted-foreground">{entry.name}</span>
                      <span className="tnum font-semibold text-foreground">
                        {formatINR(entry.value)}
                      </span>
                      <span className="tnum w-10 text-right text-xs text-muted-foreground">
                        {Math.round((entry.value / (total || 1)) * 100)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <section className="rounded-3xl border border-border border-l-4 border-l-primary bg-card p-6">
            <h2 className="text-base font-semibold text-foreground">Advice for you</h2>
            <ul className="mt-3 space-y-3">
              {tips.map((tip) => (
                <li key={tip} className="text-sm leading-relaxed text-muted-foreground">
                  {tip}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className="tnum mt-1 text-lg font-semibold"
        style={{ color: color ?? "var(--color-foreground)" }}
      >
        {value}
      </p>
    </div>
  );
}
