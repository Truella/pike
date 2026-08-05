# PIKE_JOBS_TRD.md

## Scope

Module 1: Job & Application Tracker, per the PRD's module pattern. One self-contained PR, ships independently of Hackathons and Study. Builds on the completed PIKE_SETUP PR (migrations tooling, dashboard shell, Actions pipeline already proven).

## Conventions

Follows PIKE_SETUP conventions: migrations for all schema, module tables prefixed `jobs_`, module workflow isolated in its own file, module route isolated under `/apps/dashboard/app/jobs`.

---

## PR — Module 1: Jobs & Application Tracker

### Commit 1 — `jobs_listings` migration

**Achieves**: schema for storing scraped and manually-added job listings.

**Files**: `supabase/migrations/0002_create_jobs_listings.sql`

**Covers**: table with `id, title, company, link, source, found_at, status, applied_at, follow_up_at, notes`. `status` constrained to the flow: `saved / applied / follow-up / interview / offer / closed`. `link` unique, since it's the dedupe key for the scraper.

**Verify**: `supabase migration list` shows `0002` applied; table visible in Supabase dashboard with unique constraint on `link` confirmed (duplicate insert fails as expected).

---

### Commit 2 — Scraper script

**Achieves**: Node script that fetches from Remotive and RemoteOK APIs, filters, and upserts into `jobs_listings`.

**Files**: `automations/jobs/scrape.js` (or `.ts`, matching repo convention), `automations/jobs/sources/remotive.js`, `automations/jobs/sources/remoteok.js`.

**Constraints**: keyword filter for React/Next.js/TypeScript/remote/contract, applied before insert, not after. Dedupe on `link` (upsert, not blind insert) so re-runs don't duplicate. Use the Supabase service role key (already set up as a repo secret in PIKE_SETUP) for writes. Each source lives in its own file so a broken/changed API on one source doesn't block the other.

**Verify**: running the script locally against a test Supabase project inserts real rows with correct fields populated; running it twice in a row does not create duplicates.

---

### Commit 3 — GitHub Actions workflow

**Achieves**: daily scheduled run of the scraper, plus manual trigger.

**Files**: `.github/workflows/jobs-scrape.yml`

**Constraints**: daily schedule (e.g. 7am), `workflow_dispatch` enabled. Updates the `modules` registry row for `jobs` (`last_run_at`) on every run, per the PIKE_SETUP heartbeat pattern — reuse that pattern, don't reinvent it.

**Verify**: manual trigger from the Actions tab runs successfully, new rows appear in `jobs_listings`, `modules` table shows updated `last_run_at` for the `jobs` module.

---

### Commit 4 — `/jobs` dashboard route

**Achieves**: table view of listings with editable status.

**Files**: `apps/dashboard/app/jobs/page.tsx`, `apps/dashboard/components/jobs/JobRow.tsx` (or similar, matching existing component conventions from PREP).

**Constraints**: status is a dropdown that writes back to Supabase on change (this is the module's first mutation, prior routes were read-only). Follow-up dates that are overdue are visually flagged, consistent with the amber/red conventions already established in PREP's UI (per the design tokens in `globals.css` if this dashboard shares them, otherwise define equivalent tokens here).

**Verify**: changing status in the UI persists on refresh; overdue follow-ups are visibly distinct from on-track ones.

---

### Commit 5 — CSV/XLSX export

**Achieves**: one-click export of current `jobs_listings` data.

**Files**: `apps/dashboard/components/jobs/ExportButton.tsx`, using SheetJS (already an approved library per the artifact/component conventions).

**Constraints**: exports exactly what's currently visible/filtered in the table, not the full unfiltered table, if filters are active.

**Verify**: clicking export downloads a valid `.xlsx` file that opens correctly and matches the on-screen data.

---

### Commit 6 — Daily notification (Telegram)

**Achieves**: Telegram message summarizing new listings and overdue follow-ups, sent after the scrape completes. First module to need notifications, so this commit also creates the shared Telegram utility every other module will import.

**Files**: `automations/lib/notify.js` (shared utility, Telegram-specific), `automations/jobs/notify.js` (jobs-specific message composition).

**Constraints**: `automations/lib/notify.js` sends via the Telegram Bot API (`https://api.telegram.org/bot<token>/sendMessage`), reading `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` from env/repo secrets. Function signature should just take a message string — no module-specific logic in this file, so Study and Hackathons can import it unchanged. Jobs-specific message reports count of new listings found and count of currently-overdue follow-ups only, not a full listing dump.

**Verify**: manual workflow trigger produces a real message in your personal Telegram chat with correct counts.

---

## Definition of done

All six commits merged in one PR. Scraper runs daily unattended, dashboard shows live editable data, export works, notification fires. `jobs` module row in `modules` table reflects real `last_run_at` timestamps going forward — this is your proof the module is alive without checking Actions logs directly.
