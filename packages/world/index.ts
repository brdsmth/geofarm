/**
 * @geofarm/world — the vocabulary as types.
 *
 * RFC-0001: the four primitives (Entity, Event, Assertion, Actor) as record
 * kinds; classifications carry domain meaning, kinds carry structure.
 * RFC-0003 §3: geometry forms by dimension (position, path, area, volume)
 * plus composition (collection). RFC-0004 §1–2: dual time — occurrence
 * (with temporal extent) is the author's claim; knowledge time is assigned
 * at admission. RFC-0009 §3: references are inward (by identity) or outward
 * (grounds). RFC-0013 §1: the uniform record envelope.
 *
 * Pure definitions and invariant checks. No storage, no I/O (PLAN-001 §1).
 */

export const PACKAGE = "@geofarm/world" as const;

// ---------------------------------------------------------------- identity

/** A stable identity (RFC-0004 §6): cheap, opaque, never re-used. */
export type Id = string;

export function newId(): Id {
  return crypto.randomUUID();
}

// ------------------------------------------------------------------- kinds

/** The four primitives, as record kinds (RFC-0001 §3). */
export const KINDS = ["entity", "event", "assertion", "actor"] as const;
export type Kind = (typeof KINDS)[number];

// ---------------------------------------------------------------- geometry

/** A [longitude, latitude] pair in the one shared frame (RFC-0003 §2). */
export type Coordinate = [number, number];

/** Geometry forms by intrinsic dimension, plus composition (RFC-0003 §3). */
export type Position = { form: "position"; coordinates: Coordinate };
export type Path = { form: "path"; coordinates: Coordinate[] };
export type Area = { form: "area"; rings: Coordinate[][] };
export type Volume = {
  form: "volume";
  base: Coordinate[][];
  /** [lower, upper] vertical extent in meters relative to ground. */
  verticalRange: [number, number];
};
export type Collection = { form: "collection"; members: Geometry[] };
export type Geometry = Position | Path | Area | Volume | Collection;

// -------------------------------------------------------------------- time

/**
 * Occurrence time (RFC-0004 §1): when it happened or was true in the world.
 * An instant omits `end`; an interval includes it (RFC-0004 §2).
 * ISO 8601 strings throughout.
 */
export type TemporalExtent = { start: string; end?: string };

// ------------------------------------------------------------------ agency

/**
 * Dual attribution (RFC-0002 §1.4, RFC-0001 §3.4 Amendment 1): the acting
 * Actor plus the chain acted-for, outermost principal last. The chain is
 * never collapsed (invariant I7).
 */
export type ActorChain = { actor: Id; onBehalfOf: Id[] };

// -------------------------------------------------------------- references

/**
 * An outward reference (RFC-0009 §3): a citation of knowledge the world
 * does not hold. Permitted only as evidence within assertions.
 */
export type Ground = { source: string; citation?: string };

/** A pointer to content-addressed payload storage (RFC-0013 §2). */
export type PayloadRef = { contentAddress: string; mediaType: string };

// ---------------------------------------------------------------- envelope

/**
 * The uniform record envelope (RFC-0013 §1), before admission: no knowledge
 * time, no sequence — those are the admission's facts, not the author's
 * (RFC-0012 §1 submissions).
 */
export type CandidateRecord = {
  id: Id;
  kind: Kind;
  /** Domain classification: "field", "spray", "note", "grant", ... */
  classification: string;
  actors: ActorChain;
  occurrence: TemporalExtent;
  geometry?: Geometry;
  /** Inward references: what this record is about or upon (RFC-0003 §7). */
  subjects: Id[];
  /** Assertions only: inward evidence references (RFC-0009 §5). */
  evidence?: Id[];
  /** Assertions only: outward citations (RFC-0009 §3–4). */
  grounds?: Ground[];
  /** Assertions only: the author's stated degree of belief, 0..1. */
  confidence?: number;
  /** Supersession linkage (RFC-0004 §5): correction is addition. */
  supersedes?: Id;
  /** Retraction linkage (RFC-0008 §1): disavowal is addition. */
  retracts?: Id;
  payload?: PayloadRef;
  /** Classification-specific content. */
  body?: unknown;
};

/** A record after admission (RFC-0013 §1): sequenced and knowledge-timed. */
export type AdmittedRecord = CandidateRecord & {
  /** Position in the one admission sequence — the watermark's unit. */
  seq: number;
  /** When the model came to hold it (RFC-0004 §1). */
  knowledgeTime: string;
};

// -------------------------------------------------------------- validation

