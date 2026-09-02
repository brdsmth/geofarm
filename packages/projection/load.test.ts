/**
 * P-22 — projection load rehearsal (PLAN-001 risk 1; RFC-0016 M2 gate).
 *
 * Sizes projection economics before any UI exists: seeds a season-shaped
 * journal (fields + thousands of notes) and measures scoped projection
 * cost. Bounds are deliberately generous — this is a measurement with a
 * tripwire, not a benchmark; the numbers are printed for the record.
 * Watermark-keyed caching (RFC-0015 §6) is the sanctioned remedy if these
 * ever trip.
 */
import { describe, expect, test } from "bun:test";
import { newId, type Id } from "../world/index.ts";
import { Journal } from "../journal/index.ts";
import { MemoryStore } from "../journal/store-memory.ts";
import { AccessEngine, GRANT_CLASSIFICATION } from "../access/index.ts";
import { Projection } from "./index.ts";
import { farmRegion, LATER } from "./fixtures.ts";

const FIELDS = 50;
const NOTES = 10_000;

describe("P-22 — load rehearsal", () => {
  test(`scoped projection over ${NOTES} notes across ${FIELDS} fields`, async () => {
    const journal = new Journal(new MemoryStore());
    const engine = new AccessEngine(journal);
    const org = newId();
    const agronomist = newId();
    await journal.admit({
      id: org,
      kind: "actor",
      classification: "organization",
      actors: { actor: org, onBehalfOf: [] },
      occurrence: { start: "2026-01-01T00:00:00Z" },
      subjects: [],
    });
    await journal.admit({
      id: agronomist,
      kind: "actor",
      classification: "person",
      actors: { actor: agronomist, onBehalfOf: [] },
      occurrence: { start: "2026-01-01T00:00:00Z" },
      subjects: [],
    });

    const seedStart = performance.now();
    const fieldIds: Id[] = [];
    for (let f = 0; f < FIELDS; f++) {
      const lon = -93.5 + (f % 10) * 0.05;
      const lat = 41.3 + Math.floor(f / 10) * 0.05;
      const field = await journal.admit({
        id: newId(),
        kind: "entity",
        classification: "field",
        actors: { actor: org, onBehalfOf: [] },
        occurrence: { start: "1990-01-01T00:00:00Z" },
        geometry: {
          form: "area",
          rings: [
            [
              [lon, lat],
              [lon + 0.04, lat],
              [lon + 0.04, lat + 0.04],
              [lon, lat + 0.04],
              [lon, lat],
            ],
          ],
        },
        subjects: [],
      });
      fieldIds.push(field.id);
    }
    for (let n = 0; n < NOTES; n++) {
      await journal.admit({
        id: newId(),
        kind: "event",
        classification: n % 5 === 0 ? "financial" : "note",
        actors: { actor: org, onBehalfOf: [] },
        occurrence: { start: new Date(Date.parse("2026-04-01T00:00:00Z") + n * 60_000).toISOString() },
        subjects: [fieldIds[n % FIELDS] as Id],
      });
    }
    const seedMs = performance.now() - seedStart;

    await journal.admit({
      id: newId(),
      kind: "event",
      classification: GRANT_CLASSIFICATION,
      actors: { actor: org, onBehalfOf: [] },
      occurrence: { start: "2026-06-01T00:00:00Z" },
      subjects: [agronomist],
      body: {
        grantee: agronomist,
        scope: { classifications: ["field", "note"] },
        capabilities: ["view"],
      },
    });

    const swStart = performance.now();
    const sw = await engine.subWorldAt(agronomist, LATER);
    const swMs = performance.now() - swStart;

    const p = new Projection(journal, sw);
    const loadStart = performance.now();
    const visible = await p.visibleWithin(farmRegion); // includes materialization
    const firstReadMs = performance.now() - loadStart;

    const repeatStart = performance.now();
    await p.countWithin(farmRegion);
    await p.timelineOf(fieldIds[0] as Id);
    const repeatMs = performance.now() - repeatStart;

    console.log(
      `[P-22] seed(${FIELDS + NOTES} records)=${seedMs.toFixed(0)}ms ` +
        `subWorld=${swMs.toFixed(0)}ms firstRead=${firstReadMs.toFixed(0)}ms ` +
        `repeatReads=${repeatMs.toFixed(0)}ms visibleInWindow=${visible.length}`,
    );

    // Sanity, not victory: the window sees content, the financial fifth
    // stays out of it everywhere, and the totals are exact.
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.some((r) => r.classification === "financial")).toBe(false);
    const all = await p.listKnown();
    // Granted content plus two: their own introduction record, reached by
    // original authority over their contributions (RFC-0002 §4.4), and the
    // grant that bounds them — the horizon is theirs to know (§2.3).
    expect(all.viewable.length).toBe(FIELDS + NOTES - NOTES / 5 + 2);

    // Generous tripwires (PLAN-001 risk 1 escalates if these fail).
    expect(swMs).toBeLessThan(2000);
    expect(firstReadMs).toBeLessThan(5000);
    expect(repeatMs).toBeLessThan(1000);
  }, 60_000);
});
