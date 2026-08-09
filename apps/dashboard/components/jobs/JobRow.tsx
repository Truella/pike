"use client";

import { useState } from "react";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import { StatusTag } from "@/components/ui/StatusTag";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

const statuses = [
  "saved",
  "applied",
  "follow-up",
  "interview",
  "offer",
  "closed",
] as const;

export type JobStatus = (typeof statuses)[number];

export type Job = Pick<
  Database["public"]["Tables"]["jobs_listings"]["Row"],
  | "id"
  | "title"
  | "company"
  | "link"
  | "source"
  | "found_at"
  | "status"
  | "applied_at"
  | "follow_up_at"
  | "notes"
> & {
  archived?: boolean;
};

const statusColors: Record<JobStatus, { bg: string; text: string; label: string }> = {
  saved: { bg: "bg-surface", text: "text-ink", label: "Saved" },
  applied: { bg: "bg-surface", text: "text-signal font-bold", label: "Applied" },
  "follow-up": { bg: "bg-surface", text: "text-alert font-bold", label: "Follow-up" },
  interview: { bg: "bg-signal text-background", text: "font-bold", label: "Interview" },
  offer: { bg: "bg-signal text-background", text: "font-bold", label: "Offer" },
  closed: { bg: "bg-surface", text: "text-muted", label: "Closed" },
};

export function formatJobDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

// ---------------------------------------------------------------------------
// Shared hook — all the business logic lives here once, used by both views
// ---------------------------------------------------------------------------
export function useJobRowState({
  job,
  onStatusChange,
  onArchiveToggle,
  onDelete,
}: {
  job: Job;
  onStatusChange: (id: string, status: JobStatus) => void;
  onArchiveToggle: (id: string, archived: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [status, setStatus] = useState(job.status as JobStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<string>(
    job.follow_up_at ? job.follow_up_at.slice(0, 10) : "",
  );
  const [menuOpen, setMenuOpen] = useState(false);

  const isOverdue =
    job.follow_up_at !== null && new Date(job.follow_up_at) < new Date();

  async function updateStatus(nextStatus: JobStatus) {
    const previousStatus = status;
    setStatus(nextStatus);
    onStatusChange(job.id, nextStatus);
    setIsSaving(true);
    setError(false);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStatus(previousStatus);
      onStatusChange(job.id, previousStatus);
      setIsSaving(false);
      setError(true);
      return;
    }

    const { error: updateError } = await supabase
      .from("jobs_listings")
      .update({ status: nextStatus })
      .eq("id", job.id)
      .eq("user_id", user.id);

    if (updateError) {
      setStatus(previousStatus);
      onStatusChange(job.id, previousStatus);
      setError(true);
    }
    setIsSaving(false);
  }

  async function updateFollowUp(newDateStr: string) {
    setFollowUpDate(newDateStr);
    setShowDatePicker(false);
    const isoDate = newDateStr ? new Date(newDateStr).toISOString() : null;

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("jobs_listings")
        .update({ follow_up_at: isoDate })
        .eq("id", job.id)
        .eq("user_id", user.id);
    }
  }

  async function handleArchiveToggle() {
    setMenuOpen(false);
    const nextArchived = !job.archived;
    onArchiveToggle(job.id, nextArchived);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("jobs_listings")
        .update({ archived: nextArchived })
        .eq("id", job.id)
        .eq("user_id", user.id);
    }
  }

  async function handleDelete() {
    setMenuOpen(false);
    if (!window.confirm("Are you sure you want to permanently delete this listing?")) {
      return;
    }
    onDelete(job.id);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("jobs_listings")
        .delete()
        .eq("id", job.id)
        .eq("user_id", user.id);
    }
  }

  const dropdownOptions: DropdownOption<JobStatus>[] = statuses.map((s) => ({
    value: s,
    label: statusColors[s].label,
  }));

  const currentColor = statusColors[status] || statusColors.saved;

  return {
    status,
    isSaving,
    error,
    showDatePicker,
    setShowDatePicker,
    followUpDate,
    menuOpen,
    setMenuOpen,
    isOverdue,
    updateStatus,
    updateFollowUp,
    handleArchiveToggle,
    handleDelete,
    dropdownOptions,
    currentColor,
  };
}

