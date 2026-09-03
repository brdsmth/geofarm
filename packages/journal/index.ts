/**
 * @geofarm/journal — the one history.
 *
 * RFC-0004 §5: append-only; correction is addition; nothing is edited or
 * removed. RFC-0011 §2: the admission contract (this package owns the
 * store-dependent half; @geofarm/world owns the store-independent half).
 * RFC-0012 §3–4: the walk — exact deltas since a watermark, per-consumer
 * monotonic. RFC-0013 §1: one record log, one admission point, one
 * monotonic sequence realizing knowledge time's order.
 *
 * Immutability is structural: no interface in this package carries an
 * update or delete operation (PLAN-001 §4, module rule 1).
 */

import {
  validateCandidate,
  type AdmittedRecord,
  type CandidateRecord,
  type Id,
} from "../world/index.ts";

export const PACKAGE = "@geofarm/journal" as const;

// ------------------------------------------------------------------- store

/**
 * The store port (RFC-0013 §2 swappability note): append and read, nothing
 * else. The store realizes the admission sequence (RFC-0013 §1); the
 * Journal remains the single admission point that serializes and validates.
 */
export interface JournalStore {
  /** Persist a validated candidate; the store assigns the next sequence. */
  append(candidate: CandidateRecord, knowledgeTime: string): Promise<AdmittedRecord>;
  /** Fetch one record by its id. */
  get(id: Id): Promise<AdmittedRecord | undefined>;
  /** The walk's substrate: records with seq > after, in sequence order. */
  scanFrom(after: number, limit: number): Promise<AdmittedRecord[]>;
  /** The store's current watermark: highest admitted seq (0 if empty). */
  head(): Promise<number>;
  /** Linkage lookup: the record, if any, that supersedes the given one. */
  findSuperseder(id: Id): Promise<AdmittedRecord | undefined>;
  /** Linkage lookup: the retraction event, if any, disavowing the given one. */
  findRetraction(id: Id): Promise<AdmittedRecord | undefined>;
}

// --------------------------------------------------------------- admission

/** Rejection carries every reason at once — admission is all-or-nothing. */
export class AdmissionRejected extends Error {
  readonly reasons: readonly string[];
  constructor(reasons: string[]) {
    super(`admission rejected: ${reasons.join("; ")}`);
    this.name = "AdmissionRejected";
    this.reasons = reasons;
  }
}

/** The walk's page (RFC-0012 §4): exact deltas plus the advanced watermark. */
export type WalkPage = {
  records: AdmittedRecord[];
  /** Watermark after consuming this page; equals the input if no records. */
  watermark: number;
};

/**
 * What a reader of the log needs (RFC-0013 §2): the walk, and only the
 * walk. A Journal is one; a watermark-keyed materialization of it
 * (`MaterializedLog`) is another, and readers cannot tell them apart —
 * which is the whole point: a materialization accelerates, never
 * adjudicates (RFC-0014 law 2).
 */
export type LogReader = Pick<Journal, "walkFrom">;

export class Journal {
  private readonly store: JournalStore;
  /** Serializes admissions: the single admission point of RFC-0013 §1. */
  private queue: Promise<unknown> = Promise.resolve();
  private readonly now: () => string;

  constructor(store: JournalStore, now: () => string = () => new Date().toISOString()) {
    this.store = store;
    this.now = now;
  }

