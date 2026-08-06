import { notify } from "../lib/notify.js";

/**
 * Sends a Telegram notification containing the current study topic.
 * @param {string} title
 * @param {string} url
 * @param {number} daysStuck
 */
export async function notifyStudyTopic(title, url, daysStuck) {
  let message = `${title}\n${url}`;
  if (daysStuck > 0) {
    message += `\nDays stuck: ${daysStuck}`;
  }
  await notify(message);
}
