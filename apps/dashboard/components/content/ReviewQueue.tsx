"use client";

import { useState } from "react";
import { DraftCard } from "./DraftCard";
import { formatScheduledTime } from "@/lib/dateUtils";
import type { Database } from "@/lib/supabase/database.types";

type ContentRow = Database["public"]["Tables"]["pike_content"]["Row"];
type ReviewSubTab = "needs_review" | "approved" | "scheduled" | "published";

interface ReviewQueueProps {
  posts: ContentRow[];
  publishedPosts: ContentRow[];
  onPostUpdate: (updatedPost: ContentRow) => void;
}

export function ReviewQueue({ posts, publishedPosts, onPostUpdate }: ReviewQueueProps) {
  const [activeSubTab, setActiveSubTab] = useState<ReviewSubTab>("needs_review");

  const needsReviewPosts = posts.filter((p) => p.status === "needs_review");
  const approvedPosts = posts.filter((p) => p.status === "approved");
  const scheduledPosts = posts.filter((p) => p.status === "scheduled");

  const activePosts =
    activeSubTab === "needs_review"
      ? needsReviewPosts
      : activeSubTab === "approved"
      ? approvedPosts
      : activeSubTab === "scheduled"
      ? scheduledPosts
      : publishedPosts;

  const emptyMessages: Record<ReviewSubTab, string> = {
    needs_review: "No drafts waiting for review.",
    approved: "No approved posts waiting to be scheduled.",
    scheduled: "No scheduled posts.",
    published: "No published posts yet.",
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Sub-tabs bar: horizontally scrollable on small screens */}
      <div className="pike-border rounded-token border-border bg-surface p-1.5 shadow-token">
        <nav
          className="flex gap-2 overflow-x-auto whitespace-nowrap no-scrollbar"
          aria-label="Review Queue Sub-tabs"
        >
          <button
            type="button"
            onClick={() => setActiveSubTab("needs_review")}
            className={`flex items-center gap-2 rounded-token px-4 py-2 font-mono text-xs font-bold uppercase transition-colors ${
              activeSubTab === "needs_review"
                ? "bg-ink text-background shadow-token"
                : "bg-transparent text-muted hover:text-ink"
            }`}
          >
            <span>Needs Review</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                activeSubTab === "needs_review"
                  ? "bg-alert text-background font-bold"
                  : "bg-background text-muted"
              }`}
            >
              {needsReviewPosts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("approved")}
            className={`flex items-center gap-2 rounded-token px-4 py-2 font-mono text-xs font-bold uppercase transition-colors ${
              activeSubTab === "approved"
                ? "bg-ink text-background shadow-token"
                : "bg-transparent text-muted hover:text-ink"
            }`}
          >
            <span>Approved</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                activeSubTab === "approved"
                  ? "bg-signal text-background font-bold"
                  : "bg-background text-muted"
              }`}
            >
              {approvedPosts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("scheduled")}
            className={`flex items-center gap-2 rounded-token px-4 py-2 font-mono text-xs font-bold uppercase transition-colors ${
              activeSubTab === "scheduled"
                ? "bg-ink text-background shadow-token"
                : "bg-transparent text-muted hover:text-ink"
            }`}
          >
            <span>Scheduled</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                activeSubTab === "scheduled"
                  ? "bg-signal text-background font-bold"
                  : "bg-background text-muted"
              }`}
            >
              {scheduledPosts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab("published")}
            className={`flex items-center gap-2 rounded-token px-4 py-2 font-mono text-xs font-bold uppercase transition-colors ${
              activeSubTab === "published"
                ? "bg-ink text-background shadow-token"
                : "bg-transparent text-muted hover:text-ink"
            }`}
          >
            <span>Published</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] ${
                activeSubTab === "published"
                  ? "bg-signal text-background font-bold"
                  : "bg-background text-muted"
              }`}
            >
              {publishedPosts.length}
            </span>
          </button>
        </nav>
      </div>

      {/* Cards list */}
      {activePosts.length === 0 ? (
        <div className="pike-border rounded-token border-border bg-surface p-8 text-center font-mono text-xs text-muted shadow-token">
          {emptyMessages[activeSubTab]}
        </div>
      ) : activeSubTab === "published" ? (
        <div className="flex flex-col gap-4">
          {(activePosts as ContentRow[]).map((post) => (
            <PublishedCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {activePosts.map((post, i) => (
            <DraftCard
              key={post.id}
              post={post}
              index={i}
              onPostUpdate={onPostUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PublishedCard — read-only record of a post that has already gone out.
// ---------------------------------------------------------------------------

interface PublishedCardProps {
  post: ContentRow;
}

function PublishedCard({ post }: PublishedCardProps) {
  const publishedLabel = post.published_at
    ? formatScheduledTime(post.published_at)
    : post.scheduled_at
    ? formatScheduledTime(post.scheduled_at)
    : "—";

  return (
    <article className="pike-border rounded-token border-border bg-surface p-4 shadow-token flex flex-col gap-3">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-xs font-bold uppercase text-signal">
            {post.post_type === "build_update" ? "Build Update" : "Trend"}
          </span>
          <span className="font-mono text-xs font-bold uppercase text-muted">
            Published
          </span>
          {post.source_type && (
            <span className="font-mono text-xs text-muted">
              ({post.source_type})
            </span>
          )}
        </div>
        <span className="font-mono text-xs text-muted">
          Published: {publishedLabel}
        </span>
      </div>

      {/* Post body — read-only */}
      <p className="whitespace-pre-wrap rounded-token border border-border bg-background p-3 font-mono text-sm text-ink">
        {post.draft_text}
      </p>
    </article>
  );
}
