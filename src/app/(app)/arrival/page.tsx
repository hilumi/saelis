import { submitArrival } from "@/app/(app)/actions";
import { ArrivalFlow } from "@/components/arrival/arrival-flow";
import { ScreenHeader } from "@/components/layout/screen-header";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Arrival" };

export default function ArrivalPage() {
  return (
    <div className="mx-auto max-w-xl">
      <ScreenHeader
        title="Arrive"
        subtitle="Come as you are. A few quiet questions, nothing more."
      />
      <ArrivalFlow onComplete={submitArrival} />
    </div>
  );
}
