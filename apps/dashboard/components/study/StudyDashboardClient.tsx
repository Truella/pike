"use client";

import { useState } from "react";
import Link from "next/link";
import { TopicCard } from "./TopicCard";
import { ProgressBar } from "./ProgressBar";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type CurriculumRow = Database["public"]["Tables"]["study_curriculum"]["Row"];
type ProgressRow = Database["public"]["Tables"]["study_progress"]["Row"];

interface StudyDashboardClientProps {
  curriculum: CurriculumRow[];
  initialProgress: ProgressRow[];
}

function calculateStreak(progressItems: ProgressRow[]) {
  const completedDates = new Set(
    progressItems
      .map((item) => item.completed_at)
      .filter((date): date is string => !!date)
      .map((dateStr) => new Date(dateStr).toISOString().split("T")[0])
  );

  if (completedDates.size === 0) return 0;

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  let currentStreak = 0;
  let checkDate = new Date();

  if (!completedDates.has(todayStr) && !completedDates.has(yesterdayStr)) {
    return 0;
  }

  if (!completedDates.has(todayStr) && completedDates.has(yesterdayStr)) {
    checkDate = yesterday;
  }

  while (true) {
    const checkStr = checkDate.toISOString().split("T")[0];
    if (completedDates.has(checkStr)) {
      currentStreak++;
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return currentStreak;
}

export function StudyDashboardClient({
  curriculum,
  initialProgress,
}: StudyDashboardClientProps) {
  const [progressList, setProgressList] = useState<ProgressRow[]>(initialProgress);

  const progressMap = new Map<string, ProgressRow>(
    progressList.map((p) => [p.topic_id, p])
  );

  // Find lowest order_index topic that is not done
  const currentTopic =
    curriculum.find((topic) => {
      const p = progressMap.get(topic.id);
      return !p || p.status !== "done";
    }) || null;

  const currentProgress = currentTopic ? progressMap.get(currentTopic.id) || null : null;

  const streak = calculateStreak(progressList);

  const handleUpdate = async (topicId: string, updates: Partial<ProgressRow>) => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) throw new Error("User not authenticated");

    // Optimistically update local state
    let rollbackList = [...progressList];
    setProgressList((current) => {
      const exists = current.some((p) => p.topic_id === topicId);
      if (exists) {
        return current.map((p) =>
          p.topic_id === topicId ? ({ ...p, ...updates } as ProgressRow) : p
        );
      } else {
        const newProgressRow: ProgressRow = {
          user_id: user.id,
          topic_id: topicId,
          status: updates.status || "not_started",
          created_at: new Date().toISOString(),
          started_at: updates.started_at || null,
          completed_at: updates.completed_at || null,
          notes: updates.notes || null,
        };
        return [...current, newProgressRow];
      }
    });

    const { error } = await supabase
      .from("study_progress")
      .upsert(
        {
          user_id: user.id,
          topic_id: topicId,
          ...updates,
        },
        { onConflict: "user_id,topic_id" }
      );

    if (error) {
      setProgressList(rollbackList);
      throw error;
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <p className="font-mono text-xs font-bold uppercase text-signal">
            {"// Study"}
          </p>
          <h1 className="pike-display mt-2 text-4xl font-bold">Study Dashboard</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Front End Interview Handbook curriculum progression.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-token border border-border bg-surface font-mono text-sm font-bold shadow-token">
            <span>🔥</span>
            <span>{streak} day streak</span>
          </div>
          <Link
            href="/study/history"
            className="pike-border pike-button rounded-token border-border bg-ink px-4 py-2 text-sm font-bold text-background shadow-token hover:opacity-95"
          >
            History View
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <TopicCard
            currentTopic={currentTopic}
            progress={currentProgress}
            onUpdate={handleUpdate}
          />
        </div>
        <div className="lg:col-span-1">
          <ProgressBar curriculum={curriculum} progress={progressMap} />
        </div>
      </div>
    </div>
  );
}
