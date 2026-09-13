export const MONEY_TIPS = [
  "Wait 24 hours before any unplanned purchase above ₹500. Most wants quietly disappear overnight.",
  "Pay yourself first: move 10% into savings the day money arrives, not whatever is left at month end.",
  "Cook one extra meal at home this week. One swap a day is roughly ₹4,000 saved a month.",
  "Cancel one subscription you haven't opened in 30 days. Small leaks sink big boats.",
  "Carry a list when you shop. Lists spend money; moods burn it.",
  "Round every spend up to the next ₹100 and park the difference — painless saving.",
  "Set a weekly ceiling for food delivery instead of a daily one. It's easier to keep.",
  "Automate a small SIP. Consistency beats timing, always.",
  "Before buying, ask: does this cost me money once, or every month?",
  "Keep one no-spend day a week. It resets your habits more than any budget app can.",
];

export const VIBE_TIPS = [
  "Money is a tool, not a scoreboard. You're already ahead by tracking it.",
  "Small, boring, repeated choices are what wealth is actually made of.",
  "You can't change last month. You can absolutely shape this evening.",
  "Progress over perfection — one logged expense today beats a perfect plan tomorrow.",
  "Being honest with your numbers is a form of self-respect.",
  "Calm finances make for a calm mind. You're building both.",
  "Every rupee you don't waste is a rupee of future freedom.",
  "You're not behind. You're building.",
  "Celebrate the saved ₹100 as loudly as you'd mourn the wasted ₹1,000.",
  "The best day to start was yesterday. The second best is right now.",
];

/** Practical advice of the day — one concrete action to take today. */
export const DAILY_ADVICE = [
  "Today's action: open your bank app and note one charge you don't recognise.",
  "Today's action: pack your lunch or your chai and skip one paid one.",
  "Today's action: set a hard cap for the day before you leave home.",
  "Today's action: move whatever is left in your wallet at night into savings.",
  "Today's action: unsubscribe from one shopping email — fewer nudges, fewer spends.",
  "Today's action: log every spend within a minute of paying, no exceptions.",
  "Today's action: compare one repeat purchase with a cheaper alternative.",
  "Today's action: pay cash for one purchase and feel the amount leave.",
  "Today's action: review yesterday's avoidable spends and pick one to stop.",
  "Today's action: write down the one thing you're saving for. Keep it visible.",
];

export function dayIndex() {
  return Math.floor(Date.now() / 86_400_000);
}

export function dailyPicks() {
  const i = dayIndex();
  return {
    tip: MONEY_TIPS[i % MONEY_TIPS.length]!,
    vibe: VIBE_TIPS[i % VIBE_TIPS.length]!,
    advice: DAILY_ADVICE[i % DAILY_ADVICE.length]!,
  };
}
