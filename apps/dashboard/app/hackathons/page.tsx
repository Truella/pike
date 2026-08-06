import { redirect } from "next/navigation";
import { HackathonsTable } from "@/components/hackathons/HackathonsTable";
import { Card } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/server";

export default async function HackathonsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: hackathons, error } = await supabase
    .from("hackathons_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("found_at", { ascending: false });

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-ink">
      <div className="mx-auto max-w-6xl">
        <p className="font-mono text-xs font-bold uppercase text-signal">
          {"// Hackathons"}
        </p>
        <h1 className="pike-display mt-2 text-4xl font-bold">Hackathons</h1>
        <p className="mt-2 max-w-2xl text-muted">
          Active hackathons with high prize money and manageable timelines collected by Pike.
        </p>

        {error ? (
          <p className="pike-border mt-8 rounded-token border-alert p-4 text-alert">
            Unable to load hackathons: {error.message}
          </p>
        ) : null}

        {!error && (!hackathons || hackathons.length === 0) ? (
          <Card className="mt-8 text-muted">
            No matching hackathons have been collected yet.
          </Card>
        ) : null}

        {!error && hackathons && hackathons.length > 0 ? (
          <HackathonsTable initialHackathons={hackathons} />
        ) : null}
      </div>
    </main>
  );
}
