"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/arrival", label: "Arrival" },
  { href: "/conversation", label: "Conversation" },
  { href: "/stay-here", label: "Stay Here" },
  { href: "/guidance", label: "Guidance" },
  { href: "/stillness", label: "Stillness" },
  { href: "/horizon", label: "Horizon" },
  { href: "/echoes", label: "Echoes" },
  { href: "/settings/companion", label: "Settings" },
] as const;

export function CelestialNavigation() {
  const pathname = usePathname();

  return (
    <nav aria-label="Saelis" className="w-full overflow-x-auto">
      <ul className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors",
                  active
                    ? "bg-cloud-lilac text-ink underline decoration-accent-lilac decoration-2 underline-offset-4"
                    : "text-ink-soft hover:bg-cloud-lilac/60 hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
