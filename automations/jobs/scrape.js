import { fetchRemotiveJobs } from "./sources/remotive.js";
import { fetchRemoteOkJobs } from "./sources/remoteok.js";
import { heartbeat } from "../lib/heartbeat.js";
import { notifyJobsSummary } from "./notify.js";


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

const sourceResults = await Promise.allSettled([
  fetchRemotiveJobs(),
  fetchRemoteOkJobs(),
]);
const listings = [];

for (const result of sourceResults) {
  if (result.status === "fulfilled") {
    listings.push(...result.value);
  } else {
    console.error(result.reason);
  }
}

if (sourceResults.every((result) => result.status === "rejected")) {
  throw new Error("All job sources failed");
}

const techKeywords = [
  "react",
  "next.js",
  "nextjs",
  "typescript",
  "javascript",
  "frontend",
  "front-end",
  "front end",
  "web developer",
  "full stack",
  "fullstack",
  "software engineer",
  "software developer",
];

const excludeKeywords = [
  "procurement",
  "architectural",
  "brand strategy",
  "accountant",
  "recruiter",
  "sales executive",
  "customer support",
];

const userId = process.env.PIKE_OWNER_USER_ID;
const matchingListings = listings
  .filter((listing) => {
    const titleLower = listing.title.toLowerCase();
    const searchableText = listing.searchableText.toLowerCase();

    const matchesExclude = excludeKeywords.some(
      (kw) => titleLower.includes(kw) || searchableText.includes(kw)
    );
    if (matchesExclude) return false;

    const matchesTech = techKeywords.some(
      (kw) => titleLower.includes(kw) || searchableText.includes(kw)
    );
    return matchesTech;
  })
  .map(({ searchableText, ...listing }) => ({ ...listing, user_id: userId }));
const filteredListings = [
  ...new Map(matchingListings.map((listing) => [listing.link, listing])).values(),
];

let newListings = 0;

if (filteredListings.length === 0) {
  console.log("No matching job listings found.");
} else {
  const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const endpoint = new URL(`${supabaseUrl}/rest/v1/jobs_listings`);

  endpoint.searchParams.set("on_conflict", "user_id,link");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=representation",
    },
    body: JSON.stringify(filteredListings),
  });

  if (!response.ok) {
    throw new Error(
      `Job upsert failed (${response.status}): ${await response.text()}`,
    );
  }

  const insertedListings = await response.json();
  newListings = insertedListings.length;
  console.log(`Inserted ${newListings} new matching job listings.`);
}

await heartbeat("jobs");

const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const overdueEndpoint = new URL(`${supabaseUrl}/rest/v1/jobs_listings`);

overdueEndpoint.searchParams.set("select", "id");
overdueEndpoint.searchParams.set("user_id", `eq.${userId}`);
overdueEndpoint.searchParams.set("follow_up_at", `lt.${new Date().toISOString()}`);

const overdueResponse = await fetch(overdueEndpoint, {
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    Prefer: "count=exact",
    Range: "0-0",
  },
});

if (!overdueResponse.ok) {
  throw new Error(
    `Overdue follow-up count failed (${overdueResponse.status}): ${await overdueResponse.text()}`,
  );
}

const contentRange = overdueResponse.headers.get("content-range");
const overdueFollowUps = Number(contentRange?.split("/")[1]);

if (!Number.isInteger(overdueFollowUps)) {
  throw new Error("Supabase did not return an exact overdue follow-up count");
}

await notifyJobsSummary(newListings, overdueFollowUps);
