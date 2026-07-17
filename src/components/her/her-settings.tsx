"use client";

import Link from "next/link";
import { useState } from "react";

import {
  deleteAllHerData,
  saveHerNotificationPreferences,
  saveHerProfile,
  savePathwaySettings,
  saveRestoreProfile,
} from "@/app/(app)/wellness-actions";
import { Dialog } from "@/components/ui/dialog";
import { NumberField, RadioChips, TagListField, TextField } from "@/components/her/fields";
import { Button } from "@/components/ui/button";
import { InlineNotice } from "@/components/ui/inline-notice";
import { Toggle } from "@/components/ui/toggle";
import {
  MEDICAL_CLEARANCE_STATUSES,
  MOVEMENT_EXPERIENCES,
  NOTIFICATION_STYLES,
  POSTPARTUM_STAGES,
  RHYTHM_MODES,
  type MedicalClearanceStatus,
  type PostpartumStage,
  type RhythmMode,
} from "@/lib/wellness/constants";

import type { NotificationPreferencesInput } from "@/lib/validation/wellness-onboarding";
import type { WomenWellnessProfileInput } from "@/lib/validation/wellness";

export interface HerSettingsProps {
  profile: WomenWellnessProfileInput;
  notifications: NotificationPreferencesInput;
  /** Present ONLY when the user has an active Restore enrollment. */
  restore: {
    enrollmentId: string;
    postpartumStage: PostpartumStage;
    medicalClearanceStatus: MedicalClearanceStatus;
    reportedRestrictions: string | null;
  } | null;
  /** Present ONLY when the user has an active Rhythm enrollment. */
  rhythm: { enrollmentId: string; mode: RhythmMode | null } | null;
}

type SaveState = "idle" | "saving" | "saved" | "error";

function SaveRow({
  state,
  error,
  onSave,
}: {
  state: SaveState;
  error: string | null;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="soft" onClick={onSave} disabled={state === "saving"}>
        {state === "saving" ? "Saving…" : "Save"}
      </Button>
      <span aria-live="polite" className="text-sm">
        {state === "saved" ? <span className="text-ink-soft">✓ Saved</span> : null}
        {state === "error" && error ? (
          <span role="alert" className="text-ink">
            {error}
          </span>
        ) : null}
      </span>
    </div>
  );
}

