/**
 * Orchestrator for the buffer-triggered content generation workflow.
 * Called by content-generate.yml.
 *
 * Logic:
 * 1. Count approved/scheduled rows (the ready-to-publish buffer).
 * 2. If below threshold, run generate.js enough times to refill, notify Telegram.
 * 3. If at or above threshold, exit silently.
 * 4. Always update the pike-content module heartbeat.
 */
import { heartbeat } from "../lib/heartbeat.js";
import { notify } from "../lib/notify.js";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const requiredEnvironment = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PIKE_OWNER_USER_ID",
  "GROQ_API_KEY",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
];

const missing = requiredEnvironment.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.env.PIKE_OWNER_USER_ID;
const threshold = parseInt(process.env.CONTENT_BUFFER_THRESHOLD || "3", 10);

// 1. Count approved + scheduled rows
const bufferEndpoint = new URL(`${supabaseUrl}/rest/v1/pike_content`);
bufferEndpoint.searchParams.set("select", "id");
bufferEndpoint.searchParams.set("user_id", `eq.${userId}`);
bufferEndpoint.searchParams.set("status", "in.(approved,scheduled)");

const bufferRes = await fetch(bufferEndpoint, {
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Prefer: "count=exact",
    Range: "0-0",
  },
});

const contentRange = bufferRes.headers.get("content-range") ?? "0/0";
const bufferCount = parseInt(contentRange.split("/")[1] ?? "0", 10);

console.log(`Buffer: ${bufferCount} approved/scheduled posts (threshold: ${threshold})`);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const generateScript = path.join(__dirname, "generate.js");
let generated = 0;

// 2. Generate only if below threshold
if (bufferCount < threshold) {
  const needed = threshold - bufferCount;
  console.log(`Buffer low. Generating ${needed} new draft(s)...`);

  for (let i = 0; i < needed; i++) {
    try {
      execFileSync("node", [generateScript], {
        stdio: "inherit",
        env: process.env,
      });
      generated++;
    } catch (err) {
      console.error(`Generation run ${i + 1} failed:`, err.message);
    }
  }

  if (generated > 0) {
    await notify(
      `Pike Content: ${generated} new draft(s) added to the review queue. Open the dashboard to review and approve.`
    );
  }
} else {
  console.log("Buffer healthy. No generation needed.");
}

// 3. Always update heartbeat
await heartbeat("pike-content");
