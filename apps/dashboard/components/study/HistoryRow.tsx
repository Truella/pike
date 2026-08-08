"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";

export interface HistoryItem {
  topic_id: string;
  status: string;
  notes: string | null;
  completed_at: string | null;
  study_curriculum: {
    title: string;
    section: string;
    url: string;
  };
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function HistoryRow({
  item,
  isEditing,
  onToggleEdit,
}: {
  item: HistoryItem;
  isEditing: boolean;
  onToggleEdit: () => void;
}) {
  const topic = item.study_curriculum;
  const [status, setStatus] = useState<string>(item.status);
  const [notes, setNotes] = useState<string>(item.notes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setError(null);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated");
      setIsSaving(false);
      return;
    }

    const updates: {
      status: string;
      notes: string | null;
      completed_at?: string | null;
      started_at?: string | null;
    } = {
      status,
      notes: notes || null,
    };

    if (status !== "done") {
      updates.completed_at = null;
    }

    const { error: updateError } = await supabase
      .from("study_progress")
      .update(updates)
      .eq("topic_id", item.topic_id)
      .eq("user_id", user.id);

    if (updateError) {
      setError("Failed to save changes");
    } else {
      onToggleEdit();
    }
    setIsSaving(false);
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold uppercase text-signal">
            {topic.section}
          </span>
          <a
            href={topic.url}
            target="_blank"
            rel="noreferrer"
            className="pike-display font-bold text-lg text-ink underline underline-offset-4 hover:text-signal"
          >
            {topic.title}
          </a>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted">
            Completed: {formatDate(item.completed_at)}
          </span>
          <button
            type="button"
            onClick={onToggleEdit}
            aria-label="Edit topic history"
            className="font-mono text-xs font-bold text-muted hover:text-signal"
          >
            ✏️ {isEditing ? "Close" : "Edit"}
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex items-center gap-4">
            <label className="font-mono text-xs font-bold uppercase text-muted">
              Status:
            </label>
            <select
              className="pike-border rounded-token border-border bg-background px-3 py-2 font-mono text-xs uppercase text-ink outline-none focus:border-signal"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={isSaving}
            >
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-mono text-xs font-bold uppercase text-muted">
              Notes
            </label>
            <textarea
              rows={4}
              className="pike-border rounded-token border-border bg-background p-3 text-sm text-ink outline-none focus:border-signal resize-y"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isSaving}
            />
          </div>

          {error && <p className="font-mono text-xs text-alert">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onToggleEdit}
              disabled={isSaving}
              className="pike-border rounded-token border-border px-3 py-1.5 font-mono text-xs font-bold uppercase text-muted hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="pike-border rounded-token border-border bg-ink px-4 py-1.5 font-mono text-xs font-bold uppercase text-background hover:bg-signal"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      ) : (
        <div>
          {notes ? (
            <div className="bg-background rounded-token p-3 border border-border">
              <p className="text-sm whitespace-pre-wrap text-ink font-mono">{notes}</p>
            </div>
          ) : (
            <p className="text-xs text-muted italic">No notes recorded for this topic.</p>
          )}
        </div>
      )}
    </Card>
  );
}
