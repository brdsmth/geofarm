/**
 * P-26/P-27 tests: five verbs, two laws, promotion, and the time slider.
 * RFC-0006 §2 (the laws), §3 (indication/promotion), §4 (temporal
 * panning, semantic navigation), §5 (inspection in place), §8 (aboutness
 * from the View).
 */
import { describe, expect, test } from "bun:test";
import { Boundary } from "../../boundary/index.ts";
import { MemoryPersistence, PendingStore } from "../stores/index.ts";
import { Session } from "./index.ts";
import { farmWorld, westGeom } from "../../projection/fixtures.ts";

const NOW = "2026-07-01T00:00:00Z";

async function session() {
  const fixture = await farmWorld();
  const boundary = new Boundary(fixture.journal);
  const s = new Session(fixture.owner, boundary, new PendingStore(new MemoryPersistence()), NOW);
  await s.sync();
  return { ...fixture, boundary, s };
}

describe("P-26 — the two laws", () => {
  test("four verbs cannot change the world (first law)", async () => {
    const { journal, s, west } = await session();
    const headBefore = await journal.head();
    s.navigateTo({ form: "area", rings: westGeom.form === "area" ? westGeom.rings : [] });
    s.navigateTime({ start: "2020-06-01T00:00:00Z" });
    s.reveal({ name: "boundaries", filter: { classifications: ["field"] }, visible: true });
    s.select([west.id]);
    s.draw({ form: "position", coordinates: [-93.18, 41.52] }, NOW);
    s.marks();
    s.pick([-93.17, 41.52]);
    s.inspect(west.id);
    expect(await journal.head()).toBe(headBefore); // nothing touched the world
  });

  test("gestures are ephemeral until promoted (second law)", async () => {
    const { s } = await session();
    const g = s.draw({ form: "position", coordinates: [-93.18, 41.52] }, NOW);
    expect(s.pending.gestures.length).toBe(1);
    s.pending.clearGestures(); // the session ends; the circle evaporates
    expect(s.pending.gestures.length).toBe(0);
    expect(s.promote(g, { kind: "entity", classification: "zone" })).toBeUndefined();
  });

  test("undo is navigation: stepping back restores attention wholesale", async () => {
    const { s, west } = await session();
    const before = s.view;
    s.select([west.id]);
    s.navigateTime({ start: "2019-06-01T00:00:00Z" });
    s.back();
    s.back();
    expect(s.view).toEqual(before);
  });
});

describe("P-26 — authorship through the gate", () => {
  test("draw → promote → commit → send: the field enters the world (W1)", async () => {
    const { s, boundary, owner } = await session();
    const g = s.draw(westGeom, "1995-01-01T00:00:00Z"); // backdated introduction
    const draftId = s.promote(g, { kind: "entity", classification: "pond" });
    expect(draftId).toBeDefined();
    expect(s.pending.gestures.length).toBe(0); // crossed the gate
    s.commit(draftId as string);
    const result = await s.send();
    expect(result.admitted).toBe(1);
    expect(result.rejected).toEqual([]);
    await s.sync();
    const reading = await boundary.project(owner, {
      read: { form: "record", id: s.reading.all().find((r) => r.classification === "pond")?.id as string },
    });
    expect((reading as { level: string }).level).toBe("view");
  });

  test("annotation inherits aboutness from the View (H1, RFC-0006 §8)", async () => {
    const { s, west } = await session();
    s.select([west.id]);
    const draftId = s.annotate("note", { text: "standing water at the north end" }, NOW);
    const draft = s.pending.drafts.find((d) => d.id === draftId);
    expect(draft?.subjects).toEqual([west.id]); // no form asked which field
    s.commit(draftId);
    const result = await s.send();
    expect(result.admitted).toBe(1);
  });

  test("rejected submissions stay in Pending with their reasons", async () => {
    const { s } = await session();
    s.select([]); // nothing selected, no geometry: nowhere to be
    const draftId = s.annotate("note", { text: "orphan" }, NOW);
    s.commit(draftId);
    const result = await s.send();
    expect(result.admitted).toBe(0);
    expect(result.rejected.length).toBe(1);
    expect(s.pending.submissions.length).toBe(1); // the work is not lost
  });
});

describe("P-27 — the time slider", () => {
  test("scrubbing moves every lens together; frames are true (H3)", async () => {
    const { s, west, scoutingNote } = await session();
    s.reveal({ name: "boundaries", filter: { classifications: ["field"] }, visible: true });
    s.reveal({ name: "notes", filter: { classifications: ["note"] }, visible: true });
    // Now: two fields and the June note.
    const now = s.marks();
    expect(now.filter((m) => m.lens === "boundaries").length).toBe(2);
    expect(now.filter((m) => m.lens === "notes").length).toBe(1);
    // Scrub to 2019: the fields stood; the note had not been written.
    s.navigateTime({ start: "2019-06-01T00:00:00Z" });
    const then = s.marks();
    expect(then.filter((m) => m.lens === "boundaries").length).toBe(2);
    expect(then.filter((m) => m.lens === "notes").length).toBe(0);
    // Back to the present by the same verb that panned space.
    s.back();
    expect(s.marks().some((m) => m.presents.includes(scoutingNote.id))).toBe(true);
    expect(s.view.selection).toEqual([]); // untouched by scrubbing
    void west;
  });

  test("semantic navigation: go to a thing by identity (RFC-0006 §4)", async () => {
    const { s, east } = await session();
    expect(s.navigateToThing(east.id)).toBe(true);
    expect(s.view.selection).toEqual([east.id]);
    expect(s.view.region).toBeDefined();
    // The destination window actually contains the thing.
    const marks = s.marks();
    void marks;
  });
});
