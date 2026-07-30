## Prakash Expense Tracker

A dark-theme daily expense app in INR, with an auto-categorized log, spending tips, and a 9:00 PM IST daily email report sent to prakashbtech87@gmail.com via your connected Gmail account.

### What you'll get

**1. Add expense (the core screen)**
- Two fields only: "What did you spend on?" (short text) + "How much (₹)".
- Big ₹ keypad-style input, one-tap save.
- Today's list below with running total, edit/delete.

**2. Automatic categories**
- Each entry is auto-categorized from its text (Food, Travel, Groceries, Bills, Shopping, Health, Entertainment, Other) using keyword rules first; anything unclear goes to AI (Lovable AI) for a category + a "necessary / avoidable" flag.
- You can override the category with one tap; overrides teach the keyword rules.

**3. Dashboard**
- Today / This week / This month totals in ₹.
- Category donut + 7-day bar trend.
- "Avoidable spend" figure and personalized tips ("₹640 on food delivery this week — cooking 3 of those saves ~₹450/month").

**4. Daily 9:00 PM email report**
- Sent to prakashbtech87@gmail.com every day at 21:00 IST from your Gmail account through the Gmail connector.
- Contents: total spent today, itemized list, category breakdown, comparison vs your daily average, avoidable spend, and 2-3 saving tips.
- A "Send test report now" button so you can verify it immediately.
- If a day has zero expenses, it sends a short "no spend logged today" nudge.

**5. Install as an app on iPhone**
- This will be a web app you install via Safari → Share → **Add to Home Screen**. It then opens full-screen with its own icon and name, exactly like an App Store app.
- A real App Store listing is a separate process (Apple Developer account, $99/yr, native packaging, review). Not part of this build — I'll note how to get there later if you want it.

**6. Link to track anywhere**
- After publishing you get a public URL (yourproject.lovable.app) that works on phone, laptop, anything. You can also add a custom domain later.

### Where your data is stored

- All expenses are stored in **Lovable Cloud** (a managed Postgres database owned by your project) — not in the browser, so it syncs across every device.
- Login with email/password protects the data; row-level security means only your account can read your rows.
- The Gmail connector uses your Gmail account only to send the report; no expense data leaves the app other than in that email.

### Technical notes

- Lovable Cloud enabled: `expenses` table (id, user_id, description, amount_inr, category, is_avoidable, spent_at, created_at) with RLS scoped to `auth.uid()`, plus a `category_rules` table for learned overrides.
- Auth: email/password via Cloud; app routes behind an auth gate.
- Categorization: keyword map in code → fallback to Lovable AI Gateway (`google/gemini-3-flash`) returning `{category, avoidable}`.
- Email: server route `/api/public/cron/daily-report` builds the HTML report and posts to the Gmail connector gateway (`google_mail`, `users/me/messages/send`). Requires the Gmail connection to be linked with the `gmail.send` scope, and a shared-secret header check on the route.
- Scheduling: `pg_cron` job in Cloud hitting that route at 15:30 UTC (= 21:00 IST) daily.
- PWA: manifest + icons only (no service worker) for Add to Home Screen.
- Dark theme: dark charcoal base with a single warm accent, defined as semantic tokens in `src/styles.css`; ₹ amounts in a tabular-figure display font.

### Assumptions

- 9 PM means 21:00 India Standard Time.
- Single user (you); no multi-user sharing.
