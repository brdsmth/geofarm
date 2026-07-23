/**
 * P-17 over the chosen store (RFC-0013 §2): the same watermark and walk
 * properties, demonstrated against PostgreSQL.
 *
 * Gated on GEOFARM_PG_URL — CI provides a service container; locally,
 * tools/with-pg.sh runs a scratch cluster. Skipped (not silently passed)
 * when no database is available.
 */
import { describe, expect, test } from "bun:test";
import { newId, type CandidateRecord, type Geometry } from "../world/index.ts";
import { Journal } from "./index.ts";
import { PostgresStore } from "./store-postgres.ts";

const url = process.env.GEOFARM_PG_URL;

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

describe.skipIf(url === undefined)("P-17 — watermarks over PostgreSQL", () => {
  test("admission, walk, linkage, and monotonicity on the chosen store", async () => {
    const store = await PostgresStore.open(url as string);
    try {
      const journal = new Journal(store);
      const base = await journal.head(); // shared cluster: start from wherever it is

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
        occurrence: { start: "1990-01-01T00:00:00Z" },
        geometry: square,
        subjects: [],
      };
      await journal.admit(farmer);
      await journal.admit(field);

      // Ten concurrent admissions: dense, strictly increasing sequence.
      const notes = await Promise.all(
        Array.from({ length: 10 }, () =>
          journal.admit({
            id: newId(),
            kind: "event",
            classification: "note",
            actors: { actor: farmer.id, onBehalfOf: [] },
            occurrence: { start: "2026-07-10T09:00:00Z" },
            subjects: [field.id],
          }),
        ),
      );
      const seqs = notes.map((r) => r.seq).sort((a, b) => a - b);
      for (let i = 1; i < seqs.length; i++) {
        expect(seqs[i]).toBe((seqs[i - 1] as number) + 1);
      }

      // The walk from the pre-test watermark is the exact delta, in order.
      let watermark = base;
      const seen: number[] = [];
      for (;;) {
        const page = await journal.walkFrom(watermark, 5);
        if (page.records.length === 0) break;
        seen.push(...page.records.map((r) => r.seq));
        watermark = page.watermark;
      }
      expect(seen.length).toBe(12);
      expect(seen).toEqual([...seen].sort((a, b) => a - b));

      // Linkage round-trips through jsonb indexes.
      const first = notes[0] as (typeof notes)[number];
      const corrected = await journal.admit({
        id: newId(),
        kind: "event",
        classification: "note",
        actors: { actor: farmer.id, onBehalfOf: [] },
        occurrence: { start: "2026-07-10T09:05:00Z" },
        subjects: [field.id],
        supersedes: first.id,
      });
      const chain = await journal.supersessionChain(first.id);
      expect(chain.map((r) => r.id)).toEqual([first.id, corrected.id]);
    } finally {
      await store.close();
    }
  });
});
