"use client";

import { useState } from "react";
import { themes, type Theme } from "@/lib/theme";

const labels: Record<Theme, string> = {
  brutalist: "Brutalist",
  warm: "Warm",
  pop: "Brutalist+",
  sticky: "Sticky",
};

export function ThemeSwitcher({ initialTheme }: { initialTheme: Theme }) {
  const [theme, setTheme] = useState(initialTheme);
  const [error, setError] = useState(false);

  async function updateTheme(nextTheme: Theme) {
    const previousTheme = theme;
    setTheme(nextTheme);
    setError(false);
    document.documentElement.dataset.theme = nextTheme;

    const response = await fetch("/api/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: nextTheme }),
    });

    if (!response.ok) {
      setTheme(previousTheme);
      setError(true);
      document.documentElement.dataset.theme = previousTheme;
    }
  }

  return (
    <div className="flex items-center gap-2">
      <label className="font-mono text-xs uppercase text-muted" htmlFor="theme">
        Theme
      </label>
      <select
        aria-invalid={error}
        className="pike-border rounded-token border-border bg-surface px-2 py-1.5 font-mono text-xs font-bold uppercase text-ink outline-none focus:border-signal"
        id="theme"
        onChange={(event) => updateTheme(event.target.value as Theme)}
        value={theme}
      >
        {themes.map((value) => (
          <option key={value} value={value}>
            {labels[value]}
          </option>
        ))}
      </select>
      {error ? (
        <span className="font-mono text-xs text-alert">Save failed</span>
      ) : null}
    </div>
  );
}
