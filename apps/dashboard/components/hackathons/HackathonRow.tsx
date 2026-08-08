"use client";

import { useState } from "react";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
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

export type Hackathon = Database["public"]["Tables"]["hackathons_entries"]["Row"] & {
  archived?: boolean;
};

const statusColors: Record<HackathonStatus, { bg: string; text: string; label: string }> = {
  saved: { bg: "bg-surface", text: "text-ink", label: "Saved" },
  registered: { bg: "bg-surface", text: "text-signal font-bold", label: "Registered" },
  "in-progress": { bg: "bg-surface", text: "text-signal font-bold", label: "In Progress" },
  submitted: { bg: "bg-signal text-background", text: "font-bold", label: "Submitted" },
  closed: { bg: "bg-surface", text: "text-muted", label: "Closed" },
};

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export function HackathonRow({
  hackathon,
  onStatusChange,
  onArchiveToggle,
  onDelete,
}: {
  hackathon: Hackathon;
  onStatusChange: (id: string, status: HackathonStatus) => void;
  onArchiveToggle: (id: string, archived: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [status, setStatus] = useState<HackathonStatus>(
    hackathon.status as HackathonStatus,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  async function handleArchiveToggle() {
    setMenuOpen(false);
    const nextArchived = !hackathon.archived;
    onArchiveToggle(hackathon.id, nextArchived);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("hackathons_entries")
        .update({ archived: nextArchived })
        .eq("id", hackathon.id)
        .eq("user_id", user.id);
    }
  }

  async function handleDelete() {
    setMenuOpen(false);
    if (!window.confirm("Are you sure you want to permanently delete this hackathon entry?")) {
      return;
    }
    onDelete(hackathon.id);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      await supabase
        .from("hackathons_entries")
        .delete()
        .eq("id", hackathon.id)
        .eq("user_id", user.id);
    }
  }

  const dropdownOptions: DropdownOption<HackathonStatus>[] = statuses.map((s) => ({
    value: s,
    label: statusColors[s].label,
  }));

  const currentColor = statusColors[status] || statusColors.saved;

  return (
    <tr className="pike-border border-x-0 border-t-0 border-border last:border-b-0">
      {/* Sticky First Column on Mobile */}
      <td className="sticky left-0 z-10 bg-surface px-4 py-4 align-top shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] md:static md:shadow-none">
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
          <div className="flex flex-col items-start gap-1">
            <StatusTag variant="urgent">Urgent</StatusTag>
            <span className="text-alert">{formatDate(hackathon.deadline)}</span>
          </div>
        ) : (
          <span className="text-muted">{formatDate(hackathon.deadline)}</span>
        )}
      </td>
      <td className="px-4 py-4 align-top">
        <Dropdown
          options={dropdownOptions}
          value={status}
          onChange={updateStatus}
          disabled={isSaving}
          triggerClassName={`${currentColor.bg} ${currentColor.text}`}
          ariaLabel={`Status for ${hackathon.name}`}
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
                {hackathon.archived ? "Unarchive" : "Archive"}
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
