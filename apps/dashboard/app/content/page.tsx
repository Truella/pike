import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContentDashboardClient } from "@/components/content/ContentDashboardClient";

export default async function ContentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch content queue (needs_review + approved/scheduled), newest first
  const { data: posts, error: postsError } = await supabase
    .from("pike_content")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["needs_review", "approved", "scheduled"])
    .order("created_at", { ascending: false });

  // Fetch topics bank (unused first, then used)
  const { data: topics, error: topicsError } = await supabase
    .from("pike_topics_bank")
    .select("*")
    .eq("user_id", user.id)
    .order("used", { ascending: true })
    .order("created_at", { ascending: true });

  // Weekly counts — same logic as weeklyCount.js (start of current UTC week, Sunday)
  const weekStart = new Date();
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay());

  const { count: buildCount } = await supabase
    .from("pike_content")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("post_type", "build_update")
    .neq("status", "rejected")
    .gte("created_at", weekStart.toISOString());

  const { count: trendCount } = await supabase
    .from("pike_content")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("post_type", "trend")
    .neq("status", "rejected")
    .gte("created_at", weekStart.toISOString());

  const error = postsError || topicsError;

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-ink">
      {error ? (
        <div className="mx-auto max-w-6xl">
          <p className="pike-border rounded-token border-alert p-4 text-alert">
            Unable to load content data: {error.message}
          </p>
        </div>
      ) : (
        <ContentDashboardClient
          posts={posts ?? []}
          topics={topics ?? []}
          weeklyBuildCount={buildCount ?? 0}
          weeklyTrendCount={trendCount ?? 0}
        />
      )}
    </main>
  );
}
