/**
 * Shared M2 test fixture: the MVP cast in miniature (RFC-0016 §1).
 * An organization; an owner representing it; an agronomist under a
 * predicate grant (C2); agronomic and financial content over two fields.
 */
import { newId, type CandidateRecord, type Geometry, type Id } from "../world/index.ts";
import { Journal } from "../journal/index.ts";
import { MemoryStore } from "../journal/store-memory.ts";
import { AccessEngine, GRANT_CLASSIFICATION, type GrantBody } from "../access/index.ts";

export const westGeom: Geometry = {
  form: "area",
  rings: [
    [
      [-93.2, 41.5],
      [-93.15, 41.5],
      [-93.15, 41.55],
      [-93.2, 41.55],
      [-93.2, 41.5],
    ],
  ],
};

export const eastGeom: Geometry = {
  form: "area",
  rings: [
    [
      [-93.1, 41.5],
      [-93.05, 41.5],
      [-93.05, 41.55],
      [-93.1, 41.55],
      [-93.1, 41.5],
    ],
  ],
};

/** A region covering both fields — the whole-farm window. */
export const farmRegion: Extract<Geometry, { form: "area" }> = {
  form: "area",
  rings: [
    [
      [-93.25, 41.45],
      [-93.0, 41.45],
      [-93.0, 41.6],
      [-93.25, 41.6],
      [-93.25, 41.45],
    ],
  ],
};

export const LATER = "2100-01-01T00:00:00Z";

export function actorIntro(id: Id, classification = "person"): CandidateRecord {
  return {
    id,
    kind: "actor",
    classification,
    actors: { actor: id, onBehalfOf: [] },
    occurrence: { start: "2026-01-01T00:00:00Z" },
    subjects: [],
  };
}

export function grantRecord(grantor: Id, body: GrantBody): CandidateRecord {
  return {
    id: newId(),
    kind: "event",
    classification: GRANT_CLASSIFICATION,
    actors: { actor: grantor, onBehalfOf: [] },
    occurrence: { start: "2026-06-01T00:00:00Z" },
    subjects: [body.grantee],
    body,
  };
}

export async function farmWorld(opts: { clockFrom?: string } = {}) {
  // Deterministic knowledge clock: one second per admission from the
  // given start, so knowledge-time projections are cleanly testable (C4).
  let tick = 0;
  const from = Date.parse(opts.clockFrom ?? "2026-06-01T00:00:00Z");
  const journal = new Journal(
    new MemoryStore(),
    () => new Date(from + ++tick * 1000).toISOString(),
  );
  const engine = new AccessEngine(journal);

  const org = newId();
  const owner = newId();
  const agronomist = newId();
  await journal.admit(actorIntro(org, "organization"));
  await journal.admit(actorIntro(owner));
  await journal.admit(actorIntro(agronomist));

  // Membership: the owner represents the org over everything (RFC-0002 §1.4).
  await journal.admit(
    grantRecord(org, { grantee: owner, scope: {}, capabilities: ["represent"] }),
  );

  const west = await journal.admit({
    id: newId(),
    kind: "entity",
    classification: "field",
    actors: { actor: owner, onBehalfOf: [org] },
    occurrence: { start: "1990-01-01T00:00:00Z" },
    geometry: westGeom,
    subjects: [],
  });
  const east = await journal.admit({
    id: newId(),
    kind: "entity",
    classification: "field",
    actors: { actor: owner, onBehalfOf: [org] },
    occurrence: { start: "1990-01-01T00:00:00Z" },
    geometry: eastGeom,
    subjects: [],
  });

  // Agronomic history on the west field.
  const scoutingNote = await journal.admit({
    id: newId(),
    kind: "event",
    classification: "note",
    actors: { actor: owner, onBehalfOf: [org] },
    occurrence: { start: "2026-06-20T09:00:00Z" },
    subjects: [west.id],
    body: { text: "yellowing along the drainage line" },
  });
  const diagnosis = await journal.admit({
    id: newId(),
    kind: "assertion",
    classification: "diagnosis",
    actors: { actor: owner, onBehalfOf: [org] },
    occurrence: { start: "2026-06-21T09:00:00Z" },
    subjects: [west.id],
    evidence: [scoutingNote.id],
    confidence: 0.7,
    body: { finding: "nitrogen deficiency" },
  });

  // Financial history on the same field — outside the agronomist's world.
  const lien = await journal.admit({
    id: newId(),
    kind: "event",
    classification: "lien",
    actors: { actor: owner, onBehalfOf: [org] },
    occurrence: { start: "2026-03-01T00:00:00Z" },
    subjects: [west.id],
    body: { holder: "First Ag Bank" },
  });

  // C2: the agronomist's predicate grant — agronomy over the whole farm.
  await journal.admit(
    grantRecord(org, {
      grantee: agronomist,
      scope: { classifications: ["field", "note", "diagnosis", "spray"] },
      capabilities: ["view", "author"],
    }),
  );

  return { journal, engine, org, owner, agronomist, west, east, scoutingNote, diagnosis, lien };
}
