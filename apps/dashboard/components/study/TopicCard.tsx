"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import { StatusTag } from "@/components/ui/StatusTag";
import type { Database } from "@/lib/supabase/database.types";

type CurriculumRow = Database["public"]["Tables"]["study_curriculum"]["Row"];
type ProgressRow = Database["public"]["Tables"]["study_progress"]["Row"];

interface TopicCardProps {
  currentTopic: CurriculumRow | null;
  progress: ProgressRow | null;
  onUpdate: (topicId: string, updates: Partial<ProgressRow>) => Promise<void>;
}

type TopicStatus = "not_started" | "in_progress" | "done";

const statusOptions: DropdownOption<TopicStatus>[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

const statusStyles: Record<TopicStatus, { triggerClass: string; variant: "neutral" | "live" | "done" }> = {
  not_started: { triggerClass: "bg-surface text-ink", variant: "neutral" },
  in_progress: { triggerClass: "bg-surface text-signal font-bold", variant: "live" },
  done: { triggerClass: "bg-signal text-background font-bold", variant: "done" },
};

export function TopicCard({ currentTopic, progress, onUpdate }: TopicCardProps) {
  const [status, setStatus] = useState<TopicStatus>("not_started");
  const [notes, setNotes] = useState<string>("");
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (progress) {
      setStatus(progress.status as TopicStatus);
      setNotes(progress.notes || "");
    } else {
      setStatus("not_started");
      setNotes("");
    }
    setError(null);
  }, [progress, currentTopic]);

  if (!currentTopic) {
    return (
      <Card className="text-center py-12 text-muted">
        <span className="text-3xl mb-2 block">🎉</span>
        <p className="font-bold text-ink">All topics completed!</p>
        <p className="text-sm mt-1">Excellent work, you are ready for your front-end interviews.</p>
      </Card>
    );
  }

  const computeDaysStuck = () => {
    if (!progress) return 0;
    const now = new Date();
    const anchor = progress.started_at
      ? new Date(progress.started_at)
      : new Date(progress.created_at);
    const diffMs = Math.max(0, now.getTime() - anchor.getTime());
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  };

  const daysStuck = computeDaysStuck();

  const handleStatusChange = async (newStatus: TopicStatus) => {
    const prevStatus = status;
    setStatus(newStatus);
    setIsSavingStatus(true);
    setError(null);

    const now = new Date().toISOString();
    const updates: Partial<ProgressRow> = { status: newStatus };

    if (newStatus === "in_progress") {
      updates.started_at = progress?.started_at || now;
    } else if (newStatus === "done") {
      updates.completed_at = now;
      if (!progress?.started_at) {
        updates.started_at = now;
      }
    } else if (newStatus === "not_started") {
      updates.started_at = null;
      updates.completed_at = null;
    }

    try {
      await onUpdate(currentTopic.id, updates);
    } catch (err: any) {
      setStatus(prevStatus);
      setError("Failed to update status. Reverting changes.");
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    setError(null);
    setSaveSuccess(false);

    try {
      await onUpdate(currentTopic.id, { notes: notes || null });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      setNotes(progress?.notes || "");
      setError("Failed to save notes. Reverting changes.");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const currentStyle = statusStyles[status] || statusStyles.not_started;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-[200px]">
          <span className="font-mono text-xs font-bold uppercase text-signal">
            Today's Topic — {currentTopic.section}
          </span>
          <h2 className="pike-display mt-1 text-2xl font-bold text-ink">
            <a
              href={currentTopic.url}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-signal"
            >
              {currentTopic.title}
            </a>
          </h2>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            <StatusTag variant={currentStyle.variant}>
              {status === "in_progress" ? "In Progress" : status === "done" ? "Done" : "Not Started"}
            </StatusTag>
          </div>
          {daysStuck > 0 && status !== "done" && (
            <span className="font-mono text-xs font-bold text-alert">
              🔥 {daysStuck} {daysStuck === 1 ? "day" : "days"} stuck
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 mt-2">
        <label className="font-mono text-xs font-bold uppercase text-muted">
          Status:
        </label>
        <Dropdown
          options={statusOptions}
          value={status}
          onChange={handleStatusChange}
          disabled={isSavingStatus}
          triggerClassName={currentStyle.triggerClass}
          ariaLabel="Status for current topic"
        />
      </div>

      <div className="flex flex-col gap-2 mt-2">
        <label htmlFor="notes-textarea" className="font-mono text-xs font-bold uppercase text-muted">
          Study Notes
        </label>
        <textarea
          id="notes-textarea"
          rows={5}
          className="pike-border rounded-token border-border bg-background p-3 text-sm text-ink outline-none focus:border-signal disabled:opacity-60 resize-y"
          placeholder="Write key takeaways, questions, or links to your practice solutions..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={isSavingStatus || isSavingNotes}
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveNotes}
            disabled={isSavingStatus || isSavingNotes}
            className="pike-border rounded-token border-border bg-surface px-4 py-2 font-mono text-xs font-bold uppercase text-ink hover:bg-signal hover:text-background focus:outline-none disabled:opacity-50"
          >
            {isSavingNotes ? "Saving..." : "Save Notes"}
          </button>
          {saveSuccess && (
            <span className="font-mono text-xs font-bold text-signal">Saved!</span>
          )}
        </div>
      </div>

      {error && (
        <p className="font-mono text-xs text-alert">{error}</p>
      )}

      {isSavingStatus && (
        <p className="font-mono text-xs text-muted animate-pulse">Saving status change...</p>
      )}
    </Card>
  );
}
