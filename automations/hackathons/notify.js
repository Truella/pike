import { notify } from "../lib/notify.js";

/**
 * Compiles and sends the weekly digest of newly found hackathons.
 * @param {Array} newEntries
 */
export async function notifyHackathonsDigest(newEntries) {
  if (newEntries.length === 0) {
    await notify("Pike Hackathons: No new hackathons found this week.");
    return;
  }

  // Sort by prize value descending to find top 1-3
  const getPrizeValue = (entry) => {
    return parseInt((entry.prize || "").replace(/[^0-9]/g, ""), 10) || 0;
  };

  const sorted = [...newEntries].sort((a, b) => getPrizeValue(b) - getPrizeValue(a));
  const topThree = sorted.slice(0, 3);

  const lines = [
    `Pike Hackathons: Found ${newEntries.length} new hackathon(s) this week!`,
    "",
    "Top Entries:",
  ];

  topThree.forEach((entry, index) => {
    lines.push(`${index + 1}. ${entry.name}`);
    lines.push(`   Prize: ${entry.prize}`);
    lines.push(`   Link: ${entry.link}`);
  });

  await notify(lines.join("\n"));
}

/**
 * Compiles and sends urgent deadline alerts.
 * @param {Array} urgentEntries
 */
export async function notifyHackathonsDeadlineAlert(urgentEntries) {
  if (urgentEntries.length === 0) return;

  const lines = [
    "⚠️ Pike Hackathons: Urgent Deadlines Imminent (<3 days)!",
    "",
  ];

  urgentEntries.forEach((entry) => {
    const daysLeft = Math.ceil(
      (new Date(entry.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    lines.push(`- ${entry.name}`);
    lines.push(`  Deadline: ${new Date(entry.deadline).toLocaleDateString()} (${daysLeft}d left)`);
    lines.push(`  Link: ${entry.link}`);
  });

  await notify(lines.join("\n"));
}
