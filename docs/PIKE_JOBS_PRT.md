# PIKE_JOBS_PRT.md

One prompt per commit, matching PIKE_JOBS_TRD.md. All six commits ship in a single PR.

---PROMPT---

**Commit 1 — `jobs_listings` migration**

Goal: Create the migration for the `jobs_listings` table.

Files: `supabase/migrations/0004_create_jobs_listings.sql`

Constraints: Columns exactly as specified in the TRD (`id, user_id, title, company, link, source, found_at, status, applied_at, follow_up_at, notes`). `user_id uuid references auth.users(id) not null` follows `docs/USER_SCOPING.md`. Enable RLS and add select/insert/update/delete policies requiring `user_id = auth.uid()`. `status` is text restricted to `saved / applied / follow-up / interview / offer / closed` with a check constraint and defaults to `saved`. Add `unique (user_id, link)`, since each user's scraper dedupes on `link` without preventing another user from owning the same listing.

Verify: `supabase migration list` shows `0004` applied against the linked project; inserting two rows with the same `user_id` and `link` fails while two users can own the same link; an authenticated user cannot access another user's rows; table visible in Supabase dashboard with the correct schema.

---PROMPT---

**Commit 2 — Scraper script**

Goal: Build the Node script that fetches listings from Remotive and RemoteOK, filters by stack keywords, and upserts into `jobs_listings`.

Files: `automations/jobs/scrape.js`, `automations/jobs/sources/remotive.js`, `automations/jobs/sources/remoteok.js`.

Constraints: Each source file exports a function returning a normalized array of listings (same shape regardless of source API differences). Filter for React/Next.js/TypeScript/remote/contract keywords before insert. Read the owner from `PIKE_USER_ID`, attach that `user_id` to every row, and upsert on the `user_id,link` conflict, never blind insert, so reruns do not duplicate. Use the Supabase service role key from env (already available as a repo secret from PIKE_SETUP commit 6) for writes; do not use the anon key here. Keep source files independent so a change in one API's response shape does not break the other.

Verify: running `node automations/jobs/scrape.js` locally against the linked Supabase project inserts real rows with all fields populated correctly; running it a second time immediately after produces zero new duplicate rows.

---PROMPT---

**Commit 3 — GitHub Actions workflow**

Goal: Schedule the scraper to run daily and support manual triggering.

Files: `.github/workflows/jobs-scrape.yml`

Constraints: Cron schedule for once daily (e.g. 7am UTC or your preferred time), plus `workflow_dispatch`. Pass the existing `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `PIKE_USER_ID` secrets to the script. After the scraper runs, update the owned `jobs` row in the `modules` table (`id = jobs`, `user_id = PIKE_USER_ID`, `last_run_at = now()`) by extracting and reusing the existing heartbeat update logic rather than duplicating it.

Verify: manually trigger the workflow from the GitHub Actions tab; confirm it completes without errors, new listings (if any) appear in `jobs_listings`, and the `jobs` row in `modules` shows an updated `last_run_at`.

---PROMPT---

**Commit 4 — `/jobs` dashboard route**

Goal: Build the Jobs table view with editable status, reading and writing live Supabase data.

Files: `apps/dashboard/app/jobs/page.tsx`, `apps/dashboard/components/jobs/JobRow.tsx`.

Constraints: The page is a Server Component using the typed SSR Supabase client established by `/settings`; verify the user with `auth.getUser()` and filter reads by `user_id`. `JobRow` is a Client Component using the typed browser client. Status is a dropdown; changing it immediately updates `jobs_listings.status` with filters for both row `id` and the authenticated `user_id`. Rows with `follow_up_at` in the past use the existing theme `alert` token and shared `StatusTag`; all UI uses the shared `Button`, `Card`, and `StatusTag` primitives and semantic theme tokens, with no hardcoded colors.

Verify: changing a row's status in the browser persists after a page refresh; a listing with a past `follow_up_at` date is visibly flagged; typecheck and lint pass clean.

---PROMPT---

**Commit 5 — CSV/XLSX export**

Goal: Add an export button that downloads the current jobs table as an Excel file.

Files: `apps/dashboard/components/jobs/ExportButton.tsx`

Constraints: Use SheetJS (`xlsx` package) and the shared themed `Button`. Export must reflect whatever is currently filtered/visible in the table state, not an unfiltered full fetch, if the table has any active filters at the time of export. Do not include `user_id` in the exported columns.

Verify: clicking export downloads a `.xlsx` file that opens cleanly in Excel/Sheets and matches the rows currently shown on screen.

---PROMPT---

**Commit 6 — Daily notification (Telegram)**

Goal: Send a Telegram summary notification after each scrape run, and build the shared Telegram utility other modules will reuse.

Files: `automations/lib/notify.js` (new shared utility — keep it generic enough that Study and Hackathons workflows can import it unchanged), `automations/jobs/notify.js` (jobs-specific message composition), wire the call into `automations/jobs/scrape.js` or the workflow step in `jobs-scrape.yml`.

Constraints: `notify.js` in `automations/lib` calls the Telegram Bot API `sendMessage` endpoint, reading `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` from repo secrets. It exports a single function taking only a message string; no job-specific logic belongs in this file. The jobs-specific message reports the count of new listings found and count of currently-overdue follow-ups for `PIKE_USER_ID` only, not a full row dump. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` as new repo secrets alongside the existing Supabase and owner ID secrets.

Verify: manually trigger `jobs-scrape.yml`; confirm a real message arrives in your Telegram chat with accurate counts matching what's actually in `jobs_listings` at that moment.

---PROMPT---
