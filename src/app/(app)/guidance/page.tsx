import Link from "next/link";

import { ScreenHeader } from "@/components/layout/screen-header";
import { GlassSurface } from "@/components/ui/glass-surface";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Guidance" };

const GUIDANCE_PATHS = [
  {
    title: "Think something through",
    body: "Untangle a knot — no pressure to solve it today.",
  },
  {
    title: "Weigh a decision",
    body: "Look at what each path protects and what it costs.",
  },
  {
    title: "Find the words",
    body: "Prepare for a hard conversation, message, or apology.",
  },
  {
    title: "One next step",
    body: "When everything is loud, one small true step is enough.",
  },
] as const;

export default function GuidancePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader
        title="Guidance"
        subtitle="Clarity at your own pace. Saelis never rushes an answer."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {GUIDANCE_PATHS.map((path) => (
          <GlassSurface key={path.title}>
            <h2 className="mb-1 font-semibold text-ink">{path.title}</h2>
            <p className="text-sm text-ink-soft">{path.body}</p>
          </GlassSurface>
        ))}
      </div>
      <p className="mt-6 text-ink-soft">
        Each of these starts as a conversation.{" "}
        <Link href="/conversation" className="underline underline-offset-4 hover:text-ink">
          Begin whenever you&apos;re ready.
        </Link>
      </p>
    </div>
  );
}
