"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Database } from "@/lib/supabase/database.types";

type ContentRow = Database["public"]["Tables"]["pike_content"]["Row"];

interface DraftCardProps {
  post: ContentRow;
  onStatusChange: (id: string, status: string, scheduledAt?: string) => void;
}

export function DraftCard({ post, onStatusChange }: DraftCardProps) {
  const [draftText, setDraftText] = useState(post.draft_text);
  const [scheduledAt, setScheduledAt] = useState(
    post.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReadOnly = post.status !== "needs_review";

  async function mutate(updates: Partial<ContentRow>) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Session expired. Please refresh."); return false; }

    const { error: err } = await supabase
      .from("pike_content")
      .update(updates)
      .eq("id", post.id)
      .eq("user_id", user.id);

    if (err) { setError(err.message); return false; }
    return true;
  }

  async function handleTextBlur() {
    if (draftText === post.draft_text || isReadOnly) return;
    setIsSaving(true);
    setError(null);
    await mutate({ draft_text: draftText });
    setIsSaving(false);
  }

  async function handleApprove() {
    if (!scheduledAt) { setError("Set a scheduled date before approving."); return; }
    setIsSaving(true);
    setError(null);
    const ok = await mutate({ status: "approved", scheduled_at: new Date(scheduledAt).toISOString() });
    if (ok) onStatusChange(post.id, "approved", scheduledAt);
    setIsSaving(false);
  }

  async function handleReject() {
    setIsSaving(true);
    setError(null);
    const ok = await mutate({ status: "rejected" });
    if (ok) onStatusChange(post.id, "rejected");
    setIsSaving(false);
  }

  const statusColor =
    post.status === "needs_review" ? "text-alert" :
    post.status === "approved" || post.status === "scheduled" ? "text-signal" :
    "text-muted";

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <span className="font-mono text-xs font-bold uppercase text-signal">
            {post.post_type === "build_update" ? "Build Update" : "Trend"}
          </span>
          <span className={`ml-3 font-mono text-xs font-bold uppercase ${statusColor}`}>
            {post.status.replace("_", " ")}
          </span>
        </div>
        <span className="font-mono text-xs text-muted">
          {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(post.created_at))}
        </span>
      </div>

      {isReadOnly ? (
        <p className="whitespace-pre-wrap rounded-token border border-border bg-background p-3 text-sm text-ink">
          {post.draft_text}
        </p>
      ) : (
        <textarea
          id={`draft-${post.id}`}
          rows={8}
          className="pike-border rounded-token border-border bg-background p-3 text-sm text-ink outline-none focus:border-signal disabled:opacity-60 resize-y"
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onBlur={handleTextBlur}
          disabled={isSaving}
        />
      )}

      {!isReadOnly && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={`schedule-${post.id}`} className="font-mono text-xs text-muted">
              Schedule for
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
          <Button
            type="button"
            disabled={isSaving}
            onClick={handleApprove}
          >
            Approve
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={handleReject}
          >
            Reject
          </Button>
        </div>
      )}

      {isReadOnly && post.scheduled_at && (
        <p className="font-mono text-xs text-muted">
          Scheduled: {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(post.scheduled_at))}
        </p>
      )}

      {error && <p className="font-mono text-xs text-alert">{error}</p>}
      {isSaving && <p className="font-mono text-xs text-muted animate-pulse">Saving…</p>}
    </Card>
  );
}
