/**
 * @geofarm/client-interaction — one View, five verbs, two laws (RFC-0006).
 *
 * A Session is one viewer's engagement: exactly one View (there is no
 * other "where you are" — S1), the three stores, and the boundary as the
 * only door. The five verbs decompose every interaction:
 *
 *   Navigate / Reveal / Indicate / Ask — touch the View only (first law);
 *   Author — touches the world, only by addition, only through promotion
 *   (second law: gestures are ephemeral until promoted).
 *
 * Editing state is drafts (RFC-0014 §4): the world holds none of it until
 * admission. Annotating inherits its aboutness from the View (RFC-0006
 * §8): what you were looking at is the metadata.
 */

import type {
  ActorChain,
  Area,
  CandidateRecord,
  Geometry,
  Id,
  TemporalExtent,
} from "../../world/index.ts";
import { newId } from "../../world/index.ts";
import type { AdmittedRecord } from "../../world/index.ts";
import type { Boundary } from "../../boundary/index.ts";
import {
  GRANT_CLASSIFICATION,
  grantBodyOf,
  holdingConfers,
  holdingsFrom,
  matchesAll,
  ownerOf,
  standingGrantsAt,
  type Capability,
  type GrantBody,
  type Scope,
} from "../../access/index.ts";
import {
  PendingStore,
  ReadingStore,
  ViewTrail,
  defaultView,
  toggleLens,
  withLens,
  withRegion,
  withSelection,
  withTime,
  type Lens,
  type View,
} from "../stores/index.ts";
import { deriveMarks, pickAt, standingAsOf, type Mark } from "../render/index.ts";

export const PACKAGE = "@geofarm/client-interaction" as const;

/**
 * The door, as the client sees it (RFC-0012): two operations and the walk.
 * Transport-agnostic — an in-process Boundary, a remote one, and a dead
 * radio all present this shape; the last simply throws, and the Session
 * treats that as a long gap between walks (RFC-0012 §5), never as a mode.
 */
export type BoundaryPort = Pick<Boundary, "walk" | "append" | "project">;

export type InspectionBundle = {
  record: AdmittedRecord;
  timeline: AdmittedRecord[];
  standing: AdmittedRecord | undefined;
  /** Concurrent supersessions of the same thing — a fork in the chain:
   * preserved, derived disagreement (RFC-0012 §5, RFC-0009 §2), shown
   * rather than silently resolved. Empty when the chain has one head. */
  contenders: AdmittedRecord[];
};

/** A share as the viewer reads it: the grant record and its terms. */
export type Share = { record: AdmittedRecord; grant: GrantBody };

export type SendReport = {
  admitted: number;
  rejected: { id: Id; reasons: readonly string[] }[];
  /** Submissions the door could not be reached for — still in Pending,
   * still the author's, sent on the next attempt (RFC-0014 §1). */
  deferred: number;
};

export class Session {
  readonly actor: Id;
  private readonly boundary: BoundaryPort;
  readonly reading: ReadingStore;
  readonly pending: PendingStore;
  private readonly trail: ViewTrail;

  constructor(actor: Id, boundary: BoundaryPort, pending: PendingStore, now: string) {
    this.actor = actor;
    this.boundary = boundary;
    this.reading = new ReadingStore();
    this.pending = pending;
    this.trail = new ViewTrail(defaultView(now));
  }

  /** The one View (S1): the application's only "where you are." */
  get view(): View {
    return this.trail.current;
  }

  /** Advance knowledge: walk the boundary into the Reading (RFC-0012 §4). */
  async sync(): Promise<void> {
    const page = await this.boundary.walk(this.actor, this.reading.watermark);
    this.reading.ingest(page);
  }

  /** When the Reading was last true: the watermark in plain time
   * (RFC-0012 §3 — honest staleness, displayable). */
  knownAsOf(): string | undefined {
    const all = this.reading.all();
    const last = all[all.length - 1];
    return last?.knowledgeTime;
  }

  // ---------------------------------------------- who I am here (RFC-0014 §2)

