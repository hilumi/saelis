import { describe, expect, it, vi } from "vitest";

import { createAuthController } from "./controller";
import type { AuthClientLike, SupabaseSessionLike } from "./controller";
import type { AuthState } from "./state";

const session: SupabaseSessionLike = { user: { id: "user-1", email: "sophie@example.com" } };

interface FakeClientOptions {
  restoredSession?: SupabaseSessionLike | null;
  getSessionError?: { message: string } | null;
  signOutRejects?: boolean;
}

/** Structural fake — no supabase-js internals involved. */
function makeFakeClient(options: FakeClientOptions = {}) {
  let listener: ((event: string, session: SupabaseSessionLike | null) => void) | null = null;
  const subscribeCalls: number[] = [];
  const unsubscribe = vi.fn();
  const signOut = vi.fn(async () => {
    if (options.signOutRejects) throw new Error("network down");
    return { error: null };
  });

  const client: AuthClientLike = {
    auth: {
      async getSession() {
        return {
          data: { session: options.restoredSession ?? null },
          error: options.getSessionError ?? null,
        };
      },
      onAuthStateChange(callback) {
        listener = callback;
        subscribeCalls.push(1);
        return { data: { subscription: { unsubscribe } } };
      },
      signOut,
    },
  };

  return {
    client,
    emit: (event: string, s: SupabaseSessionLike | null) => listener?.(event, s),
    subscribeCount: () => subscribeCalls.length,
    unsubscribe,
    signOut,
  };
}

function track() {
  const states: AuthState[] = [];
  return { states, onChange: (state: AuthState) => states.push(state) };
}

describe("createAuthController — session restoration", () => {
  it("restores a persisted session into signedIn", async () => {
    const fake = makeFakeClient({ restoredSession: session });
    const { states, onChange } = track();
    const controller = createAuthController(() => fake.client, onChange);

    await controller.start();

    expect(controller.getState().status).toBe("signedIn");
    expect(controller.getState().session).toEqual({
      userId: "user-1",
      email: "sophie@example.com",
    });
    expect(states.at(-1)?.status).toBe("signedIn");
  });

  it("restores to signedOut when nothing is persisted", async () => {
    const fake = makeFakeClient({ restoredSession: null });
    const controller = createAuthController(() => fake.client, track().onChange);

    await controller.start();

    expect(controller.getState().status).toBe("signedOut");
  });

  it("treats a broken persisted session as signedOut, not a crash", async () => {
    const fake = makeFakeClient({ getSessionError: { message: "corrupt" } });
    const controller = createAuthController(() => fake.client, track().onChange);

    await controller.start();

    expect(controller.getState().status).toBe("signedOut");
    expect(controller.getState().session).toBeNull();
  });

  it("reports missing configuration instead of throwing", async () => {
    const controller = createAuthController(() => {
      throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL.");
    }, track().onChange);

    await controller.start();

    expect(controller.getState().status).toBe("signedOut");
    expect(controller.getState().configError).toMatch(/EXPO_PUBLIC_SUPABASE_URL/);
  });
});

describe("createAuthController — auth-state transitions", () => {
  it("subscribes exactly once, even if started twice", async () => {
    const fake = makeFakeClient();
    const controller = createAuthController(() => fake.client, track().onChange);

    await controller.start();
    await controller.start();

    expect(fake.subscribeCount()).toBe(1);
  });

  it("signs in when the client reports a new session", async () => {
    const fake = makeFakeClient({ restoredSession: null });
    const controller = createAuthController(() => fake.client, track().onChange);
    await controller.start();

    fake.emit("SIGNED_IN", session);

    expect(controller.getState().status).toBe("signedIn");
  });

  it("keeps the session across token refreshes", async () => {
    const fake = makeFakeClient({ restoredSession: session });
    const controller = createAuthController(() => fake.client, track().onChange);
    await controller.start();

    fake.emit("TOKEN_REFRESHED", session);

    expect(controller.getState().status).toBe("signedIn");
  });

  it("drops to signedOut on a server-driven SIGNED_OUT (expired session)", async () => {
    const fake = makeFakeClient({ restoredSession: session });
    const controller = createAuthController(() => fake.client, track().onChange);
    await controller.start();

    fake.emit("SIGNED_OUT", null);

    expect(controller.getState().status).toBe("signedOut");
    expect(controller.getState().session).toBeNull();
  });

  it("stop() unsubscribes the listener", async () => {
    const fake = makeFakeClient();
    const controller = createAuthController(() => fake.client, track().onChange);
    await controller.start();

    controller.stop();

    expect(fake.unsubscribe).toHaveBeenCalledTimes(1);
  });
});

describe("createAuthController — sign-out", () => {
  it("clears local state and calls the client", async () => {
    const fake = makeFakeClient({ restoredSession: session });
    const controller = createAuthController(() => fake.client, track().onChange);
    await controller.start();

    await controller.signOut();

    expect(controller.getState().status).toBe("signedOut");
    expect(fake.signOut).toHaveBeenCalledTimes(1);
  });

  it("still signs out locally when the network call fails", async () => {
    const fake = makeFakeClient({ restoredSession: session, signOutRejects: true });
    const controller = createAuthController(() => fake.client, track().onChange);
    await controller.start();

    await controller.signOut();

    expect(controller.getState().status).toBe("signedOut");
    expect(controller.getState().session).toBeNull();
  });
});
