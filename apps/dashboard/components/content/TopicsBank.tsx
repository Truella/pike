"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Database } from "@/lib/supabase/database.types";

type TopicRow = Database["public"]["Tables"]["pike_topics_bank"]["Row"];

interface TopicsBankProps {
  initialTopics: TopicRow[];
}

export function TopicsBank({ initialTopics }: TopicsBankProps) {
  const [topics, setTopics] = useState<TopicRow[]>(initialTopics);
  const [newTopic, setNewTopic] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    if (!newTopic.trim()) { setError("Topic text is required."); return; }
    setIsAdding(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Session expired."); setIsAdding(false); return; }

    const { data, error: err } = await supabase
      .from("pike_topics_bank")
      .insert({
        user_id: user.id,
        topic: newTopic.trim(),
        notes: newNotes.trim() || null,
        source: "manual",
        used: false,
      })
      .select()
      .single();

    if (err) {
      setError(err.message);
    } else if (data) {
      setTopics((prev) => [data, ...prev]);
      setNewTopic("");
      setNewNotes("");
    }

    setIsAdding(false);
  }

  const unused = topics.filter((t) => !t.used);
  const used = topics.filter((t) => t.used);

  return (
    <Card className="flex flex-col gap-5">
      <h2 className="pike-display font-bold text-xl">Topics Bank</h2>
      <p className="text-sm text-muted">
        Topics here are picked up automatically by the generation pipeline when trend posts are needed.
      </p>

      {/* Add new topic */}
      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <h3 className="font-mono text-xs font-bold uppercase text-muted">Add Topic</h3>
        <input
          id="new-topic"
          type="text"
          placeholder="e.g. The state of CSS container queries in 2026"
          className="pike-border rounded-token border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-signal disabled:opacity-60"
          value={newTopic}
          onChange={(e) => setNewTopic(e.target.value)}
          disabled={isAdding}
        />
        <textarea
          id="new-topic-notes"
          rows={2}
          placeholder="Optional notes or angle..."
          className="pike-border rounded-token border-border bg-background px-3 py-2 text-sm text-ink outline-none focus:border-signal disabled:opacity-60 resize-none"
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          disabled={isAdding}
        />
        <Button type="button" onClick={handleAdd} disabled={isAdding}>
          {isAdding ? "Adding…" : "Add Topic"}
        </Button>
        {error && <p className="font-mono text-xs text-alert">{error}</p>}
      </div>

      {/* Unused topics */}
      {unused.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="font-mono text-xs font-bold uppercase text-muted">
            Unused ({unused.length})
          </h3>
          <ul className="flex flex-col gap-2">
            {unused.map((t) => (
              <li key={t.id} className="rounded-token border border-border bg-background px-3 py-2 text-sm text-ink">
                <p>{t.topic}</p>
                {t.notes && <p className="mt-1 text-xs text-muted">{t.notes}</p>}
                <span className="mt-1 inline-block font-mono text-xs text-muted">
                  {t.source === "groq_suggested" ? "AI suggested" : "Manual"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Used topics */}
      {used.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <h3 className="font-mono text-xs font-bold uppercase text-muted">
            Used ({used.length})
          </h3>
          <ul className="flex flex-col gap-1">
            {used.map((t) => (
              <li key={t.id} className="text-sm text-muted line-through">
                {t.topic}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