  /**
   * The representation chain this Session acts under, derived from the
   * Reading — a projection of grant history, as of the watermark
   * (RFC-0002 §1.4, C4). A member acts *for* the organization; every
   * record they author carries the chain (C1, invariant I7). Offline, the
   * chain lags with the Reading, honestly (RFC-0012 §5).
   */
  get chain(): ActorChain {
    const now = this.knownAsOf() ?? this.view.time.start;
    const principals: Id[] = [];
    for (const g of standingGrantsAt(this.reading.all(), now)) {
      const body = grantBodyOf(g) as GrantBody;
      if (body.grantee !== this.actor || !body.capabilities.includes("represent")) continue;
      const principal = ownerOf(g);
      if (principal !== this.actor && !principals.includes(principal)) principals.push(principal);
    }
    return { actor: this.actor, onBehalfOf: principals.slice(0, 1) };
  }

  /** The principal this Session's authorship lands with, if any. */
  get principal(): Id | undefined {
    return this.chain.onBehalfOf[0];
  }

  // ------------------------------------------------- Navigate (View only)

  navigateTo(region: Area): void {
    this.trail.push(withRegion(this.view, region));
  }

  /** Temporal panning (RFC-0006 §4): the slider is this verb. */
  navigateTime(time: TemporalExtent): void {
    this.trail.push(withTime(this.view, time));
  }

  /** Semantic navigation: go to a thing by identity. */
  navigateToThing(id: Id): boolean {
    const place = this.reading.placeOf(id);
    if (place === undefined) return false;
    this.trail.push(withRegion(withSelection(this.view, [id]), regionAround(place)));
    return true;
  }

  /** Undo for the consequence-free verbs: step back along the trail. */
  back(): void {
    this.trail.back();
  }

  // --------------------------------------------------- Reveal (View only)

  reveal(lens: Lens): void {
    this.trail.push(withLens(this.view, lens));
  }

  toggle(name: string): void {
    this.trail.push(toggleLens(this.view, name));
  }

  // ------------------------------------------------- Indicate (View only)

  select(ids: Id[]): void {
    this.trail.push(withSelection(this.view, ids));
  }

  /** Drawing is indication by default (RFC-0006 §3): an ephemeral gesture. */
  draw(geometry: Geometry, at: string): string {
    const id = newId();
    this.pending.addGesture({ id, geometry, at });
    return id;
  }

  // ------------------------------------------------------ Ask (read-only)

  /** What is here? Marks derived, picked, answered from the Reading. */
  marks(): Mark[] {
    return deriveMarks(this.reading, this.view);
  }

  pick(point: [number, number]): AdmittedRecord[] {
    return pickAt(this.marks(), this.reading, point);
  }

  /**
   * Inspection in place (RFC-0006 §5): a bundle of projections taken
   * within the View — the timeline stops at the View's temporal binding
   * and standing is resolved as it then was, so the panel and the map
   * can never disagree about when "now" is (REVIEW-003 A3).
   */
  inspect(id: Id): InspectionBundle | undefined {
    const record = this.reading.get(id);
    if (record === undefined) return undefined;
    const bound = Date.parse(this.view.time.end ?? this.view.time.start);
    const timeline = this.reading
      .all()
      .filter((r) => r.subjects.includes(id))
      .filter((r) => Date.parse(r.occurrence.start) <= bound)
      .sort((a, b) => Date.parse(a.occurrence.start) - Date.parse(b.occurrence.start));
    const chain = new Set<Id>([record.id]);
    let back: AdmittedRecord | undefined = record;
    while (back?.supersedes !== undefined && !chain.has(back.supersedes)) {
      chain.add(back.supersedes);
      back = this.reading.get(back.supersedes);
    }
    let grew = true;
    while (grew) {
      grew = false;
      for (const r of this.reading.all()) {
        if (r.supersedes !== undefined && chain.has(r.supersedes) && !chain.has(r.id)) {
          chain.add(r.id);
          grew = true;
        }
      }
    }
    const heads = standingAsOf(this.reading.all(), this.view.time).filter((r) => chain.has(r.id));
    const standing = heads[heads.length - 1];
    return { record, timeline, standing, contenders: heads.length > 1 ? heads : [] };
  }

  // --------------------------------------- Author (the consequential verb)

