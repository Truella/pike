# PIKE_STUDY_PRT.md

One prompt per commit, matching PIKE_STUDY_TRD.md. All six commits ship in a single PR.

---PROMPT---

**Commit 1 — `study_curriculum` and `study_progress` migrations**

Goal: Create migrations for the curriculum and progress tables.

Files: `supabase/migrations/0003_create_study_curriculum.sql`, `supabase/migrations/0004_create_study_progress.sql`

Constraints: `study_curriculum` columns: `id, order_index, title, section, url`. `study_progress` columns: `topic_id, status, started_at, completed_at, notes, days_stuck`, with `topic_id` as a foreign key referencing `study_curriculum.id` and `status` constrained to `not_started / in_progress / done`, matching whatever status-constraint pattern was used for `jobs_listings.status`.

Verify: both migrations apply cleanly and in order via `supabase migration list`; attempting to insert a `study_progress` row with a `topic_id` that doesn't exist in `study_curriculum` fails as expected.

---PROMPT---

**Commit 2 — Curriculum ingest script**

Goal: Fetch and parse the handbook's `sidebars.js`, flatten it into ordered rows, and upsert into `study_curriculum`, seeding matching `study_progress` rows on first run.

Files: `automations/study/ingest.js`, `automations/study/parseSidebar.js`

Constraints: Fetch from `https://raw.githubusercontent.com/yangshun/front-end-interview-handbook/main/website/sidebars.js`. Parse the `root` array preserving exact top-to-bottom order: standalone entries and category `items` arrays both flatten into the same sequence, company-specific pages included as trailing topics per the confirmed structure. Derive a stable `id` per topic from its doc slug/path so re-running is idempotent. Assign `order_index` by final flattened position. Upsert on `id` — never duplicate or reorder existing rows on a rerun. If a topic's `study_progress` row doesn't exist yet, create one with `status = not_started`.

Verify: first run populates roughly 42 rows in `study_curriculum` in the confirmed handbook order (introduction → coding → trivia → system design → behavioral → resume → company questions); a second immediate run produces zero duplicate or reordered rows.

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

Constraints: `dailyCheck.js` queries `study_progress` joined to `study_curriculum`, finds the lowest `order_index` where `status != 'done'` — that row is today's topic regardless of what was "supposed" to happen today. If that topic has been `not_started` or `in_progress` for more than one day (compare `started_at` or row creation to today), increment `days_stuck`. Build a message via the shared `automations/lib/notify.js` utility (from PIKE_JOBS commit 6) reporting: today's topic title + url, `days_stuck` if greater than zero, and the true status of what would have been "yesterday's" topic rather than assuming it was completed. Daily cron plus `workflow_dispatch`.

Verify: manually set a topic to `in_progress`, trigger the workflow twice on different simulated days (or two manual runs) — confirm the same topic is reported both times and `days_stuck` increments; mark it `done`, trigger again, confirm the next topic in `order_index` is now reported instead.

---PROMPT---

**Commit 5 — `/study` dashboard route**

Goal: Build the Study tab — today's topic card with status toggle and notes, overall and per-section progress bar, and a streak counter.

Files: `apps/dashboard/app/study/page.tsx`, `apps/dashboard/components/study/TopicCard.tsx`, `apps/dashboard/components/study/ProgressBar.tsx`

Constraints: `TopicCard` shows the same "current topic" logic as `dailyCheck.js` (lowest `order_index` not `done`) — reuse that query logic rather than duplicating it with different behavior. Status toggle writes to `study_progress.status` on change, following the same write pattern established in the Jobs status dropdown. Notes textarea saves to `study_progress.notes` on blur, not on every keystroke. `ProgressBar` computes overall `done` count over total, plus a breakdown grouped by `study_curriculum.section`. Streak counter is computed from `completed_at` timestamps (consecutive calendar days with at least one `done`), not stored as a separate mutable counter.

Verify: marking the current topic `done` updates the card to show the next topic, updates the progress bar and streak, and persists correctly after a page reload; notes entered and left (blurred) are saved and reappear on reload.

---PROMPT---

**Commit 6 — History view**

Goal: Build a read-only log of completed topics with their notes.

Files: `apps/dashboard/app/study/history/page.tsx`

Constraints: Query `study_progress` where `status = 'done'`, joined to `study_curriculum` for title/section, ordered by `completed_at` descending. Display title, section, completion date, and notes per row. No editing controls on this view.

Verify: completing topics via the `/study` route causes them to appear here in the correct order with matching notes; the view has no write actions.

---PROMPT---
