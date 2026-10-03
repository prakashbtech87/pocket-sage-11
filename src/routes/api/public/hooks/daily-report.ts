import { createFileRoute } from "@tanstack/react-router";

/**
 * Automatic daily emails are switched off. Reports are only sent when a user
 * taps "Send report" inside the app. This endpoint intentionally does nothing.
 */
export const Route = createFileRoute("/api/public/hooks/daily-report")({
  server: {
    handlers: {
      POST: async () =>
        new Response(JSON.stringify({ disabled: true }), {
          status: 410,
          headers: { "Content-Type": "application/json" },
        }),
    },
  },
});
