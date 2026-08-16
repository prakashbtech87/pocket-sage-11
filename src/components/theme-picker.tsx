import { useEffect, useState } from "react";
import { Check, Palette } from "lucide-react";
import { THEMES, applyTheme, readStoredTheme, storeTheme, type ThemeId } from "@/lib/theme";

/** Small hook so any screen can read/set the active theme. */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemeId>("default");

  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  function setTheme(next: ThemeId) {
    setThemeState(next);
    storeTheme(next);
    applyTheme(next);
  }

  return { theme, setTheme };
}

export function ThemePicker() {
  const { theme, setTheme } = useTheme();

  return (
    <section className="space-y-4 rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center gap-2">
        <Palette className="size-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Theme</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Pick how the app looks. Your choice is remembered on this device.
      </p>

      <div className="grid gap-2 sm:grid-cols-2">
        {THEMES.map((item) => {
          const active = item.id === theme;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTheme(item.id)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${
                active
                  ? "border-primary bg-secondary"
                  : "border-border bg-secondary/40 hover:bg-secondary"
              }`}
            >
              <span
                className="size-6 shrink-0 rounded-full border border-border"
                style={{ background: item.swatch }}
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">{item.label} theme</span>
                <span className="block text-xs text-muted-foreground">{item.hint}</span>
              </span>
              {active && <Check className="size-4 shrink-0 text-primary" />}
            </button>
          );
        })}
      </div>
    </section>
  );
}
