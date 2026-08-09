"use client";

import { Card } from "@/components/ui/Card";
import { Dropdown } from "@/components/ui/Dropdown";
import { StatusTag } from "@/components/ui/StatusTag";
import { JobCardMobile, type Job, type JobStatus } from "./JobRow";
import { formatJobDate } from "./JobRow";

// JobsCardGrid — renders each job as a sticky-note card, used under Sticky theme.
// All data/logic (filtering, sorting, pagination, mutations) is owned by the
// parent JobsController and passed down via props — no duplication here.
export function JobsCardGrid({
  jobs,
  onStatusChange,
  onArchiveToggle,
  onDelete,
}: {
  jobs: Job[];
  onStatusChange: (id: string, status: JobStatus) => void;
  onArchiveToggle: (id: string, archived: boolean) => void;
  onDelete: (id: string) => void;
}) {
  if (jobs.length === 0) {
    return (
      <Card index={0} className="text-center font-mono text-xs text-muted py-8">
        No listings found matching criteria.
      </Card>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {jobs.map((job, i) => (
        // Reuse JobCardMobile which already has all the interactive logic;
        // under Sticky the Card inside it gets the accent colour from index.
        <JobCardMobile
          key={job.id}
          job={job}
          index={i}
          onStatusChange={onStatusChange}
          onArchiveToggle={onArchiveToggle}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
