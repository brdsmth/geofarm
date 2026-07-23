/**
 * P-24 tests: three stores, four laws (RFC-0014).
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { newId, type AdmittedRecord } from "../../world/index.ts";
import {
  FilePersistence,
  PendingStore,
  ReadingStore,
  ViewTrail,
  defaultView,
  withRegion,
  withSelection,
  withTime,
} from "./index.ts";

function rec(seq: number, overrides: Partial<AdmittedRecord> = {}): AdmittedRecord {
  return {
    id: newId(),
    kind: "event",
    classification: "note",
    actors: { actor: "a", onBehalfOf: [] },
    occurrence: { start: "2026-07-01T00:00:00Z" },
    subjects: [],
    seq,
    knowledgeTime: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

describe("P-24 — Reading: knowledge only grows", () => {
  test("monotonic ingest; rebuilding from the walk reproduces the store", () => {
    const a = new ReadingStore();
    const page1 = { records: [rec(1), rec(2)], watermark: 2 };
    const page2 = { records: [rec(3)], watermark: 3 };
    a.ingest(page1);
    a.ingest(page2);
    expect(a.watermark).toBe(3);
    // Disposable by construction: a fresh store fed the same pages is equal.
    const b = new ReadingStore();
    b.ingest(page1);
    b.ingest(page2);
    expect(b.all()).toEqual(a.all());
    // The watermark never moves backward.
    expect(() => a.ingest({ records: [], watermark: 1 })).toThrow(/knowledge only grows/);
  });

  test("place resolves through known subjects (client-side inheritance)", () => {
    const store = new ReadingStore();
    const field = rec(1, {
      kind: "entity",
      classification: "field",
      geometry: { form: "position", coordinates: [-93.1, 41.5] },
    });
    const note = rec(2, { subjects: [field.id] });
    store.ingest({ records: [field, note], watermark: 2 });
    expect(store.placeOf(note.id)).toEqual(field.geometry);
  });
});

describe("P-24 — View: one value, free undo", () => {
  test("selection, time, and region co-move as one value; undo is navigation", () => {
    const v0 = defaultView("2026-07-01T00:00:00Z");
    const trail = new ViewTrail(v0);
    const v1 = withSelection(
      withTime(v0, { start: "2025-06-01T00:00:00Z" }),
      [newId()],
    );
    trail.push(v1);
    expect(trail.current.selection.length).toBe(1);
    expect(trail.current.time.start).toBe("2025-06-01T00:00:00Z");
    // Stepping back restores attention wholesale — nothing to unwind.
    expect(trail.back()).toEqual(v0);
    // Values are values: v0 was never mutated by any of it.
    expect(v0.selection).toEqual([]);
  });

  test("views are cheap values, not managed artifacts", () => {
    const v = defaultView("2026-07-01T00:00:00Z");
    const moved = withRegion(v, { form: "area", rings: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] });
    expect(moved).not.toBe(v);
    expect(v.region).toBeUndefined();
  });
});

describe("P-24 — Pending: the only fragile store, durable by construction", () => {
  test("kill-and-restart: submissions survive process death (RFC-0014 §1)", () => {
    const path = join(mkdtempSync(join(tmpdir(), "geofarm-")), "pending.json");
    const first = new PendingStore(new FilePersistence(path));
    const draft = {
      id: newId(),
      kind: "event" as const,
      classification: "note",
      actors: { actor: "scout", onBehalfOf: [] },
      occurrence: { start: "2026-07-10T09:00:00Z" },
      subjects: [],
      body: { text: "written in a dead zone" },
    };
    first.addDraft(draft);
    first.commit(draft.id);
    expect(first.submissions.length).toBe(1);
    // The process dies; a new store opens the same file: nothing lost.
    const second = new PendingStore(new FilePersistence(path));
    expect(second.submissions.length).toBe(1);
    expect(second.submissions[0]?.body).toEqual({ text: "written in a dead zone" });
    // Admission retires it — durably.
    second.retire(draft.id);
    const third = new PendingStore(new FilePersistence(path));
    expect(third.submissions.length).toBe(0);
  });

  test("gestures evaporate; drafts abandon without touching anything", () => {
    const path = join(mkdtempSync(join(tmpdir(), "geofarm-")), "pending.json");
    const pending = new PendingStore(new FilePersistence(path));
    pending.addGesture({
      id: "g1",
      geometry: { form: "position", coordinates: [-93.1, 41.5] },
      at: "2026-07-10T09:00:00Z",
    });
    pending.clearGestures();
    expect(pending.gestures.length).toBe(0);
    const d = {
      id: newId(),
      kind: "entity" as const,
      classification: "zone",
      actors: { actor: "scout", onBehalfOf: [] },
      occurrence: { start: "2026-07-10T09:00:00Z" },
      subjects: [],
    };
    pending.addDraft(d);
    pending.abandonDraft(d.id);
    expect(pending.drafts.length).toBe(0);
  });
});