function isFiniteCoordinate(c: unknown): c is Coordinate {
  return (
    Array.isArray(c) &&
    c.length === 2 &&
    typeof c[0] === "number" &&
    typeof c[1] === "number" &&
    Number.isFinite(c[0]) &&
    Number.isFinite(c[1]) &&
    c[0] >= -180 &&
    c[0] <= 180 &&
    c[1] >= -90 &&
    c[1] <= 90
  );
}

function ringIsClosed(ring: Coordinate[]): boolean {
  const first = ring[0];
  const last = ring[ring.length - 1];
  return (
    first !== undefined &&
    last !== undefined &&
    first[0] === last[0] &&
    first[1] === last[1]
  );
}

function validateRings(rings: Coordinate[][], problems: string[]): void {
  if (rings.length === 0) problems.push("area/volume requires at least one ring");
  for (const ring of rings) {
    if (ring.length < 4) problems.push("ring requires at least 4 coordinates");
    else if (!ringIsClosed(ring)) problems.push("ring must be closed (first = last)");
    for (const c of ring) {
      if (!isFiniteCoordinate(c)) problems.push("ring has invalid coordinate");
    }
  }
}

/** Validate a geometry's form (RFC-0003 §3). Returns problems, empty if valid. */
export function validateGeometry(g: Geometry): string[] {
  const problems: string[] = [];
  switch (g.form) {
    case "position":
      if (!isFiniteCoordinate(g.coordinates)) problems.push("position has invalid coordinate");
      break;
    case "path":
      if (g.coordinates.length < 2) problems.push("path requires at least 2 coordinates");
      for (const c of g.coordinates) {
        if (!isFiniteCoordinate(c)) problems.push("path has invalid coordinate");
      }
      break;
    case "area":
      validateRings(g.rings, problems);
      break;
    case "volume":
      validateRings(g.base, problems);
      if (g.verticalRange[0] > g.verticalRange[1]) {
        problems.push("volume verticalRange lower bound exceeds upper");
      }
      break;
    case "collection":
      if (g.members.length === 0) problems.push("collection requires at least one member");
      for (const m of g.members) problems.push(...validateGeometry(m));
      break;
  }
  return problems;
}

function isValidIso(s: string): boolean {
  return !Number.isNaN(Date.parse(s));
}

/**
 * Store-independent validity of a candidate record — the conceptual half of
 * the admission contract (RFC-0011 §2). Checks that need the store (referent
 * existence, inherited placement, acyclicity) belong to the journal.
 */
export function validateCandidate(c: CandidateRecord): string[] {
  const problems: string[] = [];

  if (c.id.length === 0) problems.push("record requires an id");
  if (!KINDS.includes(c.kind)) problems.push(`unknown kind: ${String(c.kind)}`);
  if (c.classification.length === 0) problems.push("record requires a classification");

  // I1 — every act has an Actor (RFC-0002 §6).
  if (c.actors.actor.length === 0) problems.push("record requires an acting actor");

  // Occurrence time — the author's claim, backdatable, well-formed (RFC-0004 §1).
  if (!isValidIso(c.occurrence.start)) problems.push("occurrence.start is not a valid time");
  if (c.occurrence.end !== undefined) {
    if (!isValidIso(c.occurrence.end)) problems.push("occurrence.end is not a valid time");
    else if (Date.parse(c.occurrence.end) < Date.parse(c.occurrence.start)) {
      problems.push("occurrence.end precedes occurrence.start");
    }
  }

  if (c.geometry !== undefined) problems.push(...validateGeometry(c.geometry));

  // Assertion-only fields (RFC-0001 §3.3).
  if (c.kind !== "assertion") {
    if (c.confidence !== undefined) problems.push("confidence is assertion-only");
    if (c.evidence !== undefined) problems.push("evidence is assertion-only");
    if (c.grounds !== undefined) problems.push("grounds are assertion-only");
  } else {
    if (c.confidence !== undefined && (c.confidence < 0 || c.confidence > 1)) {
      problems.push("confidence must be within 0..1");
    }
    // Well-formedness (RFC-0009 §5): every claim peels back to observations
    // (inward evidence) or grounds (outward). "I just know" is malformed.
    const hasEvidence = (c.evidence?.length ?? 0) > 0;
    const hasGrounds = (c.grounds?.length ?? 0) > 0;
    if (!hasEvidence && !hasGrounds) {
      problems.push("assertion requires evidence or grounds (RFC-0009 §5)");
    }
    for (const g of c.grounds ?? []) {
      if (g.source.length === 0) problems.push("ground requires a source");
    }
  }

  if (c.supersedes !== undefined && c.retracts !== undefined) {
    problems.push("a record may supersede or retract, not both");
  }

  return problems;
}
