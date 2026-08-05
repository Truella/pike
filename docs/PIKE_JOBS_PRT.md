# PIKE_JOBS_PRT.md

One prompt per commit, matching PIKE_JOBS_TRD.md. All six commits ship in a single PR.

---PROMPT---

**Commit 1 — `jobs_listings` migration**

Goal: Create the migration for the `jobs_listings` table.

Files: `supabase/migrations/0002_create_jobs_listings.sql`

Constraints: Columns exactly as specified in the TRD (`id, title, company, link, source, found_at, status, applied_at, follow_up_at, notes`). `status` restricted to `saved / applied / follow-up / interview / offer / closed` via a check constraint or enum, matching whatever pattern `0001_create_modules.sql` used for its `status` column if it set a precedent. `link` must be `unique`, since the scraper dedupes on it.

Verify: `supabase migration list` shows `0002` applied against the linked project; inserting two rows with the same `link` fails as expected; table visible in Supabase dashboard with correct schema.

---PROMPT---

**Commit 2 — Scraper script**

Goal: Build the Node script that fetches listings from Remotive and RemoteOK, filters by stack keywords, and upserts into `jobs_listings`.

Files: `automations/jobs/scrape.js`, `automations/jobs/sources/remotive.js`, `automations/jobs/sources/remoteok.js`.

Constraints: Each source file exports a function returning a normalized array of listings (same shape regardless of source API differences). Filter for React/Next.js/TypeScript/remote/contract keywords before insert. Upsert on `link` conflict, never blind insert, so reruns don't duplicate. Use the Supabase service role key from env (already available as a repo secret from PIKE_SETUP commit 6) for writes — do not use the anon key here. Keep source files independent so a change in one API's response shape doesn't break the other.

Verify: running `node automations/jobs/scrape.js` locally against the linked Supabase project inserts real rows with all fields populated correctly; running it a second time immediately after produces zero new duplicate rows.

---PROMPT---

**Commit 3 — GitHub Actions workflow**

Goal: Schedule the scraper to run daily and support manual triggering.

Files: `.github/workflows/jobs-scrape.yml`

Constraints: Cron schedule for once daily (e.g. 7am UTC or your preferred time), plus `workflow_dispatch`. After the scraper runs, update the `jobs` row in the `modules` table (`last_run_at = now()`) — follow the exact pattern used in `heartbeat.yml` from PIKE_SETUP commit 6 rather than writing new update logic from scratch.

Verify: manually trigger the workflow from the GitHub Actions tab; confirm it completes without errors, new listings (if any) appear in `jobs_listings`, and the `jobs` row in `modules` shows an updated `last_run_at`.

---PROMPT---

**Commit 4 — `/jobs` dashboard route**

Goal: Build the Jobs table view with editable status, reading and writing live Supabase data.

Files: `apps/dashboard/app/jobs/page.tsx`, `apps/dashboard/components/jobs/JobRow.tsx`.

Constraints: Status column is a dropdown; changing it writes back to `jobs_listings.status` immediately (first mutating UI in the dashboard — prior `/settings` route was read-only, follow the same Supabase client from `lib/supabase.ts`, just add a write call). Rows with `follow_up_at` in the past get a visually distinct treatment (color/badge) consistent with existing PREP design tokens if this dashboard shares `globals.css` tokens, otherwise establish equivalent amber/red tokens here and reuse them for future modules. Use the same data-fetching pattern already established in the `/settings` route (React Query, if that's what was used there).

Verify: changing a row's status in the browser persists after a page refresh; a listing with a past `follow_up_at` date is visibly flagged; typecheck and lint pass clean.

---PROMPT---

**Commit 5 — CSV/XLSX export**

Goal: Add an export button that downloads the current jobs table as an Excel file.

Files: `apps/dashboard/components/jobs/ExportButton.tsx`

Constraints: Use SheetJS (`xlsx` package). Export must reflect whatever is currently filtered/visible in the table state, not an unfiltered full fetch, if the table has any active filters at the time of export.

Verify: clicking export downloads a `.xlsx` file that opens cleanly in Excel/Sheets and matches the rows currently shown on screen.

---PROMPT---

**Commit 6 — Daily notification (Telegram)**

Goal: Send a Telegram summary notification after each scrape run, and build the shared Telegram utility other modules will reuse.

Files: `automations/lib/notify.js` (new shared utility — keep it generic enough that Study and Hackathons workflows can import it unchanged), `automations/jobs/notify.js` (jobs-specific message composition), wire the call into `automations/jobs/scrape.js` or the workflow step in `jobs-scrape.yml`.

Constraints: `notify.js` in `automations/lib` calls the Telegram Bot API `sendMessage` endpoint, reading `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` from repo secrets. It should export a single function taking just a message string — no job-specific logic in this file, that's what makes it reusable. The jobs-specific message reports count of new listings found and count of currently-overdue follow-ups only, not a full row dump. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` as new repo secrets alongside the Supabase ones already set up in PIKE_SETUP.

Verify: manually trigger `jobs-scrape.yml`; confirm a real message arrives in your Telegram chat with accurate counts matching what's actually in `jobs_listings` at that moment.

---PROMPT---
