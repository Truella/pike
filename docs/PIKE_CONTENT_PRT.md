# PIKE_CONTENT_PRT.md

One prompt per commit, matching PIKE_CONTENT_TRD.md. All seven commits ship in a single PR.

---PROMPT---

**Commit 1 — Schema migrations**

Goal: Create migrations for the content queue and topics bank tables.

Files: `supabase/migrations/0006_create_pike_content.sql`, `supabase/migrations/0007_create_pike_topics_bank.sql`

Constraints: `pike_content` columns exactly as specified in the TRD (`id, post_type, source_type, source_ref, draft_text, media_urls, status, scheduled_at, published_at, created_at`), with `post_type` constrained to `build_update / trend`, `source_type` to `manual / activity_scan / topics_bank`, and `status` to `needs_review / approved / scheduled / published / rejected`, matching the check-constraint pattern already used in `jobs_listings.status`. `pike_topics_bank` columns: `id, topic, notes, source (manual / groq_suggested), used, used_at, created_at`.

Verify: both migrations apply cleanly via `supabase migration list`; inserting a `pike_content` row with an invalid `status` or `post_type` fails as expected.

---PROMPT---

**Commit 2 — Master prompt templates and style examples**

Goal: Build the two strict prompt templates (build-update, trend) and the shared style examples file that anchors voice.

Files: `automations/content/prompts/buildUpdate.js`, `automations/content/prompts/trend.js`, `automations/content/styleExamples.js`

