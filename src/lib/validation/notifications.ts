import { z } from "zod";

/**
 * Validation for the notification API routes. No user id anywhere in these
 * shapes — identity always comes from the verified server session/token.
 */

export const pushTokenRegistrationSchema = z.object({
  token: z
    .string()
    .trim()
    .min(10, "That token doesn't look right.")
    .max(400, "That token doesn't look right."),
  platform: z.enum(["ios", "android", "unknown"]).optional().default("unknown"),
});

export type PushTokenRegistrationInput = z.output<typeof pushTokenRegistrationSchema>;

export const pushTokenRemovalSchema = z.object({
  token: z.string().trim().min(10).max(400),
});

const minutesOfDay = z.number().int().min(0).max(1439);

/** Timezones are validated against Intl; unknown zones are rejected calmly. */
const timezoneSchema = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .refine(
    (zone) => {
      try {
        new Intl.DateTimeFormat("en-US", { timeZone: zone });
        return true;
      } catch {
        return false;
      }
    },
    { message: "That timezone wasn't recognized." },
  );

export const notificationPreferencesSchema = z.object({
  enabled: z.boolean(),
  gentleCheckIns: z.boolean(),
  wellnessReminders: z.boolean(),
  eveningReflections: z.boolean(),
  userReminders: z.boolean(),
  preferredTimeMinutes: minutesOfDay,
  timezone: timezoneSchema,
  quietHoursStartMinutes: minutesOfDay,
  quietHoursEndMinutes: minutesOfDay,
  previewMode: z.enum(["private", "detailed"]),
  proactiveFrequency: z.enum(["daily", "few_per_week", "weekly"]),
});

export type NotificationPreferencesInput = z.output<typeof notificationPreferencesSchema>;
