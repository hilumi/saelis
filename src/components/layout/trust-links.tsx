import Link from "next/link";

import { cn } from "@/lib/utils";

const TRUST_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/ai-disclosure", label: "How Saelis uses AI" },
  { href: "/support", label: "Support" },
] as const;

/** The four public trust pages, linkable from footer, sign-up, and settings. */
export function TrustLinks({ className }: { className?: string }) {
  return (
    <nav aria-label="Trust and support" className={cn("flex flex-wrap gap-x-1 gap-y-0", className)}>
      {TRUST_LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="inline-flex min-h-11 items-center rounded-full px-3 text-sm text-ink-soft hover:bg-cloud-lilac/60 hover:text-ink"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
