import { notify } from "../lib/notify.js";

export async function notifyJobsSummary(newListings, overdueFollowUps) {
  const message = [
    "Pike jobs daily summary",
    `New listings: ${newListings}`,
    `Overdue follow-ups: ${overdueFollowUps}`,
  ].join("\n");

  await notify(message);
}
