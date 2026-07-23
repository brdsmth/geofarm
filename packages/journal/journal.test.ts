/**
 * P-15..P-17 tests over the memory store double.
 *
 * P-15: admission + immutability (RFC-0011 §2, RFC-0004 §5, RFC-0012 §6).
 * P-16: supersession & retraction linkage (RFC-0004 §5, RFC-0008 §1).
 * P-17: the walk — exact deltas, monotonic watermarks, knowledge-order
 *       backfill (RFC-0012 §3–4). The same suite runs against PostgreSQL
 *       (the chosen store) in journal-pg.test.ts.
 */
import { describe, expect, test } from "bun:test";
import { newId, type CandidateRecord, type Geometry, type Id } from "../world/index.ts";
import { AdmissionRejected, Journal, type JournalStore } from "./index.ts";
import { MemoryStore } from "./store-memory.ts";

const square: Geometry = {
  form: "area",
  rings: [
    [
      [-93.1, 41.5],
      [-93.0, 41.5],
      [-93.0, 41.6],
      [-93.1, 41.6],
      [-93.1, 41.5],
    ],
  ],
};

function makeCandidates() {
  const farmer: CandidateRecord = {
    id: newId(),
    kind: "actor",
    classification: "person",
    actors: { actor: "self", onBehalfOf: [] },
    occurrence: { start: "2026-01-01T00:00:00Z" },
    subjects: [],
  };
  const field: CandidateRecord = {
    id: newId(),
    kind: "entity",
    classification: "field",
    actors: { actor: farmer.id, onBehalfOf: [] },
    occurrence: { start: "1990-01-01T00:00:00Z" }, // the fifty-year-old field, backdated
    geometry: square,
    subjects: [],
  };
  return { farmer, field };
}

function note(actor: Id, subject: Id, extra?: Partial<CandidateRecord>): CandidateRecord {
  return {
    id: newId(),
    kind: "event",
    classification: "note",
    actors: { actor, onBehalfOf: [] },
    occurrence: { start: "2026-07-10T09:00:00Z" },
    subjects: [subject],
    ...extra,
  };
}

async function seeded(): Promise<{ journal: Journal; store: JournalStore; farmer: Id; field: Id }> {
  const store = new MemoryStore();
  const journal = new Journal(store);
  const { farmer, field } = makeCandidates();
  await journal.admit(farmer);
  await journal.admit(field);
  return { journal, store, farmer: farmer.id, field: field.id };
}

describe("P-15 — admission and immutability", () => {
  test("well-formed content is admitted with sequence and knowledge time", async () => {
    const { journal, farmer, field } = await seeded();
    const admitted = await journal.admit(note(farmer, field));
    expect(admitted.seq).toBe(3);
    expect(Date.parse(admitted.knowledgeTime)).toBeGreaterThan(0);
    // Bitemporality: occurrence is the author's claim, knowledge the admission's fact.
    expect(admitted.occurrence.start).toBe("2026-07-10T09:00:00Z");
  });

  test("duplicate ids are rejected, never merged (RFC-0011 §6)", async () => {
    const { journal, farmer, field } = await seeded();
    const n = note(farmer, field);
    await journal.admit(n);
    await expect(journal.admit(n)).rejects.toThrow(AdmissionRejected);
  });

  test("unknown subjects are rejected: introduce-then-join (RFC-0011 §3)", async () => {
    const { journal, farmer } = await seeded();
    await expect(journal.admit(note(farmer, newId()))).rejects.toThrow(/unknown subject/);
  });

  test("entities require geometry; agency may be placeless (RFC-0000 §2.1 Am.1)", async () => {
    const { journal, farmer } = await seeded();
    const bare: CandidateRecord = {
      id: newId(),
      kind: "entity",
      classification: "pond",
      actors: { actor: farmer, onBehalfOf: [] },
      occurrence: { start: "2026-01-01T00:00:00Z" },
      subjects: [],
    };
    await expect(journal.admit(bare)).rejects.toThrow(/entity requires geometry/);
  });

  test("placeless events must be about agency (RFC-0004 §7)", async () => {
    const { journal, farmer, field } = await seeded();
    // About an actor: fine (an organizational rename, a credential change).
    const aboutAgency = note(farmer, farmer, { geometry: undefined as never });
    delete (aboutAgency as Record<string, unknown>).geometry;
    await expect(journal.admit(aboutAgency)).resolves.toBeDefined();
    // A placed subject inherits place: a note about the field, no own geometry.
    await expect(journal.admit(note(farmer, field))).resolves.toBeDefined();
    // No subjects, no geometry: nowhere to be.
    const nowhere: CandidateRecord = {
      id: newId(),
      kind: "event",
      classification: "note",
      actors: { actor: farmer, onBehalfOf: [] },
      occurrence: { start: "2026-07-10T09:00:00Z" },
      subjects: [],
    };
    await expect(journal.admit(nowhere)).rejects.toThrow(/placeless record has no subjects/);
  });

  test("the store port carries no update or delete (module rule 1)", () => {
    const store = new MemoryStore();
    const surface = Object.getOwnPropertyNames(Object.getPrototypeOf(store));
    for (const name of surface) {
      expect(name).not.toMatch(/update|delete|remove|mutate|truncate/i);
    }
  });
});

