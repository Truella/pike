import { parseSidebar } from "./parseSidebar.js";

const sidebarUrl =
  "https://raw.githubusercontent.com/yangshun/front-end-interview-handbook/main/website/sidebars.js";
const requiredEnvironment = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PIKE_OWNER_USER_ID",
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

const sidebarResponse = await fetch(sidebarUrl);
if (!sidebarResponse.ok) {
  throw new Error(`Sidebar request failed (${sidebarResponse.status})`);
}

const topics = parseSidebar(await sidebarResponse.text());
if (topics.length === 0) throw new Error("Sidebar contained no study topics");

const curriculumEndpoint = new URL(`${supabaseUrl}/rest/v1/study_curriculum`);
curriculumEndpoint.searchParams.set(
  "select",
  "id,order_index,title,section,url",
);
curriculumEndpoint.searchParams.set("order", "order_index.asc");

const existingResponse = await request(curriculumEndpoint);
const existingTopics = await existingResponse.json();

if (!Array.isArray(existingTopics)) {
  throw new Error("Supabase returned an invalid curriculum response");
}

const upsertEndpoint = new URL(`${supabaseUrl}/rest/v1/study_curriculum`);
upsertEndpoint.searchParams.set("on_conflict", "id");

if (existingTopics.length > 0) {
  const stagedTopics = existingTopics.map((topic, index) => ({
    ...topic,
    order_index: -(index + 1),
  }));

  await request(upsertEndpoint, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(stagedTopics),
  });
}

const currentIds = new Set(topics.map((topic) => topic.id));
const retainedTopics = existingTopics
  .filter((topic) => !currentIds.has(topic.id))
  .map((topic, index) => ({
    ...topic,
    order_index: topics.length + index,
  }));
const finalCurriculum = [...topics, ...retainedTopics];

try {
  await request(upsertEndpoint, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(finalCurriculum),
  });
} catch (error) {
  if (existingTopics.length > 0) {
    try {
      await request(upsertEndpoint, {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(existingTopics),
      });
    } catch (restoreError) {
      throw new AggregateError(
        [error, restoreError],
        "Curriculum reorder and recovery both failed",
      );
    }
  }
  throw error;
}

const progressEndpoint = new URL(`${supabaseUrl}/rest/v1/study_progress`);
progressEndpoint.searchParams.set("on_conflict", "user_id,topic_id");

await request(progressEndpoint, {
  method: "POST",
  headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
  body: JSON.stringify(
    finalCurriculum.map((topic) => ({
      user_id: userId,
      topic_id: topic.id,
      status: "not_started",
    })),
  ),
});

console.log(
  `Synced ${topics.length} upstream topics and retained ${retainedTopics.length} missing upstream topics.`,
);
