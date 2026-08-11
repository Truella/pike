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

// 2. Determine primary and secondary post types
const primaryType =
  counts.build_update <= counts.trend ? "build_update" : "trend";
const secondaryType = primaryType === "build_update" ? "trend" : "build_update";

async function fetchSourceForType(type) {
  if (type === "build_update") {
    const result = await getBuildUpdateSource(supabaseUrl, serviceRoleKey, userId);
    if (!result.found) return null;
    return {
      postType: "build_update",
      sourceType: "activity_scan",
      sourceRef: result.sourceRef,
      prompt: buildBuildUpdatePrompt(result.source),
      onSuccess: null,
    };
  } else {
    const result = await getTrendSource(supabaseUrl, serviceRoleKey, userId, groqApiKey);
    if (!result.found) return null;
    return {
      postType: "trend",
      sourceType: "topics_bank",
      sourceRef: result.topicId,
      prompt: buildTrendPrompt(result.source),
      onSuccess: async () => {
        // Mark topic as used
        const updateEndpoint = new URL(`${supabaseUrl}/rest/v1/pike_topics_bank`);
        updateEndpoint.searchParams.set("id", `eq.${result.topicId}`);
        updateEndpoint.searchParams.set("user_id", `eq.${userId}`);
        await fetch(updateEndpoint, {
          method: "PATCH",
          headers: { ...headers, Prefer: "return=minimal" },
          body: JSON.stringify({ used: true, used_at: new Date().toISOString() }),
        });
      },
    };
  }
}

// 3. Try primary type first, then fallback to secondary type if primary has no source
console.log(`Attempting source selection for primary type: ${primaryType}...`);
let sourceConfig = await fetchSourceForType(primaryType);

if (!sourceConfig) {
  console.log(`No source found for ${primaryType}. Attempting fallback type: ${secondaryType}...`);
  sourceConfig = await fetchSourceForType(secondaryType);
}

if (!sourceConfig) {
  console.log("No source material available for build_update or trend. Skipping draft generation.");
  process.exit(0);
}

console.log(`Generating a ${sourceConfig.postType} post...`);

// 4. Compose prompt and call Groq
const draftText = await callGroq(sourceConfig.prompt);

// 5. Insert draft into pike_content with status = needs_review
const insertEndpoint = new URL(`${supabaseUrl}/rest/v1/pike_content`);
const insertRes = await fetch(insertEndpoint, {
  method: "POST",
  headers: { ...headers, Prefer: "return=representation" },
  body: JSON.stringify({
    user_id: userId,
    post_type: sourceConfig.postType,
    source_type: sourceConfig.sourceType,
    source_ref: sourceConfig.sourceRef,
    draft_text: draftText,
    status: "needs_review",
  }),
});

if (!insertRes.ok) {
  throw new Error(`Failed to insert draft (${insertRes.status}): ${await insertRes.text()}`);
}

const insertedRows = await insertRes.json();
if (insertedRows.error || !Array.isArray(insertedRows) || insertedRows.length === 0) {
  throw new Error(`Supabase insert failed: ${JSON.stringify(insertedRows.error || insertedRows)}`);
}

if (sourceConfig.onSuccess) {
  await sourceConfig.onSuccess();
}

console.log(`CONFIRMED_INSERT: Draft inserted with status=needs_review (id: ${insertedRows[0].id}, type: ${sourceConfig.postType}).`);

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
