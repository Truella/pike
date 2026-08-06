import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isTheme } from "@/lib/theme";

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as { theme?: string };

  if (!isTheme(body.theme)) {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  const { error } = await supabase.from("pike_preferences").upsert(
    {
      user_id: user.id,
      theme: body.theme,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ theme: body.theme });
}
