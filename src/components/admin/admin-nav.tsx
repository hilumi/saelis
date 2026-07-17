import Link from "next/link";

/**
 * Admin navigation. Rendered ONLY inside pages that already passed
 * requireAdminAccess — visibility is a courtesy, never the access control.
 */
const LINKS: Array<{ href: string; label: string; capability: "analytics" | "operations" }> = [
  { href: "/admin/analytics", label: "Overview", capability: "analytics" },
  { href: "/admin/analytics/onboarding", label: "Onboarding", capability: "analytics" },
  { href: "/admin/analytics/engagement", label: "Engagement", capability: "analytics" },
  { href: "/admin/analytics/pathways", label: "Pathways", capability: "analytics" },
  { href: "/admin/analytics/notifications", label: "Notifications", capability: "analytics" },
  { href: "/admin/analytics/safety", label: "Safety", capability: "analytics" },
  { href: "/admin/operations", label: "Operations", capability: "operations" },
];

export function AdminNav({
  current,
  canViewOperations,
}: {
  current: string;
  canViewOperations: boolean;
}) {
  return (
    <nav aria-label="Admin sections" className="flex flex-wrap gap-2 text-sm">
      {LINKS.filter((link) => link.capability !== "operations" || canViewOperations).map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={current === link.href ? "page" : undefined}
          className={
            current === link.href
              ? "rounded-full bg-white/15 px-3 py-1 font-medium text-ink"
              : "rounded-full px-3 py-1 text-ink-soft hover:text-ink"
          }
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
