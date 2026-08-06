"use client";

import type { Database } from "@/lib/supabase/database.types";

type CurriculumRow = Database["public"]["Tables"]["study_curriculum"]["Row"];
type ProgressRow = Database["public"]["Tables"]["study_progress"]["Row"];

interface ProgressBarProps {
  curriculum: CurriculumRow[];
  progress: Map<string, ProgressRow>;
}

export function ProgressBar({ curriculum, progress }: ProgressBarProps) {
  const sections = [
    "Introduction",
    "Coding",
    "Trivia",
    "System Design",
    "Behavioral",
    "Resume",
    "Company questions",
  ];

  const getProgressStats = (topics: CurriculumRow[]) => {
    if (topics.length === 0) return { completed: 0, total: 0, percent: 0 };
    const completed = topics.filter(
      (t) => progress.get(t.id)?.status === "done"
    ).length;
    return {
      completed,
      total: topics.length,
      percent: Math.round((completed / topics.length) * 100),
    };
  };

  const overall = getProgressStats(curriculum);

  return (
    <div className="flex flex-col gap-6">
      {/* Overall Progress */}
      <div className="pike-border rounded-token border-border bg-surface p-5 shadow-token">
        <div className="flex justify-between items-end mb-2">
          <div>
            <h3 className="font-mono text-xs font-bold uppercase text-muted">Overall Progress</h3>
            <span className="pike-display text-2xl font-bold">{overall.percent}%</span>
          </div>
          <span className="font-mono text-xs text-muted">
            {overall.completed} / {overall.total} completed
          </span>
        </div>
        <div className="h-4 w-full bg-background rounded-token overflow-hidden border border-border p-[2px]">
          <div
            className="h-full bg-signal rounded-token transition-all duration-500"
            style={{ width: `${overall.percent}%` }}
          />
        </div>
      </div>

      {/* Section Progress */}
      <div className="pike-border rounded-token border-border bg-surface p-5 shadow-token">
        <h3 className="font-mono text-xs font-bold uppercase text-muted mb-4">Per-Section Progress</h3>
        <div className="flex flex-col gap-4">
          {sections.map((sectionName) => {
            const sectionTopics = curriculum.filter((t) => t.section === sectionName);
            const stats = getProgressStats(sectionTopics);
            return (
              <div key={sectionName} className="flex flex-col">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-bold text-ink">{sectionName}</span>
                  <span className="font-mono text-xs text-muted">
                    {stats.completed}/{stats.total} ({stats.percent}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-background rounded-token overflow-hidden border border-border p-[1px]">
                  <div
                    className="h-full bg-signal rounded-token transition-all duration-500"
                    style={{ width: `${stats.percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
