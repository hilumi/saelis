"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?next=/settings/companion`,
      });
      // Always show the same message — never reveal whether an email exists.
      setSent(true);
    } catch {
      setError("We couldn't send the email just now. Please try again in a moment.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">We&apos;ll help you find your way back.</h1>
        <p className="mt-1 text-ink-soft">
          Enter your email and we&apos;ll send a link to reset your password.
        </p>
      </div>

      {sent ? (
        <InlineNotice tone="success">
          If an account exists for {email}, a reset link is on its way.
        </InlineNotice>
      ) : (
        <>
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
            <Button type="submit" disabled={pending || !email}>
              {pending ? "Sending…" : "Send reset link"}
            </Button>
          </form>
        </>
      )}

      <Link
        href="/sign-in"
        className="text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
      >
        Back to sign in
      </Link>
    </div>
  );
}