// ---------------------------------------------------------------------------
// JobCardMobile — used in the mobile stacked list (outside any table)
// ---------------------------------------------------------------------------
export function JobCardMobile({
  job,
  onStatusChange,
  onArchiveToggle,
  onDelete,
}: {
  job: Job;
  onStatusChange: (id: string, status: JobStatus) => void;
  onArchiveToggle: (id: string, archived: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const {
    status,
    isSaving,
    error,
    showDatePicker,
    setShowDatePicker,
    followUpDate,
    menuOpen,
    setMenuOpen,
    isOverdue,
    updateStatus,
    updateFollowUp,
    handleArchiveToggle,
    handleDelete,
    dropdownOptions,
    currentColor,
  } = useJobRowState({ job, onStatusChange, onArchiveToggle, onDelete });

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <a
            className="pike-display font-bold text-ink underline-offset-4 hover:text-signal hover:underline"
            href={job.link}
            rel="noreferrer"
            target="_blank"
          >
            {job.title}
          </a>
          <p className="mt-0.5 text-xs text-muted">{job.company}</p>
        </div>
        <div className="flex items-center gap-2">
          <Dropdown
            options={dropdownOptions}
            value={status}
            onChange={updateStatus}
            disabled={isSaving}
            triggerClassName={`${currentColor.bg} ${currentColor.text}`}
            ariaLabel={`Status for ${job.title}`}
          />
          <div className="relative inline-block text-left">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="font-mono text-xs font-bold text-muted hover:text-ink px-1 py-1"
            >
              ⋮
            </button>
            {menuOpen && (
              <div className="pike-border absolute right-0 z-50 mt-1 min-w-[120px] rounded-token border-border bg-surface py-1 shadow-token">
                <button
                  type="button"
                  onClick={handleArchiveToggle}
                  className="flex w-full items-center px-3 py-1.5 text-left font-mono text-xs text-ink hover:bg-background"
                >
                  {job.archived ? "Unarchive" : "Archive"}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex w-full items-center px-3 py-1.5 text-left font-mono text-xs text-alert hover:bg-background"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted border-t border-border pt-2">
        <span>Source: {job.source}</span>
        <span>Found: {formatJobDate(job.found_at)}</span>
        <div className="flex items-center gap-1">
          <span>Follow-up:</span>
          {showDatePicker ? (
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => updateFollowUp(e.target.value)}
              onBlur={() => setShowDatePicker(false)}
              autoFocus
              className="pike-border rounded-token border-border bg-background px-1.5 py-0.5 text-xs text-ink outline-none focus:border-signal"
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowDatePicker(true)}
              className="text-left outline-none hover:underline"
            >
              {isOverdue ? (
                <span className="text-alert font-bold">{formatJobDate(job.follow_up_at)} (Overdue)</span>
              ) : (
                <span>{formatJobDate(job.follow_up_at)}</span>
              )}
            </button>
          )}
        </div>
      </div>
      {error ? (
        <p className="font-mono text-xs text-alert">Update failed</p>
      ) : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// JobRow — pure <tr>, only used inside <tbody> for the desktop table
// ---------------------------------------------------------------------------
export function JobRow({
  job,
  onStatusChange,
  onArchiveToggle,
  onDelete,
}: {
  job: Job;
  onStatusChange: (id: string, status: JobStatus) => void;
  onArchiveToggle: (id: string, archived: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const {
    status,
    isSaving,
    error,
    showDatePicker,
    setShowDatePicker,
    followUpDate,
    menuOpen,
    setMenuOpen,
    isOverdue,
    updateStatus,
    updateFollowUp,
    handleArchiveToggle,
    handleDelete,
    dropdownOptions,
    currentColor,
  } = useJobRowState({ job, onStatusChange, onArchiveToggle, onDelete });

  return (
    <tr className="pike-border border-x-0 border-t-0 border-border last:border-b-0">
      <td className="px-4 py-4 align-top">
        <a
          className="pike-display font-bold text-ink underline-offset-4 hover:text-signal hover:underline"
          href={job.link}
          rel="noreferrer"
          target="_blank"
        >
          {job.title}
        </a>
        <p className="mt-1 text-sm text-muted">{job.company}</p>
      </td>
      <td className="px-4 py-4 align-top font-mono text-xs text-muted">
        {job.source}
      </td>
      <td className="px-4 py-4 align-top font-mono text-xs text-muted">
        {formatJobDate(job.found_at)}
      </td>
      <td className="px-4 py-4 align-top font-mono text-xs">
        {showDatePicker ? (
          <input
            type="date"
            value={followUpDate}
            onChange={(e) => updateFollowUp(e.target.value)}
            onBlur={() => setShowDatePicker(false)}
            autoFocus
            className="pike-border rounded-token border-border bg-background px-2 py-1 text-xs text-ink outline-none focus:border-signal"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowDatePicker(true)}
            className="text-left outline-none hover:underline"
          >
            {isOverdue ? (
              <div className="flex flex-col items-start gap-1">
                <StatusTag variant="urgent">Overdue</StatusTag>
                <span className="text-alert">{formatJobDate(job.follow_up_at)}</span>
              </div>
            ) : (
              <span className="text-muted">{formatJobDate(job.follow_up_at)}</span>
            )}
          </button>
        )}
      </td>
      <td className="px-4 py-4 align-top">
        <Dropdown
          options={dropdownOptions}
          value={status}
          onChange={updateStatus}
          disabled={isSaving}
          triggerClassName={`${currentColor.bg} ${currentColor.text}`}
          ariaLabel={`Status for ${job.title}`}
        />
        {error ? (
          <p className="mt-2 font-mono text-xs text-alert">Update failed</p>
        ) : null}
      </td>
      <td className="px-4 py-4 align-top text-right">
        <div className="relative inline-block text-left">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="font-mono text-xs font-bold text-muted hover:text-ink px-2 py-1"
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="pike-border absolute right-0 z-50 mt-1 min-w-[120px] rounded-token border-border bg-surface py-1 shadow-token">
              <button
                type="button"
                onClick={handleArchiveToggle}
                className="flex w-full items-center px-3 py-1.5 text-left font-mono text-xs text-ink hover:bg-background"
              >
                {job.archived ? "Unarchive" : "Archive"}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex w-full items-center px-3 py-1.5 text-left font-mono text-xs text-alert hover:bg-background"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