Constraints: `styleExamples.js` exports an array of 3-5 real past posts as few-shot text (populate with placeholder text if real examples aren't available yet, clearly marked `TODO: replace with real posts`). Each prompt file exports a single function taking source material (text) and returning a composed system prompt string containing, in fixed order: voice rules (first person, no em dashes, no marketing language, references the style examples), structure rules (hook, context, insight, close — no engagement-bait closers like "thoughts?"), and format rules (plain text output, target length range, 0-3 hashtags maximum, only if genuinely relevant). No other file in the module should construct prompts directly — all generation goes through these two functions.

Verify: calling each function with sample source text returns a string containing all three rule sections and the embedded style examples; the two templates produce structurally different prompts (different structure rules) when given the same input.

---PROMPT---

**Commit 3 — Source selection and generation script**

Goal: Build the logic that picks what to write about and generates a draft via Groq.

Files: `automations/content/generate.js`, `automations/content/sourceSelectors.js`

Constraints: `sourceSelectors.js` exports `getBuildUpdateSource()` — queries `study_progress` for rows with `status = 'done'` and `completed_at` within the last N days (configurable, default 7) that have notes, returns the most substantial one; if none exist, returns a flag indicating a manual note is required instead. Also exports `getTrendSource()` — queries `pike_topics_bank` for the oldest `used = false` row; if none exist, calls Groq once with a simple prompt to suggest 3-5 current frontend/dev topic seeds, inserts them into `pike_topics_bank` with `source = 'groq_suggested'`, then returns the first one. `generate.js` counts this week's `pike_content` rows grouped by `post_type`, determines which type is behind the 2/2 weekly target (default to `build_update` on a tie), calls the matching source selector, composes the prompt via the correct Commit 2 template, calls Groq's `llama-3.1-8b-instant` (same model/env credentials already used in the PREP AI review feature), and inserts the result into `pike_content` with `status = 'needs_review'` and the correct `source_type`/`source_ref`.

Verify: running the script with an empty topics bank still produces a draft (via the Groq-suggested-topics fallback); running it when both post types are already at 2 for the current week does not insert anything; every inserted row has `status = 'needs_review'`, never anything else.

---PROMPT---

**Commit 4 — Buffer-triggered generation workflow**

Goal: Automate generation on a schedule, but only when the ready-to-publish buffer is actually low.

Files: `.github/workflows/content-generate.yml`

Constraints: cron every 2 days plus `workflow_dispatch`. Script counts `pike_content` rows where `status IN ('approved', 'scheduled')`; if the count is below a threshold (default 3, exposed as an env var so it's easy to tune later), calls `generate.js` enough times to bring the buffer back to threshold, then sends a Telegram message via the shared `automations/lib/notify.js` reporting how many new drafts were added and need review. If the buffer is already at or above threshold, the workflow exits without generating or notifying. Update the `pike-content` row in `modules` (`last_run_at`) on every run regardless of whether generation happened.

Verify: manually trigger with the buffer artificially low (e.g. reject/delete test rows first), confirm new `needs_review` drafts appear and a Telegram message arrives with an accurate count; manually trigger again immediately after with a healthy buffer, confirm no new drafts and no message.

---PROMPT---

**Commit 5 — Media upload utility**

Goal: Implement the LinkedIn Images API upload flow as a single reusable function.

Files: `automations/linkedin/media.js`

Constraints: exports one function taking an image buffer/file path and returning an image URN. Internally performs the three-step flow: `POST /rest/images?action=initializeUpload` to register and get an upload URL, `PUT` the binary to that URL, then return the URN from the initial registration response. Wrap each step so a failure at any point throws a clear, specific error rather than allowing the caller to proceed with a partial/invalid URN. Do not attempt to reference the image in a post from within this file — that's the publish script's job.

Verify: uploading a valid test image returns a well-formed URN string; passing an invalid file path or corrupted image throws a caught, descriptive error rather than crashing silently or returning a bad URN.

---PROMPT---

**Commit 6 — Publish script and workflow**

Goal: Publish only approved, scheduled, due posts to LinkedIn, with optional media.

Files: `automations/linkedin/publish.js`, `.github/workflows/linkedin-publish.yml`

Constraints: query `pike_content` for `status = 'approved'` and `scheduled_at <= now()`, ordered oldest first. For each row: if `media_urls` is populated, call Commit 5's upload function for each and collect URNs; call the LinkedIn Posts API (`/rest/posts`, the current API — not the deprecated `/v2/ugcPosts` endpoint) with the draft text and any media URNs. On success, update `status = 'published'` and set `published_at`. On failure, leave the row's status untouched (so it retries next run) and send a Telegram failure notice via the shared `notify.js` including the row id and error. Daily cron plus `workflow_dispatch`. Update the `pike-linkedin` row in `modules` (`last_run_at`) after the run completes.

Verify: manually approve and set `scheduled_at` to now on a test post, trigger the workflow, confirm it publishes to LinkedIn and `status` becomes `published`; a post with a future `scheduled_at` is correctly left untouched; a deliberately broken test post (bad media path) fails cleanly with a Telegram alert and stays in `approved` status for retry.

---PROMPT---

**Commit 7 — `/content` dashboard route**

Goal: Build the review queue, manual topic entry, and weekly balance view.

Files: `apps/dashboard/app/content/page.tsx`, `apps/dashboard/components/content/DraftCard.tsx`, `apps/dashboard/components/content/TopicsBank.tsx`

Constraints: main list shows `needs_review` rows first with editable draft text (textarea), an approve button that also sets `scheduled_at` via a date picker, and a reject button (`status = 'rejected'`). Below that, `approved`/`scheduled` rows shown read-only with their scheduled date. `TopicsBank` component is a simple add-a-row form writing directly into `pike_topics_bank`. A small header stat shows this week's `build_update` vs `trend` counts, computed with the exact same query logic used in `generate.js` (extract into a shared query function both the dashboard and the automation import, rather than duplicating the logic in two places). All mutations follow the existing write pattern from `JobRow`/`HackathonRow`.

Verify: editing and approving a draft persists correctly and updates its status; a topic added via `TopicsBank` is picked up by `getTrendSource()` on the next generation run; the weekly count shown in the dashboard matches what `generate.js` would compute at the same moment.

---PROMPT---
