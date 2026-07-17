import { HerSettings, type HerSettingsProps } from "@/components/her/her-settings";
import { ScreenHeader } from "@/components/layout/screen-header";
import { requireUser } from "@/lib/auth/require-user";
import { getPostpartumProfile } from "@/lib/db/queries/postpartum/profile";
import { getActiveEnrollmentForPathway } from "@/lib/db/queries/wellness/enrollments";
import { getNotificationPreferences } from "@/lib/db/queries/wellness/notifications";
import { getWomenWellnessProfile } from "@/lib/db/queries/wellness/profiles";
import { createClient } from "@/lib/supabase/server";
import { enrollmentSettingsSchema, womenWellnessProfileSchema } from "@/lib/validation/wellness";
import { notificationPreferencesSchema } from "@/lib/validation/wellness-onboarding";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Saelis Her — Settings" };

/**
 * Saelis Her settings. The Restore section renders ONLY for users with an
 * active Restore enrollment — its data never reaches anyone else's screen.
 */
export default async function HerSettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const props: HerSettingsProps = {
    profile: womenWellnessProfileSchema.parse({}),
    notifications: notificationPreferencesSchema.parse({}),
    restore: null,
    rhythm: null,
  };

  try {
    const [profileRow, notifRow, restoreEnrollment, rhythmEnrollment] = await Promise.all([
      getWomenWellnessProfile(supabase, user.id),
      getNotificationPreferences(supabase, user.id),
      getActiveEnrollmentForPathway(supabase, user.id, "restore"),
      getActiveEnrollmentForPathway(supabase, user.id, "rhythm"),
    ]);

    if (profileRow) {
      props.profile = womenWellnessProfileSchema.parse({
        dateOfBirth: profileRow.date_of_birth,
        heightInches: profileRow.height_inches,
        currentWeightLbs: profileRow.current_weight_lbs,
        targetWeightLbs: profileRow.target_weight_lbs,
        desiredWeightChangeLbs: profileRow.desired_weight_change_lbs,
        goalTimeframeMonths: profileRow.goal_timeframe_months,
        movementExperience: profileRow.movement_experience,
        preferredTrainingLocations: profileRow.preferred_training_locations,
        availableEquipment: profileRow.available_equipment,
        preferredWorkoutDays: profileRow.preferred_workout_days,
        preferredWorkoutMinutes: profileRow.preferred_workout_minutes,
        averageDailySteps: profileRow.average_daily_steps,
        dietaryPattern: profileRow.dietary_pattern,
        foodAllergies: profileRow.food_allergies,
        foodDislikes: profileRow.food_dislikes,
        householdMealPreferences: profileRow.household_meal_preferences,
        budgetPreference: profileRow.budget_preference,
        mealPrepPreference: profileRow.meal_prep_preference,
        tracksCalories: profileRow.tracks_calories,
        tracksWeight: profileRow.tracks_weight,
        weighsDaily: profileRow.weighs_daily,
        cycleTrackingEnabled: profileRow.cycle_tracking_enabled,
        postpartumPathwayRelevant: profileRow.postpartum_pathway_relevant,
        notificationStyle: profileRow.notification_style,
        unitsPreference: profileRow.units_preference,
        movementLimitations: profileRow.movement_limitations,
        movementDislikes: profileRow.movement_dislikes,
        floorTransitionsDifficult: profileRow.floor_transitions_difficult,
        prefersBeginnerExplanations: profileRow.prefers_beginner_explanations,
        quickMealsPreferred: profileRow.quick_meals_preferred,
        proteinFamiliarity: profileRow.protein_familiarity as "new" | "some" | "confident" | null,
        portionGuidancePreferred: profileRow.portion_guidance_preferred,
        familyStyleMeals: profileRow.family_style_meals,
      });
    }

    if (notifRow) {
      props.notifications = notificationPreferencesSchema.parse({
        reminderStyle: notifRow.reminder_style,
        morningCheckIn: notifRow.morning_check_in,
        workoutReminders: notifRow.workout_reminders,
        nourishmentReminders: notifRow.nourishment_reminders,
        hydrationReminders: notifRow.hydration_reminders,
        eveningReflection: notifRow.evening_reflection,
        quietHoursStart: notifRow.quiet_hours_start,
        quietHoursEnd: notifRow.quiet_hours_end,
        maxDailyNotifications: notifRow.max_daily_notifications,
      });
    }

    if (restoreEnrollment) {
      const postpartum = await getPostpartumProfile(supabase, user.id);
      if (postpartum) {
        props.restore = {
          enrollmentId: restoreEnrollment.id,
          postpartumStage: postpartum.postpartum_stage,
          medicalClearanceStatus: postpartum.medical_clearance_status,
          reportedRestrictions: postpartum.reported_restrictions,
        };
      }
    }

    if (rhythmEnrollment) {
      const settings = enrollmentSettingsSchema.safeParse(rhythmEnrollment.settings ?? {});
      props.rhythm = {
        enrollmentId: rhythmEnrollment.id,
        mode: settings.success ? (settings.data.rhythmMode ?? null) : null,
      };
    }
  } catch {
    // Migrations not applied — render defaults.
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ScreenHeader
        title="Saelis Her settings"
        subtitle="Everything here is yours to change — or leave blank."
      />
      <HerSettings {...props} />
    </div>
  );
}
