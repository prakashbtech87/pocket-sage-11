import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, XAxis } from "recharts";
import { listExpenses } from "@/lib/expenses.functions";
import { CATEGORY_COLORS, formatINR, istToday } from "@/lib/expense-categories";
import { buildTips } from "@/lib/spending-advice";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "Spending insights — Prakash Expense Tracker" },
      {
        name: "description",
        content:
          "See where your rupees go by category, spot avoidable spending and get saving advice.",
      },
      { property: "og:title", content: "Spending insights" },
      {
        property: "og:description",
        content: "Category breakdown, 7-day trend and saving advice for your rupee spending.",
      },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  const today = istToday();
  const from = istToday(-29);
  const fetchExpenses = useServerFn(listExpenses);

  const { data: rows = [], isPending } = useQuery({
    queryKey: ["expenses", from, today],
    queryFn: () => fetchExpenses({ data: { from, to: today } }),
  });

  if (isPending) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const total = rows.reduce((sum, row) => sum + Number(row.amount_inr), 0);
  const avoidable = rows
    .filter((row) => row.is_avoidable)
    .reduce((sum, row) => sum + Number(row.amount_inr), 0);
  const activeDays = new Set(rows.map((row) => row.spent_on)).size || 1;
  const dailyAverage = Math.round(total / activeDays);

  const byCategory = new Map<string, number>();
  for (const row of rows) {
    byCategory.set(row.category, (byCategory.get(row.category) ?? 0) + Number(row.amount_inr));
  }
  const pieData = [...byCategory.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const trend = Array.from({ length: 7 }, (_, index) => {
    const date = istToday(index - 6);
    const amount = rows
      .filter((row) => row.spent_on === date)
      .reduce((sum, row) => sum + Number(row.amount_inr), 0);
    return {
      date,
      label: new Date(`${date}T00:00:00Z`).toLocaleDateString("en-IN", {
        weekday: "short",
        timeZone: "UTC",
      }),
      amount,
    };
  });

  const todayRows = rows.filter((row) => row.spent_on === today);
  const todayTotal = todayRows.reduce((sum, row) => sum + Number(row.amount_inr), 0);
  const tips = buildTips(
    todayRows.map(toTipRow),
    rows.map(toTipRow),
    todayTotal,
    dailyAverage,
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Log a few expenses and your insights will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-3 gap-3">
        <Stat label="Last 30 days" value={formatINR(total)} />
        <Stat label="Daily average" value={formatINR(dailyAverage)} />
        <Stat
          label="Avoidable"
          value={formatINR(avoidable)}
          color={avoidable > 0 ? "var(--color-destructive)" : "var(--color-success)"}
        />
      </section>

      <section className="rounded-3xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">Last 7 days</h2>
        <div className="mt-4 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend}>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              />
              <Bar dataKey="amount" radius={[6, 6, 0, 0]} fill="var(--color-primary)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

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
                  {Math.round((entry.value / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

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
    </div>
  );
}

function toTipRow(row: {
  id: string;
  description: string;
  amount_inr: number | string;
  category: string;
  is_avoidable: boolean;
  spent_on: string;
}) {
  return row;
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
