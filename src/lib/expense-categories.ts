export const CATEGORIES = [
  "Food & Dining",
  "Groceries",
  "Travel",
  "Bills & Utilities",
  "Shopping",
  "Health",
  "Entertainment",
  "Education",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_COLORS: Record<string, string> = {
  "Food & Dining": "var(--color-chart-1)",
  Groceries: "var(--color-chart-3)",
  Travel: "var(--color-chart-2)",
  "Bills & Utilities": "var(--color-chart-8)",
  Shopping: "var(--color-chart-4)",
  Health: "var(--color-chart-6)",
  Entertainment: "var(--color-chart-5)",
  Education: "var(--color-chart-7)",
  Other: "var(--color-muted-foreground)",
};

type Rule = { words: string[]; category: Category; avoidable: boolean };

const KEYWORD_RULES: Rule[] = [
  {
    words: [
      "swiggy",
      "zomato",
      "restaurant",
      "hotel food",
      "biryani",
      "pizza",
      "burger",
      "dosa",
      "tea",
      "chai",
      "coffee",
      "cafe",
      "snack",
      "juice",
      "icecream",
      "ice cream",
      "lunch",
      "dinner",
      "breakfast",
      "canteen",
      "mess",
      "food",
    ],
    category: "Food & Dining",
    avoidable: true,
  },
  {
    words: [
      "grocery",
      "groceries",
      "vegetable",
      "veggies",
      "milk",
      "rice",
      "atta",
      "dal",
      "oil",
      "bigbasket",
      "dmart",
      "supermarket",
      "kirana",
      "provisions",
      "eggs",
      "fruits",
    ],
    category: "Groceries",
    avoidable: false,
  },
  {
    words: [
      "petrol",
      "diesel",
      "fuel",
      "uber",
      "ola",
      "rapido",
      "auto",
      "bus",
      "train",
      "irctc",
      "metro",
      "cab",
      "taxi",
      "flight",
      "toll",
      "parking",
      "travel",
      "ticket",
    ],
    category: "Travel",
    avoidable: false,
  },
  {
    words: [
      "rent",
      "electricity",
      "current bill",
      "water bill",
      "gas",
      "cylinder",
      "recharge",
      "mobile bill",
      "broadband",
      "wifi",
      "internet",
      "dth",
      "emi",
      "loan",
      "insurance",
      "maintenance",
      "bill",
    ],
    category: "Bills & Utilities",
    avoidable: false,
  },
  {
    words: [
      "amazon",
      "flipkart",
      "myntra",
      "shirt",
      "shoes",
      "dress",
      "clothes",
      "watch",
      "gadget",
      "headphone",
      "mobile",
      "laptop",
      "shopping",
      "cosmetics",
      "perfume",
    ],
    category: "Shopping",
    avoidable: true,
  },
  {
    words: [
      "medicine",
      "pharmacy",
      "doctor",
      "hospital",
      "clinic",
      "medical",
      "gym",
      "test",
      "tablets",
      "apollo",
      "checkup",
    ],
    category: "Health",
    avoidable: false,
  },
  {
    words: [
      "movie",
      "cinema",
      "netflix",
      "prime",
      "hotstar",
      "spotify",
      "game",
      "subscription",
      "party",
      "outing",
      "cigarette",
      "smoke",
      "alcohol",
      "beer",
      "bar",
      "lottery",
    ],
    category: "Entertainment",
    avoidable: true,
  },
  {
    words: [
      "book",
      "course",
      "tuition",
      "college",
      "fees",
      "exam",
      "udemy",
      "stationery",
      "notebook",
      "pen",
    ],
    category: "Education",
    avoidable: false,
  },
];

export type Classification = { category: Category; is_avoidable: boolean };

/** Fast local classification. Returns null when nothing matches confidently. */
export function classifyByKeyword(description: string): Classification | null {
  const text = ` ${description.toLowerCase().trim()} `;
  for (const rule of KEYWORD_RULES) {
    for (const word of rule.words) {
      if (text.includes(` ${word} `) || text.includes(word)) {
        return { category: rule.category, is_avoidable: rule.avoidable };
      }
    }
  }
  return null;
}

export function formatINR(amount: number, withDecimals = false): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: withDecimals ? 2 : 0,
    maximumFractionDigits: withDecimals ? 2 : 0,
  }).format(amount);
}

/** Today's date (YYYY-MM-DD) in India Standard Time, regardless of device clock. */
export function istToday(offsetDays = 0): string {
  const now = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
