export async function heartbeat(moduleId) {
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
  const endpoint = `${supabaseUrl}/rest/v1/rpc/upsert_module_heartbeat`;
  const runAt = new Date().toISOString();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      module_id: moduleId,
      module_name: moduleId.charAt(0).toUpperCase() + moduleId.slice(1),
      owner_user_id: process.env.PIKE_OWNER_USER_ID,
      run_at: runAt,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Module heartbeat failed (${response.status}): ${await response.text()}`,
    );
  }

  const rows = await response.json();

  if (rows.length !== 1) {
    throw new Error(`Module heartbeat returned no row for '${moduleId}'.`);
  }

  console.log(`${moduleId} last_run_at updated to ${rows[0].last_run_at}.`);
}
