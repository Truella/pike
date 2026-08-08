import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { HistoryList } from "@/components/study/HistoryList";

export default async function StudyHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: history, error } = await supabase
    .from("study_progress")
    .select(`
      topic_id,
      status,
      completed_at,
      notes,
      study_curriculum!inner(
        title,
        section,
        url
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "done")
    .order("completed_at", { ascending: false });

  const formattedHistory = (history || []).map((item) => ({
    topic_id: item.topic_id,
    status: item.status,
    completed_at: item.completed_at,
    notes: item.notes,
    study_curriculum: item.study_curriculum as unknown as {
      title: string;
      section: string;
      url: string;
    },
  }));

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-ink">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <p className="font-mono text-xs font-bold uppercase text-signal">
              {"// Study / History"}
            </p>
            <h1 className="pike-display mt-2 text-4xl font-bold">Study History</h1>
            <p className="mt-2 max-w-2xl text-muted">
              Scrollable history of all completed frontend study topics.
            </p>
          </div>
          <div>
            <Link
              href="/study"
              className="pike-border pike-button rounded-token border-border bg-ink px-4 py-2 text-sm font-bold text-background shadow-token hover:opacity-95"
            >
              ← Back to Study
            </Link>
          </div>
        </div>

        {error ? (
          <p className="pike-border rounded-token border-alert p-4 text-alert">
            Unable to load study history: {error.message}
          </p>
        ) : null}

        {!error && (!history || history.length === 0) ? (
          <Card className="text-center py-12 text-muted">
            No completed study topics yet. Go complete your first topic!
          </Card>
        ) : null}

        {!error && history && history.length > 0 ? (
          <HistoryList initialHistory={formattedHistory} />
        ) : null}
      </div>
    </main>
  );
}
