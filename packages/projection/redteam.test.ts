/**
 * P-21 — the S6 red-team suite (RFC-0016 §4 S6; REVIEW-001 Risk 1).
 *
 * Attempts to leak content across a sub-world boundary through every
 * channel the reviews worried about: direct reads, existence disclosure,
 * silhouettes in aggregates, timelines of shared things, inherited
 * geometry, and escalation through re-granting. Run before any UI exists,
 * where losing the predicate-scoping bet is cheapest.
 */
import { describe, expect, test } from "bun:test";
import { newId } from "../world/index.ts";
import { Projection } from "./index.ts";
import { farmWorld, farmRegion, grantRecord, actorIntro, LATER } from "./fixtures.ts";

describe("P-21 — S6: the sub-world does not leak", () => {
  test("beyond the horizon, absence is indistinguishable from nonexistence", async () => {
    const { journal, engine, agronomist, lien } = await farmWorld();
    const p = new Projection(journal, await engine.subWorldAt(agronomist, LATER));
    // Not a stub, not an error — nothing (RFC-0012 §6).
    expect(await p.get(lien.id)).toBeUndefined();
    expect(await p.get(newId())).toBeUndefined(); // same answer as never-existed
  });

  test("aggregates cast no silhouette: computed within the sub-world (§2.3)", async () => {
    const { journal, engine, owner, agronomist } = await farmWorld();
    const ownerCount = await new Projection(
      journal,
      await engine.subWorldAt(owner, LATER),
    ).countWithin(farmRegion);
    const agronomistCount = await new Projection(
      journal,
      await engine.subWorldAt(agronomist, LATER),
    ).countWithin(farmRegion);
    // The owner sees 5 (two fields, note, diagnosis, lien); the agronomist
    // 4 — a count over their world, not a redacted count over the whole.
    expect(ownerCount).toBe(5);
    expect(agronomistCount).toBe(4);
  });

  test("timelines of shared things exclude out-of-scope history", async () => {
    const { journal, engine, agronomist, west, lien } = await farmWorld();
    const p = new Projection(journal, await engine.subWorldAt(agronomist, LATER));
    const timeline = await p.timelineOf(west.id);
    expect(timeline.some((r) => r.id === lien.id)).toBe(false);
    expect(timeline.some((r) => r.classification === "note")).toBe(true);
  });

  test("discover confers existence, never content or place (§3.1)", async () => {
    const { journal, engine, org, agronomist, lien } = await farmWorld();
    await journal.admit(
      grantRecord(org, {
        grantee: agronomist,
        scope: { classifications: ["lien"] },
        capabilities: ["discover"],
      }),
    );
    const p = new Projection(journal, await engine.subWorldAt(agronomist, LATER));
    const reading = await p.get(lien.id);
    expect(reading?.level).toBe("discover");
    if (reading?.level === "discover") {
      expect(Object.keys(reading.stub)).toEqual(["id"]); // existence, nothing else
    }
    // Existence within the scope, not location within a region: the lien
    // stays out of every spatial answer.
    const visible = await p.visibleWithin(farmRegion);
    expect(visible.some((r) => r.id === lien.id)).toBe(false);
  });

  test("re-granting cannot escalate: chains only narrow (I4)", async () => {
    const { journal, engine, agronomist, lien, west } = await farmWorld();
    const accomplice = newId();
    await journal.admit(actorIntro(accomplice));
    // The agronomist grants their accomplice "everything".
    await journal.admit(
      grantRecord(agronomist, { grantee: accomplice, scope: {}, capabilities: ["view"] }),
    );
    const p = new Projection(journal, await engine.subWorldAt(accomplice, LATER));
    // The accomplice reaches at most the agronomist's world: agronomy yes
    // (attenuated flow-through), the lien never.
    expect(await p.get(lien.id)).toBeUndefined();
    expect((await p.get(west.id))?.level).toBe("view");
  });

  test("inherited geometry cannot smuggle place across the boundary", async () => {
    const { journal, engine, org, owner } = await farmWorld();
    // A confidential trial plot, and a note about it — the reader is
    // granted the note's classification but not the plot.
    const plot = await journal.admit({
      id: newId(),
      kind: "entity",
      classification: "trial-plot",
      actors: { actor: owner, onBehalfOf: [org] },
      occurrence: { start: "2026-05-01T00:00:00Z" },
      geometry: { form: "position", coordinates: [-93.18, 41.52] },
      subjects: [],
    });
    const trialNote = await journal.admit({
      id: newId(),
      kind: "event",
      classification: "trial-note",
      actors: { actor: owner, onBehalfOf: [org] },
      occurrence: { start: "2026-07-01T00:00:00Z" },
      subjects: [plot.id],
      body: { text: "variety B ahead" },
    });
    const reader = newId();
    await journal.admit(actorIntro(reader));
    await journal.admit(
      grantRecord(org, {
        grantee: reader,
        scope: { classifications: ["trial-note"] },
        capabilities: ["view"],
      }),
    );
    const p = new Projection(journal, await engine.subWorldAt(reader, LATER));
    // The note is readable; the plot is not; and the note lends the reader
    // no location — out-of-scope subjects lend no place (S6).
    expect((await p.get(trialNote.id))?.level).toBe("view");
    expect(await p.get(plot.id)).toBeUndefined();
    const visible = await p.visibleWithin(farmRegion);
    expect(visible.some((r) => r.id === trialNote.id)).toBe(false);
  });

  test("the audit reading is scoped like every reading (T2 under S6)", async () => {
    const { journal, engine, agronomist, lien } = await farmWorld();
    // Even projected to the far future, the agronomist's world never
    // contained the lien — historical readings honor historical scope.
    const sw = await engine.subWorldAt(agronomist, LATER);
    const p = new Projection(journal, sw);
    expect(await p.get(lien.id)).toBeUndefined();
    const known = await p.listKnown();
    expect(known.viewable.includes(lien.id)).toBe(false);
    expect(known.discoverable.includes(lien.id)).toBe(false);
  });
});
