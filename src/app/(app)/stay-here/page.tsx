import { PresenceView } from "@/components/companion/presence-view";
import { ScreenHeader } from "@/components/layout/screen-header";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Stay Here" };

export default function StayHerePage() {
  return (
    <div className="mx-auto max-w-xl">
      <ScreenHeader
        title="Stay Here"
        subtitle="Presence without action. Nothing is expected of you."
      />
      <PresenceView />
    </div>
  );
}
