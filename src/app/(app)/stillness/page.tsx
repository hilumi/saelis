import { ScreenHeader } from "@/components/layout/screen-header";
import { HaloTimer } from "@/components/stillness/halo-timer";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Stillness" };

export default function StillnessPage() {
  return (
    <div className="mx-auto max-w-xl">
      <ScreenHeader title="Stillness" subtitle="A distraction-free stretch of quiet." />
      <HaloTimer />
    </div>
  );
}
