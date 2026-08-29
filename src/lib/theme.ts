export const THEMES = [
  { id: "default", label: "Charcoal", hint: "Charcoal + amber", swatch: "#f0b429" },
  { id: "dark", label: "Dark", hint: "Pure black & white", swatch: "#e6e6e6" },
  { id: "blue", label: "Dark blue", hint: "Deep navy + azure (default)", swatch: "#4b8ef7" },
  { id: "red", label: "Red", hint: "Warm crimson", swatch: "#e2503f" },
  { id: "light", label: "Light", hint: "Bright daylight", swatch: "#f5f1e8" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const THEME_STORAGE_KEY = "pet-theme";

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

/** Applies the theme classes to <html>. Safe to call only in the browser. */
export function applyTheme(theme: ThemeId) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  for (const item of THEMES) root.classList.remove(`theme-${item.id}`);
  root.classList.add(`theme-${theme}`);
  root.classList.toggle("dark", theme !== "light");
}

export function readStoredTheme(): ThemeId {
  if (typeof window === "undefined") return "blue";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeId(stored) ? stored : "blue";
}

export function storeTheme(theme: ThemeId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}
