# PIKE_SETUP_TRD.md

## Scope

Full project bootstrap for the Pike: repo, folder structure, dependency installs, Supabase project + migration tooling, Next.js dashboard scaffold, Vercel deployment, and a GitHub Actions workflow skeleton. No module logic (jobs/hackathons/study) yet — this TRD only covers what needs to exist before any module can be added.

## Conventions

- All Supabase schema changes go through the Supabase CLI migration system (`supabase/migrations/`), never a loose `schema.sql`. Every DB-touching commit adds one numbered migration file.
- Repo structure follows the PRD's module-registry pattern exactly (`/apps/dashboard`, `/automations`, `/.github/workflows`, `/supabase/migrations`).
- Planning docs live in `docs/`, named `PIKE_{FEATURE}_TRD.md` / `PIKE_{FEATURE}_PRT.md`.

---

## PR — Project setup

One PR, six commits. Each commit is independently verifiable but they ship together as a single project bootstrap PR — no reason to split setup work into separate reviewable PRs when nothing here carries independent feature risk.

### Commit 1 — Repo init and folder structure

**Achieves**: empty but correctly shaped repo, nothing functional yet.

**Structure created**:
```
/pike
  /apps/dashboard
  /automations
  /.github/workflows
  /supabase/migrations
  /docs
  .gitignore
  README.md
```

**Verify**: repo clones clean, folder tree matches structure above, README states project purpose and links back to the PRD.

---

### Commit 2 — Supabase project and migration tooling

**Achieves**: Supabase CLI installed and linked to a real Supabase project; migration workflow functional end to end with a trivial first migration.

**Covers**:
- Supabase CLI installed as a dev dependency (or global, per your preference)
- `supabase init` run inside `/supabase`
- CLI linked to the live Supabase project (project ref + access token, stored as local env, never committed)
- First migration: `0001_create_modules.sql` — creates the `modules` registry table (`id, name, status, last_run_at, notes`) per the PRD
- Migration applied to the live project via CLI, confirmed in Supabase dashboard

**Verify**: `supabase migration list` shows `0001` as applied; `modules` table visible in Supabase table editor with correct columns; running the migration again from a clean clone reproduces the same state.

---

### Commit 3 — Next.js dashboard scaffold and installs

**Achieves**: a running (but empty) Next.js app in `/apps/dashboard`, all core dependencies installed.

**Covers**:
- `create-next-app` run inside `/apps/dashboard` (App Router, TypeScript, Tailwind — matching your existing stack conventions from PREP)
- Core installs: `@supabase/supabase-js`, plus anything the shared nav/layout will need
- `.env.local.example` added with placeholder Supabase URL/anon key names (real values never committed)
- Base layout + empty nav shell (no routes with real content yet)

**Verify**: `npm run dev` boots cleanly, empty shell renders at localhost with nav placeholder, typecheck and lint pass clean.

---

### Commit 4 — Supabase client integration and /settings route

**Achieves**: dashboard can read live data from Supabase; first real route proves the whole pipeline works.

**Covers**:
- `lib/supabase.ts` — typed Supabase client using env vars
- `/settings` route: fetches and renders the `modules` table (name, status, last_run_at, notes) as a simple list
- No mutations yet, read-only

**Verify**: `/settings` renders actual rows from the live `modules` table (insert a test row manually via Supabase to confirm); no console errors; typecheck/lint clean.

---

### Commit 5 — Vercel deployment

**Achieves**: dashboard live on a public Vercel URL, connected to the real Supabase project.

**Covers**:
- Vercel project created, linked to the repo, root directory set to `/apps/dashboard`
- Env vars (Supabase URL, anon key) added in Vercel project settings, matching `.env.local.example` keys
- Production deploy triggered and confirmed working

**Verify**: production URL loads `/settings` and shows the same live data as local dev; no build errors in Vercel deploy log.

---

### Commit 6 — GitHub Actions workflow skeleton

**Achieves**: proof that scheduled automation can run and write to Supabase, with no real module logic yet — just a heartbeat.

**Covers**:
- `.github/workflows/heartbeat.yml` — scheduled (e.g. daily) + `workflow_dispatch` for manual trigger
- Repo secrets added: Supabase URL + service role key (service role, not anon, since Actions writes need elevated access)
- Script it runs (`/automations/heartbeat.js` or similar): updates `last_run_at` on a test row in `modules` to prove the Actions → Supabase write path works

**Verify**: manually trigger the workflow from the Actions tab, confirm `last_run_at` updates in Supabase table editor and reflects on the deployed `/settings` page.

---

## Definition of done

PR merged with all six commits, dashboard live on Vercel showing real Supabase data, migration history clean and reproducible from a fresh clone, and a working scheduled + manually-triggerable Actions workflow proven end to end. At this point the repo is ready for Module 1 (Jobs) to be added as new migrations + new workflow + new route, without touching any of the above.
