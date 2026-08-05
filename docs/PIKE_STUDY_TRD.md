# PIKE_STUDY_TRD.md

## Scope

Module 3: FE Interview Study Automation, per the PRD. One self-contained PR, ships independently of Jobs and Hackathons. Builds on PIKE_SETUP (migrations tooling, dashboard shell, Actions pipeline, `modules` registry) and reuses the shared `automations/lib/notify.js` utility introduced in PIKE_JOBS.

Source of truth: `yangshun/front-end-interview-handbook`, `website/sidebars.js` (confirmed structure: nested categories, ordered `items` arrays, ~42 topics flattened top to bottom, company-specific pages included as trailing daily topics).

## Conventions

Follows PIKE_SETUP conventions: migrations for all schema, module tables prefixed `study_`, module workflows isolated in their own files, module route isolated under `/apps/dashboard/app/study`.

---

## PR — Module 3: FE Interview Study Automation

### Commit 1 — `study_curriculum` and `study_progress` migrations

**Achieves**: schema for the flattened curriculum and per-topic progress tracking.

**Files**: `supabase/migrations/0003_create_study_curriculum.sql`, `supabase/migrations/0004_create_study_progress.sql`

**Covers**:
- `study_curriculum`: `id, order_index, title, section, url`
- `study_progress`: `topic_id (fk to study_curriculum.id), status, started_at, completed_at, notes, days_stuck`. `status` constrained to `not_started / in_progress / done`.

**Verify**: both migrations apply cleanly in order; `study_progress.topic_id` foreign key enforced (inserting a progress row for a non-existent topic fails).

---

### Commit 2 — Curriculum ingest script

**Achieves**: parses `sidebars.js` from the handbook repo, flattens the nested category structure into ordered rows, upserts into `study_curriculum`.

**Files**: `automations/study/ingest.js`, `automations/study/parseSidebar.js`

**Constraints**: fetch `sidebars.js` directly from the handbook's raw GitHub content (confirmed reachable at `raw.githubusercontent.com/yangshun/front-end-interview-handbook/main/website/sidebars.js`). Flatten top to bottom exactly as confirmed: `root` array order preserved, category items expanded inline, company-specific pages included as trailing topics. `order_index` assigned by position in the flattened list. Upsert on `id` (derive a stable id from the doc path/slug) so re-running doesn't duplicate or reorder existing topics if new ones are appended later. On first ever run, also seed a matching `study_progress` row per topic with `status = not_started`.

**Verify**: running the script populates `study_curriculum` with ~42 rows in the confirmed order; spot-check that `order_index` matches the handbook's actual sidebar sequence; running it twice does not duplicate rows or change existing `order_index` values.

---

### Commit 3 — Ingest workflow

**Achieves**: scheduled + manual re-sync of the curriculum in case the handbook adds new content.

**Files**: `.github/workflows/study-ingest.yml`

**Constraints**: monthly schedule (confirmed sufficient given the source's actual update cadence), plus `workflow_dispatch`. Updates the `study` row in `modules` (`last_run_at`) on completion, same pattern as `jobs-scrape.yml`.

**Verify**: manual trigger runs cleanly against a repo with no new content (no-op, no duplicate rows) and, if new content exists upstream, appends new rows at the correct trailing position without disturbing existing `order_index` values.

---

### Commit 4 — Daily accountability check and notification

**Achieves**: the core accountability mechanic — daily check of current progress, notification that does not advance if yesterday's topic isn't done.

**Files**: `.github/workflows/study-daily.yml`, `automations/study/dailyCheck.js`, `automations/study/notify.js`

**Constraints**: script finds the lowest `order_index` topic where `status != done` — that's "today's topic," regardless of what day it is. Do not auto-advance based on date alone. If that topic's `status` is `not_started` or `in_progress` for more than one day, increment `days_stuck` on its progress row. Notification message (via shared `automations/lib/notify.js`) reports: today's topic + link, days-stuck count if any, and yesterday's topic's actual status (done or still pending) rather than assuming completion. Daily schedule, plus `workflow_dispatch` for testing.

**Verify**: with a topic manually left `in_progress`, next day's workflow run repeats that same topic in the notification rather than moving to the next one; marking it `done` via the dashboard causes the next run to correctly surface the following topic.

---

### Commit 5 — `/study` dashboard route

**Achieves**: today's topic card with status toggle and notes, progress bar, streak counter.

**Files**: `apps/dashboard/app/study/page.tsx`, `apps/dashboard/components/study/TopicCard.tsx`, `apps/dashboard/components/study/ProgressBar.tsx`

**Constraints**: status toggle (`not_started → in_progress → done`) writes to `study_progress` immediately, same mutation pattern as the Jobs status dropdown. Notes field is a textarea attached to the current topic's progress row, saved on blur (not on every keystroke). Progress bar shows overall completion and a per-section breakdown (Coding / Trivia / System Design / Behavioral / Resume / Company questions). Streak counter derived from consecutive days with at least one topic marked `done` — compute this from `completed_at` timestamps rather than storing a separate streak counter that could drift out of sync.

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
