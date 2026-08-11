/**
 * Source selectors for the content generation pipeline.
 * All Supabase access uses the service-role key and explicitly filters by userId.
 */

const ACTIVITY_LOOKBACK_DAYS = parseInt(process.env.ACTIVITY_LOOKBACK_DAYS || "7", 10);

/**
 * Returns the most substantial completed study note from the last N days.
 * If none found, returns { found: false } to signal a manual note is required.
 *
 * @param {string} supabaseUrl
 * @param {string} serviceRoleKey
 * @param {string} userId
 * @returns {Promise<{found: true, source: string, sourceRef: string} | {found: false}>}
 */
export async function getBuildUpdateSource(supabaseUrl, serviceRoleKey, userId) {
  const lookbackDate = new Date();
  lookbackDate.setDate(lookbackDate.getDate() - ACTIVITY_LOOKBACK_DAYS);

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  const endpoint = new URL(`${supabaseUrl}/rest/v1/study_progress`);
  endpoint.searchParams.set("select", "topic_id,notes,completed_at,study_curriculum(title,section,url)");
  endpoint.searchParams.set("user_id", `eq.${userId}`);
  endpoint.searchParams.set("status", "eq.done");
  endpoint.searchParams.set("notes", "not.is.null");
  endpoint.searchParams.set("completed_at", `gte.${lookbackDate.toISOString()}`);
  endpoint.searchParams.set("order", "completed_at.desc");

  const response = await fetch(endpoint, { headers });

  if (!response.ok) {
    throw new Error(`Failed to fetch study progress (${response.status}): ${await response.text()}`);
  }

  const rows = await response.json();

  // Filter rows that have non-empty notes
  const withNotes = rows.filter((r) => r.notes && r.notes.trim().length > 20);
  if (withNotes.length === 0) {
    return { found: false };
  }

  // Pick the most substantial note (longest)
  const best = withNotes.reduce((a, b) =>
    (b.notes?.length ?? 0) > (a.notes?.length ?? 0) ? b : a
  );

  const curriculum = best.study_curriculum;
  const title = curriculum?.title ?? best.topic_id;
  const url = curriculum?.url ?? "";

  const source = `Topic: ${title}\nURL: ${url}\n\nNotes:\n${best.notes}`;
  return { found: true, source, sourceRef: best.topic_id };
}

/**
 * Returns the oldest unused topic from pike_topics_bank.
 * If the bank is empty, calls Groq to suggest new topics, inserts them, then returns the first.
 * If no topics can be found or created, returns { found: false }.
 *
 * @param {string} supabaseUrl
 * @param {string} serviceRoleKey
 * @param {string} userId
 * @param {string} groqApiKey
 * @returns {Promise<{found: true, source: string, sourceRef: string, topicId: string} | {found: false}>}
 */
export async function getTrendSource(supabaseUrl, serviceRoleKey, userId, groqApiKey) {
  try {
    const headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    };

    // Fetch oldest unused topic
    const topicEndpoint = new URL(`${supabaseUrl}/rest/v1/pike_topics_bank`);
    topicEndpoint.searchParams.set("select", "id,topic");
    topicEndpoint.searchParams.set("user_id", `eq.${userId}`);
    topicEndpoint.searchParams.set("used", "eq.false");
    topicEndpoint.searchParams.set("order", "created_at.asc");
    topicEndpoint.searchParams.set("limit", "1");

    const topicRes = await fetch(topicEndpoint, { headers });
    if (!topicRes.ok) {
      throw new Error(`Failed to fetch topics bank (${topicRes.status}): ${await topicRes.text()}`);
    }
    const existing = await topicRes.json();

    if (existing.length > 0) {
      const topic = existing[0];
      return { found: true, source: topic.topic, sourceRef: topic.id, topicId: topic.id };
    }

    // Bank is empty — ask Groq to suggest new topics
    console.log("Topics bank empty. Asking Groq for topic seeds...");
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "user",
            content:
              "Suggest 5 current, specific topics a frontend/full-stack developer could write a short LinkedIn post about. Focus on tools, patterns, job market realities, or developer experience. Return only a plain JSON array of strings, no explanation.",
          },
        ],
        temperature: 0.8,
      }),
    });

    if (!groqRes.ok) {
      throw new Error(`Groq topic suggestion failed (${groqRes.status}): ${await groqRes.text()}`);
    }

    const groqData = await groqRes.json();
    const rawContent = groqData.choices?.[0]?.message?.content ?? "[]";
    let topics;
    try {
      topics = JSON.parse(rawContent);
      if (!Array.isArray(topics)) throw new Error("Not an array");
    } catch {
      // Try to extract array from the text if the model wrapped it
      const match = rawContent.match(/\[[\s\S]+\]/);
      if (match) {
        topics = JSON.parse(match[0]);
      } else {
        throw new Error(`Could not parse Groq topic suggestions: ${rawContent}`);
      }
    }

    if (topics.length === 0) {
      return { found: false };
    }

    // Insert suggested topics into pike_topics_bank
    const insertEndpoint = new URL(`${supabaseUrl}/rest/v1/pike_topics_bank`);
    const rows = topics.map((topic) => ({
      user_id: userId,
      topic: String(topic).trim(),
      source: "groq_suggested",
      used: false,
    }));

    const insertRes = await fetch(insertEndpoint, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify(rows),
    });

    if (!insertRes.ok) {
      throw new Error(`Failed to insert Groq topic suggestions (${insertRes.status}): ${await insertRes.text()}`);
    }

    const inserted = await insertRes.json();
    if (!Array.isArray(inserted) || inserted.length === 0 || inserted.error) {
      return { found: false };
    }

    const first = inserted[0];
    return { found: true, source: first.topic, sourceRef: first.id, topicId: first.id };
  } catch (err) {
    console.error("Error fetching trend source:", err.message);
    return { found: false };
  }
}
