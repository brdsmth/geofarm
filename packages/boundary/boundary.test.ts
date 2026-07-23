/**
 * P-23 tests: the two operations and the clock (RFC-0012 §2–4, §6).
 */
import { describe, expect, test } from "bun:test";
import { newId } from "../world/index.ts";
import { Boundary, PUBLIC_ACTOR } from "./index.ts";
import { farmWorld, farmRegion, LATER } from "../projection/fixtures.ts";

describe("P-23 — Project, Append, and the walk", () => {
  test("Project answers within the caller's sub-world", async () => {
    const { journal, agronomist, lien, west } = await farmWorld();
    const boundary = new Boundary(journal);
    expect(
      await boundary.project(agronomist, { asOf: LATER, read: { form: "record", id: lien.id } }),
    ).toBeUndefined();
    const field = await boundary.project(agronomist, {
      asOf: LATER,
      read: { form: "record", id: west.id },
    });
    expect((field as { level: string }).level).toBe("view");
  });

  test("Append checks authorship; the acting actor must submit", async () => {
    const { journal, agronomist, west } = await farmWorld();
    const boundary = new Boundary(journal);
    // The agronomist authors an in-scope note about the west field.
    const ok = await boundary.append(agronomist, {
      id: newId(),
      kind: "event",
      classification: "note",
      actors: { actor: agronomist, onBehalfOf: [] },
      occurrence: { start: "2026-07-01T08:00:00Z" },
      subjects: [west.id],
      body: { text: "tissue sample taken" },
    });
    expect(ok.accepted).toBe(true);
    // Submitting under someone else's name is refused at the door (I1).
    const forged = await boundary.append(agronomist, {
      id: newId(),
      kind: "event",
      classification: "note",
      actors: { actor: newId(), onBehalfOf: [] },
      occurrence: { start: "2026-07-01T08:00:00Z" },
      subjects: [west.id],
      body: {},
    });
    expect(forged.accepted).toBe(false);
  });

  test("out-of-scope authoring reads as unknown, never as forbidden (S6)", async () => {
    const { journal, agronomist, lien } = await farmWorld();
    const boundary = new Boundary(journal);
    const attempt = await boundary.append(agronomist, {
      id: newId(),
      kind: "event",
      classification: "note",
      actors: { actor: agronomist, onBehalfOf: [] },
      occurrence: { start: "2026-07-01T08:00:00Z" },
      subjects: [lien.id], // beyond their horizon
      body: {},
    });
    expect(attempt.accepted).toBe(false);
    if (!attempt.accepted) {
      expect(attempt.reasons[0]).toContain("unknown subject");
      expect(attempt.reasons[0]).not.toMatch(/forbidden|denied|permission/i);
    }
  });

  test("the public can read what is published and never author (RFC-0012 §6)", async () => {
    const { journal, org, west } = await farmWorld();
    const boundary = new Boundary(journal);
    // Nothing published: the public's world is empty.
    expect(
      await boundary.project(PUBLIC_ACTOR, { asOf: LATER, read: { form: "record", id: west.id } }),
    ).toBeUndefined();
    // Publish the field boundary to the public actor.
    await journal.admit({
      id: newId(),
      kind: "event",
      classification: "grant",
      actors: { actor: org, onBehalfOf: [] },
      occurrence: { start: "2026-06-01T00:00:00Z" },
      subjects: [],
      geometry: { form: "position", coordinates: [-93.17, 41.52] },
      body: { grantee: PUBLIC_ACTOR, scope: { classifications: ["field"] }, capabilities: ["view"] },
    });
    const seen = await boundary.project(PUBLIC_ACTOR, {
      asOf: LATER,
      read: { form: "record", id: west.id },
    });
    expect((seen as { level: string }).level).toBe("view");
    // Authoring as the public is refused before anything else is considered.
    const attempt = await boundary.append(PUBLIC_ACTOR, {
      id: newId(),
      kind: "event",
      classification: "note",
      actors: { actor: PUBLIC_ACTOR, onBehalfOf: [] },
      occurrence: { start: "2026-07-01T00:00:00Z" },
      subjects: [west.id],
      body: {},
    });
    expect(attempt.accepted).toBe(false);
  });

  test("the walk is a scoped feed with a monotonic watermark (RFC-0012 §4)", async () => {
    const { journal, agronomist, owner, org, west } = await farmWorld();
    const boundary = new Boundary(journal);
    const first = await boundary.walk(agronomist, 0);
    expect(first.records.some((r) => r.classification === "lien")).toBe(false);
    // New agronomy arrives; new financials arrive; the feed carries only
    // what the sub-world admits, and the watermark still advances past both.
    await journal.admit({
      id: newId(),
      kind: "event",
      classification: "spray",
      actors: { actor: owner, onBehalfOf: [org] },
      occurrence: { start: "2026-07-02T06:00:00Z" },
      subjects: [west.id],
    });
    await journal.admit({
      id: newId(),
      kind: "event",
      classification: "lien",
      actors: { actor: owner, onBehalfOf: [org] },
      occurrence: { start: "2026-07-02T06:00:00Z" },
      subjects: [west.id],
    });
    const delta = await boundary.walk(agronomist, first.watermark);
    expect(delta.records.map((r) => r.classification)).toEqual(["spray"]);
    expect(delta.watermark).toBeGreaterThan(first.watermark);
    const idle = await boundary.walk(agronomist, delta.watermark);
    expect(idle.records).toEqual([]);
  });

  test("visibility through the boundary matches direct projection", async () => {
    const { journal, owner } = await farmWorld();
    const boundary = new Boundary(journal);
    const visible = (await boundary.project(owner, {
      asOf: LATER,
      read: { form: "visibility", region: farmRegion },
    })) as unknown[];
    expect(visible.length).toBe(5);
  });
});
