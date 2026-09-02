/**
 * @geofarm/boundary — the two operations and the clock (RFC-0012).
 *
 * Project and Append, walked along knowledge time; the only door for every
 * consumer (PLAN-001 §4, module rule 3). Every operation is performed by an
 * Actor and answered within that Actor's sub-world; the boundary holds no
 * semantics of its own — it composes access, projection, and the journal.
 *
 * The public Actor (RFC-0012 §6): may hold granted discover/view like
 * anyone; can never author — anonymous contribution is meaningless by
 * construction, since provenance is part of what a record is.
 */

import type { AdmittedRecord, Area, CandidateRecord, Id } from "../world/index.ts";
import { AdmissionRejected, type Journal } from "../journal/index.ts";
import { AccessEngine, GRANT_CLASSIFICATION, matchesScope, type Scope } from "../access/index.ts";
import { Projection, type Reading } from "../projection/index.ts";

/** Scope match against a candidate's content dimensions, place unknown. */
function matchesScopeLoose(record: AdmittedRecord, scope: Scope): boolean {
  return matchesScope(record, scope, record.geometry);
}

export const PACKAGE = "@geofarm/boundary" as const;

/** The indistinguishable everyone (RFC-0012 §6). */
export const PUBLIC_ACTOR: Id = "public";

/** Reading forms (RFC-0012 §1): every question is a View-shaped value. */
export type ReadForm =
  | { form: "record"; id: Id }
  | { form: "visibility"; region: Area }
  | { form: "timeline"; id: Id }
  | { form: "standing"; id: Id }
  | { form: "heads"; id: Id }
  | { form: "known" };

export type ProjectRequest = {
  /** As-of in knowledge time; omitted = now (RFC-0012 §3). */
  asOf?: string;
  read: ReadForm;
};

export type AppendResult =
  | { accepted: true; record: AdmittedRecord }
  | { accepted: false; reasons: readonly string[] };

export type BoundaryWalkPage = { records: AdmittedRecord[]; watermark: number };

export class Boundary {
  private readonly journal: Journal;
  private readonly access: AccessEngine;

  constructor(journal: Journal) {
    this.journal = journal;
    // The privileged path lives inside access; the boundary only ever asks
    // for sub-worlds and answers within them (PLAN-001 §2).
    this.access = new AccessEngine(journal);
  }

  private async projectionFor(actor: Id, asOf?: string): Promise<Projection> {
    const subWorld = await this.access.subWorldAt(actor, asOf ?? new Date().toISOString());
    return new Projection(this.journal, subWorld);
  }

  /** Project: take a reading (RFC-0012 §2). */
  async project(
    actor: Id,
    request: ProjectRequest,
  ): Promise<Reading | AdmittedRecord[] | AdmittedRecord | { viewable: Id[]; discoverable: Id[] } | undefined> {
    const p = await this.projectionFor(actor, request.asOf);
    switch (request.read.form) {
      case "record":
        return p.get(request.read.id);
      case "visibility":
        return p.visibleWithin(request.read.region);
      case "timeline":
        return p.timelineOf(request.read.id);
      case "standing":
        return p.standingOf(request.read.id);
      case "heads":
        return p.headsOf(request.read.id);
      case "known":
        return p.listKnown();
    }
  }

