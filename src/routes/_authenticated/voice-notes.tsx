import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Mic, MicOff, Sparkles, Trash2, Check } from "lucide-react";
import { parseVoiceNote, saveVoiceExpenses } from "@/lib/voice.functions";
import { formatINR } from "@/lib/expense-categories";
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
          "Speak your expense — \"I spent 50 rupees for food yesterday\" — and it is logged on the right date automatically.",
      },
      { property: "og:title", content: "Voice Notes — Prakash Expense Tracker" },
      {
        property: "og:description",
        content: "Add expenses by talking. The date and amount are understood for you.",
      },
    ],
  }),
  component: VoiceNotesPage,
});

type Draft = { description: string; amount: number; spent_on: string };

// Minimal typing for the browser speech recognition API.
type SpeechResultEvent = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

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

  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);

  useEffect(() => {
    setSupported(Boolean(getRecognition()));
    return () => recognitionRef.current?.stop();
  }, []);

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = getRecognition();
    if (!recognition) {
      toast.error("Your browser can't record speech — type the note instead.");
      return;
    }

    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i]?.[0]?.transcript ?? "";
      }
      setText(transcript.trim());
    };
    recognition.onerror = (event) => {
      setListening(false);
      toast.error(
        event.error === "not-allowed"
          ? "Microphone access was blocked. Allow it in your browser settings."
          : "Couldn't hear that. Try again or type the note.",
      );
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  async function handleParse() {
    const note = text.trim();
    if (note.length < 3) {
      toast.error("Say or type what you spent first.");
      return;
    }
    setParsing(true);
    try {
      const result = await parse({ data: { text: note } });
      if (!result.items.length) {
        toast.error("No expense found in that note. Mention the item and the amount.");
      } else {
        setDrafts(result.items);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setParsing(false);
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
      setText("");
      queryClient.invalidateQueries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  function updateDraft(index: number, patch: Partial<Draft>) {
    setDrafts((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Voice notes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tap the mic and talk normally — “I spent 50 rupees for food yesterday”. The amount and
            the date are understood and filed on the right day.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-6">
          <button
            type="button"
            onClick={toggleListening}
            aria-label={listening ? "Stop recording" : "Start recording"}
            className={`flex size-20 items-center justify-center rounded-full transition-transform active:scale-95 ${
              listening
                ? "animate-pulse bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {listening ? <MicOff className="size-8" /> : <Mic className="size-8" />}
          </button>
          <p className="text-xs text-muted-foreground">
            {listening
              ? "Listening… speak now"
              : supported
                ? "Tap to speak"
                : "Speech isn't supported here — type the note below"}
          </p>
        </div>

        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={3}
          placeholder="I spent 250 rupees on groceries yesterday and 60 on tea today"
          className="rounded-xl bg-secondary"
        />

        <Button
          onClick={handleParse}
          disabled={parsing}
          className="w-full rounded-xl font-semibold"
        >
          {parsing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          Read my note
        </Button>
      </section>

      {drafts.length > 0 && (
        <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold text-foreground">Check before saving</h2>
          <div className="space-y-3">
            {drafts.map((draft, index) => (
              <div key={index} className="space-y-2 rounded-2xl border border-border bg-secondary/40 p-3">
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

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-xl font-semibold"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Save {drafts.length} expense{drafts.length > 1 ? "s" : ""}
          </Button>
        </section>
      )}
    </div>
  );
}
