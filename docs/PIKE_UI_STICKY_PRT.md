# PIKE_UI_STICKY_PRT.md

Sticky theme fixes surfaced during review. One PR, three commits.

---PROMPT---

**Commit 1 — Fix Sticky card and badge color cycling**

Goal: Under Sticky theme, cards and status badges currently render in a single color (yellow for cards, blue for badges) regardless of position or state, instead of cycling through the theme's full accent palette. Root cause: the original color assignment relied on CSS structural selectors (`nth-of-type`/`nth-child`), which don't reliably apply inside real React component trees the way they did in the static HTML preview. Fix this at the shared component level so every screen using `Card` benefits automatically, not just the screens already reviewed.

Files: `apps/dashboard/app/globals.css` (Sticky theme's `@theme` token block), `apps/dashboard/components/ui/Card.tsx`, `apps/dashboard/components/ui/StatusTag.tsx`.

Constraints: Add a fourth Sticky accent token (`--pike-accent-4`, a warm lemon/orange) alongside the existing yellow/pink/blue three, so Sticky has four accent colors total. `Card` should accept an explicit index (prop or computed from a passed `index` value in whatever list renders it) and, under Sticky theme specifically, assign its background by cycling through all four accent tokens via `index % 4` — implemented in JS/inline style or a data attribute driving CSS, not CSS structural selectors. Remove any remaining `nth-of-type`/`nth-child` color rules for cards in the Sticky theme block. `StatusTag` must derive its color strictly from its `variant` prop (`live`/`urgent`/`neutral` mapped to signal/alert/muted tokens) — this mapping must work correctly and consistently under Sticky, matching its existing correct behavior on Brutalist, Warm, and Brutalist+. Note that badges sharing a status (e.g. multiple "Not Started" items) correctly showing the same color is expected behavior, not a bug — only mismatched variant-to-color mapping is the actual defect.

Verify: any screen rendering multiple `Card` components under Sticky (Dashboard home, Settings/Modules, Study's topic and per-section cards) shows all four accent colors cycling correctly across the visible cards, not just yellow; a `StatusTag` with `variant="live"` shows the signal color and `variant="urgent"` shows the alert color under Sticky, matching the mapping already correct on the other three themes; confirm no regression to color mapping on Brutalist, Warm, or Brutalist+.

---PROMPT---

**Commit 2 — Card-grid presentation for Jobs and Hackathons under Sticky**

Goal: The Jobs and Hackathons table layout doesn't fit Sticky's visual language — a rigid table colored yellow reads as "a yellow table," not as sticky notes. Replace the table presentation with a card grid under Sticky specifically, while keeping the underlying data/logic layer (fetching, sorting, filtering, pagination, mutations) fully shared across all themes.

Files: `apps/dashboard/components/jobs/JobsTable.tsx`, `apps/dashboard/components/jobs/JobsCardGrid.tsx` (new), `apps/dashboard/components/hackathons/HackathonsTable.tsx`, `apps/dashboard/components/hackathons/HackathonsCardGrid.tsx` (new).

Constraints: Extract or confirm the existing data/logic (fetch, sort, filter, paginate, status mutation, follow-up date mutation) is already decoupled from the table's presentation layer; if not, refactor so both `JobsTable` and the new `JobsCardGrid` consume the same hook/logic rather than duplicating it. `JobsCardGrid` renders each listing as an individual `Card` (using Commit 1's index-based color cycling), showing role, company, source, found date, follow-up (with the existing inline date-picker interaction preserved), and the colored status `Dropdown` — same interactions as the table version, different layout. Apply the same pattern to `HackathonsCardGrid`. The theme-based choice between table and card-grid presentation should be made once per page (checking active theme), not scattered as conditionals inside shared row-level components. Under Brutalist, Warm, and Brutalist+, the existing table presentation remains unchanged.

Verify: under Sticky theme, Jobs and Hackathons both render as a grid of individual colored cards, not a table; all existing interactions (status change, follow-up date picker, sorting, filtering, pagination) still work correctly from within the card grid; switching to any other theme shows the original unchanged table layout; confirm no duplicated data-fetching logic exists between the table and card-grid versions.

---PROMPT---

**Commit 3 — Consistent sticky-note card shape for Settings/Modules on desktop**

Goal: The Settings/Modules module registry already renders as proper sticky-note-style cards on mobile viewports under Sticky theme, but falls back to full-width rectangular bars on desktop. Apply the same card treatment consistently across viewport sizes.

Files: `apps/dashboard/app/settings/page.tsx` (or wherever the module registry list renders), the component responsible for each module's status card.

Constraints: Identify why the mobile breakpoint already produces the correct sticky-note card shape (rotation, folded corner, contained width) while desktop does not — likely a responsive layout rule scoping the card treatment to a mobile-only breakpoint rather than applying it universally under Sticky. Remove that scoping so the same card shape and sizing (not full-width rectangles) applies at all viewport widths under Sticky theme, using Commit 1's color-cycling fix for each module's card color.

Verify: on a desktop viewport under Sticky theme, the module registry renders as individual sized sticky-note cards (matching the existing mobile appearance), not full-width bars; mobile appearance remains unchanged; other themes' Settings/Modules layout is unaffected.

---PROMPT---
