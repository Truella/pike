import { redirect } from "next/navigation";
import { JobsTable } from "@/components/jobs/JobsTable";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";

export default async function JobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: jobs, error } = await supabase
    .from("jobs_listings")
    .select(
      "id, title, company, link, source, found_at, status, applied_at, follow_up_at, notes, archived",
    )
    .eq("user_id", user.id)
    .order("found_at", { ascending: false });

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-ink">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-xs font-bold uppercase text-signal">
          {"// Jobs"}
        </p>
        <h1 className="pike-display mt-2 text-4xl font-bold">Job listings</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Remote frontend and full-stack opportunities collected by Pike.
        </p>

        {error ? (
          <p className="pike-border mt-8 rounded-token border-alert p-4 text-alert">
            Unable to load jobs: {error.message}
          </p>
        ) : null}

        {!error && jobs.length === 0 ? (
          <Card className="mt-8 text-muted">
            No matching jobs have been collected yet.
          </Card>
        ) : null}

        {!error && jobs.length > 0 ? (
          <JobsTable initialJobs={jobs} />
        ) : null}
      </div>
    </main>
  );
}
