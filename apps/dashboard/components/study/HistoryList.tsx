"use client";

import { useState } from "react";
import { HistoryRow, type HistoryItem } from "./HistoryRow";

export function HistoryList({
  initialHistory,
}: {
  initialHistory: HistoryItem[];
}) {
  const [items, setItems] = useState<HistoryItem[]>(initialHistory);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);

  function handleSave(topicId: string, patch: Partial<Pick<HistoryItem, "status" | "notes" | "completed_at">>) {
    setItems((current) =>
      current.map((item) =>
        item.topic_id === topicId ? { ...item, ...patch } : item,
      ),
    );
    setEditingTopicId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      {items.map((item) => (
        <HistoryRow
          key={item.topic_id}
          item={item}
          isEditing={editingTopicId === item.topic_id}
          onToggleEdit={() =>
            setEditingTopicId((current) =>
              current === item.topic_id ? null : item.topic_id,
            )
          }
          onSave={(patch) => handleSave(item.topic_id, patch)}
        />
      ))}
    </div>
  );
}
