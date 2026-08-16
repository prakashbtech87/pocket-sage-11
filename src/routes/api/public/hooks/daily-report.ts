import { createFileRoute } from "@tanstack/react-router";

/**
 * Called by the scheduled job every day at 23:45 IST (18:15 UTC).
 * Sends each user with reports enabled their daily spend summary by email.
 */
export const Route = createFileRoute("/api/public/hooks/daily-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;

        if (!expected || apiKey !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendDailyReportForUser } = await import("@/lib/report.server");

        const { data: profiles, error } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("daily_report_enabled", true);

        if (error) {
          console.error("daily-report: failed to load profiles", error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }

        const results: { id: string; ok: boolean; error?: string }[] = [];

        for (const profile of profiles ?? []) {
          try {
            await sendDailyReportForUser(profile.id);
            results.push({ id: profile.id, ok: true });
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            console.error(`daily-report: send failed for ${profile.id}`, message);
            results.push({ id: profile.id, ok: false, error: message });
          }
        }

        return new Response(JSON.stringify({ processed: results.length, results }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
