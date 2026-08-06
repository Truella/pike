import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";

function formatDate(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

export default async function StudyHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: history, error } = await supabase
    .from("study_progress")
    .select(`
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
          <div className="flex flex-col gap-6">
            {history.map((record, index) => {
              const topic = record.study_curriculum as unknown as {
                title: string;
                section: string;
                url: string;
              };
              return (
                <Card key={index} className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
                    <div>
                      <span className="font-mono text-xs font-bold uppercase text-signal mr-2">
                        {topic.section}
                      </span>
                      <a
                        href={topic.url}
                        target="_blank"
                        rel="noreferrer"
                        className="pike-display font-bold text-lg text-ink underline underline-offset-4 hover:text-signal"
                      >
                        {topic.title}
                      </a>
                    </div>
                    <span className="font-mono text-xs text-muted">
                      Completed: {formatDate(record.completed_at)}
                    </span>
                  </div>
                  {record.notes ? (
                    <div className="bg-background rounded-token p-3 border border-border">
                      <p className="text-sm whitespace-pre-wrap text-ink font-mono">{record.notes}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted italic">No notes recorded for this topic.</p>
                  )}
                </Card>
              );
            })}
          </div>
        ) : null}
      </div>
    </main>
  );
}
