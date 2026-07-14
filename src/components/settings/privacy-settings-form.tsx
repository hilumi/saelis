"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Toggle } from "@/components/ui/toggle";

import type { ActionResult } from "@/types/actions";

export interface PrivacySettingsValues {
  saveConversationHistory: boolean;
  allowCompanionMemory: boolean;
  allowProductAnalytics: boolean;
}

export interface PrivacySettingsFormProps {
  initialValues: PrivacySettingsValues;
  action: (values: PrivacySettingsValues) => Promise<ActionResult>;
}

/**
 * Privacy controls. Changes are saved explicitly (no optimistic updates for
 * sensitive settings — the UI reflects only what the server confirmed).
 */
export function PrivacySettingsForm({ initialValues, action }: PrivacySettingsFormProps) {
  const [values, setValues] = useState<PrivacySettingsValues>(initialValues);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  async function handleSubmit() {
    setSaving(true);
    setResult(null);
    const outcome = await action(values);
    setSaving(false);
    setResult(outcome);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <Toggle
        label="Save conversation history"
        description="When off, new conversation turns are not stored after each exchange. Past saved conversations remain until you delete them."
        checked={values.saveConversationHistory}
        onChange={(checked) => setValues((v) => ({ ...v, saveConversationHistory: checked }))}
      />
      <Toggle
        label="Allow companion memory"
        description="When on, Saelis may propose things to remember. Nothing is ever remembered without your explicit approval."
        checked={values.allowCompanionMemory}
        onChange={(checked) => setValues((v) => ({ ...v, allowCompanionMemory: checked }))}
      />
      <Toggle
        label="Allow product analytics"
        description="Off by default. When on, anonymous usage signals help improve Saelis. Never your conversation content."
        checked={values.allowProductAnalytics}
        onChange={(checked) => setValues((v) => ({ ...v, allowProductAnalytics: checked }))}
      />

      {result && !result.ok ? <InlineNotice tone="error">{result.error}</InlineNotice> : null}
      {result && result.ok ? (
        <InlineNotice tone="success">Privacy settings saved.</InlineNotice>
      ) : null}

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save privacy settings"}
      </Button>
    </form>
  );
}
