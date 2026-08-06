# PIKE_STUDY_PRT.md

One prompt per commit, matching PIKE_STUDY_TRD.md. All six commits ship in a single PR.

---PROMPT---

**Commit 1 — `study_curriculum` and `study_progress` migrations**

Goal: Create migrations for the curriculum and progress tables.

Files: `supabase/migrations/0006_create_study_curriculum.sql`, `supabase/migrations/0007_create_study_progress.sql`, `apps/dashboard/lib/supabase/database.types.ts`

Constraints: `study_curriculum` is shared reference data with non-null `id, order_index, title, section, url`; use the path-derived text ID as its primary key and make `order_index` unique. Enable RLS with one select policy for authenticated users and no regular-user write policies. `study_progress` is owner-scoped with `user_id, topic_id, status, created_at, started_at, completed_at, notes`; use `(user_id, topic_id)` as its composite primary key, reference curriculum with `on delete restrict`, and apply the ownership policies from `PIKE_GAPS.md`. Default and constrain status to `not_started / in_progress / done`. Do not store `days_stuck`; consumers compute `date_part('day', now() - coalesce(started_at, created_at))`. Update the checked-in database types for both tables.

Verify: both migrations apply cleanly and in order via `supabase migration list`; authenticated users can read but not mutate curriculum; progress is owner-isolated; duplicate owner/topic progress and progress for a non-existent topic both fail.

---PROMPT---

**Commit 2 — Curriculum ingest script**

Goal: Fetch and parse the handbook's `sidebars.js`, flatten it into ordered rows, and upsert into `study_curriculum`, seeding matching `study_progress` rows on first run.

Files: `automations/study/ingest.js`, `automations/study/parseSidebar.js`

Constraints: Fetch from `https://raw.githubusercontent.com/yangshun/front-end-interview-handbook/main/website/sidebars.js`. Parse the `root` array preserving exact top-to-bottom order: standalone entries and category `items` arrays both flatten into the same sequence, company-specific pages included as trailing topics per the confirmed structure. Normalize upstream labels through a small explicit mapping to Introduction / Coding / Trivia / System Design / Behavioral / Resume / Company questions. Derive a stable ID from each doc slug/path and upsert curriculum on `id`. Recalculate active `order_index` values on each ingest to match current upstream order, using a collision-safe strategy because the column is unique; progress remains attached by topic ID. Keep ingest upsert-only by retaining topics removed upstream after the active sequence. For `PIKE_OWNER_USER_ID`, create only missing progress rows with `status = not_started` and never overwrite existing progress.

Verify: first run populates roughly 42 curriculum rows in confirmed handbook order; a second run produces no duplicates or progress changes; upstream reordering updates curriculum order without losing progress.

---PROMPT---

**Commit 3 — Ingest workflow**

Goal: Schedule the curriculum ingest to catch upstream handbook updates.

Files: `.github/workflows/study-ingest.yml`

Constraints: Monthly cron schedule plus `workflow_dispatch`. On completion, update the `study` row's `last_run_at` in `modules`, reusing the exact update pattern from `jobs-scrape.yml`.

Verify: manual trigger against current handbook state is a no-op (no new/changed rows); `modules.study.last_run_at` updates correctly after the run.

---PROMPT---

**Commit 4 — Daily accountability check and notification**

Goal: Build the daily check that determines "today's topic" from actual progress state (not the calendar date) and sends a notification that reflects reality rather than assuming advancement.

Files: `.github/workflows/study-daily.yml`, `automations/study/dailyCheck.js`, `automations/study/notify.js`

Constraints: for `PIKE_OWNER_USER_ID`, `dailyCheck.js` joins progress to curriculum and finds the lowest `order_index` where status is not `done`; this is the current topic regardless of date. This current-topic invariant is documented in `PIKE_STUDY_TRD.md` and is implemented independently in the automation and dashboard. Compute days stuck with `date_part('day', now() - coalesce(started_at, created_at))`; do not persist a counter. Build a message via `automations/lib/notify.js` containing only the current topic title + URL and days stuck when greater than zero. Daily cron plus `workflow_dispatch`.

Verify: leave a topic `in_progress` and confirm later runs repeat it with live-computed days stuck; multiple runs on one day return the same value. Mark it `done` and confirm the next topic is reported.

---PROMPT---

**Commit 5 — `/study` dashboard route**

Goal: Build the Study tab — today's topic card with status toggle and notes, overall and per-section progress bar, and a streak counter.

Files: `apps/dashboard/app/study/page.tsx`, `apps/dashboard/components/study/TopicCard.tsx`, `apps/dashboard/components/study/ProgressBar.tsx`

Constraints: `TopicCard` independently implements the documented current-topic invariant: the owner's lowest-order topic not marked `done`. Status writes follow the Jobs mutation pattern. Moving to `in_progress` sets `started_at = now()` if null; moving to `done` sets `completed_at = now()`; moving backward from `done` clears `completed_at`; moving to `not_started` clears both. Notes save on blur. Compute days stuck on read from `started_at` or `created_at`. `ProgressBar` computes overall completion and the canonical Introduction / Coding / Trivia / System Design / Behavioral / Resume / Company questions breakdown. Compute streaks from consecutive UTC dates with at least one completion; do not store a counter or convert to local time.

Verify: marking the current topic `done` updates the card to show the next topic, updates the progress bar and streak, and persists correctly after a page reload; notes entered and left (blurred) are saved and reappear on reload.

---PROMPT---

**Commit 6 — History view**

Goal: Build a read-only log of completed topics with their notes.

Files: `apps/dashboard/app/study/history/page.tsx`

Constraints: Query `study_progress` where `status = 'done'`, joined to `study_curriculum` for title/section, ordered by `completed_at` descending. Display title, section, completion date, and notes per row. No editing controls on this view.

Verify: completing topics via the `/study` route causes them to appear here in the correct order with matching notes; the view has no write actions.

---PROMPT---
