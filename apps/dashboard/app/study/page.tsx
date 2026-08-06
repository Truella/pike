import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudyDashboardClient } from "@/components/study/StudyDashboardClient";

export default async function StudyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: curriculum, error: currError } = await supabase
    .from("study_curriculum")
    .select("id, order_index, title, section, url")
    .order("order_index", { ascending: true });

  const { data: progress, error: progError } = await supabase
    .from("study_progress")
    .select("user_id, topic_id, status, created_at, started_at, completed_at, notes")
    .eq("user_id", user.id);

  const error = currError || progError;

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-ink">
      {error ? (
        <div className="mx-auto max-w-6xl">
          <p className="pike-border rounded-token border-alert p-4 text-alert">
            Unable to load study curriculum or progress: {error.message}
          </p>
        </div>
      ) : (
        <StudyDashboardClient
          curriculum={curriculum || []}
          initialProgress={progress || []}
        />
      )}
    </main>
  );
}
