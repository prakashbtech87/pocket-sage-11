import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Lock, Mail, Star, Trash2 } from "lucide-react";
import {
  getProfile,
  listExpenses,
  sendReportNow,
  setExpenseCategory,
} from "@/lib/expenses.functions";
import { deleteFeedback, listMyFeedback, saveFeedback } from "@/lib/feedback.functions";
import { CATEGORIES, CATEGORY_COLORS, formatINR, istToday } from "@/lib/expense-categories";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Period = "daily" | "weekly" | "monthly";

const PERIODS: { id: Period; label: string; days: number; blurb: string }[] = [
  { id: "daily", label: "Daily", days: 1, blurb: "Today" },
  { id: "weekly", label: "Weekly", days: 7, blurb: "Last 7 days" },
  { id: "monthly", label: "Monthly", days: 30, blurb: "Last 30 days" },
];

export const Route = createFileRoute("/_authenticated/review")({
  head: () => ({
    meta: [
      { title: "Review your spending — Prakash Expense Tracker" },
      {
        name: "description",
        content:
          "Go back over every expense, fix its category, mark what was avoidable and check the summary before your report is emailed to you.",
      },
      { property: "og:title", content: "Review your spending" },
      {
        property: "og:description",
        content: "Confirm categories, flag avoidable spends and rate the app.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<Period>("weekly");
  const active = PERIODS.find((p) => p.id === period)!;

  const to = istToday();
  const from = istToday(-(active.days - 1));

  const fetchExpenses = useServerFn(listExpenses);
  const recategorise = useServerFn(setExpenseCategory);
  const sendReport = useServerFn(sendReportNow);
  const fetchProfile = useServerFn(getProfile);

  const { data: rows = [], isPending } = useQuery({
    queryKey: ["expenses", from, to],
    queryFn: () => fetchExpenses({ data: { from, to } }),
  });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile({ data: undefined }),
  });

  const categoryMutation = useMutation({
    mutationFn: (input: { id: string; category: string; is_avoidable: boolean }) =>
      recategorise({ data: input }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Reviewed — I'll remember this next time");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reportMutation = useMutation({
    mutationFn: () => sendReport({ data: { period } }),
    onSuccess: (result) => toast.success(`Report emailed to ${result.to}`),
    onError: (error: Error) => toast.error(error.message),
  });

  const summary = useMemo(() => {
    const total = rows.reduce((sum, r) => sum + Number(r.amount_inr), 0);
    const avoidable = rows
      .filter((r) => r.is_avoidable)
      .reduce((sum, r) => sum + Number(r.amount_inr), 0);
    const byCategory = new Map<string, number>();
    for (const r of rows) {
      byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + Number(r.amount_inr));
    }
    return {
      total,
      avoidable,
      count: rows.length,
      top: [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4),
    };
  }, [rows]);

  return (
    <div className="space-y-6">
      <header className="px-1">
        <h1 className="text-2xl font-bold text-foreground">Review</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Go back over every entry, fix anything mis-categorised, then send yourself the report.
        </p>
      </header>

      <div className="flex gap-2 rounded-2xl border border-border bg-card p-1.5">
        {PERIODS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setPeriod(item.id)}
            className={`flex-1 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
              period === item.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <section className="rounded-3xl border border-border bg-card p-6 glow-ring">
        <p className="text-sm text-muted-foreground">{active.blurb} · {summary.count} entries</p>
        <p className="tnum mt-1 text-4xl font-bold text-primary">{formatINR(summary.total)}</p>
        <div className="mt-4 border-t border-border pt-4">
          <p className="text-xs text-muted-foreground">Avoidable in this period</p>
          <p
            className="tnum mt-0.5 text-lg font-semibold"
            style={{
              color: summary.avoidable > 0 ? "var(--color-destructive)" : "var(--color-success)",
            }}
          >
            {formatINR(summary.avoidable)}
          </p>
        </div>
        {summary.top.length > 0 && (
          <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
            {summary.top.map(([category, amount]) => (
              <li key={category} className="flex items-center gap-2 text-sm">
                <span
                  className="size-2 rounded-full"
                  style={{ background: CATEGORY_COLORS[category] ?? "var(--color-muted)" }}
                />
                <span className="flex-1 text-muted-foreground">{category}</span>
                <span className="tnum font-semibold text-foreground">{formatINR(amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
          <div className="text-sm">
            <p className="font-semibold text-foreground">Only you can see this report</p>
            <p className="mt-1 text-muted-foreground">
              Every entry above belongs to your login and is protected by row-level security in the
              database — no other account, including mine, can read it. The report is emailed only
              to{" "}
              <span className="font-medium text-foreground">
                {profile?.report_email ?? "your signed-in address"}
              </span>
              , the address of the account you are signed in with.
            </p>
          </div>
        </div>
        <Button
          onClick={() => reportMutation.mutate()}
          disabled={reportMutation.isPending}
          className="mt-4 h-11 w-full rounded-2xl font-semibold"
        >
          {reportMutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Mail className="size-4" />
          )}
          Email me this {active.label.toLowerCase()} report
        </Button>
      </section>

      <section>
        <h2 className="mb-3 px-1 text-sm font-semibold text-muted-foreground">
          Check each entry
        </h2>

        {isPending ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nothing logged in this period yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: CATEGORY_COLORS[row.category] ?? "var(--color-muted)" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{row.description}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{row.spent_on}</span>
                    <Select
                      value={row.category}
                      onValueChange={(value) =>
                        categoryMutation.mutate({
                          id: row.id,
                          category: value,
                          is_avoidable: row.is_avoidable,
                        })
                      }
                    >
                      <SelectTrigger className="h-6 w-auto gap-1 border-0 bg-transparent px-0 text-xs text-muted-foreground shadow-none focus:ring-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category} className="text-xs">
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <button
                      type="button"
                      onClick={() =>
                        categoryMutation.mutate({
                          id: row.id,
                          category: row.category,
                          is_avoidable: !row.is_avoidable,
                        })
                      }
                      className="rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors"
                      style={{
                        color: row.is_avoidable
                          ? "var(--color-destructive)"
                          : "var(--color-success)",
                        borderColor: row.is_avoidable
                          ? "var(--color-destructive)"
                          : "var(--color-success)",
                      }}
                    >
                      {row.is_avoidable ? "avoidable" : "needed"}
                    </button>
                  </div>
                </div>
                <span className="tnum text-base font-semibold text-foreground">
                  {formatINR(Number(row.amount_inr))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <FeedbackSection />
    </div>
  );
}

function FeedbackSection() {
  const queryClient = useQueryClient();
  const fetchFeedback = useServerFn(listMyFeedback);
  const save = useServerFn(saveFeedback);
  const remove = useServerFn(deleteFeedback);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const { data: entries = [] } = useQuery({
    queryKey: ["feedback"],
    queryFn: () => fetchFeedback({ data: undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["feedback"] });

  const saveMutation = useMutation({
    mutationFn: () => save({ data: { rating, comment: comment.trim() } }),
    onSuccess: () => {
      setRating(0);
      setComment("");
      invalidate();
      toast.success("Thanks for the review!");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="rounded-3xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold text-foreground">Review this app</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Rate the app and leave a note. Your review is stored under your own login and only you can
        read it back here.
      </p>

      <div className="mt-4 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-label={`${value} star${value > 1 ? "s" : ""}`}
            onClick={() => setRating(value)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className="size-7"
              style={{
                color: value <= rating ? "var(--color-primary)" : "var(--color-muted-foreground)",
                fill: value <= rating ? "var(--color-primary)" : "transparent",
              }}
            />
          </button>
        ))}
      </div>

      <Textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={1000}
        placeholder="What's working, what should change?"
        className="mt-3 min-h-24 rounded-2xl border-input bg-secondary text-sm"
      />

      <Button
        onClick={() => {
          if (rating < 1) return toast.error("Pick a star rating first");
          saveMutation.mutate();
        }}
        disabled={saveMutation.isPending}
        className="mt-3 h-11 w-full rounded-2xl font-semibold"
      >
        {saveMutation.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <CheckCircle2 className="size-4" />
        )}
        Submit review
      </Button>

      {entries.length > 0 && (
        <ul className="mt-5 space-y-2 border-t border-border pt-4">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start gap-3 rounded-2xl bg-secondary px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      className="size-3.5"
                      style={{
                        color:
                          value <= entry.rating
                            ? "var(--color-primary)"
                            : "var(--color-muted-foreground)",
                        fill: value <= entry.rating ? "var(--color-primary)" : "transparent",
                      }}
                    />
                  ))}
                </div>
                {entry.comment && (
                  <p className="mt-1.5 text-sm text-foreground">{entry.comment}</p>
                )}
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(entry.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(entry.id)}
                aria-label="Delete review"
                className="text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
