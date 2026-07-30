import type { Classification } from "./expense-categories";
import { CATEGORIES, classifyByKeyword } from "./expense-categories";

/**
 * Classifies an expense description into a category plus a "was this avoidable"
 * flag. Keyword rules run first; anything unclear falls back to Lovable AI.
 */
export async function classifyExpense(description: string): Promise<Classification> {
  const local = classifyByKeyword(description);
  if (local) return local;

  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return { category: "Other", is_avoidable: false };

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-lite",
        messages: [
          {
            role: "system",
            content: `You classify Indian personal expenses. Pick exactly one category from: ${CATEGORIES.join(", ")}. Also decide if the spend was avoidable (a want, impulse or luxury) rather than necessary (food staples, rent, bills, transport to work, medicine, education). Reply with JSON only.`,
          },
          { role: "user", content: `Expense: "${description}"` },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "classification",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                category: { type: "string", enum: [...CATEGORIES] },
                is_avoidable: { type: "boolean" },
              },
              required: ["category", "is_avoidable"],
            },
          },
        },
      }),
    });

    if (!response.ok) {
      console.error(`AI classify failed [${response.status}]: ${await response.text()}`);
      return { category: "Other", is_avoidable: false };
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return { category: "Other", is_avoidable: false };

    const parsed = JSON.parse(content) as Classification;
    if (!CATEGORIES.includes(parsed.category)) {
      return { category: "Other", is_avoidable: Boolean(parsed.is_avoidable) };
    }
    return { category: parsed.category, is_avoidable: Boolean(parsed.is_avoidable) };
  } catch (error) {
    console.error("AI classify error", error);
    return { category: "Other", is_avoidable: false };
  }
}
