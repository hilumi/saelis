import { saveCompanionSettings } from "@/app/(app)/actions";
import { ScreenHeader } from "@/components/layout/screen-header";
import { CompanionSettingsForm } from "@/components/settings/companion-settings-form";
import { requireUser } from "@/lib/auth/require-user";
import { toCompanionPreferences } from "@/lib/companion-defaults";
import { getCompanionProfile, getProfile } from "@/lib/db/queries/profile";
import { createClient } from "@/lib/supabase/server";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Companion settings" };

export default async function CompanionSettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [profile, companionProfile] = await Promise.all([
    getProfile(supabase, user.id),
    getCompanionProfile(supabase, user.id),
  ]);

  return (
    <div className="mx-auto max-w-xl">
      <ScreenHeader
        title="Your companion"
        subtitle="Shape how Saelis is with you. Everything here is yours to change."
      />
      <CompanionSettingsForm
        initialPreferredName={profile?.preferred_name ?? ""}
        initialPreferences={toCompanionPreferences(companionProfile)}
        action={saveCompanionSettings}
      />
    </div>
  );
}
