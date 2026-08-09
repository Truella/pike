"use client";

import { useState, useEffect } from "react";
import { ExportButton } from "./ExportButton";
import { JobRow, type Job, type JobStatus } from "./JobRow";
import { Dropdown } from "@/components/ui/Dropdown";
import { createClient } from "@/lib/supabase/client";

type SortField = "found_at" | "company" | "status";
type SortOrder = "asc" | "desc";

export function JobsTable({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [overdueOnly, setOverdueOnly] = useState<boolean>(false);
  const [showArchived, setShowArchived] = useState<boolean>(false);

  const [sortField, setSortField] = useState<SortField>("found_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 25;

  // Supabase Realtime subscription for jobs_listings
  useEffect(() => {
    const supabase = createClient();
    let channel: any;

    async function setupRealtime() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const channelName = `jobs_realtime_${user.id}`;
      const existingChannel = supabase.channel(channelName);
      if (existingChannel) {
        await supabase.removeChannel(existingChannel);
      }

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "jobs_listings",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setJobs((prev) => [payload.new as Job, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              setJobs((prev) =>
                prev.map((j) => (j.id === payload.new.id ? { ...j, ...(payload.new as Job) } : j)),
              );
            } else if (payload.eventType === "DELETE") {
              setJobs((prev) => prev.filter((j) => j.id === payload.old.id));
            }
          },
        )
        .subscribe();
    }

    setupRealtime();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  function updateVisibleStatus(id: string, status: JobStatus) {
    setJobs((currentJobs) =>
      currentJobs.map((job) => (job.id === id ? { ...job, status } : job)),
    );
  }

  function handleArchiveToggle(id: string, archived: boolean) {
    setJobs((currentJobs) =>
      currentJobs.map((job) => (job.id === id ? { ...job, archived } : job)),
    );
  }

  function handleDelete(id: string) {
    setJobs((currentJobs) => currentJobs.filter((job) => job.id !== id));
  }

  const sources = Array.from(new Set(jobs.map((j) => j.source)));

  const filteredJobs = jobs.filter((job) => {
    if (showArchived ? !job.archived : job.archived) return false;
    if (statusFilter !== "all" && job.status !== statusFilter) return false;
    if (sourceFilter !== "all" && job.source !== sourceFilter) return false;
    if (overdueOnly) {
      const isOverdue =
        job.follow_up_at !== null && new Date(job.follow_up_at) < new Date();
      if (!isOverdue) return false;
    }
    return true;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    let aVal: string | number = a[sortField] || "";
    let bVal: string | number = b[sortField] || "";
    if (sortField === "found_at") {
      aVal = new Date(aVal as string).getTime() || 0;
      bVal = new Date(bVal as string).getTime() || 0;
    }
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedJobs.length / pageSize));
  const paginatedJobs = sortedJobs.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  }

  return (
    <>
      {/* Controls Header */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Dropdown
            options={[
              { value: "all", label: "All Statuses" },
              { value: "saved", label: "Saved" },
              { value: "applied", label: "Applied" },
              { value: "follow-up", label: "Follow-up" },
              { value: "interview", label: "Interview" },
              { value: "offer", label: "Offer" },
              { value: "closed", label: "Closed" },
            ]}
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setCurrentPage(1);
            }}
          />

          <Dropdown
            options={[
              { value: "all", label: "All Sources" },
              ...sources.map((s) => ({ value: s, label: s })),
            ]}
            value={sourceFilter}
            onChange={(val) => {
              setSourceFilter(val);
              setCurrentPage(1);
            }}
          />

          <button
            type="button"
            onClick={() => {
              setOverdueOnly((prev) => !prev);
              setCurrentPage(1);
            }}
            className={`pike-border rounded-token border-border px-3 py-1.5 font-mono text-xs font-bold uppercase transition-colors ${
              overdueOnly ? "bg-alert text-background" : "bg-surface text-ink"
            }`}
          >
            {overdueOnly ? "Overdue: ON" : "Overdue Only"}
          </button>

          <button
            type="button"
            onClick={() => {
              setShowArchived((prev) => !prev);
              setCurrentPage(1);
            }}
            className={`pike-border rounded-token border-border px-3 py-1.5 font-mono text-xs font-bold uppercase transition-colors ${
              showArchived ? "bg-ink text-background" : "bg-surface text-ink"
            }`}
          >
            {showArchived ? "Viewing Archived" : "View Active"}
          </button>
        </div>

        <ExportButton jobs={sortedJobs} />
      </div>

      {/* Mobile Stacked Card View */}
      <div className="mt-4 flex flex-col gap-4 md:hidden">
        {paginatedJobs.length === 0 ? (
          <div className="pike-border rounded-token border-border bg-surface p-6 text-center font-mono text-xs text-muted">
            No listings found matching criteria.
          </div>
        ) : (
          paginatedJobs.map((job) => (
            <JobRow
              job={job}
              key={job.id}
              onStatusChange={updateVisibleStatus}
              onArchiveToggle={handleArchiveToggle}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Desktop Table Container */}
      <div className="pike-border mt-4 hidden overflow-x-auto rounded-token border-border bg-surface shadow-token md:block">
        <table className="w-full min-w-5xl border-collapse text-left">
          <thead>
            <tr className="pike-border border-x-0 border-t-0 border-border font-mono text-xs uppercase text-muted">
              <th className="px-4 py-3 font-bold">Role</th>
              <th className="px-4 py-3 font-bold">Source</th>
              <th
                className="cursor-pointer px-4 py-3 font-bold hover:text-ink"
                onClick={() => toggleSort("found_at")}
              >
                Found {sortField === "found_at" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
              </th>
              <th className="px-4 py-3 font-bold">Follow-up</th>
              <th
                className="cursor-pointer px-4 py-3 font-bold hover:text-ink"
                onClick={() => toggleSort("status")}
              >
                Status {sortField === "status" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
              </th>
              <th className="px-4 py-3 text-right font-bold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedJobs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted font-mono text-xs">
                  No listings found matching criteria.
                </td>
              </tr>
            ) : (
              paginatedJobs.map((job) => (
                <JobRow
                  job={job}
                  key={job.id}
                  onStatusChange={updateVisibleStatus}
                  onArchiveToggle={handleArchiveToggle}
                  onDelete={handleDelete}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between font-mono text-xs text-muted">
          <span>
            Page {String(currentPage)} of {String(totalPages)} ({String(sortedJobs.length)} total)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="pike-border rounded-token border-border bg-surface px-3 py-1 text-xs text-ink disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="pike-border rounded-token border-border bg-surface px-3 py-1 text-xs text-ink disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}
