/**
 * Saelis Her — deterministic weight-pace guidance.
 *
 * Product rules: never shame or reject a goal, never promise outcomes, and
 * quietly use a conservative range when a requested pace looks aggressive.
 * This module only informs copy and (in Phase 3) the rules engine — it never
 * blocks onboarding.
 */

export interface PaceAssessment {
  /** Requested average pounds per week, when computable. */
  requestedLbsPerWeek: number | null;
  /** True when the requested pace exceeds the conservative threshold. */
  aggressive: boolean;
  /** Conservative pace Saelis will plan around instead (lbs/week). */
  conservativeLbsPerWeek: number;
}

/** Above this average weekly change, Saelis plans around a gentler range. */
export const CONSERVATIVE_MAX_LBS_PER_WEEK = 1.5;

const WEEKS_PER_MONTH = 4.345;

export function assessWeightPace(input: {
  currentWeightLbs: number | null | undefined;
  targetWeightLbs: number | null | undefined;
  goalTimeframeMonths: number | null | undefined;
}): PaceAssessment {
  const { currentWeightLbs, targetWeightLbs, goalTimeframeMonths } = input;
  if (
    currentWeightLbs == null ||
    targetWeightLbs == null ||
    goalTimeframeMonths == null ||
    goalTimeframeMonths <= 0
  ) {
    return {
      requestedLbsPerWeek: null,
      aggressive: false,
      conservativeLbsPerWeek: CONSERVATIVE_MAX_LBS_PER_WEEK,
    };
  }
  const totalChange = Math.abs(currentWeightLbs - targetWeightLbs);
  const weeks = goalTimeframeMonths * WEEKS_PER_MONTH;
  const requested = totalChange / weeks;
  return {
    requestedLbsPerWeek: Math.round(requested * 100) / 100,
    aggressive: requested > CONSERVATIVE_MAX_LBS_PER_WEEK,
    conservativeLbsPerWeek: CONSERVATIVE_MAX_LBS_PER_WEEK,
  };
}

/** Calm, shame-free copy for an aggressive pace. Never a rejection. */
export const CONSERVATIVE_PACE_NOTICE =
  "That timeframe would ask a lot of your body. Your goal is welcome exactly as it is — " +
  "Saelis will simply plan around a gentler, more sustainable range, and progress may take " +
  "a little longer than the date you chose. Estimates are never promises. If you would like " +
  "a plan tailored to your specific situation, a registered dietitian or your clinician can " +
  "offer individualized guidance.";
