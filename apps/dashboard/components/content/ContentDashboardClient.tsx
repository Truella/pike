"use client";

import { useState } from "react";
import { ReviewQueue } from "./ReviewQueue";
import { TopicsBank } from "./TopicsBank";
import type { Database } from "@/lib/supabase/database.types";

type ContentRow = Database["public"]["Tables"]["pike_content"]["Row"];
type TopicRow = Database["public"]["Tables"]["pike_topics_bank"]["Row"];
type TopLevelTab = "review" | "topics";

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
  const [topTab, setTopTab] = useState<TopLevelTab>("review");

  function handlePostUpdate(updatedPost: ContentRow) {
    setItems((current) =>
      current.map((p) => (p.id === updatedPost.id ? updatedPost : p))
    );
  }

  const WEEKLY_TARGET = 2;
  const needsReviewCount = items.filter((p) => p.status === "needs_review").length;

  return (
    <div className="mx-auto max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <p className="font-mono text-xs font-bold uppercase text-signal">
            {"// Content"}
          </p>
          <h1 className="pike-display mt-2 text-4xl font-bold">
            Content Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-muted">
            Review AI-drafted posts, manage schedule, and curate topic seeds.
          </p>
        </div>

        {/* Weekly balance counter */}
        <div className="flex gap-3">
          <div
            className={`flex items-center gap-1.5 rounded-token border px-3 py-1.5 font-mono text-sm font-bold shadow-token ${
              weeklyBuildCount >= WEEKLY_TARGET
                ? "border-signal text-signal"
                : "border-alert text-alert"
            }`}
          >
            Build {weeklyBuildCount}/{WEEKLY_TARGET}
          </div>
          <div
            className={`flex items-center gap-1.5 rounded-token border px-3 py-1.5 font-mono text-sm font-bold shadow-token ${
              weeklyTrendCount >= WEEKLY_TARGET
                ? "border-signal text-signal"
                : "border-alert text-alert"
            }`}
          >
            Trend {weeklyTrendCount}/{WEEKLY_TARGET}
          </div>
        </div>
      </div>

      {/* Top-Level Tabs Bar (Responsive, horizontally scrollable on small screens) */}
      <div className="pike-border mb-8 border-b-0 rounded-token border-border bg-surface p-2 shadow-token">
        <nav
          className="flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar"
          aria-label="Content Navigation Tabs"
        >
          <button
            type="button"
            onClick={() => setTopTab("review")}
            className={`flex items-center gap-2.5 rounded-token px-6 py-3 font-mono text-xs font-bold uppercase transition-colors ${
              topTab === "review"
                ? "bg-ink text-background shadow-token"
                : "bg-transparent text-muted hover:text-ink"
            }`}
          >
            <span>Review Queue</span>
            {needsReviewCount > 0 && (
              <span className="rounded-full bg-alert px-2 py-0.5 text-[10px] text-background font-bold">
                {needsReviewCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTopTab("topics")}
            className={`flex items-center gap-2.5 rounded-token px-6 py-3 font-mono text-xs font-bold uppercase transition-colors ${
              topTab === "topics"
                ? "bg-ink text-background shadow-token"
                : "bg-transparent text-muted hover:text-ink"
            }`}
          >
            <span>Topics Bank</span>
            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] text-muted">
              {topics.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Active Tab View */}
      {topTab === "review" ? (
        <ReviewQueue posts={items} onPostUpdate={handlePostUpdate} />
      ) : (
        <div className="max-w-3xl">
          <TopicsBank initialTopics={topics} />
        </div>
      )}
    </div>
  );
}