describe("P-16 — supersession and retraction linkage", () => {
  test("correction is addition: chains are queryable, both revisions preserved", async () => {
    const { journal, farmer, field } = await seeded();
    const original = await journal.admit(note(farmer, field));
    const corrected = await journal.admit(
      note(farmer, field, { supersedes: original.id, body: { text: "corrected" } }),
    );
    // Original untouched and readable at its own position (RFC-0004 §5).
    const stillThere = await journal.get(original.id);
    expect(stillThere?.seq).toBe(original.seq);
    // Chain from either end reaches both, oldest first.
    const fromOld = await journal.supersessionChain(original.id);
    const fromNew = await journal.supersessionChain(corrected.id);
    expect(fromOld.map((r) => r.id)).toEqual([original.id, corrected.id]);
    expect(fromNew.map((r) => r.id)).toEqual([original.id, corrected.id]);
  });

  test("supersession must match kind (RFC-0004 §5)", async () => {
    const { journal, farmer, field } = await seeded();
    const event = await journal.admit(note(farmer, field));
    const wrongKind: CandidateRecord = {
      id: newId(),
      kind: "assertion",
      classification: "diagnosis",
      actors: { actor: farmer, onBehalfOf: [] },
      occurrence: { start: "2026-07-11T00:00:00Z" },
      subjects: [field],
      grounds: [{ source: "guide" }],
      supersedes: event.id,
    };
    await expect(journal.admit(wrongKind)).rejects.toThrow(/must match/);
  });

  test("retraction is an Event, target preserved and linked (RFC-0008 §1)", async () => {
    const { journal, farmer, field } = await seeded();
    const mistaken = await journal.admit(note(farmer, field));
    const retraction = await journal.admit(
      note(farmer, field, { classification: "retraction", retracts: mistaken.id }),
    );
    expect((await journal.retractionOf(mistaken.id))?.id).toBe(retraction.id);
    expect(await journal.get(mistaken.id)).toBeDefined(); // no death (L2)
  });
});

describe("P-17 — the walk and its watermarks", () => {
  test("watermarks are dense, monotonic, and store-agreed", async () => {
    const { journal, farmer, field } = await seeded();
    for (let i = 0; i < 5; i++) await journal.admit(note(farmer, field));
    expect(await journal.head()).toBe(7); // 2 seed + 5
  });

  test("the walk delivers exact deltas and advances the watermark", async () => {
    const { journal, farmer, field } = await seeded();
    const first = await journal.walkFrom(0);
    expect(first.records.length).toBe(2);
    expect(first.watermark).toBe(2);
    const a = await journal.admit(note(farmer, field));
    const b = await journal.admit(note(farmer, field));
    const delta = await journal.walkFrom(first.watermark);
    expect(delta.records.map((r) => r.id)).toEqual([a.id, b.id]);
    expect(delta.watermark).toBe(4);
    // Nothing new: watermark holds, no phantom records.
    const empty = await journal.walkFrom(delta.watermark);
    expect(empty.records).toEqual([]);
    expect(empty.watermark).toBe(delta.watermark);
  });

  test("pagination composes into the same exact delta", async () => {
    const { journal, farmer, field } = await seeded();
    const admitted: Id[] = [];
    for (let i = 0; i < 7; i++) admitted.push((await journal.admit(note(farmer, field))).id);
    let watermark = 2;
    const seen: Id[] = [];
    for (;;) {
      const page = await journal.walkFrom(watermark, 3);
      if (page.records.length === 0) break;
      seen.push(...page.records.map((r) => r.id));
      watermark = page.watermark;
    }
    expect(seen).toEqual(admitted);
  });

  test("backfill arrives in knowledge order, not occurrence order (RFC-0012 §4)", async () => {
    const { journal, farmer, field } = await seeded();
    const recent = await journal.admit(note(farmer, field)); // occurrence 2026
    const deepPast = await journal.admit(
      note(farmer, field, { occurrence: { start: "2019-06-01T00:00:00Z" } }),
    );
    const walk = await journal.walkFrom(2);
    // The 2019 record appears after the 2026 one: the walk follows knowledge.
    expect(walk.records.map((r) => r.id)).toEqual([recent.id, deepPast.id]);
    expect(walk.records[1]?.occurrence.start).toBe("2019-06-01T00:00:00Z");
  });

  test("concurrent admissions serialize through the single admission point", async () => {
    const { journal, farmer, field } = await seeded();
    const results = await Promise.all(
      Array.from({ length: 10 }, () => journal.admit(note(farmer, field))),
    );
    const seqs = results.map((r) => r.seq).sort((x, y) => x - y);
    expect(seqs).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]); // dense, no gaps, no ties
  });
});
