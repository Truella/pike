# PIKE_SETUP_PRT.md

One prompt per commit, matching PIKE_SETUP_TRD.md. All six commits ship in a single PR.

---PROMPT---

**Commit 1 — Repo init and folder structure**

Goal: Initialize the pike repo with the base folder structure and a README.

Files: `/README.md`, `/.gitignore`, empty folders `/apps/dashboard`, `/automations`, `/.github/workflows`, `/supabase/migrations`, `/docs` (use `.gitkeep` where needed since git doesn't track empty folders).

Constraints: README should state the project's purpose in 2-3 sentences and note it follows the module-registry pattern (tables → workflow → route per module). `.gitignore` should cover standard Node/Next.js/Vercel/Supabase local artifacts (`node_modules`, `.env.local`, `.next`, `.vercel`, `supabase/.temp`).

Verify: fresh clone shows the exact folder tree from the TRD; no unintended files tracked.

---PROMPT---

**Commit 2 — Supabase project and migration tooling**

Goal: Set up Supabase CLI migration tooling and create the first migration for the `modules` registry table.

Files: `/supabase/config.toml` (from `supabase init`), `/supabase/migrations/0001_create_modules.sql`.

Constraints: Migration creates exactly the `modules` table as specified in the PRD (`id text primary key, name text not null, status text default 'active', last_run_at timestamptz, notes text`). Do not add columns beyond this scope. CLI must be linked to the real Supabase project via project ref, not hardcoded credentials in any committed file.

Verify: `supabase migration list` shows `0001` applied against the linked project; `modules` table visible in the Supabase dashboard with matching columns; re-running migrations from a clean clone reproduces identical schema.

---PROMPT---

**Commit 3 — Next.js dashboard scaffold and installs**

Goal: Scaffold the Next.js dashboard app inside `/apps/dashboard` with the project's standard stack, and install core dependencies.

Files: everything under `/apps/dashboard` from `create-next-app`, plus `/apps/dashboard/.env.local.example`.

Constraints: Use App Router + TypeScript + Tailwind, matching the conventions already established in the PREP repo. Install `@supabase/supabase-js` as a dependency. `.env.local.example` should list placeholder keys only (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) with no real values. Base layout should include a minimal nav shell with placeholder links for future module routes (Jobs, Hackathons, Study, Settings) — no working routes yet beyond the default.

Verify: `npm run dev` boots without errors; typecheck and lint pass clean; nav shell renders with placeholder links.

---PROMPT---

**Commit 4 — Supabase client integration and /settings route**

Goal: Wire up a typed Supabase client and build the first real, read-only route that displays live data from the `modules` table.

Files: `/apps/dashboard/lib/supabase.ts`, `/apps/dashboard/app/settings/page.tsx`.

Constraints: Supabase client reads URL/anon key from env vars only, no hardcoded values. `/settings` route is read-only — fetch and render `modules` rows (name, status, last_run_at, notes) as a simple list, no mutation UI. Follow existing PREP conventions for data fetching (React Query if already the established pattern) rather than introducing a new fetching approach.

Verify: insert a test row into `modules` via Supabase dashboard, confirm it renders on `/settings` locally; no console errors; typecheck/lint clean.

---PROMPT---

**Commit 5 — Vercel deployment**

Goal: Deploy the dashboard to Vercel, connected to the live Supabase project.

Files: Vercel project configuration (via Vercel dashboard/CLI, not necessarily a repo file) — root directory set to `/apps/dashboard`; if a `vercel.json` is needed for monorepo root config, add it at repo root.

Constraints: Env vars in Vercel must match the keys defined in `.env.local.example` exactly. Do not commit any real credentials to the repo at any point in this commit.

Verify: production Vercel URL loads `/settings` and shows the same live data as local dev; Vercel build log shows no errors.

---PROMPT---

**Commit 6 — GitHub Actions workflow skeleton**

Goal: Prove the scheduled-automation-to-Supabase write path works, with no real module logic yet.

Files: `/.github/workflows/heartbeat.yml`, `/automations/heartbeat.js` (or `.ts` if the repo's automations are set up in TypeScript).

Constraints: Workflow triggers on a daily schedule and supports `workflow_dispatch` for manual runs. Script updates `last_run_at` on a test row in `modules` (use `heartbeat` as the `id`) using the Supabase service role key, not the anon key, since Actions needs write access beyond RLS read policies. Service role key stored only as a GitHub repo secret, never committed.

Verify: manually trigger the workflow from the Actions tab; confirm `last_run_at` updates in the Supabase table editor and reflects on the deployed `/settings` page after a refresh.

---PROMPT---
