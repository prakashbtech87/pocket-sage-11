import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Wallet } from "lucide-react";
import { getBudgetStatus, setBudget } from "@/lib/budget.functions";
import { monthLabel, type BudgetStatus } from "@/lib/budget-advice";
import { formatINR } from "@/lib/expense-categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function useBudgetStatus() {
  const fetchStatus = useServerFn(getBudgetStatus);
  return useQuery({
    queryKey: ["budget-status"],
    queryFn: () => fetchStatus({ data: {} }) as Promise<BudgetStatus>,
  });
}

export function SetBudgetDialog({
  open,
  onOpenChange,
  month,
  current,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  month: string;
  current: number | null;
}) {
  const queryClient = useQueryClient();
  const save = useServerFn(setBudget);
  const [value, setValue] = useState(current ? String(current) : "");

  const mutation = useMutation({
    mutationFn: () => save({ data: { month, amount: Number(value) } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-status"] });
      toast.success(`Budget set for ${monthLabel(month)}`);
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const amount = Number(value);
  const valid = Number.isFinite(amount) && amount > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl">
        <DialogHeader>
          <DialogTitle>How much money do you have to spend this month?</DialogTitle>
          <DialogDescription>
            Set your total for {monthLabel(month)}. Every expense you log is deducted from it, and
            you'll see what's left plus a safe daily limit.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="budget-amount">Total money for {monthLabel(month)} (₹)</Label>
          <Input
            id="budget-amount"
            inputMode="decimal"
            placeholder="25000"
            value={value}
            onChange={(event) => setValue(event.target.value.replace(/[^\d.]/g, ""))}
            className="h-12 rounded-xl bg-secondary text-lg font-semibold tabular-nums"
          />
        </div>
        <DialogFooter>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!valid || mutation.isPending}
            className="w-full rounded-xl font-semibold sm:w-auto"
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Wallet className="size-4" />
            )}
            Save budget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Compact banner that nudges you to set (or top up) the month's money. */
export function BudgetBanner() {
  const { data } = useBudgetStatus();
  const [open, setOpen] = useState(false);

  if (!data) return null;

  const needsSetting = data.budget === null;
  const remaining = data.remaining ?? 0;
  const low = !needsSetting && remaining <= (data.budget ?? 0) * 0.15;

  if (!needsSetting && !low) return null;

  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-primary/40 bg-primary/10 px-5 py-4">
        <div className="flex items-start gap-3">
          <Wallet className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">
              {needsSetting
                ? `Set your money for ${monthLabel(data.month)}`
                : remaining < 0
                  ? `You're ${formatINR(Math.abs(remaining))} over budget`
                  : `Only ${formatINR(remaining)} left this month`}
            </p>
            <p className="text-xs text-muted-foreground">
              {needsSetting
                ? "Tell me how much you have and every spend gets deducted from it."
                : `${data.daysLeft} day(s) to go. Adjust the amount if your plan changed.`}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setOpen(true)} className="rounded-xl font-semibold">
          {needsSetting ? "Set budget" : "Adjust"}
        </Button>
      </section>
      <SetBudgetDialog
        open={open}
        onOpenChange={setOpen}
        month={data.month}
        current={data.budget}
      />
    </>
  );
}