  /**
   * Append: submit attributed content for admission (RFC-0012 §2).
   * The acting Actor must be the caller; authorship is checked against
   * their sub-world (RFC-0002 §3.1) with subjects resolved through their
   * own projection — an unreachable subject reads as unknown, never as
   * forbidden (RFC-0012 §6: denial dissolves into absence).
   */
  async append(actor: Id, candidate: CandidateRecord): Promise<AppendResult> {
    if (actor === PUBLIC_ACTOR) {
      return { accepted: false, reasons: ["the public cannot author (RFC-0012 §6)"] };
    }
    if (candidate.actors.actor !== actor) {
      return { accepted: false, reasons: ["a record's acting actor must be its submitter (I1)"] };
    }

    const subWorld = await this.access.subWorldAt(actor);
    const p = new Projection(this.journal, subWorld);

    // Claimed representation must be held (RFC-0002 §1.4, I7): content
    // authored on behalf of a principal will be principal-owned (RFC-0002
    // §4.4), so the probe carries the claimed chain and must match a
    // represent-holding *including* its ownership dimension — a self-
    // holding covers only self-owned content and authorizes representing
    // no one. (Single-link chains suffice for the MVP cast; per-link
    // verification arrives with deeper chains — E6.)
    if (candidate.actors.onBehalfOf.length > 0) {
      const probe: AdmittedRecord = { ...candidate, seq: 0, knowledgeTime: subWorld.asOf };
      const held = subWorld.holdings.some(
        (h) =>
          h.capabilities.includes("represent") &&
          h.scopes.every((s) =>
            // Region-bounded scopes resolve with the full authoring check
            // below, where place is known.
            s.region !== undefined ? true : matchesScopeLoose(probe, s),
          ),
      );
      if (!held) {
        return { accepted: false, reasons: ["acting for a principal requires representation"] };
      }
    }

    const subjectRecords: AdmittedRecord[] = [];
    for (const s of candidate.subjects) {
      const reading = await p.get(s);
      if (reading?.level !== "view") {
        return { accepted: false, reasons: [`unknown subject: ${s}`] };
      }
      subjectRecords.push(reading.record);
    }
    // Resolve place the way projections do: own geometry, else subjects'.
    const place =
      candidate.geometry ??
      (subjectRecords.length === 0
        ? undefined
        : subjectRecords.length === 1
          ? subjectRecords[0]?.geometry
          : {
              form: "collection" as const,
              members: subjectRecords
                .map((r) => r.geometry)
                .filter((g): g is NonNullable<typeof g> => g !== undefined),
            });

    const probe: AdmittedRecord = { ...candidate, seq: 0, knowledgeTime: subWorld.asOf };
    if (!this.access.mayAuthor(subWorld, probe, place, subjectRecords)) {
      return { accepted: false, reasons: ["outside your authoring scope"] };
    }

    try {
      const record = await this.journal.admit(candidate);
      return { accepted: true, record };
    } catch (e) {
      if (e instanceof AdmissionRejected) return { accepted: false, reasons: e.reasons };
      throw e;
    }
  }

  /**
   * The walk (RFC-0012 §4): everything learned since the watermark, within
   * the caller's sub-world. The feed is a scoped projection of the log.
   *
   * When a grant lands after the watermark, the consumer's accessible
   * world may have grown: "a grant newly issued admits its scope's
   * existing content into the next walk" (§4). The walk then delivers
   * the difference — everything now viewable at or below the watermark
   * as well — and the Reading, append-only and keyed by identity, keeps
   * each record once. No consumer state lives here; the door stays
   * stateless (RFC-0012 §9).
   */
  async walk(actor: Id, watermark: number, limit = 1000): Promise<BoundaryWalkPage> {
    const p = await this.projectionFor(actor);
    const viewable = await p.allViewable();
    const known = new Set(viewable.map((r) => r.id));
    const records: AdmittedRecord[] = [];
    let cursor = watermark;
    let grew = false;
    for (;;) {
      const page = await this.journal.walkFrom(cursor, limit);
      if (page.records.length === 0) break;
      for (const r of page.records) {
        if (r.classification === GRANT_CLASSIFICATION) grew = true;
        if (known.has(r.id)) records.push(r);
      }
      cursor = page.watermark;
      if (records.length >= limit) break;
    }
    if (grew && watermark > 0) {
      const older = viewable.filter((r) => r.seq <= watermark);
      return { records: [...older, ...records], watermark: cursor };
    }
    return { records, watermark: cursor };
  }
}
