/**
 * @geofarm/projection — every derived reading, computed within a sub-world.
 *
 * RFC-0002 §2.3 (the sub-world rule): every question is answered as if the
 * Actor's accessible sub-world were the whole world — inputs are scoped,
 * outputs are never redacted. Enforced by API shape (PLAN-001 §4, module
 * rule 2; RFC-0010 §4 no-laundering): a Projection cannot be constructed
 * without a SubWorld, and no method reads outside it.
 *
 * RFC-0004 §4: state is a projection of the immutable past onto persistent
 * identities. RFC-0004 §9: a thing's timeline is a derived filter of the
 * one history. RFC-0003 §6: visibility is the set of things present within
 * a region of interest. RFC-0002 §3.1: discover-depth yields existence
 * without content.
 */

import type { AdmittedRecord, Area, Geometry, Id } from "../world/index.ts";
import { geometryIntersectsArea } from "../world/spatial.ts";
import type { Journal } from "../journal/index.ts";
import { holdingConfers, matchesAll, type Capability, type SubWorld } from "../access/index.ts";

export const PACKAGE = "@geofarm/projection" as const;

/** Existence without content (RFC-0002 §3.1, discover). */
export type ExistenceStub = { id: Id };

export type Reading =
  | { level: "view"; record: AdmittedRecord }
  | { level: "discover"; stub: ExistenceStub };

export class Projection {
  private readonly journal: Journal;
  private readonly subWorld: SubWorld;
  private cache:
    | { viewable: AdmittedRecord[]; discoverable: Set<Id>; place: Map<Id, Geometry | undefined> }
    | undefined;

  /** A Projection exists only for a sub-world. There is no unscoped form. */
  constructor(journal: Journal, subWorld: SubWorld) {
    this.journal = journal;
    this.subWorld = subWorld;
  }

  /**
   * Materialize the sub-world once per Projection: scan the log up to the
   * sub-world's knowledge time and keep what its holdings admit. Inherited
   * geometry (RFC-0004 §7) resolves only through subjects the sub-world
   * itself admits at view depth — an out-of-scope subject lends no place,
   * so nothing beyond the horizon shapes any answer (S6).
   */
  private async load(): Promise<NonNullable<typeof this.cache>> {
    if (this.cache !== undefined) return this.cache;
    const cutoff = Date.parse(this.subWorld.asOf);

    const all: AdmittedRecord[] = [];
    let watermark = 0;
    for (;;) {
      const page = await this.journal.walkFrom(watermark);
      if (page.records.length === 0) break;
      for (const r of page.records) {
        if (Date.parse(r.knowledgeTime) <= cutoff) all.push(r);
      }
      watermark = page.watermark;
    }

    // Pass 1: records admissible at view depth on their own geometry.
    const byId = new Map(all.map((r) => [r.id, r]));
    const viewIds = new Set<Id>();
    const place = new Map<Id, Geometry | undefined>();

    const admits = (r: AdmittedRecord, c: Capability, p: Geometry | undefined): boolean =>
      this.subWorld.holdings.some((h) => holdingConfers(h, c) && matchesAll(r, h.scopes, p));

    for (const r of all) {
      if (r.geometry !== undefined) {
        place.set(r.id, r.geometry);
        if (admits(r, "view", r.geometry)) viewIds.add(r.id);
      }
    }
    // Pass 2: placeless records inherit place from in-view subjects only.
    for (const r of all) {
      if (r.geometry !== undefined) continue;
      const inherited: Geometry[] = [];
      for (const s of r.subjects) {
        const subject = byId.get(s);
        if (subject?.geometry !== undefined && viewIds.has(s)) inherited.push(subject.geometry);
      }
      const p: Geometry | undefined =
        inherited.length === 0
          ? undefined
          : inherited.length === 1
            ? inherited[0]
            : { form: "collection", members: inherited };
      place.set(r.id, p);
      if (admits(r, "view", p)) viewIds.add(r.id);
    }

    const viewable = all.filter((r) => viewIds.has(r.id));
    const discoverable = new Set<Id>();
    for (const r of all) {
      if (!viewIds.has(r.id) && admits(r, "discover", place.get(r.id))) discoverable.add(r.id);
    }

    this.cache = { viewable, discoverable, place };
    return this.cache;
  }

