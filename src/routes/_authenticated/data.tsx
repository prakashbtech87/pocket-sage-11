import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Lock, Database, ShieldCheck, KeyRound } from "lucide-react";
import { listExpenses } from "@/lib/expenses.functions";
import { formatINR, istToday } from "@/lib/expense-categories";

export const Route = createFileRoute("/_authenticated/data")({
  head: () => ({
    meta: [
      { title: "Your stored data & security — Prakash Expense Tracker" },
      {
        name: "description",
        content:
          "See exactly what expense data is stored for your account and how it stays private on a public link.",
      },
      { property: "og:title", content: "Your stored data & security" },
      {
        property: "og:description",
        content: "Every row stored for your account, plus how the app keeps it private.",
      },
    ],
  }),
  component: DataPage,
});

function DataPage() {
  const to = istToday();
  const from = istToday(-364);
  const fetchExpenses = useServerFn(listExpenses);

  const { data: rows = [], isPending } = useQuery({
    queryKey: ["expenses", from, to],
    queryFn: () => fetchExpenses({ data: { from, to } }),
  });

  const total = rows.reduce((sum, row) => sum + Number(row.amount_inr), 0);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border bg-card p-6">
        <h1 className="text-lg font-semibold text-foreground">Your stored data</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {rows.length} row{rows.length === 1 ? "" : "s"} · {formatINR(total)} recorded in the last
          year. This is everything the database holds for your account.
        </p>
      </section>

      <section className="overflow-hidden rounded-3xl border border-border bg-card">
        {isPending ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            Nothing stored yet — log an expense and it will show up here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-[11px] tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Description</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-border/60 last:border-0">
                    <td className="tnum px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {row.spent_on}
                    </td>
                    <td className="px-4 py-3 text-foreground">{row.description}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.category}</td>
                    <td className="px-4 py-3 text-xs">
                      <span
                        className={
                          row.is_avoidable ? "text-destructive" : "text-muted-foreground"
                        }
                      >
                        {row.is_avoidable ? "avoidable" : "needed"}
                      </span>
                    </td>
                    <td className="tnum px-4 py-3 text-right font-semibold text-foreground">
                      {formatINR(Number(row.amount_inr))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-5 rounded-3xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold text-foreground">
          Is it safe on a public link?
        </h2>

        <Point icon={Database} title="Where it is stored">
          Your expenses live in a private Postgres database owned by this app on Lovable Cloud —
          not in the browser and not on the public web page. The page you open only shows data
          after you sign in.
        </Point>

        <Point icon={Lock} title="The link is public, your data is not">
          A public URL just means anyone can load the sign-in screen. Every expense route sits
          behind authentication and redirects strangers to sign in before anything loads.
        </Point>

        <Point icon={ShieldCheck} title="Row-level security">
          The database enforces, per row, that only rows whose owner equals your signed-in user ID
          can be read, updated or deleted. Even if someone got hold of the public API key, the
          database would return zero rows for them.
        </Point>

        <Point icon={KeyRound} title="Keys, transport and email">
          Everything travels over HTTPS. The key shipped to the browser is a publishable key that
          can do nothing on its own; privileged keys stay server-side only. Reports are sent
          straight to your own report address as a no-reply message and are not stored anywhere
          else.
        </Point>
      </section>
    </div>
  );
}

function Point({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Lock;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
