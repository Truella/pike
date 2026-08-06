# Pike — PRD

## 1. Problem

Job search, hackathon hunting, and interview prep each require daily manual tracking across scattered sources (job boards, Devpost, a study handbook). Nothing talks to each other, nothing reminds you, and progress lives in your head or gets lost between tabs.

## 2. Goal

One system, owned by one user (you), that:
- pulls relevant data from external sources on a schedule
- stores it centrally
- surfaces what needs action today
- tracks progress/status over time
- is built so new automations can be added without touching what already works

## 3. Non-goals

- Not multi-user, not a SaaS product (v1). No auth system needed beyond your own Supabase project key.
- Not a general-purpose scraper platform — each module is purpose-built for its source.
- Not real-time — daily/weekly cron cadence is enough for every module currently planned.

## 4. Architecture principles

**One shared core, many independent modules.**

- **Data layer**: single Supabase project. Each module owns its own tables, prefixed by module name (`jobs_listings`, `hackathons_entries`, `study_curriculum`, `study_progress`). No shared tables except a `modules` registry table (see §7).
- **Automation layer**: one GitHub Actions repo. Each module = its own workflow file (`jobs-scrape.yml`, `hackathons-scrape.yml`, `study-ingest.yml`). Independent schedules, independent failure — one breaking doesn't break another.
- **Notification layer**: one webhook utility (Discord or Telegram, decide once, reuse everywhere). Each module's workflow calls it with its own message; formatting is module-specific but the transport is shared.
- **Presentation layer**: one Next.js app on Vercel. Each module = its own route/tab (`/jobs`, `/hackathons`, `/study`). Shared shell (nav, layout, Supabase client) lives in a `lib/` and `components/` common layer; module-specific UI stays isolated in its own folder.

**Rule of thumb**: if a new automation idea shows up later, it should be addable by (1) new tables, (2) new workflow file, (3) new dashboard route — without editing existing modules' code.

## 5. Tech stack (fixed across all modules)

| Layer | Choice |
|---|---|
| Database | Supabase (Postgres) |
| Scheduler | GitHub Actions (cron + manual `workflow_dispatch`) |
| Scraping/scripts | Node.js |
| Dashboard | Next.js, deployed on Vercel |
| Notifications | Discord or Telegram webhook (single decision, reused) |
| Export | Supabase native CSV export + optional in-app SheetJS export button |

Cost: $0 at this scale (all free tiers).

## 6. Repo structure

```
/pike
  /apps/dashboard          → Next.js app
    /app/jobs
    /app/hackathons
    /app/study
    /lib                   → shared Supabase client, auth, utils
    /components            → shared UI (nav, layout, status pill, etc.)
  /automations
    /jobs
    /hackathons
    /study
  /.github/workflows
    jobs-scrape.yml
    hackathons-scrape.yml
    study-ingest.yml
  /db
    schema.sql              → all module schemas, versioned together
```

## 7. Module registry (built for growth)

A `modules` table in Supabase: `id, name, status (active/paused), last_run_at, notes`. Every workflow updates its row on run. The dashboard has a `/settings` route listing all modules and their last-run status — this is your single glance at "is everything still alive" as the number of modules grows, without opening GitHub Actions logs directly.

## 8. Success metrics

- Every module's cron ran successfully in the last expected window (visible in `modules` table)
- Time spent manually checking external sources drops to near zero for automatable ones
- Dashboard is the only place you check daily

---

# TRD: Module 1 — Job & Application Tracker

**Purpose**: aggregate remote frontend/full-stack job listings, track application status end to end.

**Sources**: Remotive API, RemoteOK API (automated) + manual entry for LinkedIn/X finds.

**Schema**
```
jobs_listings: id, title, company, link, source, found_at, status,
               applied_at, follow_up_at, notes
```
Status flow: `saved → applied → follow-up → interview → offer → closed`

**Automation**: `jobs-scrape.yml`, daily. Fetch → filter by keyword (React, Next.js, remote) → dedupe by `link` → upsert.

**Dashboard (`/jobs`)**: table view, status dropdown per row, overdue follow-ups highlighted, CSV/XLSX export button.

**Notification**: daily summary — new listings count + overdue follow-ups.

---

# TRD: Module 2 — Hackathon Tracker

**Purpose**: surface hackathons with real prize money and manageable timelines, track entries.

**Sources**: Devpost (HTML scrape, no public API — rate-limit respectfully), other listed platforms as found.

**Schema**
```
hackathons_entries: id, name, organizer, link, prize, deadline, found_at,
                     status, notes
```
Status flow: `saved → applied/registered → in-progress → submitted → closed`

**Automation**: `hackathons-scrape.yml`, weekly (hackathons don't post daily in volume). Filter by prize threshold + deadline window.

**Dashboard (`/hackathons`)**: card or table view, deadline countdown, urgent (<3 days) highlighted.

**Notification**: weekly digest + urgent-deadline alerts.

---

# TRD: Module 3 — FE Interview Study Automation

**Purpose**: walk the Front End Interview Handbook curriculum in order, with strict accountability and note-taking.

**Source**: `yangshun/front-end-interview-handbook`, `website/sidebars.js` (confirmed structure — nested categories, ordered `items` arrays).

**Schema**
```
study_curriculum: id, order_index, title, section, url
study_progress:   user_id, topic_id, status (not_started/in_progress/done),
                    created_at, started_at, completed_at, notes
```

`study_curriculum` is shared reference data. `study_progress` is owner-scoped and unique by `(user_id, topic_id)`. Days stuck is computed from `coalesce(started_at, created_at)` rather than stored.

**Ingest logic**: parse `sidebars.js` → flatten nested categories top to bottom → upsert into `study_curriculum` with incrementing `order_index`. Company-specific pages included as trailing daily topics per your call.

**Automation**: `study-ingest.yml`, monthly + manual trigger (content moves slowly — confirmed via commit history).

**Accountability logic**: daily cron does NOT auto-advance. It checks `study_progress` for the current `order_index`; if not `done`, today's notification repeats that topic instead of moving to the next one.

**Dashboard (`/study`)**: today's topic card with status toggle, notes textarea, progress bar (overall + per-section), streak counter, scrollable history of completed topics + notes.

**Notification**: daily — yesterday's topic + completion status, today's topic + link, days-stuck flag if applicable.

---

# Build order recommendation

1. Core repo scaffold + Supabase project + `modules` table + dashboard shell (nav only, no content yet)
2. Module 1 (jobs) end to end — proves the whole pattern works
3. Module 3 (study) — reuses the pattern, different domain
4. Module 2 (hackathons) — same pattern again, by now should take the least time
5. Any future module follows the same three-step add: tables → workflow → route
