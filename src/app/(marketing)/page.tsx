import Link from "next/link";

import { TheLight } from "@/components/brand/the-light";
import { APP_TAGLINE, SIGNATURE_LINE } from "@/lib/constants";

export default function MarketingPage() {
  return (
    <div className="flex flex-col items-center gap-10 pt-14 text-center">
      <TheLight state="welcoming" size={150} />
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-semibold leading-tight text-ink">{APP_TAGLINE}</h1>
        <p className="text-lg text-ink-soft">{SIGNATURE_LINE}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/sign-up"
          className="inline-flex min-h-11 items-center rounded-full bg-accent-lilac px-8 py-3 font-medium text-white shadow-sm hover:opacity-90"
        >
          Begin
        </Link>
        <Link
          href="/about"
          className="inline-flex min-h-11 items-center rounded-full px-6 py-3 text-ink-soft hover:bg-cloud-lilac/60 hover:text-ink"
        >
          What is Saelis?
        </Link>
      </div>
      <div className="glass-surface mt-6 grid max-w-2xl gap-6 p-8 text-left sm:grid-cols-3">
        <div>
          <h2 className="mb-1 font-semibold text-ink">Feel understood</h2>
          <p className="text-sm text-ink-soft">
            A companion that listens first and never rushes you anywhere.
          </p>
        </div>
        <div>
          <h2 className="mb-1 font-semibold text-ink">Think clearly</h2>
          <p className="text-sm text-ink-soft">
            Untangle decisions and hard conversations at your own pace.
          </p>
        </div>
        <div>
          <h2 className="mb-1 font-semibold text-ink">Find what&apos;s next</h2>
          <p className="text-sm text-ink-soft">
            One manageable step at a time — or no step at all.
          </p>
        </div>
      </div>
    </div>
  );
}
