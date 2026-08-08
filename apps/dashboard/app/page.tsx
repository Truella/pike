import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { StatusTag } from "@/components/ui/StatusTag";
import { createClient } from "@/lib/supabase/server";

function getModuleStatus(lastRunAt: string | null, cadenceHours: number = 24) {
  if (!lastRunAt) return { label: "Never run", variant: "neutral" as const };
  const lastRun = new Date(lastRunAt);
  const now = new Date();
  const diffHours = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);
  if (diffHours <= cadenceHours) {
    return { label: "Live", variant: "live" as const };
  }
  return { label: "Idle", variant: "neutral" as const };
}

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch modules registry
  const { data: modulesData } = await supabase
    .from("modules")
    .select("id, name, last_run_at");

  const modulesMap = new Map(
    (modulesData || []).map((m) => [m.id.toLowerCase(), m.last_run_at]),
  );

  // Fetch counts for modules if user authenticated
  let jobsCount = 0;
  let hackathonsCount = 0;
  let studyCompletedToday = 0;
  let contentDraftsCount = 0;

  if (user) {
    // Jobs: non-closed count
    const { count: jobsUnclosed } = await supabase
      .from("jobs_listings")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .neq("status", "closed");
    jobsCount = jobsUnclosed || 0;

    // Hackathons: entries with upcoming deadlines
    const { count: hackathonsUpcoming } = await supabase
      .from("hackathons_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("deadline", new Date().toISOString());
    hackathonsCount = hackathonsUpcoming || 0;

    // Study: topics completed today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const { count: studyDoneToday } = await supabase
      .from("study_progress")
      .select("topic_id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "done")
      .gte("completed_at", startOfToday.toISOString());
    studyCompletedToday = studyDoneToday || 0;

    // Content: drafts needing review
    const { count: contentDrafts } = await supabase
      .from("pike_content")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "draft");
    contentDraftsCount = contentDrafts || 0;
  }

  const moduleCards = [
    {
      id: "jobs",
      name: "Jobs",
      detail: "Listing and application pipeline",
      lastRunAt: modulesMap.get("jobs") || null,
      statLabel: `${jobsCount} active listings`,
    },
    {
      id: "hackathons",
      name: "Hackathons",
      detail: "Opportunity discovery and tracking",
      lastRunAt: modulesMap.get("hackathons") || null,
      statLabel: `${hackathonsCount} upcoming deadlines`,
    },
    {
      id: "study",
      name: "Study",
      detail: "Curriculum and daily progress",
      lastRunAt: modulesMap.get("study") || null,
      statLabel: `${studyCompletedToday} topics completed today`,
    },
    {
      id: "content",
      name: "Content",
      detail: "Draft review and content pipeline",
      lastRunAt: modulesMap.get("content") || null,
      statLabel: `${contentDraftsCount} drafts needing review`,
    },
  ];

  return (
    <main className="flex flex-1 bg-background px-6 py-16 text-ink">
      <div className="mx-auto w-full max-w-6xl">
        <p className="font-mono text-xs font-bold uppercase text-signal">
          {"// Dashboard"}
        </p>
        <h1 className="pike-display mt-3 max-w-3xl text-4xl font-bold sm:text-6xl">
          Your daily work, in one place.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-muted">
          Pike tracks your jobs, hackathons, study progress, and automation
          health as each module comes online.
        </p>

        <section className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {moduleCards.map((module) => {
            const status = getModuleStatus(module.lastRunAt);
            return (
              <Link
                key={module.id}
                href={`/${module.id}`}
                className="group transition-transform hover:-translate-y-1 block"
              >
                <Card className="flex h-full flex-col justify-between transition-colors group-hover:border-signal">
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="pike-display text-lg font-bold group-hover:text-signal">
                        {module.name}
                      </h2>
                      <StatusTag variant={status.variant}>{status.label}</StatusTag>
                    </div>
                    <p className="mt-4 font-mono text-xs leading-5 text-muted">
                      {module.detail}
                    </p>
                  </div>
                  <div className="mt-6 border-t border-border pt-3">
                    <span className="font-mono text-xs font-bold text-signal">
                      {module.statLabel}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </section>

        <Link
          className="mt-10 inline-block font-mono text-sm font-bold uppercase text-signal underline-offset-4 hover:underline"
          href="/settings"
        >
          View module registry
        </Link>
      </div>
    </main>
  );
}
