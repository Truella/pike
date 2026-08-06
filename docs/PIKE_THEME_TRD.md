# PIKE_THEME_TRD.md

## Scope

Establishes the full design token system and theme-switching mechanism across all four locked themes (Brutalist, Warm, Brutalist+, Sticky), plus the base UI primitives every future module builds on. One self-contained PR, slotted in immediately after PIKE_SETUP and before PIKE_JOBS, so every module from Jobs onward is theme-ready from its first commit rather than needing retrofitting later.

Built against **Tailwind CSS v4's CSS-first configuration** — there is no `tailwind.config.js` in this project. All design tokens live in `globals.css` via the `@theme` directive, which generates utility classes automatically from CSS custom property names. `@theme` variables become real CSS custom properties on `:root`, so runtime theme switching works by pointing those variables at values defined under `[data-theme="..."]` selectors — the exact mechanism already validated in the four-theme HTML preview.

## Conventions

Follows PIKE_SETUP conventions: migrations for schema, workflows/routes isolated per concern. No config file conventions apply here since v4 has none — `globals.css` is the single source of truth for tokens.

---

## PR — Theme System

### Commit 1 — `pike_preferences` migration

**Achieves**: per-user storage for the active theme choice, following the same `user_id` + RLS pattern established in the auth commit.

**Files**: `supabase/migrations/0003_create_pike_preferences.sql`

**Covers**: `user_id uuid references auth.users(id) primary key, theme text default 'brutalist', updated_at timestamptz default now()`. `theme` constrained to the four locked values (`brutalist / warm / pop / sticky`). RLS enabled, policy scoped to `user_id = auth.uid()`, matching the pattern documented in the auth commit.

**Verify**: migration applies cleanly; a user can only read/write their own preference row; inserting an invalid `theme` value fails the check constraint.

---

### Commit 2 — Token definitions in `globals.css`

**Achieves**: all four themes' full token sets (color, radius, border-width, shadow, font) defined and registered with Tailwind via `@theme`, ported directly from the validated HTML preview.

**Files**: `apps/dashboard/app/globals.css`

**Constraints**: `@import "tailwindcss";` at the top, no `@tailwind base/components/utilities` directives (that's the deprecated v3 syntax). Define semantic custom properties under `:root` (default = brutalist) and each `[data-theme="warm"]`, `[data-theme="pop"]`, `[data-theme="sticky"]` block, exactly matching the hex/shape values already locked in the preview file. Register these as Tailwind tokens inside a single `@theme` block using the correct namespace prefixes so utilities generate correctly: `--color-*` for bg/text/border utilities, `--radius-*` for `rounded-*`, `--shadow-*` for `shadow-*`. Reference the `:root`-level custom properties from within `@theme` (e.g. `--color-surface: var(--pike-surface)`) rather than hardcoding values twice, so the same token name resolves differently per active theme without regenerating CSS. Do not create a `tailwind.config.js` — if any tooling or tutorial output suggests one, that's outdated v3 guidance and should be ignored.

**Verify**: applying `bg-surface`, `text-ink`, `border-border`, `rounded-token`, `shadow-token` utility classes in a throwaway test element renders correctly and changes appearance when `data-theme` on a parent element is switched between all four values, with no `tailwind.config.js` present anywhere in the repo.

---

### Commit 3 — Base UI primitives

**Achieves**: `Button`, `Card`, and `StatusTag` components built once against the token system, so every future module reuses these rather than styling from scratch.

**Files**: `apps/dashboard/components/ui/Button.tsx`, `apps/dashboard/components/ui/Card.tsx`, `apps/dashboard/components/ui/StatusTag.tsx`

**Constraints**: every style decision in these components uses the Tailwind utilities generated from Commit 2's tokens (`bg-surface`, `border-ink`, `shadow-token`, etc.) — no hardcoded hex values or one-off Tailwind arbitrary values (`bg-[#...]`) anywhere. `StatusTag` accepts a `variant` prop (`live / urgent / neutral`) mapping to the signal/alert/ink color tokens, matching the tag behavior already proven in the preview (diagonal clip on Brutalist, pill on Warm, filled on Brutalist+, rotated sticky-note style on Sticky — achieved via the same token-driven CSS, not per-component theme conditionals).

**Verify**: rendering each component under all four `data-theme` values (via a temporary test page) produces visually correct results matching the HTML preview's look for each theme, with zero component-level theme-specific code branches — only token values change.

---

### Commit 4 — Theme switcher and persistence

**Achieves**: user can change themes from the dashboard, choice persists across sessions/devices via `pike_preferences`, and the correct theme applies on page load without a flash of the wrong theme.

**Files**: `apps/dashboard/app/layout.tsx` (root layout, Server Component), `apps/dashboard/components/ThemeSwitcher.tsx` (Client Component)

**Constraints**: root layout is a Server Component that reads the authenticated user's `pike_preferences.theme` (via the server Supabase client from the auth commit) and sets `data-theme` directly on the `<html>` element in the initial server-rendered HTML — this avoids a flash of the default theme before client JS runs. `ThemeSwitcher` is a small client component (dropdown or button group, matching the preview's switcher UI) that updates `data-theme` on the client immediately for instant feedback, then writes the new value to `pike_preferences` via a Route Handler using the authenticated session. Default to `brutalist` for a user with no preference row yet.

**Verify**: switching themes updates the UI instantly with no page reload; refreshing the page or logging in from a different browser session shows the correct persisted theme with no visible flash of a different theme first.

---

## Definition of done

All four commits merged in one PR. Every one of the four locked themes renders correctly across the base primitives with zero component-level theme branching — only CSS custom property values differ per theme. Theme choice persists per user via Supabase and applies without flash on load. No `tailwind.config.js` exists anywhere in the repo — all token configuration lives in `globals.css` per Tailwind v4's CSS-first convention. Every module built after this PR (Jobs, Study, Hackathons, Content) consumes `Button`, `Card`, and `StatusTag` rather than styling components independently.
