import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!supabaseUrl || !supabaseKey) return new Response("Not configured", { status: 500 });

        const supabase = createClient(supabaseUrl, supabaseKey, {
          auth: { persistSession: false },
          global: { headers: { apikey: supabaseKey, Authorization: `Bearer ${token}` } },
        });
        const { data: userData } = await supabase.auth.getUser(token);
        if (!userData?.user) return new Response("Unauthorized", { status: 401 });

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Transcription unavailable", { status: 500 });

        const form = await request.formData();
        const audio = form.get("file");
        if (!(audio instanceof File) || audio.size < 2048) {
          return new Response(
            JSON.stringify({ error: "That recording was empty — please try again." }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        if (audio.size > 20 * 1024 * 1024) {
          return new Response(JSON.stringify({ error: "Recording is too long." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-transcribe");
        upstream.append("file", audio, "recording.wav");

        const response = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: upstream,
        });

        if (!response.ok) {
          const body = await response.text().catch(() => "");
          console.error(`Transcription failed [${response.status}]: ${body}`);
          const message =
            response.status === 429
              ? "Too many requests just now — try again shortly."
              : "Could not hear that clearly. Try again or type the note.";
          return new Response(JSON.stringify({ error: message }), {
            status: response.status,
            headers: { "Content-Type": "application/json" },
          });
        }

        const payload = (await response.json()) as { text?: string };
        return new Response(JSON.stringify({ text: payload.text ?? "" }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
