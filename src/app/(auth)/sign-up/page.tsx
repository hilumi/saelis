"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit() {
    setPending(true);
    setError(null);
    if (password.length < 8) {
      setError("Please choose a password of at least 8 characters.");
      setPending(false);
      return;
    }
    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (signUpError) {
        setError("We couldn't create your account with those details. Please try again.");
        setPending(false);
        return;
      }
      if (data.session) {
        router.push("/home");
        router.refresh();
        return;
      }
      setAwaitingConfirmation(true);
      setPending(false);
    } catch {
      setError("Sign-up isn't available right now. Please try again in a moment.");
      setPending(false);
    }
  }

  if (awaitingConfirmation) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-ink">Almost there.</h1>
        <InlineNotice tone="success">
          We&apos;ve sent a confirmation link to {email}. Follow it, and your quiet place will be
          waiting.
        </InlineNotice>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Create a quiet place of your own.</h1>
        <p className="mt-1 text-ink-soft">Come as you are. Leave a little lighter.</p>
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
          <p id="password-hint" className="text-sm text-ink-soft">
            At least 8 characters.
          </p>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            aria-describedby="password-hint"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="glass-surface min-h-11 rounded-2xl px-4 py-2 text-ink"
          />
        </div>
        <p className="text-xs text-ink-muted">
          By creating an account you agree to the{" "}
          <Link href="/terms" className="underline underline-offset-4 hover:text-ink">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-ink">
            Privacy
          </Link>{" "}
          drafts, and understand that Saelis is AI —{" "}
          <Link href="/ai-disclosure" className="underline underline-offset-4 hover:text-ink">
            it can misunderstand
          </Link>{" "}
          and is not a crisis service.
        </p>
        <Button type="submit" disabled={pending || !email || !password}>
          {pending ? "Creating your place…" : "Create account"}
        </Button>
      </form>

      <p className="text-sm text-ink-soft">
        Already have a place here?{" "}
        <Link href="/sign-in" className="underline underline-offset-4 hover:text-ink">
          Return when you&apos;re ready.
        </Link>
      </p>
    </div>
  );
}
