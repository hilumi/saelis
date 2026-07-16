import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-user", () => ({ getOptionalUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/db/queries/roles", () => ({ hasFounderRole: vi.fn(async () => false) }));
vi.mock("@/lib/db/queries/stewardship", () => ({
  getStewardshipEventCounts: vi.fn(async () => [
    { event_type: "memory_proposal_accepted", occurrences: 4 },
  ]),
  getStewardshipMemoryCounts: vi.fn(async () => [
    { kind: "constellation", status: "active", occurrences: 7 },
  ]),
  getFeedbackCategoryCounts: vi.fn(async () => [{ feedback_category: "too-long", occurrences: 2 }]),
}));
vi.mock("@/lib/db/queries/adaptation", () => ({
  getAdaptationAggregateCounts: vi.fn(async () => [
    { record_kind: "adaptive_preference", status: "active", occurrences: 3 },
    { record_kind: "pattern_hypothesis", status: "reviewable", occurrences: 2 },
  ]),
}));

import FounderPage from "@/app/(app)/founder/page";
import { getOptionalUser } from "@/lib/auth/require-user";
import { hasFounderRole } from "@/lib/db/queries/roles";
import { APP_VERSION } from "@/lib/version";

const USER = { id: "00000000-0000-4000-8000-000000000001", email: "private@example.com" };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Founder Console authorization", () => {
  it("denies unauthenticated visitors with a 404", async () => {
    vi.mocked(getOptionalUser).mockResolvedValue(null);
    await expect(FounderPage()).rejects.toThrow();
  });

  it("denies ordinary users with a 404 (server-side role check)", async () => {
    vi.mocked(getOptionalUser).mockResolvedValue(USER as never);
    vi.mocked(hasFounderRole).mockResolvedValue(false);
    await expect(FounderPage()).rejects.toThrow();
    expect(hasFounderRole).toHaveBeenCalled();
  });

  it("permits a founder and shows only privacy-safe aggregates", async () => {
    vi.mocked(getOptionalUser).mockResolvedValue(USER as never);
    vi.mocked(hasFounderRole).mockResolvedValue(true);
    render(await FounderPage());
    expect(screen.getByText("Founder Console")).toBeInTheDocument();
    expect(screen.getByText(`v${APP_VERSION}`)).toBeInTheDocument();
    // Aggregate counts appear…
    expect(screen.getByText("Memory proposals accepted")).toBeInTheDocument();
    expect(screen.getByText("Active Constellations")).toBeInTheDocument();
    // …and no user content, email, or identifier ever does.
    expect(screen.queryByText(/private@example.com/)).not.toBeInTheDocument();
    expect(screen.queryByText(USER.id)).not.toBeInTheDocument();
  });
});
