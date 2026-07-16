import { redirect } from "next/navigation";

import { completeOnboarding } from "@/app/(onboarding)/onboarding/onboarding-actions";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { requireUser } from "@/lib/auth/require-user";
import { getProfile } from "@/lib/db/queries/profile";
import { createClient } from "@/lib/supabase/server";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Welcome" };

/** Onboarding — shown exactly once. Returning users go straight home. */
export default async function OnboardingPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const profile = await getProfile(supabase, user.id).catch(() => null);

  if (profile?.onboarded_at) {
    redirect("/home");
  }

  return <OnboardingFlow action={completeOnboarding} />;
}
