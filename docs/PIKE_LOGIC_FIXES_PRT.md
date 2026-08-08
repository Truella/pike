# PIKE_LOGIC_FIXES_PRT.md

Functional and backend fixes 
surfaced while reviewing the UI, separated out since these are logic bugs and missing features, not styling. One PR, five commits.

---PROMPT---

**Commit 1 — Fix Jobs keyword filtering**

Goal: Jobs listings currently include clearly irrelevant roles (e.g. "Procurement Specialist," "Architectural Designer," "Brand Strategy") despite the scraper being specified to filter for React/Next.js/TypeScript/remote/contract roles before insert. Audit and fix the actual filtering logic.

Files: `automations/jobs/scrape.js`, `automations/jobs/sources/remotive.js`, `automations/jobs/sources/remoteok.js`.

Constraints: Inspect the current filter implementation first — likely candidates are: the filter checking the wrong field (e.g. only a short title field rather than title+description), the filter using overly narrow exact-match logic instead of case-insensitive substring/keyword matching, or the filter not actually being called before insert at all. Fix whichever is the real cause. Keyword matching should check both job title and description text where available, case-insensitive, against a defined keyword list (React, Next.js, TypeScript, frontend, front-end, remote, contract — adjust as needed for reasonable recall without being so loose it readmits noise). Do not weaken matching so much that it lets irrelevant roles back in, and do not tighten it so much that it excludes genuinely relevant roles missing an exact keyword (e.g. "JavaScript Developer" should still pass).

Verify: running the scraper against current live source data no longer inserts obviously irrelevant roles like the examples above; genuinely relevant frontend/React roles from the same source data are still inserted; run against a small manually-reviewed sample of source data before and after to confirm the fix actually changes behavior, not just theoretically.

---PROMPT---

**Commit 2 — Realtime updates for Jobs and Hackathons**

Goal: Replace the need for a manual page refresh after a scrape workflow completes with Supabase Realtime, so new/updated rows appear live.

Files: `apps/dashboard/app/jobs/page.tsx` (or the Client Component holding table state), `apps/dashboard/app/hackathons/page.tsx` (same).

Constraints: Use Supabase's Realtime `postgres_changes` subscription (not polling) on `jobs_listings` and `hackathons_entries` respectively, filtered to the authenticated user's `user_id` so Realtime respects the same ownership scoping as everything else. On INSERT, prepend/insert the new row into local table state. On UPDATE (e.g. a status change from another session/device), update the matching row in place. Unsubscribe cleanly on component unmount. This requires Realtime replication to be enabled on both tables in the Supabase dashboard (Database → Replication) — flag this as a manual step, not something the code alone can turn on.

Verify: with the dashboard open in one browser tab, manually trigger the Jobs (or Hackathons) scrape workflow; confirm new rows appear in the open tab without any manual refresh; confirm changing a status in one tab reflects in another open tab live.

---PROMPT---

**Commit 3 — Archive and delete for Jobs and Hackathons**

Goal: Both tables currently grow unbounded with no way to remove or hide old entries. Add an archive (soft-hide) action and a permanent delete action per row.

Files: `supabase/migrations/00XX_add_archived_to_jobs_and_hackathons.sql` (use the next available migration number — inspect `supabase/migrations/` first), `apps/dashboard/components/jobs/JobRow.tsx`, `apps/dashboard/components/hackathons/HackathonRow.tsx`.

Constraints: Migration adds `archived boolean not null default false` to both `jobs_listings` and `hackathons_entries`. Default table views filter to `archived = false`; add a way to view archived rows separately (a toggle or filter option, reusing the filtering UI from the theme sweep's Commit 3/5 if that's already merged, otherwise a simple visible/archived tab). Each row gets an "Archive" action (sets `archived = true`, reversible) via the existing kebab-menu or row-action pattern, and a separate "Delete" action (permanent, hard delete from the table) that requires a confirmation step before executing, since it's irreversible.

Verify: archiving a row removes it from the default view and it reappears correctly when viewing archived rows; unarchiving restores it to the default view; deleting a row (after confirming) permanently removes it and it does not reappear in either view.

---PROMPT---

**Commit 4 — Decouple Study notes from status mutation**

Goal: Notes currently appear tied to the status dropdown's write, preventing a note from being saved independently. Give notes their own explicit save action.

Files: `apps/dashboard/components/study/TopicCard.tsx`.

Constraints: Add a dedicated "Save" button beneath the notes textarea, wired to its own mutation that writes only `study_progress.notes` for the current topic, completely independent of the status dropdown's mutation. Saving a note must work regardless of the topic's current status, including `not_started`. Give clear save-state feedback (e.g. a brief "Saved" confirmation or disabled-state during the write) so it's obvious the save succeeded independent of any status change.

Verify: on a topic still marked `not_started`, typing a note and clicking Save persists it correctly without changing the topic's status; refreshing the page shows the saved note; changing status afterward does not require re-saving the note.

---PROMPT---

**Commit 5 — Editable History rows in Study**

Goal: Completed topics currently have no way to be revisited or corrected once marked done, since History is read-only by original spec. Add in-place editing via a pen icon, without cluttering the default read-only view.

Files: `apps/dashboard/app/study/history/page.tsx`, `apps/dashboard/components/study/HistoryRow.tsx` (new, if the history list should be extracted into its own row component).

Constraints: Each history row displays read-only by default (title, section, completion date, notes) exactly as it does now, plus a small pen/edit icon. Clicking the icon swaps that specific row in place into an editable state showing the same status `Dropdown` (from the UI sweep's Commit 1) and notes textarea used on the main topic card — reusing those components rather than rebuilding equivalent ones. Editing and saving from this expanded row writes to the same `study_progress` row as the main topic card would. Clicking the icon again (or a close action) collapses the row back to its read-only display. Only one row should be in edit mode at a time to avoid confusing simultaneous edits.

Verify: clicking the pen icon on a history row reveals status and notes controls in place, without navigating away or opening a modal; changing status or notes there and saving persists correctly and is reflected if that topic later becomes "today's topic" again (e.g. reopening a done topic back to in_progress makes it eligible to resurface on the main Study page); the row collapses back to read-only after editing or on explicit close.

---PROMPT---
