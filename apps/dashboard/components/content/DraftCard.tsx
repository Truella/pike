"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Database } from "@/lib/supabase/database.types";

type ContentRow = Database["public"]["Tables"]["pike_content"]["Row"];

interface DraftCardProps {
  post: ContentRow;
  index?: number;
  onPostUpdate: (updatedPost: ContentRow) => void;
}

export function DraftCard({ post, index, onPostUpdate }: DraftCardProps) {
  const [isEditingText, setIsEditingText] = useState(false);
  const [draftText, setDraftText] = useState(post.draft_text);
  const [scheduledAt, setScheduledAt] = useState<string>(
    post.scheduled_at
      ? new Date(post.scheduled_at).toISOString().slice(0, 16)
      : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mutate(updates: Partial<ContentRow>): Promise<ContentRow | null> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Session expired. Please refresh.");
      return null;
    }

    const { data, error: err } = await supabase
      .from("pike_content")
      .update(updates)
      .eq("id", post.id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (err) {
      setError(err.message);
      return null;
    }
    return data;
  }

  // --- Needs Review actions ---
  async function handleApprove() {
    setIsSaving(true);
    setError(null);

    const hasScheduleDate = Boolean(scheduledAt);
    const updates: Partial<ContentRow> = {
      draft_text: draftText,
      status: hasScheduleDate ? "scheduled" : "approved",
      scheduled_at: hasScheduleDate ? new Date(scheduledAt).toISOString() : null,
    };

    const updated = await mutate(updates);
    if (updated) {
      onPostUpdate(updated);
    }
    setIsSaving(false);
  }

  async function handleReject() {
    setIsSaving(true);
    setError(null);
    const updated = await mutate({ status: "rejected" });
    if (updated) {
      onPostUpdate(updated);
    }
    setIsSaving(false);
  }

  // --- Text Save action ---
  async function handleSaveText() {
    setIsSaving(true);
    setError(null);
    const updated = await mutate({ draft_text: draftText });
    if (updated) {
      setIsEditingText(false);
      onPostUpdate(updated);
    }
    setIsSaving(false);
  }

  // --- Schedule actions for Approved & Scheduled tabs ---
  async function handleSchedulePost() {
    if (!scheduledAt) {
      setError("Please pick a schedule date & time.");
      return;
    }
    setIsSaving(true);
    setError(null);

    const updated = await mutate({
      status: "scheduled",
      scheduled_at: new Date(scheduledAt).toISOString(),
    });
    if (updated) {
      onPostUpdate(updated);
    }
    setIsSaving(false);
  }

  async function handleUpdateScheduleDate() {
    if (!scheduledAt) {
      setError("Please pick a schedule date & time.");
      return;
    }
    setIsSaving(true);
    setError(null);

    const updated = await mutate({
      scheduled_at: new Date(scheduledAt).toISOString(),
    });
    if (updated) {
      onPostUpdate(updated);
    }
    setIsSaving(false);
  }

  async function handleUnschedule() {
    setIsSaving(true);
    setError(null);

    const updated = await mutate({
      status: "approved",
      scheduled_at: null,
    });
    if (updated) {
      setScheduledAt("");
      onPostUpdate(updated);
    }
    setIsSaving(false);
  }

  async function handleRevertToReview() {
    setIsSaving(true);
    setError(null);

    const updated = await mutate({
      status: "needs_review",
      scheduled_at: null,
    });
    if (updated) {
      setScheduledAt("");
      onPostUpdate(updated);
    }
    setIsSaving(false);
  }

  const statusColor =
    post.status === "needs_review"
      ? "text-alert"
      : post.status === "approved" || post.status === "scheduled"
      ? "text-signal"
      : "text-muted";

  const formattedCreated = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(post.created_at));

  const formattedScheduled = post.scheduled_at
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(post.scheduled_at))
    : null;

  return (
    <Card index={index} className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-xs font-bold uppercase text-signal">
            {post.post_type === "build_update" ? "Build Update" : "Trend"}
          </span>
          <span className={`font-mono text-xs font-bold uppercase ${statusColor}`}>
            {post.status.replace("_", " ")}
          </span>
          {post.source_type && (
            <span className="font-mono text-xs text-muted">
              ({post.source_type})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted">
            Created: {formattedCreated}
          </span>
          {/* Pen / Edit icon toggles ONLY draft text editing */}
          {post.status !== "needs_review" && (
            <button
              type="button"
              onClick={() => setIsEditingText((prev) => !prev)}
              aria-label="Toggle text editing"
              className="flex items-center gap-1 font-mono text-xs font-bold text-muted hover:text-signal transition-colors"
            >
              <span>✏️</span>
              <span>{isEditingText ? "Close Text Edit" : "Edit Text"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Draft Text Display / Textarea */}
      {post.status === "needs_review" || isEditingText ? (
        <div className="flex flex-col gap-2">
          <textarea
            id={`draft-${post.id}`}
            rows={7}
            className="pike-border rounded-token border-border bg-background p-3 font-mono text-sm text-ink outline-none focus:border-signal disabled:opacity-60 resize-y"
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            disabled={isSaving}
          />
          {post.status !== "needs_review" && (
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={isSaving || draftText === post.draft_text}
                onClick={handleSaveText}
              >
                Save Text
              </Button>
            </div>
          )}
        </div>
      ) : (
        <p className="whitespace-pre-wrap rounded-token border border-border bg-background p-3 font-mono text-sm text-ink">
          {post.draft_text}
        </p>
      )}

      {/* Always-visible Schedule Controls & Actions */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-t border-border pt-3">
        {/* Date Picker (Always visible) */}
        <div className="flex flex-col gap-1 max-w-xs">
          <label
            htmlFor={`schedule-${post.id}`}
            className="font-mono text-xs font-bold uppercase text-muted"
          >
            {post.status === "scheduled"
              ? "Scheduled for"
              : "Schedule for (optional)"}
          </label>
          <input
            id={`schedule-${post.id}`}
            type="datetime-local"
            className="pike-border rounded-token border-border bg-background px-3 py-2 font-mono text-xs text-ink outline-none focus:border-signal disabled:opacity-60"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            disabled={isSaving}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {post.status === "needs_review" && (
            <>
              <Button
                type="button"
                disabled={isSaving}
                onClick={handleApprove}
              >
                {scheduledAt ? "Approve & Schedule" : "Approve"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSaving}
                onClick={handleReject}
              >
                Reject
              </Button>
            </>
          )}

          {post.status === "approved" && (
            <>
              <Button
                type="button"
                disabled={isSaving || !scheduledAt}
                onClick={handleSchedulePost}
              >
                Schedule
              </Button>
              <button
                type="button"
                onClick={handleRevertToReview}
                disabled={isSaving}
                className="pike-border rounded-token border-border px-3 py-1.5 font-mono text-xs font-bold uppercase text-alert hover:bg-alert hover:text-background"
              >
                Revert to Review
              </button>
            </>
          )}

          {post.status === "scheduled" && (
            <>
              <Button
                type="button"
                disabled={
                  isSaving ||
                  !scheduledAt ||
                  (post.scheduled_at
                    ? new Date(scheduledAt).toISOString() ===
                      new Date(post.scheduled_at).toISOString()
                    : false)
                }
                onClick={handleUpdateScheduleDate}
              >
                Update Schedule
              </Button>
              <button
                type="button"
                onClick={handleUnschedule}
                disabled={isSaving}
                className="pike-border rounded-token border-border px-3 py-1.5 font-mono text-xs font-bold uppercase text-muted hover:text-ink"
              >
                Unschedule
              </button>
              <button
                type="button"
                onClick={handleRevertToReview}
                disabled={isSaving}
                className="pike-border rounded-token border-border px-3 py-1.5 font-mono text-xs font-bold uppercase text-alert hover:bg-alert hover:text-background"
              >
                Revert to Review
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="font-mono text-xs text-alert">{error}</p>}
      {isSaving && (
        <p className="font-mono text-xs text-muted animate-pulse">Saving…</p>
      )}
    </Card>
  );
}
