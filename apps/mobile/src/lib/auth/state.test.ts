import { describe, expect, it } from "vitest";

import { authReducer, initialAuthState } from "./state";
import type { SessionInfo } from "./state";

const session: SessionInfo = { userId: "user-1", email: "sophie@example.com" };

describe("authReducer", () => {
  it("starts loading with no session", () => {
    expect(initialAuthState.status).toBe("loading");
    expect(initialAuthState.session).toBeNull();
  });

  it("restoring with a session signs the user in", () => {
    const state = authReducer(initialAuthState, { type: "restored", session });
    expect(state.status).toBe("signedIn");
    expect(state.session).toEqual(session);
  });

  it("restoring without a session signs the user out (never stuck loading)", () => {
    const state = authReducer(initialAuthState, { type: "restored", session: null });
    expect(state.status).toBe("signedOut");
    expect(state.session).toBeNull();
  });

  it("a session change while signed out signs the user in", () => {
    const signedOut = authReducer(initialAuthState, { type: "restored", session: null });
    const state = authReducer(signedOut, { type: "sessionChanged", session });
    expect(state.status).toBe("signedIn");
  });

  it("a null session change signs the user out", () => {
    const signedIn = authReducer(initialAuthState, { type: "restored", session });
    const state = authReducer(signedIn, { type: "sessionChanged", session: null });
    expect(state.status).toBe("signedOut");
    expect(state.session).toBeNull();
  });

  it("signedOut clears the session (expired or explicit)", () => {
    const signedIn = authReducer(initialAuthState, { type: "restored", session });
    const state = authReducer(signedIn, { type: "signedOut" });
    expect(state.status).toBe("signedOut");
    expect(state.session).toBeNull();
  });

  it("configError resolves to signedOut with a message", () => {
    const state = authReducer(initialAuthState, { type: "configError", message: "Missing env." });
    expect(state.status).toBe("signedOut");
    expect(state.configError).toBe("Missing env.");
  });
});
