"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { createClient } from "@/lib/supabase/client";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError("That email and password didn't match. Take your time and try again.");
        setPending(false);
        return;
      }
      router.push("/home");
      router.refresh();
    } catch {
      setError("Sign-in isn't available right now. Please try again in a moment.");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Return when you&apos;re ready.</h1>
        <p className="mt-1 text-ink-soft">Sign in to your quiet place.</p>
      </div>

      {error ? <InlineNotice tone="error">{error}</InlineNotice> : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="font-medium text-ink">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="glass-surface min-h-11 rounded-2xl px-4 py-2 text-ink"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="font-medium text-ink">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="glass-surface min-h-11 rounded-2xl px-4 py-2 text-ink"
          />
        </div>
        <Button type="submit" disabled={pending || !email || !password}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="flex flex-col gap-2 text-sm">
        <Link
          href="/forgot-password"
          className="text-ink-soft underline underline-offset-4 hover:text-ink"
        >
          Forgot your password?
        </Link>
        <p className="text-ink-soft">
          New here?{" "}
          <Link href="/sign-up" className="underline underline-offset-4 hover:text-ink">
            Create a quiet place of your own.
          </Link>
        </p>
      </div>
    </div>
  );
}
