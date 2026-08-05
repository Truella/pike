# PIKE_HACKATHONS_PRT.md

One prompt per commit, matching PIKE_HACKATHONS_TRD.md. All five commits ship in a single PR.

---PROMPT---

**Commit 1 — `hackathons_entries` migration**

Goal: Create the migration for the `hackathons_entries` table.

Files: `supabase/migrations/0005_create_hackathons_entries.sql`

Constraints: Columns exactly as specified in the TRD (`id, name, organizer, link, prize, deadline, found_at, status, notes`). `status` restricted to `saved / registered / in-progress / submitted / closed`, matching the constraint pattern already used for `jobs_listings.status`. `link` must be `unique` for scraper dedupe.

Verify: `supabase migration list` shows `0005` applied; inserting two rows with the same `link` fails; table visible in Supabase dashboard with correct schema.

---PROMPT---

**Commit 2 — Scraper script**

Goal: Build the Node script that scrapes Devpost listings, filters by prize threshold and deadline, and upserts into `hackathons_entries`.

Files: `automations/hackathons/scrape.js`, `automations/hackathons/sources/devpost.js`

Constraints: Devpost has no public API, so `sources/devpost.js` parses HTML directly — isolate all markup-dependent logic to this one file so future breakage is easy to locate and fix. Respect reasonable request pacing (no rapid-fire requests). Filter out entries below a configurable minimum prize value and past their deadline before insert. Upsert on `link` conflict, same dedupe approach as the Jobs scraper.

Verify: running `node automations/hackathons/scrape.js` locally inserts real rows with correct fields; a fixture/test entry below the prize threshold or past deadline is correctly excluded; running it twice produces no duplicates.

---PROMPT---

**Commit 3 — GitHub Actions workflow**

Goal: Schedule the hackathon scraper to run weekly with manual trigger support.

Files: `.github/workflows/hackathons-scrape.yml`

Constraints: Weekly cron schedule, plus `workflow_dispatch`. After the scraper runs, update the `hackathons` row in `modules` (`last_run_at = now()`), following the exact update pattern used in `jobs-scrape.yml`.

Verify: manual trigger from the Actions tab completes without errors; new entries (if any) appear in `hackathons_entries`; `modules.hackathons.last_run_at` updates correctly.

---PROMPT---

**Commit 4 — `/hackathons` dashboard route**

Goal: Build the Hackathons table view with editable status and deadline urgency flags.

Files: `apps/dashboard/app/hackathons/page.tsx`, `apps/dashboard/components/hackathons/HackathonRow.tsx`

Constraints: Status dropdown writes to `hackathons_entries.status` on change, same write pattern as `JobRow`. Entries with `deadline` within 3 days get the same amber/red urgency treatment already established for Jobs' overdue follow-ups — reuse those existing design tokens/components rather than creating new ones.

Verify: changing status persists after refresh; an entry with a near-term deadline is visibly flagged; typecheck and lint pass clean.

---PROMPT---

**Commit 5 — Weekly digest and urgent-deadline notification (Telegram)**

Goal: Send a weekly digest of new hackathon entries, and a separate daily check that alerts only when something tracked has an imminent deadline.

Files: `automations/hackathons/notify.js`, `.github/workflows/hackathons-deadline-check.yml`, `automations/hackathons/deadlineCheck.js`

Constraints: Both scripts import `automations/lib/notify.js` from PIKE_JOBS unchanged — no new Telegram transport code, only message composition. Digest (wired into `hackathons-scrape.yml`, after the weekly scrape) reports count of new entries and the top 1-3 by prize value. `deadlineCheck.js` runs on its own daily schedule (separate workflow from the weekly scrape) and queries for any non-closed entry with `deadline` within 3 days — if none exist, it exits without sending a message, to avoid daily noise when nothing's urgent.

Verify: manually trigger `hackathons-scrape.yml`, confirm a digest message arrives in Telegram with accurate counts; set a test entry's `deadline` to tomorrow, trigger `hackathons-deadline-check.yml`, confirm an urgent alert arrives; with no near-term deadlines, trigger it again and confirm no message is sent.

---PROMPT---
