"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Toggle } from "@/components/ui/toggle";

import type { ActionResult } from "@/types/actions";
import type { CompanionPreferences } from "@/types/companion";

export interface CompanionSettingsFormProps {
  initialPreferredName: string;
  initialPreferences: CompanionPreferences;
  action: (input: {
    preferredName: string | null;
    preferences: CompanionPreferences;
  }) => Promise<ActionResult>;
}

interface SelectFieldProps<T extends string> {
  id: string;
  label: string;
  description: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

function SelectField<T extends string>({
  id,
  label,
  description,
  value,
  options,
  onChange,
}: SelectFieldProps<T>) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-medium text-ink">
        {label}
      </label>
      <p id={`${id}-description`} className="text-sm text-ink-soft">
        {description}
      </p>
      <select
        id={id}
        value={value}
        aria-describedby={`${id}-description`}
        onChange={(event) => onChange(event.target.value as T)}
        className="glass-surface min-h-11 rounded-2xl px-4 py-2 text-ink"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CompanionSettingsForm({
  initialPreferredName,
  initialPreferences,
  action,
}: CompanionSettingsFormProps) {
  const [preferredName, setPreferredName] = useState(initialPreferredName);
  const [preferences, setPreferences] = useState<CompanionPreferences>(initialPreferences);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  function set<K extends keyof CompanionPreferences>(key: K, value: CompanionPreferences[K]) {
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit() {
    setSaving(true);
    setResult(null);
    const outcome = await action({
      preferredName: preferredName.trim() === "" ? null : preferredName.trim(),
      preferences,
    });
    setSaving(false);
    setResult(outcome);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="preferred-name" className="font-medium text-ink">
          What should Saelis call you?
        </label>
        <input
          id="preferred-name"
          type="text"
          value={preferredName}
          maxLength={80}
          onChange={(event) => setPreferredName(event.target.value)}
          className="glass-surface min-h-11 rounded-2xl px-4 py-2 text-ink"
        />
      </div>

      <SelectField
        id="tone"
        label="Tone"
        description="How Saelis speaks with you."
        value={preferences.tonePreference}
        options={[
          { value: "gentle", label: "Gentle" },
          { value: "balanced", label: "Balanced" },
          { value: "direct", label: "Direct" },
        ]}
        onChange={(value) => set("tonePreference", value)}
      />

      <SelectField
        id="response-length"
        label="Response length"
        description="How much Saelis says at a time."
        value={preferences.responseLength}
        options={[
          { value: "brief", label: "Brief" },
          { value: "moderate", label: "Moderate" },
          { value: "expansive", label: "Expansive" },
        ]}
        onChange={(value) => set("responseLength", value)}
      />

      <SelectField
        id="support-preference"
        label="Default support"
        description="What Saelis reaches for first."
        value={preferences.defaultSupportPreference}
        options={[
          { value: "listen-first", label: "Listen first" },
          { value: "ask-first", label: "Ask first" },
          { value: "guide-first", label: "Guide first" },
        ]}
        onChange={(value) => set("defaultSupportPreference", value)}
      />

      <SelectField
        id="humor"
        label="Humor"
        description="How playful Saelis may be."
        value={preferences.humorLevel}
        options={[
          { value: "none", label: "None" },
          { value: "light", label: "Light" },
          { value: "playful", label: "Playful" },
        ]}
        onChange={(value) => set("humorLevel", value)}
      />

      <SelectField
        id="faith"
        label="Faith reflection"
        description="Whether faith may be part of the conversation."
        value={preferences.faithPreference}
        options={[
          { value: "never", label: "Never" },
          { value: "ask", label: "Ask me each time" },
          { value: "welcome", label: "Always welcome" },
        ]}
        onChange={(value) => set("faithPreference", value)}
      />

      <SelectField
        id="planning"
        label="Planning style"
        description="How next steps are offered."
        value={preferences.planningStyle}
        options={[
          { value: "one-step", label: "One step at a time" },
          { value: "small-plan", label: "A small plan" },
          { value: "no-plans", label: "No plans, please" },
        ]}
        onChange={(value) => set("planningStyle", value)}
      />

      <SelectField
        id="encouragement"
        label="Encouragement"
        description="The warmth of Saelis's encouragement."
        value={preferences.encouragementStyle}
        options={[
          { value: "quiet", label: "Quiet" },
          { value: "warm", label: "Warm" },
          { value: "bright", label: "Bright" },
        ]}
        onChange={(value) => set("encouragementStyle", value)}
      />

      <Toggle
        label="Allow Saelis to adapt how it communicates with me"
        description="Let Saelis gently adapt to your communication preferences over time. Everything it adapts is visible below, and nothing lasting is remembered without your approval."
        checked={preferences.adaptiveLearningEnabled}
        onChange={(value) => set("adaptiveLearningEnabled", value)}
      />

      {result && !result.ok ? <InlineNotice tone="error">{result.error}</InlineNotice> : null}
      {result && result.ok ? (
        <InlineNotice tone="success">Saved. Saelis will keep this in mind.</InlineNotice>
      ) : null}

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save preferences"}
      </Button>
    </form>
  );
}
