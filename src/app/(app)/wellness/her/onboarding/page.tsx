import { HerOnboardingFlow } from "@/components/her/her-onboarding-flow";
import { ScreenHeader } from "@/components/layout/screen-header";
import { requireUser } from "@/lib/auth/require-user";
import { getOnboardingState } from "@/lib/db/queries/wellness/onboarding";
import { createClient } from "@/lib/supabase/server";
import { onboardingStepSchema } from "@/lib/validation/wellness-onboarding";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Saelis Her — Setup" };

export default async function HerOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const { step } = await searchParams;

  let state: Awaited<ReturnType<typeof getOnboardingState>> = {
    currentStep: "welcome",
    data: {},
    completedAt: null,
  };
  try {
    state = await getOnboardingState(supabase, user.id);
  } catch {
    // Draft table unavailable — begin fresh; progress will save once it exists.
  }

  const parsedStep = onboardingStepSchema.safeParse(step);

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader
        title="Saelis Her"
        subtitle="A few unhurried questions. Skip anything — you can leave and pick this back up anytime."
      />
      <HerOnboardingFlow
        initialState={state}
        initialStep={parsedStep.success ? parsedStep.data : null}
      />
    </div>
  );
}
