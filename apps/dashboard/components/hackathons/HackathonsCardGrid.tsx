"use client";

import { Card } from "@/components/ui/Card";
import { HackathonCardMobile, type Hackathon, type HackathonStatus } from "./HackathonRow";

// HackathonsCardGrid — renders each hackathon as a sticky-note card.
// All data/logic is owned by the parent and passed as props.
export function HackathonsCardGrid({
  hackathons,
  onStatusChange,
  onArchiveToggle,
  onDelete,
}: {
  hackathons: Hackathon[];
  onStatusChange: (id: string, status: HackathonStatus) => void;
  onArchiveToggle: (id: string, archived: boolean) => void;
  onDelete: (id: string) => void;
}) {
  if (hackathons.length === 0) {
    return (
      <Card index={0} className="text-center font-mono text-xs text-muted py-8">
        No hackathons found matching criteria.
      </Card>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {hackathons.map((h, i) => (
        <HackathonCardMobile
          key={h.id}
          hackathon={h}
          index={i}
          onStatusChange={onStatusChange}
          onArchiveToggle={onArchiveToggle}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
