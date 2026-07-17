import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/admin-access", () => ({ requireAdminAccess: vi.fn() }));
vi.mock("@/lib/analytics/admin-service", () => ({ loadAdminAnalyticsOverview: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/db/queries/stewardship", () => ({ recordStewardshipEvent: vi.fn(async () => {}) }));

import AdminAnalyticsPage from "@/app/(app)/admin/analytics/page";
import { loadAdminAnalyticsOverview } from "@/lib/analytics/admin-service";
import { requireAdminAccess } from "@/lib/auth/admin-access";
import { recordStewardshipEvent } from "@/lib/db/queries/stewardship";
import { computeOverview } from "@/lib/analytics/metrics";

const USER = { id: "00000000-0000-4000-8000-000000000001", email: "admin@example.com" };

const ACCESS = {
  user: USER,
  roles: ["admin"],
  can: () => true,
} as never;

const EMPTY_DISTRIBUTION = { entries: [], suppressedGroups: 0 };

function fixture() {
  const overview = computeOverview([]);
  return {
    range: {
      fromISO: "2026-06-17T00:00:00.000Z",
      toISO: "2026-07-17T00:00:00.000Z",
      label: "Last 30 days",
    },
    minCohort: 5,
    current: { ...overview, activeUsers: 12, safetyHolds: 2 },
    previous: overview,
    funnel: {
      started: 10,
      completed: 6,
      completionRate: 60,
      abandonmentRate: 40,
      steps: [{ step: "pathways", users: 10, conversionFromPrevious: null }],
      medianCompletionMinutes: null,
    },
    activeUserTrend: [{ date: "2026-07-16", count: 4, users: 4 }],
    planTrend: [],
    workoutTrend: [],
    nutritionTrend: [],
    resetTrend: [],
    pathwayDistribution: { entries: [], suppressedGroups: 2 },
    pathwayCombinations: EMPTY_DISTRIBUTION,
    workoutTypeDistribution: EMPTY_DISTRIBUTION,
    workoutReplacedTypeDistribution: EMPTY_DISTRIBUTION,
    milestoneDistribution: EMPTY_DISTRIBUTION,
    notificationCategoryDistribution: EMPTY_DISTRIBUTION,
    suppressionReasonDistribution: EMPTY_DISTRIBUTION,
    safety: {
      tierDistribution: [],
      urgentSupportCount: 0,
      recoveryOnlyCount: 0,
      holdCount: 2,
      holdsByPathway: EMPTY_DISTRIBUTION,
      holdTrend: [],
    },
    retention: {
      cohortSize: 3,
      day1: { kind: "insufficient" },
      day7: { kind: "insufficient" },
      day14: { kind: "insufficient" },
      day30: { kind: "insufficient" },
    },
    eventCount: 5,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("admin analytics overview page", () => {
  it("renders nothing without server authorization (deny by default)", async () => {
    vi.mocked(requireAdminAccess).mockRejectedValue(new Error("NEXT_NOT_FOUND"));
    await expect(AdminAnalyticsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow();
    expect(loadAdminAnalyticsOverview).not.toHaveBeenCalled();
  });

  it("renders aggregates, audits access, and shows insufficient-data states", async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(ACCESS);
    vi.mocked(loadAdminAnalyticsOverview).mockResolvedValue(fixture());
    render(await AdminAnalyticsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText("Saelis Her Analytics")).toBeInTheDocument();
    expect(screen.getAllByText("Active users").length).toBeGreaterThan(0);
    expect(screen.getByText("12")).toBeInTheDocument();
    // Small cohorts render as insufficient data, never as tiny groups.
    expect(
      screen.getByText(/Insufficient data — groups below the minimum cohort size/),
    ).toBeInTheDocument();
    // The privacy commitment is stated on the page.
    expect(screen.getByText(/No personal wellness records/i)).toBeInTheDocument();
    // Access is audited content-free.
    expect(recordStewardshipEvent).toHaveBeenCalledWith(expect.anything(), USER.id, {
      event_type: "admin_analytics_viewed",
    });
    // No identifiers or emails ever render.
    expect(screen.queryByText(/admin@example.com/)).not.toBeInTheDocument();
    expect(screen.queryByText(USER.id)).not.toBeInTheDocument();
  });

  it("shows a calm error state when analytics are unavailable", async () => {
    vi.mocked(requireAdminAccess).mockResolvedValue(ACCESS);
    vi.mocked(loadAdminAnalyticsOverview).mockRejectedValue(new Error("no db"));
    render(await AdminAnalyticsPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByText(/Analytics aren't available/)).toBeInTheDocument();
  });
});
