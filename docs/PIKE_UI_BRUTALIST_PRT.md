# PIKE_UI_BRUTALIST_PRT.md


UI refinement sweep for the Brutalist theme only, across Dashboard, Jobs, Study, and Hackathons. Content is explicitly excluded — its review queue has no real draft data yet to design against. One PR, five commits.

---PROMPT---

**Commit 1 — Shared dropdown and nav restructure**

Goal: Replace the native `<select>` used throughout the app with a themed custom dropdown component, restructure the header nav layout for desktop and mobile, redesign the theme switcher as swatch circles, and remove the header's stray white border.

Files: `apps/dashboard/components/ui/Dropdown.tsx` (new), `apps/dashboard/components/ThemeSwitcher.tsx` (rework), `apps/dashboard/components/layout/Header.tsx` (or wherever the current nav lives — locate it first).

Constraints: `Dropdown` is a fully custom component (button trigger + positioned option list, not a native `<select>`), styled entirely through existing theme tokens (`bg-surface`, `border-border`, `text-ink`, `rounded-token`), reusable across Jobs status, Hackathons status, Study status, and the theme switcher. Desktop header layout: `Pike` logo left, nav links centered, theme switcher + sign-out right, in one row, no wrapping. Mobile: logo + hamburger icon only in the visible bar; nav links move into a slide-out/drawer menu triggered by the hamburger, not stacked inline. Theme switcher becomes four small circles (one per theme: brutalist, warm, pop, sticky), each showing that theme's dominant/signal color, with a tooltip on hover showing the theme name and a visible ring/outline on whichever circle matches the currently active theme. Remove the header's current white bottom border entirely.

Verify: on a desktop viewport, the header shows all three sections in one row with no wrapping; on a mobile viewport, only the logo and hamburger are visible in the bar, and tapping the hamburger reveals nav links in a drawer; every dropdown in the app (Jobs status, Hackathons status, Study status, theme switcher) renders as the new custom component, no native `<select>` remains anywhere; the theme switcher shows four circles with working hover tooltips and a visible active-state ring; the header has no white border.

---PROMPT---

**Commit 2 — Dashboard home overhaul**

Goal: Replace the static "Planned" feature cards with real live status pulled from the `modules` registry and each module's own data, since all four modules now have real functionality and data.

Files: `apps/dashboard/app/page.tsx`, `apps/dashboard/components/dashboard/ModuleCard.tsx` (new or reworked).

Constraints: For each module (Jobs, Study, Hackathons, Content), replace the hardcoded "PLANNED" badge with a real status derived from that module's `modules.last_run_at` — e.g. "Live" if run within the expected cadence window, "Idle" if overdue, "Never run" if `last_run_at` is null. Each card should also surface one real, module-specific number pulled from that module's own table (e.g. Jobs: count of non-closed listings; Study: topics completed today or current streak; Hackathons: count of tracked entries with upcoming deadlines; Content: count of drafts needing review). No quick-link buttons to each module's page are needed on these cards — the header nav already covers navigation. Keep the existing "View module registry" link to `/settings` as-is.

Verify: each card shows a real status label reflecting that module's actual `last_run_at`, and a real number reflecting that module's actual current data — not a hardcoded placeholder; visiting the page immediately after a module's workflow runs shows an updated status without needing a code change.

---PROMPT---

**Commit 3 — Jobs table refinements**

Goal: Add pagination, sorting, filtering, an inline follow-up date picker, colored status states, and a mobile sticky first column to the Jobs table.

Files: `apps/dashboard/app/jobs/page.tsx`, `apps/dashboard/components/jobs/JobRow.tsx`, `apps/dashboard/components/jobs/JobsTable.tsx` (new, if the table logic should be extracted).

Constraints: Add pagination (25 or 50 rows per page, your call, consistent with whatever pattern is simplest given the existing data-fetching setup) rather than rendering the full unbounded list. Add sortable column headers for Found date, Company, and Status. Add filter controls for Status, Source, and an "overdue follow-up" toggle. The Status dropdown (using Commit 1's shared `Dropdown`) should visually reflect its selected value's color state — reuse the same status-color tokens already defined for the status system, applied to the dropdown trigger itself, not just a separate badge. The Follow-up cell becomes clickable, opening an inline date picker that writes to `follow_up_at` on selection, matching the existing mutation pattern used by the Status dropdown. On mobile viewports, the Role/title column stays fixed/visible while Source, Found, Follow-up, and Status scroll horizontally beneath it.

Verify: table shows a bounded page of rows with working next/previous controls; clicking a sortable header re-orders correctly; applying a filter narrows the visible rows correctly; the status dropdown trigger shows the correct color per selected status; clicking the Follow-up cell opens a date picker and saves the chosen date; on a mobile-width viewport, scrolling the table horizontally keeps the Role column pinned in place.

---PROMPT---

**Commit 4 — Study refinements**

Goal: Apply the shared dropdown and status colors to Study, and turn per-section progress into an expandable accordion showing individual topics.

Files: `apps/dashboard/app/study/page.tsx`, `apps/dashboard/components/study/TopicCard.tsx`, `apps/dashboard/components/study/ProgressBar.tsx` (or wherever per-section progress currently renders).

Constraints: Replace the current status `<select>` on the topic card with Commit 1's shared `Dropdown`, with the trigger reflecting the selected status's color (not_started/in_progress/done mapped to existing tokens). The status badge shown near the topic title should use the same color mapping. Each row in the per-section progress list becomes an accordion header — clicking it expands to show every topic in that section with its individual status (read-only in this view, no editing here), using data already available from the existing curriculum/progress query rather than a new fetch.

Verify: the status dropdown on the topic card is the new custom component and visibly changes color per selected status; clicking a section row in per-section progress expands to list its topics with correct individual statuses, and collapses again on a second click.

---PROMPT---

**Commit 5 — Hackathons refinements**

Goal: Apply the same table refinements built for Jobs in Commit 3 to Hackathons, plus add the missing urgent-deadline visual flag.

Files: `apps/dashboard/app/hackathons/page.tsx`, `apps/dashboard/components/hackathons/HackathonRow.tsx`, `apps/dashboard/components/hackathons/HackathonsTable.tsx` (new, if extracted).

Constraints: Apply pagination, sorting (by Deadline, Prize, Status), filtering (Status, and a "deadline within 3 days" toggle), the shared colored `Dropdown` for Status, and the mobile sticky-first-column pattern — matching Commit 3's Jobs implementation exactly rather than reimplementing independently. Additionally, any row where `deadline` falls within 3 days of today gets the same urgent visual treatment already used for Jobs' overdue follow-ups (same alert token, same visual pattern), which was originally specified but not yet implemented.

Verify: table behavior (pagination, sorting, filtering, colored status dropdown, mobile sticky column) matches Jobs' Commit 3 implementation; a test entry with a deadline set to within 3 days visibly shows the urgent treatment, and one further out does not.

---PROMPT---
