import { approveProposedMemory } from "@/app/(app)/actions";
import { ConversationView } from "@/components/companion/conversation-view";
import { ScreenHeader } from "@/components/layout/screen-header";
import { InlineNotice } from "@/components/ui/inline-notice";
import { isMockCompanion } from "@/lib/ai/provider";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conversation" };

export default function ConversationPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader title="Conversation" subtitle="Say anything. Saelis listens first." />
      {isMockCompanion() ? (
        <InlineNotice tone="info" className="mb-4">
          Development preview: you&apos;re talking with a mock companion. No AI model is connected
          yet, and responses are simple placeholders.
        </InlineNotice>
      ) : null}
      <ConversationView approveMemoryAction={approveProposedMemory} />
    </div>
  );
}
