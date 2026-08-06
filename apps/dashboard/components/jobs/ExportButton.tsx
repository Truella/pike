"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { JobRow, type Job, type JobStatus } from "./JobRow";

export function ExportButton({ jobs }: { jobs: Job[] }) {
  async function exportJobs() {
    const XLSX = await import("xlsx");
    const rows = jobs.map((job) => ({
      Title: job.title,
      Company: job.company,
      Link: job.link,
      Source: job.source,
      Found: job.found_at,
      Status: job.status,
      "Applied at": job.applied_at ?? "",
      "Follow up at": job.follow_up_at ?? "",
      Notes: job.notes ?? "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    worksheet["!autofilter"] = { ref: worksheet["!ref"] ?? "A1:I1" };
    XLSX.utils.book_append_sheet(workbook, worksheet, "Jobs");
    XLSX.writeFile(
      workbook,
      `pike-jobs-${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  }

  return (
    <Button onClick={exportJobs} type="button" variant="outline">
      Export XLSX
    </Button>
  );
}

export function JobsTable({ initialJobs }: { initialJobs: Job[] }) {
  const [jobs, setJobs] = useState(initialJobs);

  function updateVisibleStatus(id: string, status: JobStatus) {
    setJobs((currentJobs) =>
      currentJobs.map((job) => (job.id === id ? { ...job, status } : job)),
    );
  }

  return (
    <>
      <div className="mt-8 flex justify-end">
        <ExportButton jobs={jobs} />
      </div>
      <div className="pike-border mt-4 overflow-x-auto rounded-token border-border bg-surface shadow-token">
        <table className="w-full min-w-5xl border-collapse text-left">
          <thead>
            <tr className="pike-border border-x-0 border-t-0 border-border font-mono text-xs uppercase text-muted">
              <th className="px-4 py-3 font-bold">Role</th>
              <th className="px-4 py-3 font-bold">Source</th>
              <th className="px-4 py-3 font-bold">Found</th>
              <th className="px-4 py-3 font-bold">Follow-up</th>
              <th className="px-4 py-3 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <JobRow
                job={job}
                key={job.id}
                onStatusChange={updateVisibleStatus}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
