import { fetchRemotiveJobs } from "./sources/remotive.js";
import { fetchRemoteOkJobs } from "./sources/remoteok.js";

const keywords = ["react", "next.js", "nextjs", "typescript", "remote", "contract"];

const requiredEnvironment = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PIKE_USER_ID",
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

const userId = process.env.PIKE_USER_ID;
const matchingListings = listings
  .filter((listing) => {
    const searchableText = listing.searchableText.toLowerCase();
    return keywords.some((keyword) => searchableText.includes(keyword));
  })
  .map(({ searchableText, ...listing }) => ({ ...listing, user_id: userId }));
const filteredListings = [
  ...new Map(matchingListings.map((listing) => [listing.link, listing])).values(),
];

if (filteredListings.length === 0) {
  console.log("No matching job listings found.");
  process.exit(0);
}

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
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify(filteredListings),
});

if (!response.ok) {
  throw new Error(`Job upsert failed (${response.status}): ${await response.text()}`);
}

console.log(`Upserted ${filteredListings.length} matching job listings.`);
