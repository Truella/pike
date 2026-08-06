"use client";

import { useState } from "react";
import { DraftCard } from "./DraftCard";
import { TopicsBank } from "./TopicsBank";
import type { Database } from "@/lib/supabase/database.types";

type ContentRow = Database["public"]["Tables"]["pike_content"]["Row"];
type TopicRow = Database["public"]["Tables"]["pike_topics_bank"]["Row"];

interface ContentDashboardClientProps {
  posts: ContentRow[];
  topics: TopicRow[];
  weeklyBuildCount: number;
  weeklyTrendCount: number;
}

export function ContentDashboardClient({
  posts,
  topics,
  weeklyBuildCount,
  weeklyTrendCount,
}: ContentDashboardClientProps) {
  const [items, setItems] = useState<ContentRow[]>(posts);

  function handleStatusChange(id: string, status: string, scheduledAt?: string) {
    setItems((current) =>
      current.map((p) =>
        p.id === id
          ? { ...p, status, scheduled_at: scheduledAt ?? p.scheduled_at }
          : p
      )
    );
  }

  const needsReview = items.filter((p) => p.status === "needs_review");
  const approved = items.filter((p) => p.status === "approved" || p.status === "scheduled");

  const WEEKLY_TARGET = 2;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <p className="font-mono text-xs font-bold uppercase text-signal">{"// Content"}</p>
          <h1 className="pike-display mt-2 text-4xl font-bold">Content Queue</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Review AI-drafted posts before they go to LinkedIn.
          </p>
        </div>

        {/* Weekly balance counter */}
        <div className="flex gap-3">
          <div className={`flex items-center gap-1.5 rounded-token border px-3 py-1.5 font-mono text-sm font-bold shadow-token ${weeklyBuildCount >= WEEKLY_TARGET ? "border-signal text-signal" : "border-alert text-alert"}`}>
            Build {weeklyBuildCount}/{WEEKLY_TARGET}
          </div>
          <div className={`flex items-center gap-1.5 rounded-token border px-3 py-1.5 font-mono text-sm font-bold shadow-token ${weeklyTrendCount >= WEEKLY_TARGET ? "border-signal text-signal" : "border-alert text-alert"}`}>
            Trend {weeklyTrendCount}/{WEEKLY_TARGET}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Needs review */}
          {needsReview.length > 0 && (
            <section>
              <h2 className="font-mono text-xs font-bold uppercase text-alert mb-3">
                Needs Review ({needsReview.length})
              </h2>
              <div className="flex flex-col gap-4">
                {needsReview.map((post) => (
                  <DraftCard key={post.id} post={post} onStatusChange={handleStatusChange} />
                ))}
              </div>
            </section>
          )}

          {needsReview.length === 0 && (
            <div className="pike-border rounded-token border-border bg-surface p-6 text-center text-muted shadow-token">
              No drafts waiting for review.
            </div>
          )}

          {/* Approved / scheduled */}
          {approved.length > 0 && (
            <section>
              <h2 className="font-mono text-xs font-bold uppercase text-signal mb-3">
                Approved / Scheduled ({approved.length})
              </h2>
              <div className="flex flex-col gap-4">
                {approved.map((post) => (
                  <DraftCard key={post.id} post={post} onStatusChange={handleStatusChange} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Topics bank sidebar */}
        <div className="lg:col-span-1">
          <TopicsBank initialTopics={topics} />
        </div>
      </div>
    </div>
  );
}
