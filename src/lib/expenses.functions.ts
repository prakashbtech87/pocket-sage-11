import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const AddInput = z.object({
  description: z.string().trim().min(1, "Say what you spent on").max(120),
  amount: z.number().positive().max(10_000_000),
  spent_on: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

const RangeInput = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const IdInput = z.object({ id: z.string().uuid() });

const CategoryInput = z.object({
  id: z.string().uuid(),
  category: z.string().min(1).max(40),
  is_avoidable: z.boolean(),
});

const ProfileInput = z.object({
  display_name: z.string().trim().min(1).max(60),
  report_email: z.string().trim().email().max(255),
  daily_report_enabled: z.boolean(),
});

export const addExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AddInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const text = data.description.toLowerCase();

    const { data: rules } = await supabase
      .from("category_rules")
      .select("keyword, category, is_avoidable")
      .eq("user_id", userId);

    const learned = (rules ?? []).find((rule) => text.includes(rule.keyword));

    let category = learned?.category;
    let isAvoidable = learned?.is_avoidable;

    if (!category) {
      const { classifyExpense } = await import("./classify.server");
      const result = await classifyExpense(data.description);
      category = result.category;
      isAvoidable = result.is_avoidable;
    }

    const { data: row, error } = await supabase
      .from("expenses")
      .insert({
        user_id: userId,
        description: data.description,
        amount_inr: data.amount,
        category,
        is_avoidable: isAvoidable ?? false,
        ...(data.spent_on ? { spent_on: data.spent_on } : {}),
      })
      .select("id, description, amount_inr, category, is_avoidable, spent_on, created_at")
      .single();

    if (error) throw new Error(error.message);
    return row;
  });

export const listExpenses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RangeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("expenses")
      .select("id, description, amount_inr, category, is_avoidable, spent_on, created_at")
      .gte("spent_on", data.from)
      .lte("spent_on", data.to)
      .order("spent_on", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => IdInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("expenses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setExpenseCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CategoryInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: row, error } = await supabase
      .from("expenses")
      .update({ category: data.category, is_avoidable: data.is_avoidable })
      .eq("id", data.id)
      .select("description")
      .single();

    if (error) throw new Error(error.message);

    // Remember the correction so similar entries land in the same bucket.
    const keyword = row.description.toLowerCase().trim().split(/\s+/).slice(0, 2).join(" ");
    if (keyword.length >= 3) {
      await supabase.from("category_rules").upsert(
        {
          user_id: userId,
          keyword,
          category: data.category,
          is_avoidable: data.is_avoidable,
        },
        { onConflict: "user_id,keyword" },
      );
    }

    return { ok: true };
  });

export const getProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("profiles")
      .select("display_name, report_email, daily_report_enabled")
      .eq("id", context.userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (
      data ?? {
        display_name: "Prakash",
        report_email: "prakashbtech87@gmail.com",
        daily_report_enabled: true,
      }
    );
  });

export const updateProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ProfileInput.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .upsert({ id: context.userId, ...data }, { onConflict: "id" });

    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendReportNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ period: z.enum(["daily", "weekly", "monthly"]).default("daily") })
      .default({ period: "daily" })
      .parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { sendReportForUser } = await import("./report.server");
    return sendReportForUser(context.userId, data.period);
  });

