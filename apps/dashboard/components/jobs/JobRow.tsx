"use client";

import { useState } from "react";
import { StatusTag } from "@/components/ui/StatusTag";
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
>;

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function JobRow({
  job,
  onStatusChange,
}: {
  job: Job;
  onStatusChange: (id: string, status: JobStatus) => void;
}) {
  const [status, setStatus] = useState(job.status as JobStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);
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
        {formatDate(job.found_at)}
      </td>
      <td className="px-4 py-4 align-top font-mono text-xs">
        {isOverdue ? (
          <div className="flex flex-col items-start gap-2">
            <StatusTag variant="urgent">Overdue</StatusTag>
            <span className="text-alert">{formatDate(job.follow_up_at)}</span>
          </div>
        ) : (
          <span className="text-muted">{formatDate(job.follow_up_at)}</span>
        )}
      </td>
      <td className="px-4 py-4 align-top">
        <select
          aria-label={`Status for ${job.title}`}
          className="pike-border rounded-token border-border bg-background px-3 py-2 font-mono text-xs uppercase text-ink outline-none focus:border-signal disabled:opacity-60"
          disabled={isSaving}
          onChange={(event) => updateStatus(event.target.value as JobStatus)}
          value={status}
        >
          {statuses.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        {error ? (
          <p className="mt-2 font-mono text-xs text-alert">Update failed</p>
        ) : null}
      </td>
    </tr>
  );
}
