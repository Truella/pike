import { fetchDevpostHackathons } from "./sources/devpost.js";
import { heartbeat } from "../lib/heartbeat.js";
import { notifyHackathonsDigest } from "./notify.js";

const requiredEnvironment = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PIKE_OWNER_USER_ID",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
];

const missingEnvironment = requiredEnvironment.filter(
  (name) => !process.env[name],
);

if (missingEnvironment.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvironment.join(", ")}`,
  );
}

const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.env.PIKE_OWNER_USER_ID;
const minPrize = parseInt(process.env.HACKATHON_MIN_PRIZE || "5000", 10);
const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
};

async function request(endpoint, options = {}) {
  const response = await fetch(endpoint, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!response.ok) {
    throw new Error(
      `Supabase request failed (${response.status}): ${await response.text()}`,
    );
  }

  return response;
}

// 1. Fetch from Devpost
console.log("Fetching Devpost hackathons...");
const scraped = await fetchDevpostHackathons();
console.log(`Fetched ${scraped.length} hackathons from Devpost.`);

// 2. Filter by minimum prize threshold and future deadline
const filtered = scraped.filter((entry) => {
  const prizeVal = parseInt(entry.prize.replace(/[^0-9]/g, ""), 10) || 0;
  if (prizeVal < minPrize) return false;

  if (entry.deadline) {
    const deadlineDate = new Date(entry.deadline);
    if (deadlineDate < new Date()) return false;
  }

  return true;
});
console.log(`${filtered.length} hackathons passed prize (>= $${minPrize}) and deadline filters.`);

if (filtered.length === 0) {
  console.log("No hackathons matched the filters.");
  await heartbeat("hackathons");
  await notifyHackathonsDigest([]);
  process.exit(0);
}

// 3. Fetch existing entries to detect which are brand new
const existingEndpoint = new URL(`${supabaseUrl}/rest/v1/hackathons_entries`);
existingEndpoint.searchParams.set("select", "link");
existingEndpoint.searchParams.set("user_id", `eq.${userId}`);
const existingResponse = await request(existingEndpoint);
const existingData = await existingResponse.json();
const existingLinks = new Set(existingData.map((row) => row.link));

const newEntries = filtered.filter((entry) => !existingLinks.has(entry.link));
console.log(`Detected ${newEntries.length} new hackathons.`);

// 4. Map entries for database insert
const dbEntries = filtered.map((entry) => ({
  user_id: userId,
  name: entry.name,
  organizer: entry.organizer,
  link: entry.link,
  prize: entry.prize,
  deadline: entry.deadline,
  status: "saved",
}));

// 5. Upsert to Supabase
const upsertEndpoint = new URL(`${supabaseUrl}/rest/v1/hackathons_entries`);
upsertEndpoint.searchParams.set("on_conflict", "user_id,link");
await request(upsertEndpoint, {
  method: "POST",
  headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
  body: JSON.stringify(dbEntries),
});
console.log("Upserted hackathons successfully.");

// 6. Update heartbeat
await heartbeat("hackathons");

// 7. Send digest notification for new entries
await notifyHackathonsDigest(newEntries);