  /**
   * Read one thing. Full content at view depth; existence alone at
   * discover depth; beyond the horizon, indistinguishable from nonexistent
   * (RFC-0012 §6 — denial dissolves into absence).
   */
  async get(id: Id): Promise<Reading | undefined> {
    const { viewable, discoverable } = await this.load();
    const record = viewable.find((r) => r.id === id);
    if (record !== undefined) return { level: "view", record };
    if (discoverable.has(id)) return { level: "discover", stub: { id } };
    return undefined;
  }

  /**
   * Visibility (RFC-0003 §6): what is present within a region of interest.
   * Discover-depth content is excluded — its place is content it does not
   * confer (existence within the scope, not location within a region).
   */
  async visibleWithin(region: Area): Promise<AdmittedRecord[]> {
    const { viewable, place } = await this.load();
    return viewable.filter((r) => {
      const p = place.get(r.id);
      return p !== undefined && geometryIntersectsArea(p, region);
    });
  }

  /**
   * A thing's timeline (RFC-0004 §9): the derived filter of the one history
   * whose records reference it, in occurrence order.
   */
  async timelineOf(id: Id): Promise<AdmittedRecord[]> {
    const { viewable } = await this.load();
    return viewable
      .filter((r) => r.subjects.includes(id))
      .sort((a, b) => Date.parse(a.occurrence.start) - Date.parse(b.occurrence.start));
  }

  /**
   * The standing revision of a record (RFC-0004 §4): the newest link of its
   * supersession chain visible in this sub-world, unless retracted
   * (RFC-0008 §1 — retracted content leaves ordinary projections).
   */
  async standingOf(id: Id): Promise<AdmittedRecord | undefined> {
    const { viewable } = await this.load();
    const byId = new Map(viewable.map((r) => [r.id, r]));
    const supersederOf = new Map<Id, AdmittedRecord>();
    const retracted = new Set<Id>();
    for (const r of viewable) {
      if (r.supersedes !== undefined) supersederOf.set(r.supersedes, r);
      if (r.retracts !== undefined) retracted.add(r.retracts);
    }
    let cursor = byId.get(id);
    if (cursor === undefined) return undefined;
    while (true) {
      const next = supersederOf.get(cursor.id);
      if (next === undefined) break;
      cursor = next;
    }
    return retracted.has(cursor.id) ? undefined : cursor;
  }

  /**
   * Every standing head of a record's supersession chain. One head is the
   * ordinary case; more than one is a fork — two Actors corrected the same
   * thing without hearing each other (offline, RFC-0012 §5), and the
   * disagreement is preserved and derived (RFC-0009 §2), never resolved
   * by write order. Whoever next authors a reconciliation collapses it.
   */
  async headsOf(id: Id): Promise<AdmittedRecord[]> {
    const { viewable } = await this.load();
    const byId = new Map(viewable.map((r) => [r.id, r]));
    const supersedersOf = new Map<Id, AdmittedRecord[]>();
    const retracted = new Set<Id>();
    for (const r of viewable) {
      if (r.supersedes !== undefined) {
        supersedersOf.set(r.supersedes, [...(supersedersOf.get(r.supersedes) ?? []), r]);
      }
      if (r.retracts !== undefined) retracted.add(r.retracts);
    }
    // Back to the root, then out along every branch.
    let root = byId.get(id);
    if (root === undefined) return [];
    while (root.supersedes !== undefined && byId.has(root.supersedes)) {
      root = byId.get(root.supersedes) as AdmittedRecord;
    }
    const heads: AdmittedRecord[] = [];
    const stack = [root];
    while (stack.length > 0) {
      const r = stack.pop() as AdmittedRecord;
      const next = supersedersOf.get(r.id) ?? [];
      if (next.length === 0) {
        if (!retracted.has(r.id)) heads.push(r);
      } else {
        stack.push(...next);
      }
    }
    return heads.sort((a, b) => a.seq - b.seq);
  }

  /** An aggregate computed within the sub-world (S6: no global-then-redact). */
  async countWithin(region: Area): Promise<number> {
    return (await this.visibleWithin(region)).length;
  }

  /** Every record this sub-world reads at view depth, in admission order. */
  async allViewable(): Promise<AdmittedRecord[]> {
    return (await this.load()).viewable;
  }

  /** Everything this sub-world knows exists (view and discover depths). */
  async listKnown(): Promise<{ viewable: Id[]; discoverable: Id[] }> {
    const { viewable, discoverable } = await this.load();
    return { viewable: viewable.map((r) => r.id), discoverable: [...discoverable] };
  }
}
