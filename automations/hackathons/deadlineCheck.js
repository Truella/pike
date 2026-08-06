import { notifyHackathonsDeadlineAlert } from "./notify.js";

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

// 1. Fetch non-closed hackathons with valid deadlines for the owner
const endpoint = new URL(`${supabaseUrl}/rest/v1/hackathons_entries`);
endpoint.searchParams.set("select", "name,link,deadline,status");
endpoint.searchParams.set("user_id", `eq.${userId}`);
endpoint.searchParams.set("status", "not.eq.closed");
endpoint.searchParams.set("deadline", "not.is.null");

const response = await request(endpoint);
const hackathons = await response.json();

// 2. Filter hackathons with deadlines within 3 days (72 hours)
const now = new Date();
const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

const urgent = hackathons.filter((h) => {
  const deadlineDate = new Date(h.deadline);
  return deadlineDate >= now && deadlineDate <= threeDaysFromNow;
});

// 3. Notify only if there are urgent deadlines
if (urgent.length > 0) {
  console.log(`Found ${urgent.length} urgent hackathons. Sending Telegram alert...`);
  await notifyHackathonsDeadlineAlert(urgent);
} else {
  console.log("No urgent hackathons found. Exiting silently.");
}