  /**
   * Promotion (RFC-0006 §3): a gesture crosses into a draft — the one-way
   * gate between the consequence-free verbs and the consequential one.
   */
  promote(
    gestureId: string,
    shape: { kind: CandidateRecord["kind"]; classification: string; body?: unknown },
  ): Id | undefined {
    const gesture = this.pending.gestures.find((g) => g.id === gestureId);
    if (gesture === undefined) return undefined;
    const draft: CandidateRecord = {
      id: newId(),
      kind: shape.kind,
      classification: shape.classification,
      actors: this.chain,
      occurrence: { start: gesture.at },
      geometry: gesture.geometry,
      subjects: [...this.view.selection],
      ...(shape.body !== undefined ? { body: shape.body } : {}),
    };
    this.pending.addDraft(draft);
    this.pending.dropGesture(gestureId);
    return draft.id;
  }

  /**
   * Annotation (RFC-0006 §8): aboutness inherited from the View — the
   * selection is the subjects; no form asks "which field is this about?".
   */
  annotate(classification: string, body: unknown, at: string): Id {
    const draft: CandidateRecord = {
      id: newId(),
      kind: "event",
      classification,
      actors: this.chain,
      occurrence: { start: at },
      subjects: [...this.view.selection],
      body,
    };
    this.pending.addDraft(draft);
    return draft.id;
  }

  /**
   * Correction is addition (RFC-0004 §5): a superseding record whose
   * geometry comes from a gesture — the redrawn line — and whose identity
   * of purpose is the record it replaces. The prior stands in history.
   */
  correct(gestureId: string, supersedes: Id, at: string): Id | undefined {
    const gesture = this.pending.gestures.find((g) => g.id === gestureId);
    const prior = this.reading.get(supersedes);
    if (gesture === undefined || prior === undefined) return undefined;
    const draft: CandidateRecord = {
      id: newId(),
      kind: prior.kind,
      classification: prior.classification,
      actors: this.chain,
      occurrence: { start: at },
      geometry: gesture.geometry,
      subjects: [...prior.subjects],
      supersedes,
      ...(prior.body !== undefined ? { body: prior.body } : {}),
    };
    this.pending.addDraft(draft);
    this.pending.dropGesture(gestureId);
    return draft.id;
  }

  // ------------------------------------------ Sharing (RFC-0002 §4; C2, C3)

  /**
   * Sharing is authorship of a Grant (RFC-0002 §3.1): a decision, drawn on
   * the map when a gesture bounds it (§4.1 — a fence for access). The
   * grant is an Event about the grantor's agency: its subject is the
   * principal whose reach it extends; the grantee lives in its terms.
   * A predicate scope by default — the tripwire of §8.5 is watched, not
   * dodged (RFC-0016 C2).
   */
  share(opts: {
    grantee: Id;
    scope: Scope;
    capabilities: Capability[];
    until?: string;
    /** A drawn region bounds the share spatially. */
    gestureId?: string;
    at: string;
  }): Id {
    const gesture =
      opts.gestureId === undefined
        ? undefined
        : this.pending.gestures.find((g) => g.id === opts.gestureId);
    const region =
      gesture?.geometry.form === "area" ? (gesture.geometry as Extract<Geometry, { form: "area" }>) : undefined;
    const scope: Scope = region === undefined ? opts.scope : { ...opts.scope, region };
    const body: GrantBody = {
      grantee: opts.grantee,
      scope,
      capabilities: opts.capabilities,
      ...(opts.until !== undefined ? { until: opts.until } : {}),
    };
    const draft: CandidateRecord = {
      id: newId(),
      kind: "event",
      classification: GRANT_CLASSIFICATION,
      actors: this.chain,
      occurrence: { start: opts.at },
      ...(region !== undefined ? { geometry: region } : {}),
      subjects: [this.principal ?? this.actor],
      body,
    };
    this.pending.addDraft(draft);
    if (gesture !== undefined) this.pending.dropGesture(gesture.id);
    return draft.id;
  }

