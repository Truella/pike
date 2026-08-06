import { heartbeat } from "../lib/heartbeat.js";
import { notifyStudyTopic } from "./notify.js";

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

// 1. Fetch study curriculum ordered by order_index
const curriculumEndpoint = new URL(`${supabaseUrl}/rest/v1/study_curriculum`);
curriculumEndpoint.searchParams.set("select", "id,order_index,title,section,url");
curriculumEndpoint.searchParams.set("order", "order_index.asc");
const curriculumResponse = await request(curriculumEndpoint);
const curriculum = await curriculumResponse.json();

// 2. Fetch study progress for the owner user
const progressEndpoint = new URL(`${supabaseUrl}/rest/v1/study_progress`);
progressEndpoint.searchParams.set("select", "topic_id,status,created_at,started_at,completed_at");
progressEndpoint.searchParams.set("user_id", `eq.${userId}`);
const progressResponse = await request(progressEndpoint);
const progressList = await progressResponse.json();

const progressMap = new Map(progressList.map((p) => [p.topic_id, p]));

// 3. Find the lowest order_index topic where status is not 'done'
let currentTopic = null;
let currentProgress = null;

for (const topic of curriculum) {
  const progress = progressMap.get(topic.id);
  const status = progress ? progress.status : "not_started";
  if (status !== "done") {
    currentTopic = topic;
    currentProgress = progress;
    break;
  }
}

if (!currentTopic) {
  console.log("All study topics have been completed!");
} else {
  // 4. Compute days stuck: now() - coalesce(started_at, created_at)
  const now = new Date();
  const startedAt = currentProgress?.started_at ? new Date(currentProgress.started_at) : null;
  const createdAt = currentProgress?.created_at ? new Date(currentProgress.created_at) : now;
  const anchor = startedAt || createdAt;
  const diffMs = Math.max(0, now.getTime() - anchor.getTime());
  const daysStuck = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  console.log(`Current topic: "${currentTopic.title}" (days stuck: ${daysStuck})`);

  // 5. Send daily notification
  await notifyStudyTopic(currentTopic.title, currentTopic.url, daysStuck);
}

// 6. Update study module heartbeat
await heartbeat("study");
