import { describe, expect, it, vi } from "vitest";

import {
  archiveEnrollment,
  createEnrollment,
  listActiveEnrollments,
  pauseEnrollment,
  resumeEnrollment,
} from "./enrollments";
import { upsertPostpartumProfile } from "../postpartum/profile";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Minimal chainable Supabase mock. Records filter calls so tests can assert
 * that every query is scoped to the server-derived user id.
 */
interface MockOptions {
  single?: { data: unknown; error: unknown };
  maybeSingle?: { data: unknown; error: unknown };
  list?: { data: unknown[]; error: unknown };
}

function createMockClient(options: MockOptions = {}) {
  const calls: { method: string; args: unknown[] }[] = [];
  const result = {
    data: options.list?.data ?? null,
    error: options.list?.error ?? null,
  };
  const builder: Record<string, unknown> = {};
  const chain = (method: string) =>
    vi.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    });
  builder.from = chain("from");
  builder.select = chain("select");
  builder.insert = chain("insert");
  builder.update = chain("update");
  builder.upsert = chain("upsert");
  builder.delete = chain("delete");
  builder.eq = chain("eq");
  builder.order = chain("order");
  builder.limit = chain("limit");
  builder.single = vi.fn(async () => {
    calls.push({ method: "single", args: [] });
    return options.single ?? { data: null, error: null };
  });
  builder.maybeSingle = vi.fn(async () => {
    calls.push({ method: "maybeSingle", args: [] });
    return options.maybeSingle ?? { data: null, error: null };
  });
  // Awaiting the builder resolves list-style queries.
  builder.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return { client: builder as unknown as SupabaseClient<Database>, calls };
}

const userId = "user-123";

describe("enrollment services", () => {
  it("scopes active-enrollment listing to the given user", async () => {
    const { client, calls } = createMockClient({ list: { data: [], error: null } });
    await listActiveEnrollments(client, userId);
    expect(calls).toContainEqual({ method: "eq", args: ["user_id", userId] });
    expect(calls).toContainEqual({ method: "eq", args: ["status", "active"] });
  });

  it("inserts enrollments with the server-derived user id", async () => {
    const row = { id: "e-1", user_id: userId, pathway_key: "strong", status: "active" };
    const { client, calls } = createMockClient({ single: { data: row, error: null } });
    const created = await createEnrollment(client, userId, { pathwayKey: "strong" });
    expect(created).toEqual(row);
    const insert = calls.find((c) => c.method === "insert");
    expect(insert?.args[0]).toMatchObject({ user_id: userId, pathway_key: "strong" });
  });

  it("supports multiple simultaneous pathways (distinct keys both insert)", async () => {
    for (const pathwayKey of ["phoenix", "nourish"] as const) {
      const row = { id: `e-${pathwayKey}`, user_id: userId, pathway_key: pathwayKey };
      const { client } = createMockClient({ single: { data: row, error: null } });
      await expect(createEnrollment(client, userId, { pathwayKey })).resolves.toMatchObject({
        pathway_key: pathwayKey,
      });
    }
  });

  it("returns a calm error when a duplicate active enrollment is rejected", async () => {
    const { client } = createMockClient({
      single: { data: null, error: { code: "23505" } },
    });
    await expect(createEnrollment(client, userId, { pathwayKey: "strong" })).rejects.toThrow(
      "already enrolled",
    );
  });

  it("scopes pause updates to both enrollment id and user id", async () => {
    const { client, calls } = createMockClient({ list: { data: [], error: null } });
    await pauseEnrollment(client, userId, "enrollment-9");
    expect(calls).toContainEqual({ method: "eq", args: ["id", "enrollment-9"] });
    expect(calls).toContainEqual({ method: "eq", args: ["user_id", userId] });
  });

  it("archives without deleting — status update only, scoped to the user", async () => {
    const { client, calls } = createMockClient({ list: { data: [], error: null } });
    await archiveEnrollment(client, userId, "enrollment-9");
    expect(calls.find((c) => c.method === "delete")).toBeUndefined();
    const update = calls.find((c) => c.method === "update");
    expect(update?.args[0]).toMatchObject({ status: "archived" });
    expect(calls).toContainEqual({ method: "eq", args: ["user_id", userId] });
  });

  it("supports temporary Reset activation: enroll, pause, resume — original data untouched", async () => {
    const resetRow = { id: "e-reset", user_id: userId, pathway_key: "reset", status: "active" };
    const { client } = createMockClient({ single: { data: resetRow, error: null } });
    await expect(createEnrollment(client, userId, { pathwayKey: "reset" })).resolves.toMatchObject({
      pathway_key: "reset",
    });

    const { client: pauseClient, calls } = createMockClient({ list: { data: [], error: null } });
    await pauseEnrollment(pauseClient, userId, "e-reset");
    await resumeEnrollment(pauseClient, userId, "e-reset");
    // Reset lifecycle is pure status flips — never a delete of any program data.
    expect(calls.filter((c) => c.method === "update")).toHaveLength(2);
    expect(calls.find((c) => c.method === "delete")).toBeUndefined();
  });
});

describe("Restore isolation at the service layer", () => {
  it("refuses postpartum profile writes without an active Restore enrollment", async () => {
    // The enrollment lookup returns nothing — the user is not in Restore.
    const { client, calls } = createMockClient({ maybeSingle: { data: null, error: null } });
    await expect(
      upsertPostpartumProfile(client, userId, {
        enrollmentId: "11111111-2222-4333-8444-555555555555",
        postpartumStage: "6_to_12_weeks",
        feedingStatus: "prefer_not_to_say",
        medicalClearanceStatus: "unknown",
        pelvicFloorSymptoms: false,
        suspectedDiastasis: false,
        diastasisAssessedByProfessional: false,
        abdominalDomingOrConing: false,
        chronicPain: false,
        ironDeficiencyOrAnemia: false,
        fatigueConcern: false,
      }),
    ).rejects.toThrow("Restore is not active");
    // The guard queried for the user's own active restore enrollment...
    expect(calls).toContainEqual({ method: "eq", args: ["pathway_key", "restore"] });
    expect(calls).toContainEqual({ method: "eq", args: ["user_id", userId] });
    // ...and never attempted the write.
    expect(calls.find((c) => c.method === "upsert")).toBeUndefined();
  });
});
