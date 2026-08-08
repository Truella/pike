"use client";

import { useState } from "react";
import { themes, type Theme } from "@/lib/theme";

const themeColors: Record<Theme, string> = {
  brutalist: "#FF5500", // signal color for brutalist
  warm: "#D97706",      // amber signal color for warm
  pop: "#EC4899",       // pink signal color for pop
  sticky: "#EAB308",    // yellow signal color for sticky
};

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
      <span className="font-mono text-xs uppercase text-muted">Theme</span>
      <div className="flex items-center gap-2">
        {themes.map((t) => (
          <button
            key={t}
            type="button"
            title={labels[t]}
            aria-label={`Switch theme to ${labels[t]}`}
            onClick={() => updateTheme(t)}
            style={{ backgroundColor: themeColors[t] }}
            className={`h-4 w-4 rounded-full transition-transform hover:scale-110 focus:outline-none ${
              theme === t ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : "opacity-80 hover:opacity-100"
            }`}
          />
        ))}
      </div>
      {error ? (
        <span className="font-mono text-xs text-alert">Save failed</span>
      ) : null}
    </div>
  );
}
