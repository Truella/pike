import { uploadImageToLinkedIn } from "./media.js";
import { heartbeat } from "../lib/heartbeat.js";
import { notify } from "../lib/notify.js";

const requiredEnvironment = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PIKE_OWNER_USER_ID",
  "LINKEDIN_ACCESS_TOKEN",
  "LINKEDIN_PERSON_URN",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_CHAT_ID",
  "LINKEDIN_API_VERSION",
];

const missing = requiredEnvironment.filter((name) => !process.env[name]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
}

const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.env.PIKE_OWNER_USER_ID;
const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
const personUrn = process.env.LINKEDIN_PERSON_URN;
// LinkedIn-Version uses YYYYMM format (e.g. 202607 = July 2026).
// Each version is supported for ~12 months before sunset. When LinkedIn
// announces a deprecation, update the LINKEDIN_API_VERSION GitHub secret
// — no code change required. Current confirmed active version: 202607.
const linkedinApiVersion = process.env.LINKEDIN_API_VERSION;

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  "Content-Type": "application/json",
};

// 1. Fetch approved posts with scheduled_at <= now(), oldest first
const endpoint = new URL(`${supabaseUrl}/rest/v1/pike_content`);
endpoint.searchParams.set("select", "id,draft_text,media_urls,post_type");
endpoint.searchParams.set("user_id", `eq.${userId}`);
endpoint.searchParams.set("status", "eq.approved");
endpoint.searchParams.set("scheduled_at", `lte.${new Date().toISOString()}`);
endpoint.searchParams.set("order", "scheduled_at.asc");

const listRes = await fetch(endpoint, { headers });
if (!listRes.ok) {
  throw new Error(`Failed to fetch approved posts (${listRes.status}): ${await listRes.text()}`);
}

const posts = await listRes.json();
console.log(`Found ${posts.length} approved post(s) due for publishing.`);

for (const post of posts) {
  try {
    // 2. Upload media if present
    const mediaUrns = [];
    if (post.media_urls && post.media_urls.length > 0) {
      for (const mediaUrl of post.media_urls) {
        const urn = await uploadImageToLinkedIn(mediaUrl, accessToken, personUrn, linkedinApiVersion);
        mediaUrns.push(urn);
      }
    }

    // 3. Build LinkedIn Post payload using /rest/posts (current API, not deprecated /v2/ugcPosts)
    const postPayload = {
      author: personUrn,
      commentary: post.draft_text,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    };

    // Add media if uploaded
    if (mediaUrns.length > 0) {
      postPayload.content = {
        media: {
          id: mediaUrns[0], // LinkedIn currently supports one image per post via /rest/posts
        },
      };
    }

    const publishRes = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": linkedinApiVersion, // YYYYMM — update secret annually, see comment above
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postPayload),
    });

    if (!publishRes.ok) {
      throw new Error(`LinkedIn publish failed (${publishRes.status}): ${await publishRes.text()}`);
    }

    // 4. On success, update status to published and set published_at
    const updateEndpoint = new URL(`${supabaseUrl}/rest/v1/pike_content`);
    updateEndpoint.searchParams.set("id", `eq.${post.id}`);
    updateEndpoint.searchParams.set("user_id", `eq.${userId}`);

    const updateRes = await fetch(updateEndpoint, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=minimal" },
      body: JSON.stringify({ status: "published", published_at: new Date().toISOString() }),
    });

    if (!updateRes.ok) {
      console.error(`Warning: post ${post.id} published but status update failed: ${await updateRes.text()}`);
    }

    console.log(`Post ${post.id} published successfully.`);
  } catch (err) {
    // 5. On failure, leave status unchanged and alert via Telegram
    console.error(`Post ${post.id} failed:`, err.message);
    await notify(`Pike LinkedIn publish FAILED for post ${post.id}:\n${err.message}\n\nStatus left as 'approved' for next retry.`);
  }
}

// 6. Update module heartbeat
await heartbeat("pike-linkedin");
