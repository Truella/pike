# PIKE_GAPS.md

## Purpose

The original module TRDs and PRTs were drafted before authentication, user scoping, the theme system, and several shared automation conventions were added to Pike. This document records those cross-cutting decisions once so older and future module plans do not need to repeat the same corrections.

Read this file alongside the relevant module TRD and PRT. The module documents remain the source of truth for feature-specific behavior; this file is the source of truth for project-wide conventions added after those documents were drafted. If an older module document conflicts with this file, this file takes precedence.

## Current Migration Order

Migration filenames must use the next available repository-wide number, regardless of numbers written in older module documents. Never reuse or rename an applied migration number.

The current applied sequence is:

1. `0001_create_modules.sql`
2. `0002_add_user_scoping_modules.sql`
3. `0003_create_pike_preferences.sql`
4. `0004_create_jobs_listings.sql`
5. `0005_create_module_heartbeat_function.sql`

The next schema migration must therefore start at `0006`. Before creating any later migration, inspect `supabase/migrations/` and use the next available number rather than trusting a stale number in a TRD or PRT.

## Authentication

Pike now uses Supabase email/password authentication. There is no public sign-up route.

- `apps/dashboard/lib/supabase/client.ts` is the typed browser client.
- `apps/dashboard/lib/supabase/server.ts` is the typed cookie-backed client for Server Components and Route Handlers.
- `apps/dashboard/proxy.ts` refreshes sessions and redirects unauthenticated requests to `/login`.
- `/login` is the only public application route.
- The Next.js 16 `proxy.ts` convention is required; do not add `middleware.ts`.
- Server Components and Route Handlers must verify identity with `supabase.auth.getUser()` before accessing user-owned data.
- Client mutations must obtain the authenticated user from Supabase, not from form data, URL parameters, or other caller-controlled input.

Any older instruction referring to a single `lib/supabase.ts` client is superseded by the browser/server client split above.

## User-Owned Schema

Every user-owned table in Jobs, Study, Hackathons, Content, and future modules must include:

```sql
user_id uuid references auth.users(id) not null
```

Use `default auth.uid()` only when it is useful for authenticated database inserts. Application code and service-role automations must still assign `user_id` explicitly; the default is not a substitute for explicit ownership.

Every user-owned table must enable RLS and define separate policies for select, insert, update, and delete. Each policy must compare ownership with `auth.uid()` as documented in `docs/USER_SCOPING.md`.

Do not add broad `anon` policies. An anonymous Supabase client must not be able to read or mutate user-owned rows.

## Query Scoping

RLS is the database security boundary, but application queries must also scope ownership explicitly as defense in depth.

- Reads must include `.eq("user_id", user.id)`.
- Updates and deletes must filter by the row identifier and `.eq("user_id", user.id)`.
- Inserts must include `user_id: user.id` from the verified session.
- Internal ownership fields such as `user_id` must not be included in user-facing exports.
- The typed `Database` definition in `apps/dashboard/lib/supabase/database.types.ts` must be updated whenever migrations add or change tables.

## Uniqueness And Dedupe

Constraints that were originally global must usually become owner-scoped after authentication.

For a user-owned scraped table, do not use a global `unique (link)` constraint. Use:

```sql
unique (user_id, link)
```

Automations must use the same composite columns as their PostgREST or Supabase upsert conflict target. This prevents duplicates for one owner without preventing two users from saving the same public listing.

Apply this principle to other natural keys where separate users may legitimately own equivalent records.

## Service-Role Automations

GitHub Actions automations use the Supabase service-role key because they write outside a browser session. The service role bypasses RLS, so ownership must be enforced in script logic.

Every owner-specific automation must read and validate:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PIKE_OWNER_USER_ID`

Every inserted row must include `user_id: PIKE_OWNER_USER_ID`. Every update, delete, and count query must filter by `PIKE_OWNER_USER_ID`. Never expose the service-role key or `PIKE_OWNER_USER_ID` through `NEXT_PUBLIC_*` variables or browser code.

The shared `automations/lib/heartbeat.js` helper must be called with only the module ID after successful automation work. It invokes the service-role-only `upsert_module_heartbeat` database function, which creates a missing module row with its derived name, `active` status, `PIKE_OWNER_USER_ID`, and the current `last_run_at`. On conflict, it updates only `last_run_at`; it must never overwrite an existing row's `name`, `status`, or `user_id`. Failed module work must not call the heartbeat helper.

## Notifications

Telegram transport is shared through `automations/lib/notify.js`.

- The shared function accepts only a message string.
- Module-specific counting and message composition stay in the module folder.
- Telegram credentials come from `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` repository secrets.
- Counts derived with the service role must be explicitly filtered by `PIKE_OWNER_USER_ID`.
- A notification must report actual results, such as rows newly inserted, rather than all rows fetched from an external source.

## Dashboard Data Flow

The established dashboard pattern is Server Components for initial owner-scoped reads and small Client Components for interactive mutations.

- Use the typed server Supabase client for page data.
- Use the typed browser Supabase client for interactive row mutations.
- Do not introduce React Query unless a later requirement demonstrates a concrete need for client caching beyond the established pattern.
- Mutations should provide immediate feedback, disable conflicting controls while saving, and roll optimistic state back when persistence fails.
- Protected pages should still verify the user even though `proxy.ts` guards routes.

## Theme And UI

The theme system was added before the feature modules and is mandatory for all module UI.

- Tailwind CSS v4 is configured through `apps/dashboard/app/globals.css` and its single `@theme` block.
- Do not create `tailwind.config.js` or use deprecated Tailwind v3 directives.
- Use semantic utilities such as `bg-background`, `bg-surface`, `text-ink`, `text-muted`, `text-signal`, `text-alert`, `border-border`, `rounded-token`, and `shadow-token`.
- Do not add hardcoded hex colors or arbitrary color classes in module components.
- Reuse `Button`, `Card`, and `StatusTag` from `apps/dashboard/components/ui/` instead of recreating base controls.
- Theme-specific appearance belongs in token-driven CSS, not React branches based on the active theme.
- The four supported themes are `brutalist`, `warm`, `pop`, and `sticky`.
- `docs/pike-style-preview.html` is the visual reference for theme-specific patterns.

## Exports

Module exports must represent the rows currently visible in the UI, including successful local edits and active filtering. They must not perform an independent unfiltered fetch at export time. Internal fields such as `user_id` must be omitted.

Jobs established SheetJS through the `xlsx` package and the shared themed `Button`; later spreadsheet exports should reuse that pattern unless their module documents explicitly require another format.

## Manual Automation Triggers

Current module documents use GitHub Actions `workflow_dispatch` as the manual automation trigger. A dashboard button that dispatches a workflow is not implicitly included in module scope.

If a dashboard-triggered run is added later, it requires an explicit feature prompt and a server-only integration. GitHub tokens, service-role credentials, and other privileged secrets must never be sent to browser code.

## Precedence Checklist

Before implementing any module commit:

1. Read its TRD and PRT for feature behavior and commit boundaries.
2. Apply this document's authentication, ownership, migration, automation, query, and UI conventions.
3. Inspect the current repository before using migration numbers, shared helper names, or client paths from an older prompt.
4. Prefer existing shared clients, helpers, tokens, and primitives over introducing parallel implementations.
5. Stop at the requested commit boundary unless explicitly told to continue.
