import { getBuildUpdateSource, getTrendSource } from "./sourceSelectors.js";
import { buildBuildUpdatePrompt } from "./prompts/buildUpdate.js";
import { buildTrendPrompt } from "./prompts/trend.js";
import { getWeeklyPostCounts } from "./weeklyCount.js";

const requiredEnvironment = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PIKE_OWNER_USER_ID",
  "GROQ_API_KEY",
];

const missing = requiredEnvironment.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.env.PIKE_OWNER_USER_ID;
const groqApiKey = process.env.GROQ_API_KEY;
const WEEKLY_TARGET = 2; // posts per type per week

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
};

// 1. Count this week's posts
const counts = await getWeeklyPostCounts(supabaseUrl, serviceRoleKey, userId);
console.log(`This week: ${counts.build_update} build_update, ${counts.trend} trend`);

if (counts.build_update >= WEEKLY_TARGET && counts.trend >= WEEKLY_TARGET) {
  console.log("Weekly targets already met. No generation needed.");
  process.exit(0);
}

// 2. Determine which type is lagging (build_update wins a tie)
const postType =
  counts.build_update <= counts.trend ? "build_update" : "trend";
console.log(`Generating a ${postType} post...`);

// 3. Select source material
let draftText;
let sourceType;
let sourceRef;

if (postType === "build_update") {
  const result = await getBuildUpdateSource(supabaseUrl, serviceRoleKey, userId);
  if (!result.found) {
    console.log("No recent activity found. A manual note is required for a build_update post. Exiting.");
    process.exit(0);
  }
  sourceType = "activity_scan";
  sourceRef = result.sourceRef;

  // 4. Compose prompt and call Groq
  const prompt = buildBuildUpdatePrompt(result.source);
  draftText = await callGroq(prompt);
} else {
  const result = await getTrendSource(supabaseUrl, serviceRoleKey, userId, groqApiKey);
  sourceType = "topics_bank";
  sourceRef = result.topicId;

  // Mark topic as used
  const updateEndpoint = new URL(`${supabaseUrl}/rest/v1/pike_topics_bank`);
  updateEndpoint.searchParams.set("id", `eq.${result.topicId}`);
  updateEndpoint.searchParams.set("user_id", `eq.${userId}`);
  await fetch(updateEndpoint, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify({ used: true, used_at: new Date().toISOString() }),
  });

  const prompt = buildTrendPrompt(result.source);
  draftText = await callGroq(prompt);
}

// 5. Insert draft into pike_content with status = needs_review
const insertEndpoint = new URL(`${supabaseUrl}/rest/v1/pike_content`);
const insertRes = await fetch(insertEndpoint, {
  method: "POST",
  headers: { ...headers, Prefer: "return=minimal" },
  body: JSON.stringify({
    user_id: userId,
    post_type: postType,
    source_type: sourceType,
    source_ref: sourceRef,
    draft_text: draftText,
    status: "needs_review",
  }),
});

if (!insertRes.ok) {
  throw new Error(`Failed to insert draft (${insertRes.status}): ${await insertRes.text()}`);
}

console.log(`Draft inserted with status=needs_review (type: ${postType}).`);

// ---- helpers ----

async function callGroq(systemPrompt) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "system", content: systemPrompt }],
      temperature: 0.7,
      max_tokens: 600,
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq generation failed (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text || text.trim().length === 0) {
    throw new Error("Groq returned an empty draft");
  }

  return text.trim();
}
