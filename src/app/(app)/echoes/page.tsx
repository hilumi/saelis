import { TheLight } from "@/components/brand/the-light";
import { ScreenHeader } from "@/components/layout/screen-header";
import { EmptyState } from "@/components/ui/empty-state";
import { GlassSurface } from "@/components/ui/glass-surface";
import { getOptionalUser } from "@/lib/auth/require-user";
import { listRecentArrivals } from "@/lib/db/queries/arrivals";
import { formatDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

import type { Tables } from "@/lib/supabase/types";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Echoes" };

export default async function EchoesPage() {
  let arrivals: Tables<"arrivals">[] = [];

  try {
    const user = await getOptionalUser();
    if (user) {
      const supabase = await createClient();
      arrivals = await listRecentArrivals(supabase, user.id);
    }
  } catch {
    arrivals = [];
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader
        title="Echoes"
        subtitle="Traces of how you've arrived over time — kept only for you."
      />
      {arrivals.length === 0 ? (
        <EmptyState
          visual={<TheLight state="reflecting" size={80} />}
          title="No echoes yet."
          body="After you arrive a few times, gentle traces of those moments gather here — how you felt, what you needed, how things moved."
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {arrivals.map((arrival) => (
            <li key={arrival.id}>
              <GlassSurface>
                <p className="text-sm text-ink-muted">{formatDate(arrival.created_at)}</p>
                <p className="mt-1 text-ink">
                  You arrived <strong>{arrival.mood}</strong>, energy{" "}
                  <strong>{arrival.energy}</strong>, needing{" "}
                  <strong>{arrival.support_need.replace("-", " ")}</strong>.
                </p>
                {arrival.message ? (
                  <p className="mt-2 text-sm italic text-ink-soft">“{arrival.message}”</p>
                ) : null}
              </GlassSurface>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
