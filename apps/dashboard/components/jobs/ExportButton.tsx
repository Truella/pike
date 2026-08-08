"use client";

import { Button } from "@/components/ui/Button";
import type { Job } from "./JobRow";

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
