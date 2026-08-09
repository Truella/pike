"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { HackathonRow, HackathonCardMobile, type Hackathon, type HackathonStatus } from "./HackathonRow";
import { HackathonsCardGrid } from "./HackathonsCardGrid";
import { createClient } from "@/lib/supabase/client";

type SortField = "deadline" | "prize" | "status";
type SortOrder = "asc" | "desc";

export function HackathonsTable({
  initialHackathons,
}: {
  initialHackathons: Hackathon[];
}) {
  const [hackathons, setHackathons] = useState<Hackathon[]>(initialHackathons);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [urgentOnly, setUrgentOnly] = useState<boolean>(false);
  const [showArchived, setShowArchived] = useState<boolean>(false);

  const [sortField, setSortField] = useState<SortField>("deadline");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 25;

  // Detect active theme once on mount — drives table vs card-grid switch.
  const [isSticky, setIsSticky] = useState(false);
  useEffect(() => {
    const theme = document.documentElement.dataset.theme;
    setIsSticky(theme === "sticky");
  }, []);

  // Supabase Realtime subscription for hackathons_entries
  useEffect(() => {
    const supabase = createClient();
    let channel: any;

    async function setupRealtime() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const channelName = `hackathons_realtime_${user.id}`;
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
            table: "hackathons_entries",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setHackathons((prev) => [payload.new as Hackathon, ...prev]);
            } else if (payload.eventType === "UPDATE") {
              setHackathons((prev) =>
                prev.map((h) => (h.id === payload.new.id ? { ...h, ...(payload.new as Hackathon) } : h)),
              );
            } else if (payload.eventType === "DELETE") {
              setHackathons((prev) => prev.filter((h) => h.id !== payload.old.id));
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

  function updateVisibleStatus(id: string, status: HackathonStatus) {
    setHackathons((current) =>
      current.map((h) => (h.id === id ? { ...h, status } : h)),
    );
  }

  function handleArchiveToggle(id: string, archived: boolean) {
    setHackathons((current) =>
      current.map((h) => (h.id === id ? { ...h, archived } : h)),
    );
  }

  function handleDelete(id: string) {
    setHackathons((current) => current.filter((h) => h.id !== id));
  }

  const filteredHackathons = hackathons.filter((h) => {
    if (showArchived ? !h.archived : h.archived) return false;
    if (statusFilter !== "all" && h.status !== statusFilter) return false;
    if (urgentOnly) {
      const isUrgent =
        h.deadline !== null &&
        h.status !== "closed" &&
        h.status !== "submitted" &&
        new Date(h.deadline).getTime() - new Date().getTime() <= 3 * 24 * 60 * 60 * 1000;
      if (!isUrgent) return false;
    }
    return true;
  });

  const sortedHackathons = [...filteredHackathons].sort((a, b) => {
    let aVal: any = a[sortField] || "";
    let bVal: any = b[sortField] || "";

    if (sortField === "deadline") {
      aVal = new Date(aVal).getTime() || 0;
      bVal = new Date(bVal).getTime() || 0;
    }

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedHackathons.length / pageSize));
  const paginatedHackathons = sortedHackathons.slice(
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

  async function exportHackathons() {
    const XLSX = await import("xlsx");
    const rows = sortedHackathons.map((h) => ({
      Name: h.name,
      Organizer: h.organizer ?? "",
      Link: h.link,
      Prize: h.prize ?? "",
      Deadline: h.deadline ?? "",
      Status: h.status,
      Notes: h.notes ?? "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    worksheet["!autofilter"] = { ref: worksheet["!ref"] ?? "A1:G1" };
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hackathons");
    XLSX.writeFile(
      workbook,
      `pike-hackathons-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
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
              { value: "registered", label: "Registered" },
              { value: "in-progress", label: "In Progress" },
              { value: "submitted", label: "Submitted" },
              { value: "closed", label: "Closed" },
            ]}
            value={statusFilter}
            onChange={(val) => {
              setStatusFilter(val);
              setCurrentPage(1);
            }}
          />

          <button
            type="button"
            onClick={() => {
              setUrgentOnly((prev) => !prev);
              setCurrentPage(1);
            }}
            className={`pike-border rounded-token border-border px-3 py-1.5 font-mono text-xs font-bold uppercase transition-colors ${
              urgentOnly ? "bg-alert text-background" : "bg-surface text-ink"
            }`}
          >
            {urgentOnly ? "Urgent (< 3 days): ON" : "Urgent Only"}
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

        <Button onClick={exportHackathons} type="button" variant="outline">
          Export XLSX
        </Button>
      </div>

      {/* Presentation layer: card grid under Sticky, table everywhere else */}
      {isSticky ? (
        <div className="mt-6">
          <HackathonsCardGrid
            hackathons={paginatedHackathons}
            onStatusChange={updateVisibleStatus}
            onArchiveToggle={handleArchiveToggle}
            onDelete={handleDelete}
          />
        </div>
      ) : (
        <>
          {/* Mobile Stacked Card View */}
          <div className="mt-4 flex flex-col gap-4 md:hidden">
            {paginatedHackathons.length === 0 ? (
              <div className="pike-border rounded-token border-border bg-surface p-6 text-center font-mono text-xs text-muted">
                No hackathons found matching criteria.
              </div>
            ) : (
              paginatedHackathons.map((h, i) => (
                <HackathonCardMobile
                  hackathon={h}
                  key={h.id}
                  index={i}
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
                  <th className="px-4 py-3 font-bold">Hackathon</th>
                  <th
                    className="cursor-pointer px-4 py-3 font-bold hover:text-ink"
                    onClick={() => toggleSort("prize")}
                  >
                    Prize Pool {sortField === "prize" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 font-bold hover:text-ink"
                    onClick={() => toggleSort("deadline")}
                  >
                    Deadline {sortField === "deadline" ? (sortOrder === "asc" ? "▲" : "▼") : ""}
                  </th>
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
                {paginatedHackathons.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted font-mono text-xs">
                      No hackathons found matching criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedHackathons.map((h) => (
                    <HackathonRow
                      hackathon={h}
                      key={h.id}
                      onStatusChange={updateVisibleStatus}
                      onArchiveToggle={handleArchiveToggle}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between font-mono text-xs text-muted">
          <span>
            Page {currentPage} of {totalPages} ({sortedHackathons.length} total)
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

