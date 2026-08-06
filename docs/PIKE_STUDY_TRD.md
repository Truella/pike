# PIKE_STUDY_TRD.md

## Scope

Module 3: FE Interview Study Automation, per the PRD. One self-contained PR, ships independently of Jobs and Hackathons. Builds on PIKE_SETUP (migrations tooling, dashboard shell, Actions pipeline, `modules` registry) and reuses the shared `automations/lib/notify.js` utility introduced in PIKE_JOBS.

Source of truth: `yangshun/front-end-interview-handbook`, `website/sidebars.js` (confirmed structure: nested categories, ordered `items` arrays, ~42 topics flattened top to bottom, company-specific pages included as trailing daily topics).

## Conventions

Follows PIKE_SETUP and PIKE_GAPS conventions: migrations for all schema, module tables prefixed `study_`, module workflows isolated in their own files, module route isolated under `/apps/dashboard/app/study`. `study_curriculum` is shared, service-role-managed reference data; `study_progress` is owner-scoped data protected by RLS.

The current-topic invariant is: for the authenticated owner, select the curriculum topic with the lowest `order_index` whose progress status is not `done`. The automation and dashboard implement this query independently and must preserve this invariant.

---

## PR — Module 3: FE Interview Study Automation

### Commit 1 — `study_curriculum` and `study_progress` migrations

**Achieves**: schema for the flattened curriculum and per-topic progress tracking.

**Files**: `supabase/migrations/0006_create_study_curriculum.sql`, `supabase/migrations/0007_create_study_progress.sql`, `apps/dashboard/lib/supabase/database.types.ts`

**Covers**:
- `study_curriculum`: shared reference data with non-null `id, order_index, title, section, url`; `id` is the stable upstream doc path/slug and `order_index` is unique. RLS permits authenticated reads only; regular users cannot insert, update, or delete curriculum rows.
- `study_progress`: owner-scoped `user_id, topic_id, status, created_at, started_at, completed_at, notes`. `(user_id, topic_id)` is the composite primary key. `topic_id` references `study_curriculum.id` with `on delete restrict`; `status` defaults to `not_started` and is constrained to `not_started / in_progress / done`. Operation-specific RLS policies enforce ownership.
- `days_stuck` is not stored. Consumers compute it from `date_part('day', now() - coalesce(started_at, created_at))` so repeated runs on one day cannot inflate a counter.

**Verify**: both migrations apply cleanly in order; authenticated users can read but not mutate curriculum; progress RLS prevents cross-user access; duplicate progress for one owner/topic fails; and inserting progress for a non-existent topic fails.

---

### Commit 2 — Curriculum ingest script

**Achieves**: parses `sidebars.js` from the handbook repo, flattens the nested category structure into ordered rows, upserts into `study_curriculum`.

**Files**: `automations/study/ingest.js`, `automations/study/parseSidebar.js`

**Constraints**: fetch `sidebars.js` directly from the handbook's raw GitHub content (confirmed reachable at `raw.githubusercontent.com/yangshun/front-end-interview-handbook/main/website/sidebars.js`). Flatten top to bottom exactly as confirmed: `root` array order preserved, category items expanded inline, company-specific pages included as trailing topics. Normalize upstream category labels to the canonical sections Introduction / Coding / Trivia / System Design / Behavioral / Resume / Company questions through a small explicit mapping object. Derive a stable `id` from each doc path/slug and upsert curriculum on `id`. Recalculate every active topic's `order_index` from the latest flattened position on every run so upstream reordering is reflected without losing progress, which remains keyed by topic ID. Because `order_index` is unique, apply reordered indexes with a collision-safe strategy rather than directly swapping occupied values. Ingest remains upsert-only: retain topics removed upstream after the active sequence instead of deleting rows or history. Seed missing `study_progress` rows for `PIKE_OWNER_USER_ID` with `status = not_started`; never duplicate or overwrite existing progress.

**Verify**: running the script populates `study_curriculum` with ~42 rows in the confirmed order; spot-check that `order_index` matches the handbook's actual sidebar sequence; running it twice does not duplicate rows or alter progress; an upstream reorder updates `order_index` while retaining progress by topic ID.

---

### Commit 3 — Ingest workflow

**Achieves**: scheduled + manual re-sync of the curriculum in case the handbook adds new content.

**Files**: `.github/workflows/study-ingest.yml`

**Constraints**: monthly schedule (confirmed sufficient given the source's actual update cadence), plus `workflow_dispatch`. Updates the `study` row in `modules` (`last_run_at`) on completion, same pattern as `jobs-scrape.yml`.

**Verify**: manual trigger runs cleanly against a repo with no new content (no duplicate rows or progress changes) and reflects new or reordered upstream content without losing topic progress.

---

### Commit 4 — Daily accountability check and notification

**Achieves**: the core accountability mechanic: a daily notification that repeats the current topic until it is done.

**Files**: `.github/workflows/study-daily.yml`, `automations/study/dailyCheck.js`, `automations/study/notify.js`

**Constraints**: for `PIKE_OWNER_USER_ID`, the script applies the current-topic invariant: find the lowest `order_index` topic where progress status is not `done`, regardless of the calendar date. Do not auto-advance based on date alone. Compute days stuck on read with `date_part('day', now() - coalesce(started_at, created_at))`; never persist or increment a counter. The notification, sent through `automations/lib/notify.js`, reports only the current topic title + link and its days-stuck value when greater than zero. Daily schedule plus `workflow_dispatch` for testing.

**Verify**: with a topic manually left `in_progress`, next day's workflow run repeats that same topic with the computed days-stuck value; multiple runs on one day return the same value. Marking it `done` via the dashboard causes the next run to surface the following topic.

---

### Commit 5 — `/study` dashboard route

**Achieves**: today's topic card with status toggle and notes, progress bar, streak counter.

**Files**: `apps/dashboard/app/study/page.tsx`, `apps/dashboard/components/study/TopicCard.tsx`, `apps/dashboard/components/study/ProgressBar.tsx`

**Constraints**: the dashboard independently applies the documented current-topic invariant. Status changes write immediately using the Jobs mutation pattern. Moving to `in_progress` sets `started_at = now()` only when it is null; moving to `done` sets `completed_at = now()`; moving backward from `done` clears `completed_at`; moving to `not_started` clears both timestamps. Notes are saved on textarea blur, not every keystroke. Compute days stuck on read with `date_part('day', now() - coalesce(started_at, created_at))`. Progress shows overall completion and the canonical per-section breakdown (Introduction / Coding / Trivia / System Design / Behavioral / Resume / Company questions). Derive streaks from consecutive UTC calendar dates containing at least one `completed_at`; do not store a streak counter or apply local-time conversion.

**Verify**: marking a topic done updates its status, advances what the next daily check considers "today's topic," and updates the progress bar; notes persist across page reloads.

---

### Commit 6 — History view

**Achieves**: scrollable log of completed topics with notes, doubling as a pre-interview review reference.

**Files**: `apps/dashboard/app/study/history/page.tsx` (or a collapsible section within `/study` if simpler)

**Constraints**: lists only `done` topics, most recently completed first, showing title, section, completion date, and notes. Read-only view, no editing here (edits happen back on the topic itself if needed later, out of scope for this commit).

**Verify**: completing several topics populates the history view in the correct order with notes visible and matching what was entered on each topic card.

---

## Definition of done

All six commits merged in one PR. Curriculum correctly reflects the handbook's real structure. Daily notification enforces accountability by refusing to advance on undone topics. Dashboard shows live progress, streak, and notes. `study` module row in `modules` reflects real `last_run_at` values from both workflows going forward.
