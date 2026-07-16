import {
  deleteAccountAction,
  deleteAllArrivalsAction,
  deleteAllConversationsAction,
  deleteAllHorizonStepsAction,
  deleteAllMemoriesAction,
  savePrivacySettings,
} from "@/app/(app)/actions";
import { PrototypeImportPreview } from "@/components/import/prototype-import-preview";
import { ScreenHeader } from "@/components/layout/screen-header";
import { TrustLinks } from "@/components/layout/trust-links";
import { DataDeletionSection } from "@/components/settings/data-deletion-section";
import { PrivacySettingsForm } from "@/components/settings/privacy-settings-form";
import { GlassSurface } from "@/components/ui/glass-surface";
import { requireUser } from "@/lib/auth/require-user";
import { getPrivacySettings } from "@/lib/db/queries/profile";
import { createClient } from "@/lib/supabase/server";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy settings" };

export default async function PrivacySettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const settings = await getPrivacySettings(supabase, user.id);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8">
      <div>
        <ScreenHeader
          title="Privacy"
          subtitle="Your words belong to you. These controls decide what Saelis keeps."
        />
        <PrivacySettingsForm
          initialValues={{
            saveConversationHistory: settings?.save_conversation_history ?? true,
            allowCompanionMemory: settings?.allow_companion_memory ?? true,
            allowProductAnalytics: settings?.allow_product_analytics ?? false,
          }}
          action={savePrivacySettings}
        />
      </div>

      <GlassSurface>
        <DataDeletionSection
          deleteConversations={deleteAllConversationsAction}
          deleteArrivals={deleteAllArrivalsAction}
          deleteHorizonSteps={deleteAllHorizonStepsAction}
          deleteMemories={deleteAllMemoriesAction}
          deleteAccount={deleteAccountAction}
          accountDeletionAvailable={Boolean(process.env.SUPABASE_SECRET_KEY)}
        />
      </GlassSurface>

      <GlassSurface>
        <PrototypeImportPreview />
      </GlassSurface>

      <section aria-label="Policies and support">
        <h2 className="mb-1 px-3 text-sm font-medium text-ink-soft">Policies &amp; support</h2>
        <TrustLinks />
      </section>
    </div>
  );
}
