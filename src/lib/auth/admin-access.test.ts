import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/require-user", () => ({ getOptionalUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/db/queries/roles", () => ({ listAppRoles: vi.fn(async () => []) }));
vi.mock("@/lib/db/queries/stewardship", () => ({ recordStewardshipEvent: vi.fn(async () => {}) }));
vi.mock("server-only", () => ({}));

import { getAdminAccess, requireAdminAccess } from "@/lib/auth/admin-access";
import { getOptionalUser } from "@/lib/auth/require-user";
import { listAppRoles } from "@/lib/db/queries/roles";
import { recordStewardshipEvent } from "@/lib/db/queries/stewardship";

const USER = { id: "00000000-0000-4000-8000-000000000001" };

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.ADMIN_ANALYTICS_ENABLED;
});

describe("requireAdminAccess (deny by default)", () => {
  it("404s unauthenticated visitors", async () => {
    vi.mocked(getOptionalUser).mockResolvedValue(null);
    await expect(requireAdminAccess("analytics")).rejects.toThrow();
  });

  it("404s ordinary authenticated users and audits the attempt", async () => {
    vi.mocked(getOptionalUser).mockResolvedValue(USER as never);
    vi.mocked(listAppRoles).mockResolvedValue([]);
    await expect(requireAdminAccess("analytics")).rejects.toThrow();
    expect(recordStewardshipEvent).toHaveBeenCalledWith(expect.anything(), USER.id, {
      event_type: "admin_access_denied",
    });
  });

  it("grants analytics but NOT operations/export to product_analytics", async () => {
    vi.mocked(getOptionalUser).mockResolvedValue(USER as never);
    vi.mocked(listAppRoles).mockResolvedValue(["product_analytics"]);
    const access = await requireAdminAccess("analytics");
    expect(access.can("analytics")).toBe(true);
    expect(access.can("operations")).toBe(false);
    expect(access.can("export")).toBe(false);
    await expect(requireAdminAccess("operations")).rejects.toThrow();
    await expect(requireAdminAccess("export")).rejects.toThrow();
  });

  it("grants everything to admin", async () => {
    vi.mocked(getOptionalUser).mockResolvedValue(USER as never);
    vi.mocked(listAppRoles).mockResolvedValue(["admin"]);
    const access = await requireAdminAccess("operations");
    expect(access.can("analytics")).toBe(true);
    expect(access.can("export")).toBe(true);
  });

  it("gives support_admin no analytics access", async () => {
    vi.mocked(getOptionalUser).mockResolvedValue(USER as never);
    vi.mocked(listAppRoles).mockResolvedValue(["support_admin"]);
    await expect(requireAdminAccess("analytics")).rejects.toThrow();
  });

  it("stays denied when the feature flag is on but the role is missing", async () => {
    process.env.ADMIN_ANALYTICS_ENABLED = "true";
    vi.mocked(getOptionalUser).mockResolvedValue(USER as never);
    vi.mocked(listAppRoles).mockResolvedValue([]);
    await expect(requireAdminAccess("analytics")).rejects.toThrow();
  });

  it("404s even admins when the feature flag disables analytics", async () => {
    process.env.ADMIN_ANALYTICS_ENABLED = "false";
    vi.mocked(getOptionalUser).mockResolvedValue(USER as never);
    vi.mocked(listAppRoles).mockResolvedValue(["admin"]);
    await expect(requireAdminAccess("analytics")).rejects.toThrow();
    delete process.env.ADMIN_ANALYTICS_ENABLED;
  });
});

describe("getAdminAccess", () => {
  it("returns null for users without any admin capability", async () => {
    vi.mocked(getOptionalUser).mockResolvedValue(USER as never);
    vi.mocked(listAppRoles).mockResolvedValue(["support"]);
    expect(await getAdminAccess()).toBeNull();
  });

  it("returns roles and capabilities for a founder", async () => {
    vi.mocked(getOptionalUser).mockResolvedValue(USER as never);
    vi.mocked(listAppRoles).mockResolvedValue(["founder"]);
    const access = await getAdminAccess();
    expect(access?.can("analytics")).toBe(true);
    expect(access?.can("operations")).toBe(true);
  });
});
