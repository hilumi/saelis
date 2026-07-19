import { describe, expect, it } from "vitest";

import {
  buildNotificationContent,
  NOTIFICATION_COPY,
  NOTIFICATION_DEEP_LINKS,
  PRIVATE_PREVIEW_BODY,
  PROHIBITED_NOTIFICATION_PATTERNS,
} from "./copy";
import type { NotificationCategory } from "./copy";

const CATEGORIES = Object.keys(NOTIFICATION_COPY) as NotificationCategory[];

describe("notification copy catalog", () => {
  it("contains no guilt, streak, urgency, or attachment language anywhere", () => {
    for (const category of CATEGORIES) {
      const copy = NOTIFICATION_COPY[category];
      for (const text of [copy.title, ...copy.bodies]) {
        const lower = text.toLowerCase();
        for (const prohibited of PROHIBITED_NOTIFICATION_PATTERNS) {
          expect(lower, `"${text}" must not contain "${prohibited}"`).not.toContain(prohibited);
        }
      }
    }
  });

  it("private preview shows only the generic line, for every category", () => {
    for (const category of CATEGORIES) {
      const content = buildNotificationContent(category, "private", "2026-07-17");
      expect(content.body).toBe(PRIVATE_PREVIEW_BODY);
      expect(content.title).toBe("Saelis");
    }
  });

  it("detailed preview is category-specific but static (no user content interpolation)", () => {
    for (const category of CATEGORIES) {
      const content = buildNotificationContent(category, "detailed", "2026-07-17");
      expect(NOTIFICATION_COPY[category].bodies).toContain(content.body);
      expect(content.body).not.toMatch(/\{|\}|\$\{/); // no template holes
    }
  });

  it("copy selection is deterministic per day (idempotent retries send identical text)", () => {
    const a = buildNotificationContent("gentle_check_in", "detailed", "2026-07-17");
    const b = buildNotificationContent("gentle_check_in", "detailed", "2026-07-17");
    expect(a).toEqual(b);
  });

  it("every category has a deep-link path on the app's route space", () => {
    for (const category of CATEGORIES) {
      expect(NOTIFICATION_DEEP_LINKS[category]).toMatch(/^\//);
    }
  });
});
