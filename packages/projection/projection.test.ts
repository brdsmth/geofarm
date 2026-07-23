/**
 * P-20 tests: derived readings within a sub-world.
 * RFC-0004 §4 (standing state), §9 (timelines as derived filters),
 * RFC-0003 §6 (visibility), RFC-0008 §1 (retraction leaves ordinary
 * projections), RFC-0002 §3.1 (discover depth).
 */
import { describe, expect, test } from "bun:test";
import { newId } from "../world/index.ts";
import { Projection } from "./index.ts";
import { farmWorld, farmRegion, LATER } from "./fixtures.ts";

describe("P-20 — projection within a sub-world", () => {
  test("the owner's projection reads the whole farm", async () => {
    const { journal, engine, owner, west, lien } = await farmWorld();
    const p = new Projection(journal, await engine.subWorldAt(owner, LATER));
    expect((await p.get(west.id))?.level).toBe("view");
    expect((await p.get(lien.id))?.level).toBe("view");
    const visible = await p.visibleWithin(farmRegion);
    expect(visible.map((r) => r.classification).sort()).toEqual(
      ["diagnosis", "field", "field", "lien", "note"].sort(),
    );
  });

  test("timelines are occurrence-ordered derived filters (RFC-0004 §9)", async () => {
    const { journal, engine, owner, west, scoutingNote, diagnosis, lien } = await farmWorld();
    const p = new Projection(journal, await engine.subWorldAt(owner, LATER));
    const timeline = await p.timelineOf(west.id);
    // The March lien precedes the June note and diagnosis: occurrence
    // order, regardless of admission order.
    expect(timeline.map((r) => r.id)).toEqual([lien.id, scoutingNote.id, diagnosis.id]);
  });

  test("standing state follows the supersession chain (RFC-0004 §4)", async () => {
    const { journal, engine, owner, org, west, diagnosis } = await farmWorld();
    const revised = await journal.admit({
      id: newId(),
      kind: "assertion",
      classification: "diagnosis",
      actors: { actor: owner, onBehalfOf: [org] },
      occurrence: { start: "2026-06-25T09:00:00Z" },
      subjects: [west.id],
      evidence: [diagnosis.id],
      confidence: 0.9,
      supersedes: diagnosis.id,
      body: { finding: "sulfur deficiency" },
    });
    const p = new Projection(journal, await engine.subWorldAt(owner, LATER));
    expect((await p.standingOf(diagnosis.id))?.id).toBe(revised.id);
    // The superseded revision remains readable — history is preserved.
    expect((await p.get(diagnosis.id))?.level).toBe("view");
  });

  test("retracted content leaves ordinary projections, not the record (L2)", async () => {
    const { journal, engine, owner, org, west, scoutingNote } = await farmWorld();
    await journal.admit({
      id: newId(),
      kind: "event",
      classification: "retraction",
      actors: { actor: owner, onBehalfOf: [org] },
      occurrence: { start: "2026-06-22T09:00:00Z" },
      subjects: [west.id],
      retracts: scoutingNote.id,
    });
    const p = new Projection(journal, await engine.subWorldAt(owner, LATER));
    expect(await p.standingOf(scoutingNote.id)).toBeUndefined(); // disavowed
    expect((await p.get(scoutingNote.id))?.level).toBe("view"); // never removed
  });

  test("placeless records inherit place through their subjects (RFC-0004 §7)", async () => {
    const { journal, engine, owner, scoutingNote } = await farmWorld();
    const p = new Projection(journal, await engine.subWorldAt(owner, LATER));
    // The note has no geometry of its own; it appears in the farm window
    // through the west field it is about.
    const visible = await p.visibleWithin(farmRegion);
    expect(visible.some((r) => r.id === scoutingNote.id)).toBe(true);
  });
});
