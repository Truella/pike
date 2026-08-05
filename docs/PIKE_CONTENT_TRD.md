# PIKE_CONTENT_TRD.md

## Scope

Module 4: LinkedIn Content Automation. One self-contained PR, ships independently of Jobs, Study, and Hackathons. Builds on PIKE_SETUP and reuses the shared `automations/lib/notify.js` (Telegram) utility. Uses Groq (free tier, already established for AI review in PREP) for generation — no paid LLM API.

Goal: minimum 4 posts/week, split ~2 build-update / ~2 trend-or-meme, generated in batches ahead of need, always human-reviewed before publish, never auto-published without approval.

## Conventions

Follows PIKE_SETUP conventions: migrations for all schema, module tables prefixed `pike_content` / `pike_topics_bank`, workflows isolated in their own files, route isolated under `/apps/dashboard/app/content`.

---

## PR — Module 4: Content Automation

### Commit 1 — Schema migrations

**Achieves**: tables for the content queue and the trend/meme topic bank.

**Files**: `supabase/migrations/0006_create_pike_content.sql`, `supabase/migrations/0007_create_pike_topics_bank.sql`

**Covers**:
- `pike_content`: `id, post_type (build_update / trend), source_type (manual / activity_scan / topics_bank), source_ref, draft_text, media_urls, status (needs_review / approved / scheduled / published / rejected), scheduled_at, published_at, created_at`
- `pike_topics_bank`: `id, topic, notes, source (manual / groq_suggested), used, used_at, created_at`

**Verify**: both migrations apply cleanly; inserting a row with an invalid `status` or `post_type` value fails as expected (check constraints).

---

### Commit 2 — Master prompt templates and style examples

**Achieves**: the strict, reusable prompt structure that prevents generic AI output.

**Files**: `automations/content/prompts/buildUpdate.js`, `automations/content/prompts/trend.js`, `automations/content/styleExamples.js`

**Constraints**: each prompt file exports a function that composes a system prompt with fixed sections — voice rules (first person, no em dashes, no marketing language), structure rules (hook → context → insight → close), format rules (plain text, length range, hashtag cap of 0-3, no engagement-bait closers). `styleExamples.js` holds 3-5 of your actual past posts as few-shot examples, imported into both templates. No free-form prompting anywhere else in the pipeline — every generation call goes through one of these two functions.

**Verify**: manually calling each template function with sample source material produces a well-formed prompt string containing all required sections; no hardcoded content leaks between the two templates.

---

### Commit 3 — Source selection and generation script

**Achieves**: decides what to write about (manual note, your own recent activity, or the topics bank) and generates the draft.

**Files**: `automations/content/generate.js`, `automations/content/sourceSelectors.js`

**Constraints**: `sourceSelectors.js` exports two functions — `getBuildUpdateSource()` (queries recent completed activity: `study_progress` rows marked `done` in the last N days with notes, recently merged Pike module PRs if tracked, or falls back to asking for a manual note if nothing recent exists) and `getTrendSource()` (pulls the oldest `used = false` row from `pike_topics_bank`; if the bank is empty, calls Groq once to suggest 3-5 new topic seeds, inserts them as `source = groq_suggested`, then proceeds). `generate.js` checks this week's `pike_content` counts by `post_type`, picks whichever is behind the 2/2 target, selects a source, composes the prompt via the correct template from Commit 2, calls Groq (`llama-3.1-8b-instant`, matching the model already used in PREP), and inserts the result into `pike_content` with `status = needs_review`.

**Verify**: running the script with no manual input still produces a real draft using the activity-scan or topics-bank fallback; running it when this week's counts are already balanced picks the correct lagging type; draft is never inserted with any status other than `needs_review`.

---

### Commit 4 — Buffer-triggered generation workflow

**Achieves**: automatic batch generation only when the ready-to-publish queue is running low, with a Telegram nudge.

**Files**: `.github/workflows/content-generate.yml`

**Constraints**: schedule every 2 days plus `workflow_dispatch`. On run, count `pike_content` rows where `status IN ('approved', 'scheduled')`. If below threshold (default 3, adjustable), run `generate.js` for enough posts to refill the buffer, then send a Telegram message via the shared `notify.js` reporting how many new drafts need review. If the buffer is already healthy, exit without generating or notifying. Update `pike-content` row in `modules` (`last_run_at`) regardless of whether generation ran.

**Verify**: manually trigger with a low buffer, confirm new `needs_review` drafts appear and a Telegram message arrives; manually trigger with a healthy buffer, confirm no drafts are added and no message is sent.

---

### Commit 5 — Media upload utility

**Achieves**: support for attaching images to posts via LinkedIn's official Images API.

**Files**: `automations/linkedin/media.js`

**Constraints**: implements the three-step flow — register upload (`POST /rest/images?action=initializeUpload`), upload the binary to the returned URL, return the resulting image URN. Exposed as a single function taking an image file/buffer and returning a URN, so the publish script doesn't need to know the multi-step details. Handles and surfaces upload failures clearly rather than silently proceeding to post creation, since LinkedIn requires the image to finish processing before it's referenced.

**Verify**: uploading a test image returns a valid URN; a deliberately malformed/oversized image fails clearly with a caught error, not a silent post-without-image.

---

### Commit 6 — Publish script and workflow

**Achieves**: publishes only human-approved, scheduled posts, with or without media, to LinkedIn.

**Files**: `automations/linkedin/publish.js`, `.github/workflows/linkedin-publish.yml`

**Constraints**: queries `pike_content` for `status = approved` and `scheduled_at <= now()`, oldest first. For each, if `media_urls` is populated, uploads via Commit 5's utility and includes the returned URN(s) in the post payload; otherwise publishes text-only via the LinkedIn Posts API (`/rest/posts`, not the deprecated `/v2/ugcPosts`). On success, updates `status = published` and `published_at`. On failure, leaves status unchanged and reports the failure via Telegram rather than retrying silently. Daily schedule plus `workflow_dispatch`. Updates the `pike-linkedin` row in `modules` (`last_run_at`).

**Verify**: manually approve and schedule a test post, trigger the workflow, confirm it appears on LinkedIn and `status` updates to `published`; a post with `scheduled_at` in the future is correctly skipped.

---

### Commit 7 — `/content` dashboard route

**Achieves**: review queue, manual topic entry, and weekly type-balance visibility.

**Files**: `apps/dashboard/app/content/page.tsx`, `apps/dashboard/components/content/DraftCard.tsx`, `apps/dashboard/components/content/TopicsBank.tsx`

**Constraints**: main view lists `pike_content` rows needing review first (editable draft text, approve + schedule-date picker, reject button), then approved/scheduled ones read-only with their scheduled date. A separate section lets you add rows directly to `pike_topics_bank`. Weekly build-update vs trend count shown at the top, matching the same logic `generate.js` uses so the dashboard and the automation never disagree on what's "behind." Editing and approving follows the same mutation pattern established in Jobs/Hackathons status dropdowns.

**Verify**: editing a draft's text and approving it persists correctly; a newly added topics-bank entry is available to `generate.js` on its next run; weekly counts shown match actual `pike_content` rows for the current week.

---

## Definition of done

All seven commits merged in one PR. Generation runs autonomously every 2 days but only acts when the queue is genuinely low, always producing human-reviewable drafts, never auto-publishing. Publishing runs daily and only touches approved, scheduled, human-reviewed posts. Media uploads work end to end. Dashboard is the single place review, scheduling, and topic-bank management happen. Zero paid API usage anywhere in the pipeline.
