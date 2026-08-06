# PIKE_JOBS_TRD.md

## Scope

Module 1: Job & Application Tracker, per the PRD's module pattern. One self-contained PR, ships independently of Hackathons and Study. Builds on the completed PIKE_SETUP PR (migrations tooling, dashboard shell, Actions pipeline already proven).

## Conventions

Follows PIKE_SETUP, authentication, and PIKE_THEME conventions: migrations for all schema, every user-owned table follows `docs/USER_SCOPING.md`, module tables are prefixed `jobs_`, the module workflow is isolated in its own file, and the module route is isolated under `/apps/dashboard/app/jobs`. Dashboard UI reuses the shared themed primitives and semantic tokens rather than introducing module-specific colors or base components.

---

## PR — Module 1: Jobs & Application Tracker

### Commit 1 — `jobs_listings` migration

**Achieves**: schema for storing scraped and manually-added job listings.

**Files**: `supabase/migrations/0004_create_jobs_listings.sql`

**Covers**: table with `id, user_id, title, company, link, source, found_at, status, applied_at, follow_up_at, notes`. `user_id` is a required foreign key to `auth.users`; RLS and operation-specific policies enforce `user_id = auth.uid()`. `status` defaults to `saved` and is constrained to `saved / applied / follow-up / interview / offer / closed`. The composite constraint `unique (user_id, link)` is the scraper dedupe key and permits separate users to own the same public listing.

**Verify**: `supabase migration list` shows `0004` applied; the table is visible in Supabase with the composite unique constraint confirmed; a duplicate link for one owner fails, the same link for different owners succeeds, and RLS prevents cross-user access.

---

### Commit 2 — Scraper script

**Achieves**: Node script that fetches from Remotive and RemoteOK APIs, filters, and upserts into `jobs_listings`.

**Files**: `automations/jobs/scrape.js` (or `.ts`, matching repo convention), `automations/jobs/sources/remotive.js`, `automations/jobs/sources/remoteok.js`.

**Constraints**: keyword filter for React/Next.js/TypeScript/remote/contract, applied before insert, not after. Attach `PIKE_USER_ID` to every row and dedupe on `user_id,link` (upsert, not blind insert) so reruns do not duplicate. Use the Supabase service role key for writes. Each source lives in its own file so a broken or changed API response is isolated to that adapter.

**Verify**: running the script locally against a test Supabase project inserts real rows with correct fields populated; running it twice in a row does not create duplicates.

---

### Commit 3 — GitHub Actions workflow

**Achieves**: daily scheduled run of the scraper, plus manual trigger.

**Files**: `.github/workflows/jobs-scrape.yml`

**Constraints**: daily schedule (e.g. 7am), `workflow_dispatch` enabled. Pass `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `PIKE_USER_ID`. Update the owned `modules` registry row for `jobs` (`id = jobs`, `user_id = PIKE_USER_ID`, `last_run_at = now()`) on every successful run by extracting and reusing the PIKE_SETUP heartbeat update logic.

**Verify**: manual trigger from the Actions tab runs successfully, new rows appear in `jobs_listings`, `modules` table shows updated `last_run_at` for the `jobs` module.

---

### Commit 4 — `/jobs` dashboard route

**Achieves**: table view of listings with editable status.

**Files**: `apps/dashboard/app/jobs/page.tsx`, `apps/dashboard/components/jobs/JobRow.tsx` (or similar, matching existing component conventions from PREP).

**Constraints**: the Server Component verifies the authenticated user and explicitly filters reads by `user_id`; the client row mutation filters by both listing `id` and the authenticated `user_id`, in addition to RLS. Status is a dropdown that writes back to Supabase on change. Overdue follow-ups use the existing theme `alert` token and `StatusTag`. Reuse `Button`, `Card`, and `StatusTag`, with no hardcoded colors or theme branches.

**Verify**: changing status in the UI persists on refresh; overdue follow-ups are visibly distinct from on-track ones.

---

### Commit 5 — CSV/XLSX export

**Achieves**: one-click export of current `jobs_listings` data.

**Files**: `apps/dashboard/components/jobs/ExportButton.tsx`, using SheetJS (already an approved library per the artifact/component conventions).

**Constraints**: use SheetJS and the shared `Button`; export exactly what is currently visible or filtered, not an unfiltered full fetch. Exclude the internal `user_id` ownership column from exports.

**Verify**: clicking export downloads a valid `.xlsx` file that opens correctly and matches the on-screen data.

---

### Commit 6 — Daily notification (Telegram)

**Achieves**: Telegram message summarizing new listings and overdue follow-ups, sent after the scrape completes. First module to need notifications, so this commit also creates the shared Telegram utility every other module will import.

**Files**: `automations/lib/notify.js` (shared utility, Telegram-specific), `automations/jobs/notify.js` (jobs-specific message composition).

**Constraints**: `automations/lib/notify.js` sends via the Telegram Bot API (`https://api.telegram.org/bot<token>/sendMessage`), reading `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` from env/repo secrets. Its function takes only a message string, with no module-specific logic. The Jobs message reports new listings and overdue follow-ups scoped to `PIKE_USER_ID` only, not a full listing dump.

**Verify**: manual workflow trigger produces a real message in your personal Telegram chat with correct counts.

---

## Definition of done

All six commits merged in one PR. Scraper runs daily unattended, dashboard shows live editable data, export works, notification fires. `jobs` module row in `modules` table reflects real `last_run_at` timestamps going forward — this is your proof the module is alive without checking Actions logs directly.
