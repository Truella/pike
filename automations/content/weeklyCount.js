/**
 * Shared query logic for counting this week's pike_content rows by post_type.
 * Used by both generate.js and the dashboard so the counts always agree.
 *
 * @param {string} supabaseUrl
 * @param {string} serviceRoleKey
 * @param {string} userId
 * @returns {Promise<{build_update: number, trend: number}>}
 */
export async function getWeeklyPostCounts(supabaseUrl, serviceRoleKey, userId) {
  const weekStart = new Date();
  weekStart.setUTCHours(0, 0, 0, 0);
  weekStart.setUTCDate(weekStart.getUTCDate() - weekStart.getUTCDay()); // Sunday

  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };

  // Fetch build_update count
  const buildEndpoint = new URL(`${supabaseUrl}/rest/v1/pike_content`);
  buildEndpoint.searchParams.set("select", "id");
  buildEndpoint.searchParams.set("user_id", `eq.${userId}`);
  buildEndpoint.searchParams.set("post_type", "eq.build_update");
  buildEndpoint.searchParams.set("status", "not.eq.rejected");
  buildEndpoint.searchParams.set("created_at", `gte.${weekStart.toISOString()}`);

  const buildRes = await fetch(buildEndpoint, {
    headers: { ...headers, Prefer: "count=exact", Range: "0-0" },
  });
  const buildRange = buildRes.headers.get("content-range") ?? "0/0";
  const buildCount = parseInt(buildRange.split("/")[1] ?? "0", 10);

  // Fetch trend count
  const trendEndpoint = new URL(`${supabaseUrl}/rest/v1/pike_content`);
  trendEndpoint.searchParams.set("select", "id");
  trendEndpoint.searchParams.set("user_id", `eq.${userId}`);
  trendEndpoint.searchParams.set("post_type", "eq.trend");
  trendEndpoint.searchParams.set("status", "not.eq.rejected");
  trendEndpoint.searchParams.set("created_at", `gte.${weekStart.toISOString()}`);

  const trendRes = await fetch(trendEndpoint, {
    headers: { ...headers, Prefer: "count=exact", Range: "0-0" },
  });
  const trendRange = trendRes.headers.get("content-range") ?? "0/0";
  const trendCount = parseInt(trendRange.split("/")[1] ?? "0", 10);

  return {
    build_update: isNaN(buildCount) ? 0 : buildCount,
    trend: isNaN(trendCount) ? 0 : trendCount,
  };
}
