export async function updateModuleLastRun(moduleId) {
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

  const supabaseUrl = process.env.SUPABASE_URL.replace(/\/$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId = process.env.PIKE_USER_ID;
  const endpoint = new URL(`${supabaseUrl}/rest/v1/modules`);

  endpoint.searchParams.set("id", `eq.${moduleId}`);
  endpoint.searchParams.set("user_id", `eq.${userId}`);
  endpoint.searchParams.set("select", "id,last_run_at");

  const response = await fetch(endpoint, {
    method: "PATCH",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ last_run_at: new Date().toISOString() }),
  });

  if (!response.ok) {
    throw new Error(
      `Module update failed (${response.status}): ${await response.text()}`,
    );
  }

  const rows = await response.json();

  if (rows.length !== 1) {
    throw new Error(
      `Expected one owned modules row with id '${moduleId}'; create it before running this workflow.`,
    );
  }

  console.log(`${moduleId} last_run_at updated to ${rows[0].last_run_at}.`);
}
