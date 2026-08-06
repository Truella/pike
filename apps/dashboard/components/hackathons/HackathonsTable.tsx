"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { HackathonRow, type Hackathon, type HackathonStatus } from "./HackathonRow";

export function HackathonsTable({ initialHackathons }: { initialHackathons: Hackathon[] }) {
  const [hackathons, setHackathons] = useState(initialHackathons);

  function updateVisibleStatus(id: string, status: HackathonStatus) {
    setHackathons((current) =>
      current.map((h) => (h.id === id ? { ...h, status } : h))
    );
  }

  async function exportHackathons() {
    const XLSX = await import("xlsx");
    const rows = hackathons.map((h) => ({
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
      `pike-hackathons-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  }

  return (
    <>
      <div className="mt-8 flex justify-end">
        <Button onClick={exportHackathons} type="button" variant="outline">
          Export XLSX
        </Button>
      </div>
      <div className="pike-border mt-4 overflow-x-auto rounded-token border-border bg-surface shadow-token">
        <table className="w-full min-w-5xl border-collapse text-left">
          <thead>
            <tr className="pike-border border-x-0 border-t-0 border-border font-mono text-xs uppercase text-muted">
              <th className="px-4 py-3 font-bold">Hackathon</th>
              <th className="px-4 py-3 font-bold">Prize Pool</th>
              <th className="px-4 py-3 font-bold">Deadline</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {hackathons.map((h) => (
              <HackathonRow
                hackathon={h}
                key={h.id}
                onStatusChange={updateVisibleStatus}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
