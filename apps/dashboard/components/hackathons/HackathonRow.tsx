"use client";

import { useState } from "react";
import { StatusTag } from "@/components/ui/StatusTag";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

const statuses = [
  "saved",
  "registered",
  "in-progress",
  "submitted",
  "closed",
] as const;

export type HackathonStatus = (typeof statuses)[number];
export type Hackathon = Database["public"]["Tables"]["hackathons_entries"]["Row"];

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function HackathonRow({
  hackathon,
  onStatusChange,
}: {
  hackathon: Hackathon;
  onStatusChange: (id: string, status: HackathonStatus) => void;
}) {
  const [status, setStatus] = useState<HackathonStatus>(hackathon.status as HackathonStatus);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);

  const isUrgent =
    hackathon.deadline !== null &&
    status !== "closed" &&
    status !== "submitted" &&
    new Date(hackathon.deadline).getTime() - new Date().getTime() <= 3 * 24 * 60 * 60 * 1000;

  async function updateStatus(nextStatus: HackathonStatus) {
    const previousStatus = status;
    setStatus(nextStatus);
    onStatusChange(hackathon.id, nextStatus);
    setIsSaving(true);
    setError(false);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setStatus(previousStatus);
      onStatusChange(hackathon.id, previousStatus);
      setIsSaving(false);
      setError(true);
      return;
    }

    const { error: updateError } = await supabase
      .from("hackathons_entries")
      .update({ status: nextStatus })
      .eq("id", hackathon.id)
      .eq("user_id", user.id);

    if (updateError) {
      setStatus(previousStatus);
      onStatusChange(hackathon.id, previousStatus);
      setError(true);
    }

    setIsSaving(false);
  }

  return (
    <tr className="pike-border border-x-0 border-t-0 border-border last:border-b-0">
      <td className="px-4 py-4 align-top">
        <a
          className="pike-display font-bold text-ink underline-offset-4 hover:text-signal hover:underline"
          href={hackathon.link}
          rel="noreferrer"
          target="_blank"
        >
          {hackathon.name}
        </a>
        <p className="mt-1 text-sm text-muted">{hackathon.organizer}</p>
      </td>
      <td className="px-4 py-4 align-top font-mono text-xs text-muted">
        {hackathon.prize}
      </td>
      <td className="px-4 py-4 align-top font-mono text-xs">
        {isUrgent ? (
          <div className="flex flex-col items-start gap-2">
            <StatusTag variant="urgent">Urgent</StatusTag>
            <span className="text-alert">{formatDate(hackathon.deadline)}</span>
          </div>
        ) : (
          <span className="text-muted">{formatDate(hackathon.deadline)}</span>
        )}
      </td>
      <td className="px-4 py-4 align-top">
        <select
          aria-label={`Status for ${hackathon.name}`}
          className="pike-border rounded-token border-border bg-background px-3 py-2 font-mono text-xs uppercase text-ink outline-none focus:border-signal disabled:opacity-60"
          disabled={isSaving}
          onChange={(event) => updateStatus(event.target.value as HackathonStatus)}
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
