"use client";

import { useState } from "react";
import Link from "next/link";
import type { Database } from "@/lib/supabase/database.types";
import { StatusTag } from "@/components/ui/StatusTag";

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

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (sectionName: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

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

      {/* Accordion Per-Section Progress */}
      <div className="pike-border rounded-token border-border bg-surface p-5 shadow-token">
        <h3 className="font-mono text-xs font-bold uppercase text-muted mb-4">Per-Section Progress</h3>
        <div className="flex flex-col gap-4">
          {sections.map((sectionName) => {
            const sectionTopics = curriculum.filter((t) => t.section === sectionName);
            const stats = getProgressStats(sectionTopics);
            const isExpanded = !!expandedSections[sectionName];

            return (
              <div key={sectionName} className="flex flex-col border-b border-border pb-3 last:border-b-0 last:pb-0">
                <button
                  type="button"
                  onClick={() => toggleSection(sectionName)}
                  className="flex justify-between items-center text-left py-1 outline-none hover:text-signal"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted">{isExpanded ? "▼" : "▶"}</span>
                    <span className="text-sm font-bold text-ink">{sectionName}</span>
                  </div>
                  <span className="font-mono text-xs text-muted">
                    {stats.completed}/{stats.total} ({stats.percent}%)
                  </span>
                </button>

                <div className="h-2 w-full bg-background rounded-token overflow-hidden border border-border p-[1px] mt-1">
                  <div
                    className="h-full bg-signal rounded-token transition-all duration-500"
                    style={{ width: `${stats.percent}%` }}
                  />
                </div>

                {/* Expanded Topic List */}
                {isExpanded && (
                  <div className="mt-3 flex flex-col gap-2 pl-4 border-l border-border">
                    {sectionTopics.map((topic) => {
                      const p = progress.get(topic.id);
                      const topicStatus = p?.status || "not_started";
                      return (
                        <div key={topic.id} className="flex items-center justify-between gap-2 text-xs">
                          {topic.url ? (
                            <Link
                              href={topic.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-ink font-mono truncate hover:text-signal hover:underline underline-offset-2 transition-colors"
                            >
                              {topic.title}
                            </Link>
                          ) : (
                            <span className="text-ink font-mono truncate">{topic.title}</span>
                          )}
                          <StatusTag
                            variant={
                              topicStatus === "done"
                                ? "done"
                                : topicStatus === "in_progress"
                                ? "live"
                                : "neutral"
                            }
                          >
                            {topicStatus === "in_progress"
                              ? "In Progress"
                              : topicStatus === "done"
                              ? "Done"
                              : "Not Started"}
                          </StatusTag>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
