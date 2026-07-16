import { decideAdaptivePreference, resetAllAdaptationData } from "@/app/(app)/adaptation-actions";
import { saveCompanionSettings } from "@/app/(app)/actions";
import { ScreenHeader } from "@/components/layout/screen-header";
import { CommunicationAdaptationSection } from "@/components/settings/communication-adaptation-section";
import { CompanionSettingsForm } from "@/components/settings/companion-settings-form";
import { requireUser } from "@/lib/auth/require-user";
import { toCompanionPreferences } from "@/lib/companion-defaults";
import { CORE_PREVIEWS, previewAdaptivePreferences } from "@/lib/core/preview-fixtures";
import { listAdaptivePreferences } from "@/lib/db/queries/adaptation";
import { getCompanionProfile, getProfile } from "@/lib/db/queries/profile";
import { createClient } from "@/lib/supabase/server";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Companion settings" };

export default async function CompanionSettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const supabase = await createClient();

  const [profile, companionProfile] = await Promise.all([
    getProfile(supabase, user.id),
    getCompanionProfile(supabase, user.id),
  ]);

  // DEVELOPMENT-ONLY preview states (fictional, never persisted).
  let preview: string | undefined;
  if (process.env.NODE_ENV !== "production" && searchParams) {
    const params = await searchParams;
    const value = params.preview;
    if (typeof value === "string" && CORE_PREVIEWS.has(value)) preview = value;
  }

  const adaptivePreferences = preview
    ? previewAdaptivePreferences(preview)
    : await listAdaptivePreferences(supabase, user.id).catch(() => []);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-10">
      <div>
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

      <CommunicationAdaptationSection
        preferences={adaptivePreferences}
        decideAction={preview ? undefined : decideAdaptivePreference}
        resetAllAction={preview ? undefined : resetAllAdaptationData}
        previewMode={Boolean(preview)}
      />
    </div>
  );
}
