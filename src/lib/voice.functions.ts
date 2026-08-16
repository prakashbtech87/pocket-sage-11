import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const NoteInput = z.object({
  text: z.string().trim().min(3, "Say or type what you spent").max(1000),
});

const SaveInput = z.object({
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1).max(120),
        amount: z.number().positive().max(10_000_000),
        spent_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .min(1)
    .max(20),
});

export const parseVoiceNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => NoteInput.parse(input))
  .handler(async ({ data }) => {
    const { parseVoiceNoteText } = await import("./voice.server");
    const items = await parseVoiceNoteText(data.text);
    return { items };
  });

export const saveVoiceExpenses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { classifyExpense } = await import("./classify.server");

    const { data: rules } = await supabase
      .from("category_rules")
      .select("keyword, category, is_avoidable")
      .eq("user_id", userId);

    const rows = [];
    for (const item of data.items) {
      const text = item.description.toLowerCase();
      const learned = (rules ?? []).find((rule) => text.includes(rule.keyword));
      const result = learned ?? (await classifyExpense(item.description));
      rows.push({
        user_id: userId,
        description: item.description,
        amount_inr: item.amount,
        spent_on: item.spent_on,
        category: result.category,
        is_avoidable: result.is_avoidable ?? false,
      });
    }

    const { error } = await supabase.from("expenses").insert(rows);
    if (error) throw new Error(error.message);

    let alerts: import("./budget-alerts.server").BudgetAlert[] = [];
    try {
      const { checkBudgetAlerts, emailBudgetAlert } = await import("./budget-alerts.server");
      alerts = await checkBudgetAlerts(supabase, userId);
      const highest = alerts[alerts.length - 1];
      if (highest) await emailBudgetAlert(userId, highest);
    } catch (alertError) {
      console.error("budget alert check failed", alertError);
    }

    return { saved: rows.length, alerts };
  });
