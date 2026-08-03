import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Check, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  addExpense,
  deleteExpense,
  listExpenses,
  updateExpense,
} from "@/lib/expenses.functions";
import { CATEGORY_COLORS, formatINR, istToday } from "@/lib/expense-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/modify")({
  head: () => ({
    meta: [
      { title: "Modify past days — Prakash Expense Tracker" },
      {
        name: "description",
        content:
          "Pick any past date and add or fix the expenses you forgot to log that day.",
      },
      { property: "og:title", content: "Modify past days" },
      {
        property: "og:description",
        content:
          "Pick any past date and add or fix the expenses you forgot to log that day.",
      },
    ],
  }),
  component: ModifyPage,
});

function prettyDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d)).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function ModifyPage() {
  const queryClient = useQueryClient();
  const today = istToday();

  const [date, setDate] = useState(istToday(-1));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");

  const fetchExpenses = useServerFn(listExpenses);
  const add = useServerFn(addExpense);
  const remove = useServerFn(deleteExpense);
  const edit = useServerFn(updateExpense);

  const { data: rows = [], isPending } = useQuery({
    queryKey: ["expenses", date, date],
    queryFn: () => fetchExpenses({ data: { from: date, to: date } }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["expenses"] });

  const addMutation = useMutation({
    mutationFn: (input: { description: string; amount: number; spent_on: string }) =>
      add({ data: input }),
    onSuccess: (row) => {
      setDescription("");
      setAmount("");
      invalidate();
      toast.success(`${formatINR(Number(row.amount_inr))} added to ${prettyDate(date)}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Entry removed");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const editMutation = useMutation({
    mutationFn: (input: {
      id: string;
      description: string;
      amount: number;
      spent_on: string;
    }) => edit({ data: input }),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
      toast.success("Entry updated");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const dayTotal = rows.reduce((sum, row) => sum + Number(row.amount_inr), 0);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = parseFloat(amount);
    if (!description.trim()) return toast.error("What was the spend on?");
    if (!Number.isFinite(value) || value <= 0) return toast.error("Enter a valid amount");
    addMutation.mutate({ description: description.trim(), amount: value, spent_on: date });
  }

  function saveEdit(id: string) {
    const value = parseFloat(editAmount);
    if (!editDescription.trim()) return toast.error("Description can't be empty");
    if (!Number.isFinite(value) || value <= 0) return toast.error("Enter a valid amount");
    editMutation.mutate({
      id,
      description: editDescription.trim(),
      amount: value,
      spent_on: date,
    });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Modify a past day</h1>
        <p className="text-sm text-muted-foreground">
          Forgot to log something last week? Pick that date and add it here — your totals,
          budget and reports update automatically.
        </p>
      </header>

      <section className="rounded-3xl border border-border bg-card p-5 glow-ring">
        <label
          htmlFor="modify-date"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <CalendarDays className="size-4" />
          Pick the date
        </label>
        <Input
          id="modify-date"
          type="date"
          value={date}
          max={today}
          onChange={(event) => {
            if (event.target.value) setDate(event.target.value);
            setEditingId(null);
          }}
          className="mt-2 h-12 rounded-2xl border-input bg-secondary text-base"
        />
        <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
          <p className="text-sm text-foreground">{prettyDate(date)}</p>
          <p className="tnum text-xl font-bold text-primary">{formatINR(dayTotal)}</p>
        </div>
      </section>

      <form onSubmit={submit} className="space-y-3 rounded-3xl border border-border bg-card p-5">
        <p className="text-sm font-semibold text-foreground">Add a missed expense</p>
        <Input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What was it? e.g. auto to office"
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
          The category is worked out automatically — you can change it on the Today or Review
          screen.
        </p>
      </form>

      <section>
        <h2 className="mb-3 px-1 text-sm font-semibold text-muted-foreground">
          Entries on this day {rows.length > 0 && `(${rows.length})`}
        </h2>

        {isPending ? (
          <div className="flex justify-center py-10">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nothing logged on this date yet.
          </div>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="rounded-2xl border border-border bg-card px-4 py-3"
              >
                {editingId === row.id ? (
                  <div className="space-y-2">
                    <Input
                      value={editDescription}
                      onChange={(event) => setEditDescription(event.target.value)}
                      maxLength={120}
                      className="h-10 rounded-xl border-input bg-secondary text-sm"
                    />
                    <div className="flex gap-2">
                      <Input
                        value={editAmount}
                        onChange={(event) =>
                          setEditAmount(event.target.value.replace(/[^0-9.]/g, ""))
                        }
                        inputMode="decimal"
                        className="tnum h-10 flex-1 rounded-xl border-input bg-secondary text-sm font-semibold"
                      />
                      <Button
                        type="button"
                        size="icon"
                        onClick={() => saveEdit(row.id)}
                        disabled={editMutation.isPending}
                        className="size-10 rounded-xl"
                        aria-label="Save changes"
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                        className="size-10 rounded-xl"
                        aria-label="Cancel editing"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{
                        background: CATEGORY_COLORS[row.category] ?? "var(--color-muted)",
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {row.description}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{row.category}</p>
                    </div>
                    <span className="tnum text-base font-semibold text-foreground">
                      {formatINR(Number(row.amount_inr))}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(row.id);
                        setEditDescription(row.description);
                        setEditAmount(String(row.amount_inr));
                      }}
                      aria-label="Edit expense"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMutation.mutate(row.id)}
                      aria-label="Delete expense"
                      className="text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
