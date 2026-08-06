"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import type { Theme } from "@/lib/theme";
import { Button } from "@/components/ui/Button";

const links = [
  { href: "/jobs", label: "Jobs" },
  { href: "/hackathons", label: "Hackathons" },
  { href: "/study", label: "Study" },
  { href: "/content", label: "Content" },
  { href: "/settings", label: "Settings" },
];

export function Navigation({ initialTheme }: { initialTheme: Theme }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);

  if (pathname === "/login") return null;

  async function signOut() {
    setIsSigningOut(true);
    setSignOutError(false);
    const supabase = createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });

    if (error) {
      setSignOutError(true);
      setIsSigningOut(false);
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="pike-border border-x-0 border-t-0 border-border bg-surface text-ink">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link className="pike-display text-lg font-bold" href="/">
          Pike
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <nav aria-label="Primary navigation">
            <ul className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs uppercase text-muted">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    aria-current={pathname === link.href ? "page" : undefined}
                    className="transition-colors hover:text-ink aria-[current=page]:text-signal"
                    href={link.href}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <ThemeSwitcher initialTheme={initialTheme} />
          <Button
            aria-describedby={signOutError ? "sign-out-error" : undefined}
            className="px-3 py-1.5 text-xs"
            disabled={isSigningOut}
            onClick={signOut}
            type="button"
            variant="outline"
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Button>
          {signOutError ? (
            <span className="font-mono text-xs text-alert" id="sign-out-error">
              Sign out failed. Try again.
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}
