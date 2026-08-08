"use client";

import { useState } from "react";
import { HistoryRow, type HistoryItem } from "./HistoryRow";

export function HistoryList({
  initialHistory,
}: {
  initialHistory: HistoryItem[];
}) {
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      {initialHistory.map((item) => (
        <HistoryRow
          key={item.topic_id}
          item={item}
          isEditing={editingTopicId === item.topic_id}
          onToggleEdit={() =>
            setEditingTopicId((current) =>
              current === item.topic_id ? null : item.topic_id,
            )
          }
        />
      ))}
    </div>
  );
}
