# PIKE_THEME_PRT.md

One prompt per commit, matching PIKE_THEME_TRD.md. All four commits ship in a single PR.

---PROMPT---

**Commit 1 — `pike_preferences` migration**

Goal: Create the migration for per-user theme preference storage.

Files: `supabase/migrations/0003_create_pike_preferences.sql`

Constraints: Columns: `user_id uuid references auth.users(id) primary key, theme text default 'brutalist', updated_at timestamptz default now()`. `theme` constrained via check constraint to `brutalist / warm / pop / sticky` only. Enable RLS and add a policy restricting all operations to rows where `user_id = auth.uid()`, following the exact same pattern established in the earlier auth/RLS commit for `modules`.

Verify: migration applies cleanly via `supabase migration list`; a test user can insert/select/update only their own row; inserting a `theme` value outside the four allowed values fails as expected.

---PROMPT---

**Commit 2 — Token definitions in `globals.css`**

Goal: Define all four themes' complete token sets and register them with Tailwind v4's `@theme` directive — no config file.

Files: `apps/dashboard/app/globals.css`

Constraints: Start with `@import "tailwindcss";` — do not use the deprecated `@tailwind base/components/utilities` v3 directives. Define plain CSS custom properties under `:root` (defaults = the Brutalist theme's values) and under `[data-theme="warm"]`, `[data-theme="pop"]`, `[data-theme="sticky"]` selectors, porting the exact hex/radius/border-width/shadow/clip-path values already validated in the four-theme HTML preview built earlier in this project. Inside a single `@theme` block, register Tailwind tokens by referencing these custom properties (e.g. `--color-surface: var(--pike-surface); --color-ink: var(--pike-ink); --color-border: var(--pike-border); --color-signal: var(--pike-signal); --color-alert: var(--pike-alert); --radius-token: var(--pike-radius); --shadow-token: var(--pike-shadow);`), using correct namespace prefixes (`--color-*`, `--radius-*`, `--shadow-*`) so Tailwind generates the matching utility classes (`bg-surface`, `text-ink`, `border-border`, `rounded-token`, `shadow-token`, etc.) automatically. Do not create or reference a `tailwind.config.js` anywhere.

Verify: create a temporary test element using `bg-surface text-ink border border-border rounded-token shadow-token` classes; confirm it renders correctly and its appearance changes correctly when a parent's `data-theme` attribute is switched between all four values in dev tools; confirm no `tailwind.config.js` file exists in the repo.

---PROMPT---

**Commit 3 — Base UI primitives**

Goal: Build `Button`, `Card`, and `StatusTag` as the shared primitives every future module will use, styled entirely through the tokens from Commit 2.

Files: `apps/dashboard/components/ui/Button.tsx`, `apps/dashboard/components/ui/Card.tsx`, `apps/dashboard/components/ui/StatusTag.tsx`

Constraints: Use only the Tailwind utilities generated from Commit 2's `@theme` tokens — no hardcoded hex colors, no Tailwind arbitrary-value classes like `bg-[#...]`, anywhere in these three files. `Button` supports at least a default and outline variant, matching the preview's button treatments. `Card` is a simple bordered/surfaced container matching the preview's card structure. `StatusTag` takes a `variant` prop (`'live' | 'urgent' | 'neutral'`) mapping to signal/alert/ink tokens respectively, and should visually match the preview's tag behavior per theme (diagonal-cut clip on Brutalist, soft pill on Warm, solid-fill offset-shadow on Brutalist+, rotated sticky-note style on Sticky) purely through CSS driven by the active `data-theme`, not through conditional logic inside the component based on a theme prop.

Verify: build a temporary test page rendering all three components under each of the four `data-theme` values (toggle via a wrapper div's attribute); visually confirm each matches the corresponding look from the HTML preview; confirm zero if/else or switch statements branching on theme exist inside any of the three component files.

---PROMPT---

**Commit 4 — Theme switcher and persistence**

Goal: Let the user change themes from the UI, persist the choice per user, and apply it on load without a flash of the wrong theme.

Files: `apps/dashboard/app/layout.tsx`, `apps/dashboard/components/ThemeSwitcher.tsx`

Constraints: `layout.tsx` remains (or becomes) a Server Component. It reads the current authenticated user's `pike_preferences.theme` using the server-side Supabase client (from the earlier auth commit), defaulting to `'brutalist'` if no row exists yet, and sets `data-theme={theme}` directly on the `<html>` element so the correct theme is present in the initial server-rendered HTML — this is required to avoid a flash of the default theme before any client JS runs. `ThemeSwitcher` is a Client Component (dropdown or button group, matching the preview's switcher UI) that: updates the `data-theme` attribute on `document.documentElement` immediately on click for instant visual feedback, then calls a Route Handler (`apps/dashboard/app/api/preferences/route.ts` or similar) to persist the new value to `pike_preferences` for the authenticated user.

Verify: switching themes updates the entire UI instantly with no page reload; hard-refreshing the page shows the previously selected theme immediately with no visible flash of a different theme; logging in from a different browser/session shows the same persisted theme correctly.

---PROMPT---
