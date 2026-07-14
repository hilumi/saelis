import type { ENERGIES, MOODS, SUPPORT_NEEDS } from "@/lib/constants";

export type Mood = (typeof MOODS)[number];
export type Energy = (typeof ENERGIES)[number];
export type SupportNeed = (typeof SUPPORT_NEEDS)[number];

/** A completed arrival check-in, before persistence. */
export interface ArrivalInput {
  mood: Mood;
  energy: Energy;
  supportNeed: SupportNeed;
  message: string | null;
  includeFaithReflection: boolean;
}
