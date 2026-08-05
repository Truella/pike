# PIKE_HACKATHONS_TRD.md

## Scope

Module 2: Hackathon Tracker, per the PRD. One self-contained PR, ships independently of Jobs and Study. Builds on PIKE_SETUP and reuses the shared `automations/lib/notify.js` (Telegram) utility created in PIKE_JOBS.

## Conventions

Follows PIKE_SETUP conventions: migrations for all schema, module tables prefixed `hackathons_`, module workflow isolated in its own file, module route isolated under `/apps/dashboard/app/hackathons`.

---

## PR — Module 2: Hackathon Tracker

### Commit 1 — `hackathons_entries` migration

**Achieves**: schema for storing scraped and manually-added hackathon entries.

**Files**: `supabase/migrations/0005_create_hackathons_entries.sql`

**Covers**: `id, name, organizer, link, prize, deadline, found_at, status, notes`. `status` constrained to `saved / registered / in-progress / submitted / closed`. `link` unique, for dedupe.

**Verify**: `supabase migration list` shows `0005` applied; `hackathons_entries` visible in Supabase dashboard with correct schema and unique constraint on `link`.

---

### Commit 2 — Scraper script

**Achieves**: script that pulls hackathon listings from Devpost (HTML scrape, no public API) and filters by prize threshold and deadline window.

**Files**: `automations/hackathons/scrape.js`, `automations/hackathons/sources/devpost.js`

**Constraints**: Devpost has no official API, so this parses HTML directly — keep the parsing logic isolated to `sources/devpost.js` so it's the only file that breaks if Devpost changes their markup. Respect reasonable rate limits (no rapid repeated requests). Filter out listings below a minimum prize threshold and past their deadline before insert. Upsert on `link`, same dedupe pattern as Jobs.

**Verify**: running the script locally inserts real rows with correct fields; a listing already past its deadline or below the prize threshold is correctly excluded; rerunning does not duplicate.

---

### Commit 3 — GitHub Actions workflow

**Achieves**: weekly scheduled scrape (hackathons don't post frequently enough to justify daily), plus manual trigger.

**Files**: `.github/workflows/hackathons-scrape.yml`

**Constraints**: weekly schedule, `workflow_dispatch` enabled. Updates the `hackathons` row in `modules` (`last_run_at`) on completion, reusing the same update pattern as `jobs-scrape.yml`.

**Verify**: manual trigger runs successfully, new rows (if any) appear in `hackathons_entries`, `modules.hackathons.last_run_at` updates.

---

### Commit 4 — `/hackathons` dashboard route

**Achieves**: view of tracked hackathons with editable status and visible deadline urgency.

**Files**: `apps/dashboard/app/hackathons/page.tsx`, `apps/dashboard/components/hackathons/HackathonRow.tsx`

**Constraints**: status dropdown writes back to Supabase on change, same mutation pattern as Jobs' status dropdown. Entries with a deadline within 3 days get the same urgent visual treatment already established for Jobs' overdue follow-ups — reuse those tokens, don't invent new ones.

**Verify**: changing status persists on refresh; a hackathon with a near deadline is visibly flagged as urgent.

---

### Commit 5 — Weekly digest and urgent-deadline notification (Telegram)

**Achieves**: two notification types — a weekly digest of new entries, and standalone alerts when a tracked entry's deadline is imminent.

**Files**: `automations/hackathons/notify.js`, wired into `hackathons-scrape.yml` for the digest; a second lightweight workflow `.github/workflows/hackathons-deadline-check.yml` plus `automations/hackathons/deadlineCheck.js` for daily urgent-deadline checks.

**Constraints**: both import the shared `automations/lib/notify.js` from PIKE_JOBS unchanged — no new notification transport code here. Digest message reports count of new entries found and top 1-3 by prize value. Deadline check runs daily (separate from the weekly scrape) and only sends a message if at least one tracked, non-closed entry has a deadline within 3 days — silent otherwise, to avoid noise.

**Verify**: manual trigger of the weekly workflow sends a digest with accurate counts; manually setting a test entry's deadline to tomorrow and triggering the deadline-check workflow sends an urgent alert; with no near deadlines, the deadline-check workflow runs but sends nothing.

---

## Definition of done

All five commits merged in one PR. Scraper runs weekly unattended, dashboard shows live editable data with urgency flags, weekly digest and daily deadline alerts both fire correctly via Telegram. `hackathons` module row in `modules` reflects real `last_run_at` going forward.
