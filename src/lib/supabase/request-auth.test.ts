import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockCreateJsClient, mockBearerGetUser, mockCookieGetUser } = vi.hoisted(() => ({
  mockCreateJsClient: vi.fn(),
  mockBearerGetUser: vi.fn(),
  mockCookieGetUser: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateJsClient,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockCookieGetUser } })),
}));

import { resolveRequestAuth } from "@/lib/supabase/request-auth";

function requestWith(headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/api/companion/stream", {
    method: "POST",
    headers,
  });
}

describe("resolveRequestAuth", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    mockCreateJsClient.mockReturnValue({ auth: { getUser: mockBearerGetUser } });
    mockBearerGetUser.mockResolvedValue({ data: { user: null } });
    mockCookieGetUser.mockResolvedValue({ data: { user: null } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("verifies a bearer token server-side and returns the user", async () => {
    mockBearerGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });

    const { user } = await resolveRequestAuth(requestWith({ Authorization: "Bearer abc.def.ghi" }));

    expect(user).toEqual({ id: "user-1" });
    // Verified explicitly against the auth server with the presented token.
    expect(mockBearerGetUser).toHaveBeenCalledWith("abc.def.ghi");
    // The RLS client forwards the SAME user JWT — never a service key.
    const config = mockCreateJsClient.mock.calls[0]?.[2] as {
      global: { headers: Record<string, string> };
    };
    expect(config.global.headers.Authorization).toBe("Bearer abc.def.ghi");
    expect(mockCookieGetUser).not.toHaveBeenCalled();
  });

  it("rejects an invalid bearer token with user: null (routes answer 401)", async () => {
    mockBearerGetUser.mockResolvedValue({ data: { user: null } });

    const { user } = await resolveRequestAuth(requestWith({ Authorization: "Bearer expired" }));

    expect(user).toBeNull();
    expect(mockCookieGetUser).not.toHaveBeenCalled();
  });

  it("uses the cookie session when no bearer header is present (web unchanged)", async () => {
    mockCookieGetUser.mockResolvedValue({ data: { user: { id: "web-user" } } });

    const { user } = await resolveRequestAuth(requestWith());

    expect(user).toEqual({ id: "web-user" });
    expect(mockCreateJsClient).not.toHaveBeenCalled();
  });

  it("treats an empty bearer value as unauthenticated cookie flow", async () => {
    mockCookieGetUser.mockResolvedValue({ data: { user: null } });

    const { user } = await resolveRequestAuth(requestWith({ Authorization: "Bearer " }));

    expect(user).toBeNull();
    expect(mockCreateJsClient).not.toHaveBeenCalled();
  });
});