  /**
   * Admit a candidate under the full admission contract (RFC-0011 §2):
   * the world's store-independent checks plus the checks only the log can
   * make. All-or-nothing; on success the record is permanent.
   */
  admit(candidate: CandidateRecord): Promise<AdmittedRecord> {
    const run = this.queue.then(() => this.admitSerialized(candidate));
    // Keep the queue alive past rejections; each caller still sees its own.
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async admitSerialized(candidate: CandidateRecord): Promise<AdmittedRecord> {
    const reasons = validateCandidate(candidate);

    // Identity is never re-used (RFC-0004 §6); duplicate delivery is
    // distinguishable by id and rejected rather than silently merged
    // (RFC-0011 §6).
    if ((await this.store.get(candidate.id)) !== undefined) {
      reasons.push(`id already admitted: ${candidate.id}`);
    }

    // Inward references resolve to admitted records (introduce-then-join,
    // RFC-0011 §3; acyclicity of evidence follows by construction — a
    // record can only reference what was admitted before it, RFC-0009 §5).
    for (const s of candidate.subjects) {
      if ((await this.store.get(s)) === undefined) reasons.push(`unknown subject: ${s}`);
    }
    for (const e of candidate.evidence ?? []) {
      if ((await this.store.get(e)) === undefined) reasons.push(`unknown evidence: ${e}`);
    }

    // Placement (RFC-0004 §7): world content has a place, intrinsic or
    // inherited; only agency-about records may be placeless.
    if (candidate.geometry === undefined) {
      if (candidate.kind === "entity") {
        reasons.push("entity requires geometry (RFC-0001 §3.1)");
      } else if (candidate.kind === "event" || candidate.kind === "assertion") {
        if (candidate.subjects.length === 0) {
          reasons.push("placeless record has no subjects to inherit place from (RFC-0004 §7)");
        } else {
          for (const s of candidate.subjects) {
            const subject = await this.store.get(s);
            if (subject !== undefined && subject.kind !== "actor" && subject.geometry === undefined) {
              reasons.push(`placeless record's subject is neither placed nor agency: ${s}`);
            }
          }
        }
      }
      // kind "actor": agency may be placeless (RFC-0000 §2.1, Amendment 1).
    }

    // Supersession linkage (RFC-0004 §5): same-kind replacement of an
    // existing record. Retraction linkage (RFC-0008 §1): disavowal is
    // itself an Event, aimed at any existing record.
    if (candidate.supersedes !== undefined) {
      const target = await this.store.get(candidate.supersedes);
      if (target === undefined) reasons.push(`supersedes unknown record: ${candidate.supersedes}`);
      else if (target.kind !== candidate.kind) {
        reasons.push("supersession must match the superseded record's kind (RFC-0004 §5)");
      }
    }
    if (candidate.retracts !== undefined) {
      if (candidate.kind !== "event") {
        reasons.push("retraction is an Event (RFC-0008 §1)");
      }
      if ((await this.store.get(candidate.retracts)) === undefined) {
        reasons.push(`retracts unknown record: ${candidate.retracts}`);
      }
    }

    if (reasons.length > 0) throw new AdmissionRejected(reasons);

    // Knowledge time is the admission's fact (RFC-0004 §1); the store
    // assigns the sequence (RFC-0013 §1).
    return this.store.append(candidate, this.now());
  }

  // -------------------------------------------------------------- reading

  get(id: Id): Promise<AdmittedRecord | undefined> {
    return this.store.get(id);
  }

  /**
   * The walk (RFC-0012 §4): everything admitted since the watermark, in
   * knowledge order — including supersessions, retractions, and backfill
   * about the deep past, each at its admission position.
   */
  async walkFrom(watermark: number, limit = 1000): Promise<WalkPage> {
    const records = await this.store.scanFrom(watermark, limit);
    const last = records[records.length - 1];
    return { records, watermark: last === undefined ? watermark : last.seq };
  }

  /** The journal's current watermark. */
  head(): Promise<number> {
    return this.store.head();
  }

  // -------------------------------------------------------------- linkage

  /**
   * The supersession chain of a record (RFC-0004 §5), oldest first, ending
   * at the currently standing revision. Both timelines are preserved: every
   * link remains readable at its own occurrence and knowledge times.
   */
  async supersessionChain(id: Id): Promise<AdmittedRecord[]> {
    const start = await this.store.get(id);
    if (start === undefined) return [];
    // Walk backward to the root...
    const back: AdmittedRecord[] = [start];
    let cursor = start;
    while (cursor.supersedes !== undefined) {
      const prev = await this.store.get(cursor.supersedes);
      if (prev === undefined) break;
      back.push(prev);
      cursor = prev;
    }
    back.reverse();
    // ...then forward to the standing head.
    let head = back[back.length - 1] as AdmittedRecord;
    for (;;) {
      const next = await this.store.findSuperseder(head.id);
      if (next === undefined) break;
      back.push(next);
      head = next;
    }
    return back;
  }

  /** The retraction disavowing a record, if any (RFC-0008 §1). */
  retractionOf(id: Id): Promise<AdmittedRecord | undefined> {
    return this.store.findRetraction(id);
  }
}
