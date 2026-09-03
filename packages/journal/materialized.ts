/**
 * A watermark-keyed materialization of the log (RFC-0013 §2: "derived
 * caches, rebuildable from the log" — the one sanctioned accelerator).
 *
 * REVIEW-003 §2.F logged the debt: every projection re-scanned the whole
 * store, and a feed resolving identities by projection was O(n²) in
 * store reads. This pays it without a second authority. The materialized
 * log holds the records the journal has admitted up to a head it names;
 * `refresh` extends it by exactly the delta since that head (one range
 * scan of the store), and readers walk it in memory. It is dropped and
 * rebuilt at will, it can never disagree with the log and win (RFC-0014
 * law 2), and it carries no state the log does not — a copy keyed by
 * watermark, not a store.
 */

import type { AdmittedRecord } from "../world/index.ts";
import type { Journal, LogReader, WalkPage } from "./index.ts";

export class MaterializedLog implements LogReader {
  private records: AdmittedRecord[] = [];
  private head = 0;

  constructor(private readonly journal: Journal) {}

  /** The watermark this materialization is true as of. */
  get watermark(): number {
    return this.head;
  }

  /** Extend by the delta since the head: the log's own walk, once. */
  async refresh(): Promise<number> {
    for (;;) {
      const page = await this.journal.walkFrom(this.head);
      if (page.records.length === 0) break;
      this.records.push(...page.records);
      this.head = page.watermark;
    }
    return this.head;
  }

  /** Rebuildable: forget everything; the next refresh reads it back. */
  drop(): void {
    this.records = [];
    this.head = 0;
  }

  /** The walk, served from memory. Sequences may have gaps (a store's
   * sequence advances even on a refused insert), so the start is found
   * by search, never by index arithmetic. */
  async walkFrom(watermark: number, limit = 1000): Promise<WalkPage> {
    let lo = 0;
    let hi = this.records.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((this.records[mid] as AdmittedRecord).seq <= watermark) lo = mid + 1;
      else hi = mid;
    }
    const records = this.records.slice(lo, lo + limit);
    const last = records[records.length - 1];
    return { records, watermark: last === undefined ? watermark : last.seq };
  }
}
