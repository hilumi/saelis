import { z } from "zod";

import { ENERGIES, MOODS, SUPPORT_NEEDS } from "@/lib/constants";

export const arrivalSchema = z.object({
  mood: z.enum(MOODS),
  energy: z.enum(ENERGIES),
  supportNeed: z.enum(SUPPORT_NEEDS),
  message: z
    .string()
    .trim()
    .max(2000, "That note is a little long — 2000 characters at most.")
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional()
    .default(null),
  includeFaithReflection: z.boolean().default(false),
});

export type ArrivalFormInput = z.input<typeof arrivalSchema>;
export type ValidatedArrival = z.output<typeof arrivalSchema>;
