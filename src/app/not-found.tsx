import Link from "next/link";

import { OpenHorizon } from "@/components/brand/open-horizon";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <OpenHorizon size={64} />
      <h1 className="text-2xl font-semibold text-ink">This path doesn&apos;t lead anywhere.</h1>
      <p className="max-w-md text-ink-soft">
        The page you were looking for isn&apos;t here. The horizon is still where you left it.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center rounded-full bg-accent-lilac px-6 font-medium text-white"
      >
        Back to the beginning
      </Link>
    </div>
  );
}
