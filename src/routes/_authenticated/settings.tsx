import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Mail, Database, Smartphone } from "lucide-react";
import { getProfile, sendReportNow, updateProfile } from "@/lib/expenses.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Prakash Expense Tracker" },
      {
        name: "description",
        content: "Choose where your 9 PM daily spending report is emailed and manage your profile.",
      },
      { property: "og:title", content: "Settings" },
      {
        property: "og:description",
        content: "Manage your daily 9 PM email report and profile details.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const fetchProfile = useServerFn(getProfile);
  const save = useServerFn(updateProfile);
  const sendNow = useServerFn(sendReportNow);

  const { data: profile, isPending } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? "");
    setEmail(profile.report_email ?? "");
    setEnabled(profile.daily_report_enabled ?? true);
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: () =>
      save({
        data: {
          display_name: name.trim() || "Prakash",
          report_email: email.trim(),
          daily_report_enabled: enabled,
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Settings saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const testMutation = useMutation({
    mutationFn: (period: "daily" | "weekly" | "monthly") => sendNow({ data: { period } }),
    onSuccess: () => toast.success(`Report sent to ${email}`),
    onError: (error: Error) => toast.error(error.message),
  });


  if (isPending) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-5 rounded-3xl border border-border bg-card p-6">
        <h1 className="text-lg font-semibold text-foreground">Daily report</h1>

        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-11 rounded-xl bg-secondary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Send the report to</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 rounded-xl bg-secondary"
          />
          <p className="text-xs text-muted-foreground">
            Delivered automatically every day at 9:00 PM IST from your connected Gmail account.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-secondary px-4 py-3">
          <div>
            <p className="text-sm font-medium text-foreground">Automatic 9 PM email</p>
            <p className="text-xs text-muted-foreground">Turn off to pause daily reports.</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="rounded-xl font-semibold"
          >
            {saveMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Save settings
          </Button>
          <Button
            variant="outline"
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            className="rounded-xl"
          >
            {testMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Mail className="size-4" />
            )}
            Send today's report now
          </Button>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
        <div className="flex items-start gap-3">
          <Database className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">Where your data lives</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Every expense is stored in your own private Postgres database on Lovable Cloud — not
              on your phone. Row-level security means only your signed-in account can read or write
              your rows, so the same data appears on every device you sign in from.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Smartphone className="mt-0.5 size-4 shrink-0 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">Add to your iPhone</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Open this link in Safari, tap the Share button, then choose “Add to Home Screen”. It
              installs like an App Store app with its own icon and full-screen dark UI.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
