"use client";

import { useEffect } from "react";

import { TheLight } from "@/components/brand/the-light";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log only the digest — never message content that could include user text.
    console.error("Saelis route error", error.digest ?? "no-digest");
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <TheLight state="still" size={80} />
      <h1 className="text-xl font-semibold text-ink">Something went quiet in the wrong way.</h1>
      <p className="max-w-md text-ink-soft">
        That wasn&apos;t you. You can try again, and nothing you wrote here was lost on our side.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
