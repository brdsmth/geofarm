/**
 * @geofarm/access — grants, capabilities, sub-worlds.
 *
 * RFC-0002: access is Actor × Scope × Capability; a Grant is an Event
 * (classification "grant"); access state is a projection of grant history
 * (C4/I5); authority only attenuates (C3/I4); representation is a
 * capability (§1.4/§3.1); ownership follows contribution (§4.4).
 *
 * This package owns the one privileged read path (PLAN-001 §2): it scans
 * the journal unscoped — over grant-kind records — to produce sub-worlds.
 * Nothing else may read unscoped; projections take the sub-world produced
 * here as a required input.
 */

import type { AdmittedRecord, Geometry, Id, Kind, TemporalExtent } from "../world/index.ts";
import { geometryWithinArea, temporalWithin } from "../world/spatial.ts";
import type { Journal } from "../journal/index.ts";

export const PACKAGE = "@geofarm/access" as const;

// ------------------------------------------------------------ capabilities

/** The frozen four (RFC-0002 §3.1). Granting is authorship, not a fifth. */
export const CAPABILITIES = ["discover", "view", "author", "represent"] as const;
export type Capability = (typeof CAPABILITIES)[number];

// ------------------------------------------------------------------ scope

/**
 * A Scope (RFC-0002 §2.1): a predicate over world content along its
 * intrinsic dimensions. Unspecified dimensions are unconstrained; specified
 * dimensions are conjunctive.
 */
export type Scope = {
  /** Content kinds (structure). */
  kinds?: Kind[];
  /** Domain classifications ("field", "note", "spray", ...). */
  classifications?: string[];
  /** Spatial restriction: content whose place lies within this region. */
  region?: Extract<Geometry, { form: "area" }>;
  /** Temporal restriction over occurrence time. */
  period?: TemporalExtent;
  /** Provenance: the acting authors whose contributions are in scope. */
  sources?: Id[];
  /** Ownership: whose content (outermost principal) is in scope. */
  owners?: Id[];
  /** Identity enumeration: these things, and content about them. */
  ids?: Id[];
  /** Assertions must state at least this confidence; records without a
   * confidence (observations, entities) are unaffected (RFC-0005 §5). */
  minConfidence?: number;
};

/** The owner of a record: the outermost principal of its actor chain —
 * content authored under representation lands principal-owned
 * (RFC-0002 §4.4, RFC-0011 §5). */
export function ownerOf(record: AdmittedRecord): Id {
  const chain = record.actors.onBehalfOf;
  return chain.length > 0 ? (chain[chain.length - 1] as Id) : record.actors.actor;
}

/**
 * Does a record satisfy a scope? `place` is the record's resolved geometry
 * (own, or inherited through in-scope subjects — resolution is the
 * caller's, since inheritance is itself sub-world-relative).
 */
export function matchesScope(
  record: AdmittedRecord,
  scope: Scope,
  place: Geometry | undefined,
): boolean {
  if (scope.kinds !== undefined && !scope.kinds.includes(record.kind)) return false;
  if (
    scope.classifications !== undefined &&
    !scope.classifications.includes(record.classification)
  ) {
    return false;
  }
  if (scope.sources !== undefined && !scope.sources.includes(record.actors.actor)) return false;
  if (scope.owners !== undefined && !scope.owners.includes(ownerOf(record))) return false;
  if (scope.ids !== undefined) {
    const hit = scope.ids.includes(record.id) || record.subjects.some((s) => scope.ids?.includes(s));
    if (!hit) return false;
  }
  if (scope.period !== undefined && !temporalWithin(record.occurrence, scope.period)) return false;
  if (scope.region !== undefined) {
    // No resolvable place → cannot be shown to lie within the region →
    // excluded. Conservative under-inclusion, never leakage (S6).
    if (place === undefined) return false;
    if (!geometryWithinArea(place, scope.region)) return false;
  }
  if (
    scope.minConfidence !== undefined &&
    record.kind === "assertion" &&
    (record.confidence ?? 0) < scope.minConfidence
  ) {
    return false;
  }
  return true;
}

// ---------------------------------------------------------------- holdings

/**
 * A holding: capabilities over the conjunction of scopes. Attenuation is
 * represented by scope-conjunction (a received grant stacks its scope onto
 * the grantor's own), so chains narrow monotonically (I4) without polygon
 * clipping.
 */
export type Holding = {
  scopes: Scope[];
  capabilities: Capability[];
};

/** An Actor's sub-world (RFC-0002 §2.3): the holdings their reach is
 * evaluated against. Produced only by the AccessEngine. */
export type SubWorld = {
  actor: Id;
  /** Knowledge time the grant projection was taken at (C4). */
  asOf: string;
  holdings: Holding[];
};

export function matchesAll(
  record: AdmittedRecord,
  scopes: Scope[],
  place: Geometry | undefined,
): boolean {
  return scopes.every((s) => matchesScope(record, s, place));
}

/** Capability lattice (RFC-0002 §3.1): view implies discover. */
export function holdingConfers(h: Holding, c: Capability): boolean {
  if (h.capabilities.includes(c)) return true;
  return c === "discover" && h.capabilities.includes("view");
}

// ------------------------------------------------------------------ grants

/** The body of a grant record (RFC-0002 §4.1). */
export type GrantBody = {
  grantee: Id;
  scope: Scope;
  capabilities: Capability[];
  /** Expiry fixed at issuance (§4.1): in force only until this time. */
  until?: string;
};

export const GRANT_CLASSIFICATION = "grant";

