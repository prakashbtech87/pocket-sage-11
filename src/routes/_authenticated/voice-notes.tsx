import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Mic, Square, Sparkles, Trash2, Check, X } from "lucide-react";
import { parseVoiceNote, saveVoiceExpenses } from "@/lib/voice.functions";
import { formatINR } from "@/lib/expense-categories";
import { startWavRecording, type WavRecorder } from "@/lib/wav-recorder";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/voice-notes")({
  head: () => ({
    meta: [
      { title: "Voice Notes — Prakash Expense Tracker" },
      {
        name: "description",
        content:
          "Speak your expense — \"I spent 50 rupees for food yesterday\" — confirm with Yes and it is logged on the right date.",
      },
      { property: "og:title", content: "Voice Notes — Prakash Expense Tracker" },
      {
        property: "og:description",
        content: "Add expenses by talking. Your words are turned into a clear sentence to confirm.",
      },
    ],
  }),
  component: VoiceNotesPage,
});

type Draft = { description: string; amount: number; spent_on: string };

function prettyDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function VoiceNotesPage() {
  const queryClient = useQueryClient();
  const parse = useServerFn(parseVoiceNote);
  const save = useServerFn(saveVoiceExpenses);

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState<null | "transcribing" | "reading">(null);
  const [text, setText] = useState("");
  const [summary, setSummary] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [saving, setSaving] = useState(false);
  const recorderRef = useRef<WavRecorder | null>(null);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => () => recorderRef.current?.cancel(), []);

  async function startRecording() {
    setSummary("");
    setDrafts([]);
    try {
      recorderRef.current = await startWavRecording();
      setSeconds(0);
      setRecording(true);
    } catch {
      toast.error("Microphone access was blocked. Allow it in your browser settings, or type below.");
    }
  }

  async function stopRecording() {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    setRecording(false);
    if (!recorder) return;

    const blob = await recorder.stop();
    if (blob.size < 4096) {
      toast.error("That recording was too short — hold the mic and speak.");
      return;
    }

    setBusy("transcribing");
    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session.session?.access_token;
      const form = new FormData();
      form.append("file", blob, "recording.wav");

      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });
      const payload = (await response.json().catch(() => ({}))) as {
        text?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Could not hear that clearly.");

      const heard = (payload.text ?? "").trim();
      if (!heard) throw new Error("Nothing was heard. Try again a little closer to the mic.");
      setText(heard);
      await readNote(heard);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function readNote(note: string) {
    if (note.trim().length < 3) {
      toast.error("Say or type what you spent first.");
      return;
    }
    setBusy("reading");
    try {
      const result = await parse({ data: { text: note.trim() } });
      if (!result.items.length) {
        setSummary("");
        setDrafts([]);
        toast.error("No expense found in that note. Mention the item and the amount.");
        return;
      }
      setDrafts(result.items);
      setSummary(
        result.summary ||
          result.items
            .map((i) => `${formatINR(i.amount)} on ${i.description} (${prettyDate(i.spent_on)})`)
            .join(", "),
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  }

  async function handleSave() {
    if (!drafts.length) return;
    setSaving(true);
    try {
      const result = await save({ data: { items: drafts } });
      toast.success(`${result.saved} expense${result.saved > 1 ? "s" : ""} added`);
      for (const alert of result.alerts ?? []) {
        toast.warning(`${alert.threshold}% of your monthly budget is spent`, {
          description:
            alert.remaining >= 0
              ? `${formatINR(alert.remaining)} left for the rest of the month.`
              : `Over budget by ${formatINR(Math.abs(alert.remaining))}.`,
        });
      }
      setDrafts([]);
      setSummary("");
      setText("");
      queryClient.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  function updateDraft(index: number, patch: Partial<Draft>) {
    setDrafts((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  const working = busy !== null;

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Voice notes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap the mic and talk normally, even in broken English — “yesterday food fifty rupees
            spent”. It becomes a clear sentence and you confirm with Yes before it is saved.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-6">
          <div className="flex w-full gap-3">
            <Button
              onClick={startRecording}
              disabled={recording || working}
              className="h-12 flex-1 rounded-xl font-semibold"
            >
              <Mic className="size-5" />
              Record
            </Button>
            <Button
              onClick={stopRecording}
              disabled={!recording}
              variant="destructive"
              className="h-12 flex-1 rounded-xl font-semibold"
            >
              <Square className="size-5" />
              Stop
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {recording
              ? `Recording… ${seconds}s — press Stop when done`
              : busy === "transcribing"
                ? "Writing down what you said…"
                : busy === "reading"
                  ? "Understanding your note…"
                  : "Press Record, speak, then press Stop"}
          </p>
          {working && <Loader2 className="size-5 animate-spin text-muted-foreground" />}
        </div>

        {text && !recording && (
          <div className="rounded-2xl border border-border bg-secondary/50 p-3">
            <p className="text-xs font-medium text-muted-foreground">You said</p>
            <p className="mt-1 text-sm leading-relaxed text-foreground">{text}</p>
          </div>
        )}

        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          placeholder="I spent 250 rupees on groceries yesterday and 60 on tea today"
          className="rounded-xl bg-secondary"
        />

        <Button
          onClick={() => readNote(text)}
          disabled={working}
          variant="secondary"
          className="w-full rounded-xl font-semibold"
        >
          {busy === "reading" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          Read my note
        </Button>
      </section>

      {drafts.length > 0 && (
        <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Do you want to add this to your expenses?
            </h2>
            <p className="mt-2 rounded-2xl bg-secondary/50 p-3 text-sm leading-relaxed text-foreground">
              {summary}
            </p>
          </div>

          <div className="space-y-3">
            {drafts.map((draft, index) => (
              <div
                key={index}
                className="space-y-2 rounded-2xl border border-border bg-secondary/40 p-3"
              >
                <Input
                  value={draft.description}
                  onChange={(event) => updateDraft(index, { description: event.target.value })}
                  className="h-10 rounded-lg bg-secondary"
                />
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={draft.amount}
                    onChange={(event) =>
                      updateDraft(index, { amount: Number(event.target.value) || 0 })
                    }
                    className="h-10 w-28 rounded-lg bg-secondary tnum"
                  />
                  <Input
                    type="date"
                    value={draft.spent_on}
                    onChange={(event) => updateDraft(index, { spent_on: event.target.value })}
                    className="h-10 flex-1 rounded-lg bg-secondary"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove"
                    onClick={() => setDrafts((c) => c.filter((_, i) => i !== index))}
                    className="text-muted-foreground"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatINR(draft.amount)} · {prettyDate(draft.spent_on)}
                </p>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl font-semibold"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              Yes
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setDrafts([]);
                setSummary("");
              }}
              className="flex-1 rounded-xl font-semibold"
            >
              <X className="size-4" />
              No
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