  /**
   * Revocation is supersession (RFC-0002 §4.1): a Grant conferring nothing
   * replaces the standing one. Access ends; the fact that it existed is
   * permanent record — and cannot reach memory (§4.3).
   */
  revoke(grantId: Id, at: string): Id | undefined {
    const prior = this.reading.get(grantId);
    const body = prior === undefined ? undefined : grantBodyOf(prior);
    if (prior === undefined || body === undefined) return undefined;
    const draft: CandidateRecord = {
      id: newId(),
      kind: "event",
      classification: GRANT_CLASSIFICATION,
      actors: this.chain,
      occurrence: { start: at },
      ...(prior.geometry !== undefined ? { geometry: prior.geometry } : {}),
      subjects: [...prior.subjects],
      supersedes: grantId,
      body: { grantee: body.grantee, scope: body.scope, capabilities: [] },
    };
    this.pending.addDraft(draft);
    return draft.id;
  }

  /**
   * "Who can see this?" — the standing shares this Session's principal (or
   * the Session itself) has issued, as of the Reading (RFC-0002 §4.2: audit
   * is a query). A share with no capabilities left is a revocation and is
   * not listed as standing.
   */
  shares(asOf: string = this.knownAsOf() ?? this.view.time.start): Share[] {
    const me = this.principal ?? this.actor;
    return standingGrantsAt(this.reading.all(), asOf)
      .map((record) => ({ record, grant: grantBodyOf(record) as GrantBody }))
      .filter(
        ({ record, grant }) =>
          ownerOf(record) === me && grant.grantee !== me && grant.capabilities.length > 0,
      );
  }

  /**
   * The June question (RFC-0016 C3/S5): what could this Actor see, as of a
   * moment in knowledge time? Answered entirely from the viewer's own
   * Reading by projecting grant history to that moment and evaluating the
   * grantee's holdings over what was then known (RFC-0002 T2). No audit
   * feature exists; this is the ordinary sub-world computation applied to
   * someone else, over content the asker already reaches.
   */
  reachOf(grantee: Id, asOf: string): AdmittedRecord[] {
    const cutoff = Date.parse(asOf);
    const known = this.reading.all().filter((r) => Date.parse(r.knowledgeTime) <= cutoff);
    const holdings = holdingsFrom(grantee, standingGrantsAt(known, asOf));
    return known.filter((r) =>
      holdings.some(
        (h) => holdingConfers(h, "view") && matchesAll(r, h.scopes, this.reading.placeOf(r.id)),
      ),
    );
  }

  /** Commit a draft to the outbox; send the outbox through the door. */
  commit(draftId: Id): void {
    this.pending.commit(draftId);
  }

  async send(): Promise<SendReport> {
    const report: SendReport = { admitted: 0, rejected: [], deferred: 0 };
    for (const submission of [...this.pending.submissions]) {
      let result;
      try {
        result = await this.boundary.append(this.actor, submission);
      } catch {
        // No door today: the outbox keeps what it holds (RFC-0012 §5 —
        // reconnection is this same act, later). Nothing to merge.
        report.deferred = this.pending.submissions.length - report.admitted - report.rejected.length;
        return report;
      }
      if (result.accepted) {
        report.admitted++;
        this.pending.retire(submission.id);
      } else {
        report.rejected.push({ id: submission.id, reasons: result.reasons });
      }
    }
    return report;
  }
}

/** A small window around a place — semantic navigation's destination. */
function regionAround(g: Geometry): Area {
  const pts: [number, number][] = [];
  const collect = (geom: Geometry): void => {
    switch (geom.form) {
      case "position":
        pts.push(geom.coordinates);
        break;
      case "path":
        pts.push(...geom.coordinates);
        break;
      case "area":
        for (const ring of geom.rings) pts.push(...ring);
        break;
      case "volume":
        for (const ring of geom.base) pts.push(...ring);
        break;
      case "collection":
        for (const m of geom.members) collect(m);
        break;
    }
  };
  collect(g);
  const lons = pts.map((p) => p[0]);
  const lats = pts.map((p) => p[1]);
  const pad = 0.01;
  const w = Math.min(...lons) - pad;
  const e = Math.max(...lons) + pad;
  const s = Math.min(...lats) - pad;
  const n = Math.max(...lats) + pad;
  return {
    form: "area",
    rings: [
      [
        [w, s],
        [e, s],
        [e, n],
        [w, n],
        [w, s],
      ],
    ],
  };
}