/** Read a record as a grant, if it is one (RFC-0002 §4.1). */
export function grantBodyOf(record: AdmittedRecord): GrantBody | undefined {
  if (record.kind !== "event" || record.classification !== GRANT_CLASSIFICATION) return undefined;
  const b = record.body as Partial<GrantBody> | undefined;
  if (b === undefined || typeof b.grantee !== "string" || b.scope === undefined) return undefined;
  if (!Array.isArray(b.capabilities)) return undefined;
  return b as GrantBody;
}

/**
 * The grant projection as a pure function (C4/I5): standing grants as of a
 * moment in knowledge time, over any set of records — admitted by then,
 * not superseded by then, not lapsed by their own terms (RFC-0008 §2).
 * The engine applies it to the whole log; a client may apply it to its
 * own Reading, which is how "who could see what in June" is answered
 * with no audit machinery anywhere (RFC-0002 T2, RFC-0016 S5).
 */
export function standingGrantsAt(records: readonly AdmittedRecord[], asOf: string): AdmittedRecord[] {
  const cutoff = Date.parse(asOf);
  const known = records.filter((r) => Date.parse(r.knowledgeTime) <= cutoff);
  const supersededIds = new Set(
    known.filter((r) => r.supersedes !== undefined).map((r) => r.supersedes as Id),
  );
  return known.filter((r) => {
    const body = grantBodyOf(r);
    if (body === undefined) return false;
    if (supersededIds.has(r.id)) return false;
    if (body.until !== undefined && Date.parse(body.until) < cutoff) return false;
    return true;
  });
}

/**
 * The holdings an Actor derives from a set of standing grants — original
 * authority over what they own (§4.4), received grants attenuated through
 * the grantor's own holdings (I4), representation flowing the principal's
 * reach through within scope (§1.4), and the horizon: an Actor may always
 * view the grants that bound them (§2.3 — "an Actor should know the bounds
 * of their own access"; RFC-0014 §2 — who I am here is knowledge).
 */
export function holdingsFrom(actor: Id, grants: readonly AdmittedRecord[]): Holding[] {
  return holdingsOf(actor, grants, new Set());
}

function holdingsOf(actor: Id, grants: readonly AdmittedRecord[], visiting: Set<Id>): Holding[] {
  if (visiting.has(actor)) return []; // cycle guard: attenuation converges
  visiting.add(actor);

  // Original authority: everything the Actor owns, all capabilities (§4.4).
  const holdings: Holding[] = [
    { scopes: [{ owners: [actor] }], capabilities: [...CAPABILITIES] },
  ];

  const horizon: Id[] = [];
  for (const record of grants) {
    const body = grantBodyOf(record) as GrantBody;
    if (body.grantee !== actor) continue;
    horizon.push(record.id);
    const grantor = record.actors.actor;
    const grantorHoldings = holdingsOf(grantor, grants, visiting);
    for (const gh of grantorHoldings) {
      // Attenuation (I4): a grantor confers only what they hold, and the
      // conferred scope is the conjunction of theirs and the grant's.
      const conferred = body.capabilities.includes("represent")
        ? gh.capabilities // representation: the principal's reach, in scope
        : body.capabilities.filter((c) => holdingConfers(gh, c));
      if (conferred.length === 0) continue;
      holdings.push({
        scopes: [...gh.scopes, body.scope],
        capabilities: conferred,
      });
    }
  }
  if (horizon.length > 0) {
    holdings.push({
      scopes: [{ classifications: [GRANT_CLASSIFICATION], ids: horizon }],
      capabilities: ["view"],
    });
  }

  visiting.delete(actor);
  return holdings;
}

// ------------------------------------------------------------------ engine

export class AccessEngine {
  private readonly journal: Journal;

  constructor(journal: Journal) {
    this.journal = journal;
  }

  /**
   * The privileged projection (PLAN-001 §2): standing grants as of a moment
   * in knowledge time — admitted by then, not superseded by then, not
   * lapsed by their own terms (RFC-0002 §4, RFC-0008 §2).
   */
  private async standingGrantsAt(asOf: string): Promise<AdmittedRecord[]> {
    const all: AdmittedRecord[] = [];
    let watermark = 0;
    for (;;) {
      const page = await this.journal.walkFrom(watermark);
      if (page.records.length === 0) break;
      all.push(...page.records);
      watermark = page.watermark;
    }
    return standingGrantsAt(all, asOf);
  }

  /**
   * An Actor's sub-world as of a moment (C4): original authority over their
   * own contributions (§4.4) plus received grants, each attenuated through
   * the grantor's own holdings (I4). Representation flows the principal's
   * reach through, within the granted scope (§1.4).
   */
  async subWorldAt(actor: Id, asOf: string = new Date().toISOString()): Promise<SubWorld> {
    const grants = await this.standingGrantsAt(asOf);
    return { actor, asOf, holdings: holdingsFrom(actor, grants) };
  }

  /**
   * May this Actor author this candidate (RFC-0002 §3.1: "appending Events
   * and Assertions whose subjects lie within the scope")? Subjects are
   * checked against the full scope. The candidate itself is checked against
   * the scope's content-shaped dimensions only (classification, region,
   * period, kind, ids): its owner and source come into being *at* admission
   * (RFC-0002 §4.4 — ownership follows contribution), so provenance
   * dimensions cannot bind a record that does not yet exist.
   */
  mayAuthor(
    subWorld: SubWorld,
    candidate: AdmittedRecord,
    place: Geometry | undefined,
    subjectRecords: AdmittedRecord[],
  ): boolean {
    return subWorld.holdings.some((h) => {
      if (!holdingConfers(h, "author")) return false;
      const candidateScopes = h.scopes.map((s) => {
        const reduced: Scope = { ...s };
        delete reduced.owners;
        delete reduced.sources;
        return reduced;
      });
      if (!matchesAll(candidate, candidateScopes, place)) return false;
      return subjectRecords.every((s) => matchesAll(s, h.scopes, s.geometry));
    });
  }
}
