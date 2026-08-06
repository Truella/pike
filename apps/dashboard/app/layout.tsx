import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { isTheme, type Theme } from "@/lib/theme";
import { Navigation } from "./navigation";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

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
  }

  return (
    <html
      data-theme={theme}
      lang="en"
      className={`${inter.variable} ${jetBrainsMono.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <Navigation initialTheme={theme} />
        {children}
      </body>
    </html>
  );
}
