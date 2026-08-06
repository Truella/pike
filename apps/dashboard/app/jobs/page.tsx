import { redirect } from "next/navigation";
import { JobRow } from "@/components/jobs/JobRow";
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
      "id, title, company, link, source, found_at, status, applied_at, follow_up_at, notes",
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
          <div className="pike-border mt-8 overflow-x-auto rounded-token border-border bg-surface shadow-token">
            <table className="w-full min-w-5xl border-collapse text-left">
              <thead>
                <tr className="pike-border border-x-0 border-t-0 border-border font-mono text-xs uppercase text-muted">
                  <th className="px-4 py-3 font-bold">Role</th>
                  <th className="px-4 py-3 font-bold">Source</th>
                  <th className="px-4 py-3 font-bold">Found</th>
                  <th className="px-4 py-3 font-bold">Follow-up</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <JobRow job={job} key={job.id} />
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </main>
  );
}