export function HerSettings({ profile, notifications, restore, rhythm }: HerSettingsProps) {
  const [profileDraft, setProfileDraft] = useState<WomenWellnessProfileInput>(profile);
  const [profileState, setProfileState] = useState<SaveState>("idle");
  const [profileError, setProfileError] = useState<string | null>(null);

  const [notifDraft, setNotifDraft] = useState<NotificationPreferencesInput>(notifications);
  const [notifState, setNotifState] = useState<SaveState>("idle");
  const [notifError, setNotifError] = useState<string | null>(null);

  const [restoreDraft, setRestoreDraft] = useState(restore);
  const [restoreState, setRestoreState] = useState<SaveState>("idle");
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const [rhythmMode, setRhythmMode] = useState<RhythmMode | null>(rhythm?.mode ?? null);
  const [rhythmState, setRhythmState] = useState<SaveState>("idle");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteState, setDeleteState] = useState<SaveState>("idle");
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function patchProfile(patch: Partial<WomenWellnessProfileInput>) {
    setProfileDraft((current) => ({ ...current, ...patch }));
    setProfileState("idle");
  }

  async function saveProfile() {
    setProfileState("saving");
    setProfileError(null);
    const result = await saveHerProfile(profileDraft);
    setProfileState(result.ok ? "saved" : "error");
    if (!result.ok) setProfileError(result.error);
  }

  async function saveNotifications() {
    setNotifState("saving");
    setNotifError(null);
    const result = await saveHerNotificationPreferences(notifDraft);
    setNotifState(result.ok ? "saved" : "error");
    if (!result.ok) setNotifError(result.error);
  }

  return (
    <div className="flex flex-col gap-8">
      <section
        aria-labelledby="settings-pathways"
        className="glass-surface flex flex-col gap-2 p-5"
      >
        <h2 id="settings-pathways" className="text-lg font-semibold text-ink">
          Pathways
        </h2>
        <p className="text-sm text-ink-soft">
          Add, pause, resume, or set aside pathways. Pausing never deletes anything.
        </p>
        <Link href="/wellness/her/pathways" className="text-ink underline underline-offset-4">
          Manage pathways
        </Link>
      </section>

      <section aria-labelledby="settings-profile" className="glass-surface flex flex-col gap-4 p-5">
        <h2 id="settings-profile" className="text-lg font-semibold text-ink">
          General profile
        </h2>
        <NumberField
          label="Height"
          unit="inches"
          min={36}
          max={90}
          value={profileDraft.heightInches ?? null}
          onChange={(heightInches) => patchProfile({ heightInches })}
        />
        <NumberField
          label="Current weight"
          unit="lbs"
          min={50}
          max={1000}
          hint="Optional, always."
          value={profileDraft.currentWeightLbs ?? null}
          onChange={(currentWeightLbs) => patchProfile({ currentWeightLbs })}
        />
        <NumberField
          label="Target weight"
          unit="lbs"
          min={50}
          max={1000}
          value={profileDraft.targetWeightLbs ?? null}
          onChange={(targetWeightLbs) => patchProfile({ targetWeightLbs })}
        />
        <RadioChips
          legend="Units"
          options={[
            { value: "imperial", label: "Imperial" },
            { value: "metric", label: "Metric" },
          ]}
          value={profileDraft.unitsPreference}
          onChange={(unitsPreference) => patchProfile({ unitsPreference })}
        />
        <h3 className="font-medium text-ink">Progress tracking</h3>
        <Toggle
          label="Track weight"
          description="Progress never requires a scale."
          checked={profileDraft.tracksWeight}
          onChange={(tracksWeight) => patchProfile({ tracksWeight })}
        />
        <Toggle
          label="Track calories"
          description="Estimates only, never precise."
          checked={profileDraft.tracksCalories}
          onChange={(tracksCalories) => patchProfile({ tracksCalories })}
        />
        <Toggle
          label="Daily weigh-ins"
          checked={profileDraft.weighsDaily}
          onChange={(weighsDaily) => patchProfile({ weighsDaily })}
        />
        <SaveRow state={profileState} error={profileError} onSave={saveProfile} />
      </section>

      <section
        aria-labelledby="settings-movement"
        className="glass-surface flex flex-col gap-4 p-5"
      >
        <h2 id="settings-movement" className="text-lg font-semibold text-ink">
          Movement preferences
        </h2>
        <RadioChips
          legend="Experience"
          options={MOVEMENT_EXPERIENCES.map((value) => ({
            value,
            label: value.charAt(0).toUpperCase() + value.slice(1),
          }))}
          value={profileDraft.movementExperience}
          onChange={(movementExperience) => patchProfile({ movementExperience })}
        />
        <NumberField
          label="Workout days per week"
          min={0}
          max={7}
          optional={false}
          value={profileDraft.preferredWorkoutDays}
          onChange={(value) => patchProfile({ preferredWorkoutDays: value ?? 3 })}
        />
        <NumberField
          label="Usual minutes"
          min={5}
          max={180}
          optional={false}
          value={profileDraft.preferredWorkoutMinutes}
          onChange={(value) => patchProfile({ preferredWorkoutMinutes: value ?? 30 })}
        />
        <TagListField
          label="Anything to work around"
          values={profileDraft.movementLimitations}
          onChange={(movementLimitations) => patchProfile({ movementLimitations })}
        />
        <Toggle
          label="Floor transitions are hard right now"
          checked={profileDraft.floorTransitionsDifficult}
          onChange={(floorTransitionsDifficult) => patchProfile({ floorTransitionsDifficult })}
        />
        <SaveRow state={profileState} error={profileError} onSave={saveProfile} />
      </section>

      <section
        aria-labelledby="settings-nutrition"
        className="glass-surface flex flex-col gap-4 p-5"
      >
        <h2 id="settings-nutrition" className="text-lg font-semibold text-ink">
          Nutrition preferences
        </h2>
        <TextField
          label="Dietary pattern"
          value={profileDraft.dietaryPattern ?? ""}
          onChange={(value) => patchProfile({ dietaryPattern: value || null })}
        />
        <TagListField
          label="Food allergies"
          values={profileDraft.foodAllergies}
          onChange={(foodAllergies) => patchProfile({ foodAllergies })}
        />
        <TagListField
          label="Foods you dislike"
          values={profileDraft.foodDislikes}
          onChange={(foodDislikes) => patchProfile({ foodDislikes })}
        />
        <Toggle
          label="Quick meals matter"
          checked={profileDraft.quickMealsPreferred}
          onChange={(quickMealsPreferred) => patchProfile({ quickMealsPreferred })}
        />
        <Toggle
          label="Family-style meals are important"
          checked={profileDraft.familyStyleMeals}
          onChange={(familyStyleMeals) => patchProfile({ familyStyleMeals })}
        />
        <SaveRow state={profileState} error={profileError} onSave={saveProfile} />
      </section>

      <section
        aria-labelledby="settings-reminders"
        className="glass-surface flex flex-col gap-4 p-5"
      >
        <h2 id="settings-reminders" className="text-lg font-semibold text-ink">
          Reminders
        </h2>
        <RadioChips
          legend="Style"
          options={NOTIFICATION_STYLES.map((value) => ({
            value,
            label: value.charAt(0).toUpperCase() + value.slice(1),
          }))}
          value={notifDraft.reminderStyle}
          onChange={(reminderStyle) => {
            setNotifDraft({ ...notifDraft, reminderStyle });
            setNotifState("idle");
          }}
        />
        {(
          [
            ["morningCheckIn", "Morning check-in"],
            ["workoutReminders", "Workout reminders"],
            ["nourishmentReminders", "Nourishment reminders"],
            ["hydrationReminders", "Hydration reminders"],
            ["eveningReflection", "Evening reflection"],
          ] as const
        ).map(([key, label]) => (
          <Toggle
            key={key}
            label={label}
            checked={notifDraft[key]}
            onChange={(checked) => {
              setNotifDraft({ ...notifDraft, [key]: checked });
              setNotifState("idle");
            }}
          />
        ))}
        <NumberField
          label="Most notifications per day"
          min={0}
          max={10}
          optional={false}
          value={notifDraft.maxDailyNotifications}
          onChange={(value) => {
            setNotifDraft({ ...notifDraft, maxDailyNotifications: value ?? 3 });
            setNotifState("idle");
          }}
        />
        <SaveRow state={notifState} error={notifError} onSave={saveNotifications} />
      </section>

      {restoreDraft ? (
        <section
          aria-labelledby="settings-restore"
          className="flex flex-col gap-4 rounded-3xl bg-cloud-pink/30 p-5"
        >
          <h2 id="settings-restore" className="text-lg font-semibold text-ink">
            Restore
          </h2>
          <p className="text-sm text-ink-soft">
            Visible only because Restore is active, and only to you.
          </p>
          <RadioChips
            legend="Postpartum stage"
            optional={false}
            options={POSTPARTUM_STAGES.map((stage) => ({
              value: stage,
              label: stage.replaceAll("_", " "),
            }))}
            value={restoreDraft.postpartumStage}
            onChange={(postpartumStage) => {
              setRestoreDraft({ ...restoreDraft, postpartumStage });
              setRestoreState("idle");
            }}
          />
          <RadioChips
            legend="Clearance you have reported"
            optional={false}
            options={MEDICAL_CLEARANCE_STATUSES.map((status) => ({
              value: status,
              label: status.replaceAll("_", " "),
            }))}
            value={restoreDraft.medicalClearanceStatus}
            onChange={(medicalClearanceStatus) => {
              setRestoreDraft({ ...restoreDraft, medicalClearanceStatus });
              setRestoreState("idle");
            }}
          />
          <TextField
            label="Restrictions to respect"
            maxLength={500}
            value={restoreDraft.reportedRestrictions ?? ""}
            onChange={(value) => {
              setRestoreDraft({ ...restoreDraft, reportedRestrictions: value || null });
              setRestoreState("idle");
            }}
          />
          <SaveRow
            state={restoreState}
            error={restoreError}
            onSave={async () => {
              setRestoreState("saving");
              setRestoreError(null);
              const result = await saveRestoreProfile({
                enrollmentId: restoreDraft.enrollmentId,
                postpartumStage: restoreDraft.postpartumStage,
                medicalClearanceStatus: restoreDraft.medicalClearanceStatus,
                reportedRestrictions: restoreDraft.reportedRestrictions,
              });
              setRestoreState(result.ok ? "saved" : "error");
              if (!result.ok) setRestoreError(result.error);
            }}
          />
        </section>
      ) : null}

      {rhythm ? (
        <section
          aria-labelledby="settings-rhythm"
          className="glass-surface flex flex-col gap-4 p-5"
        >
          <h2 id="settings-rhythm" className="text-lg font-semibold text-ink">
            Rhythm
          </h2>
          <p className="text-sm text-ink-soft">
            Always optional and symptom-led. No fertility tracking, ever.
          </p>
          <RadioChips
            legend="Participation"
            options={RHYTHM_MODES.map((value) => ({
              value,
              label:
                value === "symptom-led"
                  ? "Symptom-led awareness"
                  : value === "not-applicable"
                    ? "Not applicable"
                    : "Prefer not to track",
            }))}
            value={rhythmMode}
            onChange={async (mode) => {
              setRhythmMode(mode);
              setRhythmState("saving");
              const result = await savePathwaySettings({
                enrollmentId: rhythm.enrollmentId,
                settings: { rhythmMode: mode },
              });
              setRhythmState(result.ok ? "saved" : "error");
            }}
          />
          <p aria-live="polite" className="text-sm text-ink-soft">
            {rhythmState === "saving" ? "Saving…" : rhythmState === "saved" ? "✓ Saved" : ""}
          </p>
        </section>
      ) : null}

      <section aria-labelledby="settings-privacy" className="glass-surface flex flex-col gap-2 p-5">
        <h2 id="settings-privacy" className="text-lg font-semibold text-ink">
          Privacy and your data
        </h2>
        <p className="text-sm text-ink-soft">
          Everything in Saelis Her belongs to you alone: profile, goals, check-ins, and any Restore
          details are protected by per-user database security and are never shared between users,
          never used to shame you, and never written to logs. Weight and calorie tracking stay
          optional forever. Pausing or setting aside a pathway keeps your records; deleting your
          account removes them all.
        </p>
        <p className="text-sm text-ink-soft">
          What Saelis Her tracks: your preferences, goals, check-ins, workouts, nutrition and
          hydration estimates, and — only when Restore is active — your private Restore intake and
          recovery check-ins. Reminder previews may be visible on a lock screen, so Restore
          reminders never carry detail. Pausing a pathway keeps its data; notifications can be
          turned off above; full account deletion removes everything, everywhere.
        </p>
        <InlineNotice tone="info">
          Saelis Her offers general educational wellness support — it does not replace
          individualized care from your clinician, physical therapist, or dietitian.
        </InlineNotice>
        <div>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            Remove all my wellness data
          </Button>
        </div>
        {deleteState === "saved" ? (
          <p role="status" className="text-sm text-ink-soft">
            Your wellness data has been removed.
          </p>
        ) : null}
        {deleteState === "error" && deleteError ? (
          <InlineNotice tone="error">{deleteError}</InlineNotice>
        ) : null}
      </section>

      <Dialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Remove all Saelis Her data?"
      >
        <div className="flex flex-col gap-4">
          <p className="text-ink-soft">
            This permanently deletes your wellness profile, pathways, programs, plans, check-ins,
            logs, meal plans, milestones, and any Restore records. It cannot be undone, and it does
            not touch your conversations or memories.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Keep my data
            </Button>
            <Button
              variant="danger"
              disabled={deleteState === "saving"}
              onClick={async () => {
                setDeleteState("saving");
                setDeleteError(null);
                const result = await deleteAllHerData({ confirm: true });
                setDeleteOpen(false);
                setDeleteState(result.ok ? "saved" : "error");
                if (!result.ok) setDeleteError(result.error);
              }}
            >
              {deleteState === "saving" ? "Removing…" : "Permanently remove"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
