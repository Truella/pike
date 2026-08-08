"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setIsSigningOut(false);
    setMobileMenuOpen(false);
  }, [pathname]);

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
    <header className="bg-surface text-ink">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Left: Pike Logo */}
        <Link className="pike-display text-lg font-bold" href="/">
          Pike
        </Link>

        {/* Desktop Navigation (Centered) */}
        <nav aria-label="Primary navigation" className="hidden md:block">
          <ul className="flex items-center gap-x-6 font-mono text-xs uppercase text-muted">
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

        {/* Right: Theme Switcher & Sign Out (Desktop) */}
        <div className="hidden items-center gap-4 md:flex">
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

        {/* Mobile Hamburger Button */}
        <div className="flex items-center md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="pike-border rounded-token border-border bg-surface p-2 font-mono text-xs text-ink focus:outline-none"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Slide-out Drawer */}
      {mobileMenuOpen && (
        <div className="pike-border border-x-0 border-t-0 border-border bg-surface px-6 pb-6 pt-2 md:hidden">
          <nav aria-label="Mobile navigation" className="mb-4">
            <ul className="flex flex-col gap-3 font-mono text-xs uppercase text-muted">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    aria-current={pathname === link.href ? "page" : undefined}
                    className="block transition-colors hover:text-ink aria-[current=page]:text-signal"
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <ThemeSwitcher initialTheme={initialTheme} />
            <Button
              className="w-full px-3 py-1.5 text-xs"
              disabled={isSigningOut}
              onClick={signOut}
              type="button"
              variant="outline"
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
