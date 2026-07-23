/**
 * P-25 tests: answerable marks, lens streams, two-axis invalidation,
 * and true-frame temporal re-projection (RFC-0015 §1–3, §6–7).
 */
import { describe, expect, test } from "bun:test";
import { newId, type AdmittedRecord } from "../../world/index.ts";
import { ReadingStore, defaultView, withLens, withTime, type View } from "../stores/index.ts";
import { MarkCache, deriveMarks, pickAt, standingAsOf } from "./index.ts";

const westRings: [number, number][][] = [
  [
    [-93.2, 41.5],
    [-93.15, 41.5],
    [-93.15, 41.55],
    [-93.2, 41.55],
    [-93.2, 41.5],
  ],
];
const widerRings: [number, number][][] = [
  [
    [-93.2, 41.5],
    [-93.1, 41.5],
    [-93.1, 41.55],
    [-93.2, 41.55],
    [-93.2, 41.5],
  ],
];

function seed(): { reading: ReadingStore; field: AdmittedRecord; corrected: AdmittedRecord; note: AdmittedRecord } {
  const reading = new ReadingStore();
  const field: AdmittedRecord = {
    id: newId(),
    kind: "entity",
    classification: "field",
    actors: { actor: "owner", onBehalfOf: [] },
    occurrence: { start: "1990-01-01T00:00:00Z" },
    geometry: { form: "area", rings: westRings },
    subjects: [],
    seq: 1,
    knowledgeTime: "2026-06-01T00:00:00Z",
  };
  // A boundary correction taking effect mid-2026 (W2): same kind, supersedes.
  const corrected: AdmittedRecord = {
    ...field,
    id: newId(),
    occurrence: { start: "2026-06-15T00:00:00Z" },
    geometry: { form: "area", rings: widerRings },
    supersedes: field.id,
    seq: 2,
    knowledgeTime: "2026-06-16T00:00:00Z",
  };
  const note: AdmittedRecord = {
    id: newId(),
    kind: "event",
    classification: "note",
    actors: { actor: "owner", onBehalfOf: [] },
    occurrence: { start: "2026-06-20T09:00:00Z" },
    subjects: [field.id],
    seq: 3,
    knowledgeTime: "2026-06-20T09:00:00Z",
  };
  reading.ingest({ records: [field, corrected, note], watermark: 3 });
  return { reading, field, corrected, note };
}

function boundaryAndNotes(v: View): View {
  return withLens(withLens(v, { name: "boundaries", filter: { classifications: ["field"] }, visible: true }), {
    name: "notes",
    filter: { classifications: ["note"] },
    visible: true,
  });
}

describe("P-25 — marks, streams, picking", () => {
  test("independent lens streams; every mark presents world content", () => {
    const { reading, corrected, note } = seed();
    const view = boundaryAndNotes(defaultView("2026-07-01T00:00:00Z"));
    const marks = deriveMarks(reading, view);
    // One boundary mark (the standing revision) + one note mark.
    expect(marks.map((m) => m.lens).sort()).toEqual(["boundaries", "notes"]);
    expect(marks.every((m) => m.presents.length > 0)).toBe(true);
    expect(marks.find((m) => m.lens === "boundaries")?.presents).toEqual([corrected.id]);
    expect(marks.find((m) => m.lens === "notes")?.presents).toEqual([note.id]);
  });

  test("picking resolves through the Reading to records (RFC-0015 §1)", () => {
    const { reading, corrected } = seed();
    const view = boundaryAndNotes(defaultView("2026-07-01T00:00:00Z"));
    const marks = deriveMarks(reading, view);
    const hits = pickAt(marks, reading, [-93.17, 41.52]);
    expect(hits.some((r) => r.id === corrected.id)).toBe(true);
    // Picking empty space answers emptily, not wrongly.
    expect(pickAt(marks, reading, [0, 0])).toEqual([]);
  });

  test("every frame is a true frame: scrubbing re-projects (H3, W2)", () => {
    const { reading, field, corrected } = seed();
    const base = boundaryAndNotes(defaultView("2026-07-01T00:00:00Z"));
    // 2000: the original boundary; the correction had not yet occurred.
    const then = deriveMarks(reading, withTime(base, { start: "2000-06-01T00:00:00Z" }));
    expect(then.find((m) => m.lens === "boundaries")?.presents).toEqual([field.id]);
    expect(then.find((m) => m.lens === "notes")).toBeUndefined(); // not yet written
    // After mid-2026: the corrected boundary stands; the note exists.
    const now = deriveMarks(reading, base);
    expect(now.find((m) => m.lens === "boundaries")?.presents).toEqual([corrected.id]);
    // The slider moves every lens together: one binding, all streams.
    expect(standingAsOf(reading.all(), { start: "2000-06-01T00:00:00Z" }).length).toBe(1);
  });

  test("two-axis invalidation: attention and knowledge, nothing else", () => {
    const { reading } = seed();
    const cache = new MarkCache();
    const view = boundaryAndNotes(defaultView("2026-07-01T00:00:00Z"));
    const first = cache.derive(reading, view);
    expect(first.recomputed).toBe(true);
    // No change on either axis: cached, same marks.
    const again = cache.derive(reading, view);
    expect(again.recomputed).toBe(false);
    expect(again.marks).toBe(first.marks);
    // Attention changed: recompute.
    const scrubbed = cache.derive(reading, withTime(view, { start: "2000-06-01T00:00:00Z" }));
    expect(scrubbed.recomputed).toBe(true);
    // Knowledge changed: recompute.
    cache.derive(reading, view);
    reading.ingest({
      records: [
        {
          id: newId(),
          kind: "event",
          classification: "note",
          actors: { actor: "owner", onBehalfOf: [] },
          occurrence: { start: "2026-06-21T09:00:00Z" },
          subjects: [],
          geometry: { form: "position", coordinates: [-93.18, 41.51] },
          seq: 4,
          knowledgeTime: "2026-06-21T09:00:00Z",
        },
      ],
      watermark: 4,
    });
    const advanced = cache.derive(reading, view);
    expect(advanced.recomputed).toBe(true);
    expect(advanced.marks.filter((m) => m.lens === "notes").length).toBe(2);
  });
});
