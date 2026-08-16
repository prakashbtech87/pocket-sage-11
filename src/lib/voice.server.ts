import { istToday } from "./expense-categories";

export type ParsedVoiceItem = {
  description: string;
  amount: number;
  spent_on: string;
};

export type ParsedVoiceNote = {
  items: ParsedVoiceItem[];
  summary: string;
};

function safeDate(value: unknown, fallback: string) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

/**
 * Turns a spoken sentence ("I spent 50 rupees for food yesterday") into one or
 * more expense rows with the right date, using Lovable AI.
 */
export async function parseVoiceNoteText(text: string): Promise<ParsedVoiceNote> {
  const today = istToday();
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Voice parsing is unavailable right now.");

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: "google/gemini-3.6-flash",
      messages: [
        {
          role: "system",
          content: `You extract Indian personal expenses from a spoken sentence. Today's date in India (IST) is ${today}. Resolve relative dates like "today", "yesterday", "last Monday", "2 days back", "on the 5th" into an exact YYYY-MM-DD date, never in the future. Amounts are in Indian Rupees; convert words like "fifty", "1.5k", "two hundred" into numbers. Keep the description short (max 8 words) describing what was bought. The speaker may use broken English, Tamil/Hindi words or mixed grammar — understand the intent anyway. If the sentence contains several expenses, return one item per expense. If no expense is present, return an empty list. Also return "summary": one clear, grammatically correct English sentence restating what they spent, e.g. "You spent Rs 50 on food on 2026-08-15." — this is shown back for a Yes/No confirmation.`,
        },
        { role: "user", content: text },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "expenses",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    description: { type: "string" },
                    amount: { type: "number" },
                    spent_on: { type: "string" },
                  },
                  required: ["description", "amount", "spent_on"],
                },
              },
              summary: { type: "string" },
            },
            required: ["items", "summary"],
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Voice parse failed [${response.status}]: ${body}`);
    if (response.status === 429) throw new Error("Too many requests just now — try again shortly.");
    throw new Error("Could not understand that note. Try again or type it out.");
  }

  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) return { items: [], summary: "" };

  const parsed = JSON.parse(content) as { items?: unknown[]; summary?: unknown };
  const items = (parsed.items ?? [])
    .map((raw) => {
      const item = raw as { description?: unknown; amount?: unknown; spent_on?: unknown };
      const amount = Number(item.amount);
      return {
        description: String(item.description ?? "").trim().slice(0, 120),
        amount: Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0,
        spent_on: safeDate(item.spent_on, today),
      };
    })
    .filter((item) => item.description.length > 0 && item.amount > 0);

  return { items, summary: typeof parsed.summary === "string" ? parsed.summary : "" };
}
