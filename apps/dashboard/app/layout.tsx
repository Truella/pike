import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isTheme, type Theme } from "@/lib/theme";
import { Navigation } from "./navigation";
import { ThemeProvider } from "@/lib/theme-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pike Dashboard",
  description: "Personal automation and progress dashboard.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let theme: Theme = "brutalist";

  if (user) {
    const { data } = await supabase
      .from("pike_preferences")
      .select("theme")
      .eq("user_id", user.id)
      .maybeSingle();

    if (isTheme(data?.theme)) theme = data.theme;
  } else {
    const cookieStore = await cookies();
    const cookieTheme = cookieStore.get("pike-theme")?.value;
    if (isTheme(cookieTheme)) {
      theme = cookieTheme;
    }
  }

  return (
    <html
      data-theme={theme}
      lang="en"
      className="h-full antialiased"
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider initialTheme={theme}>
          <Navigation initialTheme={theme} />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
