import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HerToday, type HerTodayProps } from "./her-today";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/app/(app)/wellness-actions", () => ({
  saveEveningReflection: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/app/(app)/wellness-plan-actions", () => ({
  adaptPlanForTime: vi.fn(async () => ({ ok: true })),
  generateTodayPlan: vi.fn(async () => ({ ok: true })),
  saveDailyCheckInAction: vi.fn(async () => ({ ok: true })),
  completeWorkout: vi.fn(async () => ({ ok: true })),
  replaceTodaysWorkout: vi.fn(async () => ({ ok: true })),
  logHydration: vi.fn(async () => ({ ok: true })),
  logMeal: vi.fn(async () => ({ ok: true })),
  quickAddProtein: vi.fn(async () => ({ ok: true })),
  saveRestoreCheckInAction: vi.fn(async () => ({ ok: true })),
}));

function props(overrides: Partial<HerTodayProps> = {}): HerTodayProps {
  return {
    today: "2026-07-17",
    dateLabel: "Friday, July 17",
    greetingName: "Sophie",
    pathwayNames: ["Phoenix"],
    pathways: ["phoenix"],
    programWeek: { weekNumber: 2, phaseName: "Foundation", deload: false },
    checkInDone: false,
    initialReadiness: null,
    plan: {
      presentation: {
        urgent: false,
        safetyHold: false,
        minimumViableDay: false,
        nextBestAction: "Your 20-minute home full body.",
        additionalActions: ["Protein at each meal.", "Water: about 72 oz across the day."],
        adaptationExplanation: null,
      },
      safetyMessage: null,
      adaptationLevel: "standard",
      movement: {
        focus: "Home full body",
        workoutTemplateSlug: "home-20",
        approximateMinutes: 20,
        exercises: [
          {
            exerciseSlug: "bodyweight-squat",
            displayName: "Bodyweight squat",
            sequenceNumber: 1,
            sets: 3,
            reps: "10",
            durationSeconds: null,
            restSeconds: 60,
            intensityGuidance: "2 reps in reserve",
            modificationNotes: null,
          },
        ],
        restDay: false,
        notes: "Two reps in reserve, always.",
      },
      recovery: { activities: ["gentle stretching"], sleepFocus: null, notes: null },
      intensityNote: "Two reps in reserve, always.",
    },
    planError: false,
    nutrition: {
      focus: "Protein at each meal.",
      proteinTargetGrams: 110,
      proteinSoFarGrams: 40,
      hydrationTargetOunces: 72,
      hydrationSoFarOunces: 16,
      calorieRange: { low: 1600, high: 1800 },
      mealsLoggedToday: 1,
    },
    restore: null,
    resetActive: false,
    stopConditions: ["Sharp or worsening pain"],
    milestoneMessage: null,
    reflectionSaved: false,
    ...overrides,
  };
}

describe("HerToday dashboard", () => {
  it("shows the priority order: readiness, next best action, movement, nourishment", () => {
    render(<HerToday {...props()} />);
    expect(screen.getByRole("region", { name: "Readiness check-in" })).toBeInTheDocument();
    expect(screen.getByText("Your 20-minute home full body.")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Today's workout" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Nourishment and hydration" })).toBeInTheDocument();
    expect(screen.getByText(/Week 2, Foundation/)).toBeInTheDocument();
  });

  it("shows no postpartum content for non-Restore users", () => {
    render(<HerToday {...props()} />);
    expect(document.body.textContent).not.toMatch(/postpartum|pelvic|Restore/);
  });

  it("renders the discreet Restore card only when Restore is active — summary, not symptoms", () => {
    render(
      <HerToday
        {...props({
          pathways: ["restore"],
          pathwayNames: ["Restore"],
          restore: {
            enrollmentId: "11111111-2222-4333-8444-555555555555",
            phaseName: "Restore A — Foundation",
            clearanceLabel: "not yet discussed",
            checkInDone: false,
            holdActive: false,
            professionalSupportSuggested: false,
            recoveryAction: "Breath first, then gentle reconnection.",
          },
        })}
      />,
    );
    expect(screen.getByRole("region", { name: "Restore" })).toBeInTheDocument();
    // Symptom questions are behind an explicit disclosure, not on the surface.
    expect(screen.queryByText(/Heavy bleeding/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Gentle recovery check-in/ })).toBeInTheDocument();
  });

  it("safety hold replaces the workout card with guidance and hides quick workout actions", () => {
    render(
      <HerToday
        {...props({
          plan: {
            ...props().plan!,
            safetyMessage: "Your plan is on a gentle hold — this is not a diagnosis.",
            adaptationLevel: "safety_hold",
            presentation: {
              urgent: false,
              safetyHold: true,
              minimumViableDay: false,
              nextBestAction:
                "Nourishment, hydration, and rest are the plan while things get checked.",
              additionalActions: ["One nourishing meal.", "Water within reach."],
              adaptationExplanation: null,
            },
          },
        })}
      />,
    );
    expect(screen.getByText(/gentle hold/)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Today's workout" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Planet Fitness" })).not.toBeInTheDocument();
  });

  it("urgent support shows only the urgent message and its single action", () => {
    render(
      <HerToday
        {...props({
          plan: {
            ...props().plan!,
            safetyMessage: "Some of what you reported deserves prompt medical attention.",
            adaptationLevel: "safety_hold",
            presentation: {
              urgent: true,
              safetyHold: true,
              minimumViableDay: false,
              nextBestAction: "Reach the support described above — that is the only item today.",
              additionalActions: [],
              adaptationExplanation: null,
            },
          },
        })}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/prompt medical attention/);
    expect(screen.queryByRole("region", { name: "Readiness check-in" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Nourishment and hydration" }),
    ).not.toBeInTheDocument();
  });

  it("Reset/minimum-viable day shows at most three actions and hides metrics", () => {
    render(
      <HerToday
        {...props({
          resetActive: true,
          plan: {
            ...props().plan!,
            presentation: {
              urgent: false,
              safetyHold: false,
              minimumViableDay: true,
              nextBestAction: "Eat one nourishing meal with a protein source.",
              additionalActions: [
                "Drink a manageable amount of water.",
                "Five to fifteen minutes of gentle movement or rest.",
              ],
              adaptationExplanation: "Today has been reduced to three meaningful actions.",
            },
          },
        })}
      />,
    );
    expect(screen.getByText(/A care day — three things, nothing more/)).toBeInTheDocument();
    expect(screen.getByText(/intentional care, not falling short/)).toBeInTheDocument();
    // Nourishment metrics card is hidden on minimal days.
    expect(
      screen.queryByRole("region", { name: "Nourishment and hydration" }),
    ).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/streak|failed|behind/i);
  });

  it("offers the evening reflection with skip", () => {
    render(<HerToday {...props()} />);
    expect(screen.getByText("What is one thing you are proud of today?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
  });
});
