import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  addExpense,
  deleteExpense,
  listExpenses,
  setExpenseCategory,
} from "@/lib/expenses.functions";
import { CATEGORIES, CATEGORY_COLORS, formatINR, istToday } from "@/lib/expense-categories";
import { BudgetBanner } from "@/components/budget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/track")({
  head: () => ({
    meta: [
      { title: "Today's spending — Prakash Expense Tracker" },
      {
        name: "description",
        content: "Log what you spent today in rupees and see your running total instantly.",
      },
      { property: "og:title", content: "Today's spending" },
      {
        property: "og:description",
        content: "Log what you spent today in rupees and see your running total instantly.",
      },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const queryClient = useQueryClient();
  const today = istToday();
  const weekStart = istToday(-6);

  const fetchExpenses = useServerFn(listExpenses);
  const add = useServerFn(addExpense);
  const remove = useServerFn(deleteExpense);
  const recategorise = useServerFn(setExpenseCategory);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const { data: rows = [], isPending } = useQuery({
    queryKey: ["expenses", weekStart, today],
    queryFn: () => fetchExpenses({ data: { from: weekStart, to: today } }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["expenses"] });

  const addMutation = useMutation({
    mutationFn: (input: { description: string; amount: number }) => add({ data: input }),
    onSuccess: (row) => {
      setDescription("");
      setAmount("");
      invalidate();
      toast.success(`${formatINR(Number(row.amount_inr))} logged as ${row.category}`);
      for (const alert of row.alerts ?? []) {
        toast.warning(`${alert.threshold}% of your monthly budget is spent`, {
          description:
            alert.remaining >= 0
              ? `${formatINR(alert.remaining)} left for the rest of the month.`
              : `Over budget by ${formatINR(Math.abs(alert.remaining))}.`,
        });
      }
    },

    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message),
  });

  const categoryMutation = useMutation({
    mutationFn: (input: { id: string; category: string; is_avoidable: boolean }) =>
      recategorise({ data: input }),
    onSuccess: () => {
      invalidate();
      toast.success("Category updated — I'll remember it next time");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const todayRows = rows.filter((row) => row.spent_on === today);
  const todayTotal = todayRows.reduce((sum, row) => sum + Number(row.amount_inr), 0);
  const weekTotal = rows.reduce((sum, row) => sum + Number(row.amount_inr), 0);
  const avoidableToday = todayRows
    .filter((row) => row.is_avoidable)
    .reduce((sum, row) => sum + Number(row.amount_inr), 0);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = parseFloat(amount);
    if (!description.trim()) return toast.error("What did you spend on?");
    if (!Number.isFinite(value) || value <= 0) return toast.error("Enter a valid amount");
    addMutation.mutate({ description: description.trim(), amount: value });
  }

  return (
    <div className="space-y-6">
      <BudgetBanner />
      <section className="rounded-3xl border border-border bg-card p-6 glow-ring">
        <p className="text-sm text-muted-foreground">Spent today</p>
        <p className="tnum mt-1 text-5xl font-bold text-primary">{formatINR(todayTotal)}</p>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
            <p className="tnum mt-0.5 text-lg font-semibold text-foreground">
              {formatINR(weekTotal)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Avoidable today</p>
            <p
              className="tnum mt-0.5 text-lg font-semibold"
              style={{
                color: avoidableToday > 0 ? "var(--color-destructive)" : "var(--color-success)",
              }}
            >
              {formatINR(avoidableToday)}
            </p>
          </div>
        </div>
      </section>

      <form
        onSubmit={submit}
        className="space-y-3 rounded-3xl border border-border bg-card p-5"
      >
        <Input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What did you spend on? e.g. morning chai"
          maxLength={120}
          className="h-12 rounded-2xl border-input bg-secondary text-base"
        />
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute top-1/2 left-4 -translate-y-1/2 text-lg text-muted-foreground">
              ₹
            </span>
            <Input
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              placeholder="0"
              className="tnum h-12 rounded-2xl border-input bg-secondary pl-9 text-lg font-semibold"
            />
          </div>
          <Button
            type="submit"
            disabled={addMutation.isPending}
            className="h-12 rounded-2xl px-6 font-semibold"
          >
            {addMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The category is worked out automatically from what you type.
        </p>
      </form>

      <section>
        <h2 className="mb-3 px-1 text-sm font-semibold text-muted-foreground">
          Today's entries {todayRows.length > 0 && `(${todayRows.length})`}
        </h2>

        {isPending ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : todayRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nothing logged yet today. Add your first spend above.
          </div>
        ) : (
          <ul className="space-y-2">
            {todayRows.map((row) => (
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
                  <div className="mt-1 flex items-center gap-2">
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
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(row.id)}
                  aria-label="Delete expense"
                  className="text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
