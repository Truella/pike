"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: String(formData.get("email")),
      password: String(formData.get("password")),
    });

    if (signInError) {
      setError(signInError.message);
      setIsSubmitting(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-ink">
      <Card className="w-full max-w-sm p-8">
        <p className="mb-2 font-mono text-xs font-bold uppercase text-signal">
          Pike
        </p>
        <h1 className="pike-display text-3xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Use your dashboard email and password to continue.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium" htmlFor="email">
            Email
            <input
              autoComplete="email"
              className="pike-border mt-2 w-full rounded-token border-border bg-background px-3 py-2.5 text-ink outline-none transition focus:border-signal"
              id="email"
              name="email"
              required
              type="email"
            />
          </label>

          <label className="block text-sm font-medium" htmlFor="password">
            Password
            <input
              autoComplete="current-password"
              className="pike-border mt-2 w-full rounded-token border-border bg-background px-3 py-2.5 text-ink outline-none transition focus:border-signal"
              id="password"
              name="password"
              required
              type="password"
            />
          </label>

          {error ? (
            <p className="pike-border rounded-token border-alert px-3 py-2 text-sm text-alert">
              {error}
            </p>
          ) : null}

          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
