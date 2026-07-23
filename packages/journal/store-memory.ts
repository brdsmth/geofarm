/**
 * In-memory JournalStore — the test double (RFC-0013 §2 names PostgreSQL as
 * the chosen store; this adapter exists so the journal's logic is testable
 * without one, and to demonstrate the port's swappability).
 *
 * Append-only by construction: the only mutation is push.
 */

import type { AdmittedRecord, CandidateRecord, Id } from "../world/index.ts";
import type { JournalStore } from "./index.ts";

export class MemoryStore implements JournalStore {
  private readonly log: AdmittedRecord[] = [];
  private readonly byId = new Map<Id, AdmittedRecord>();
  private readonly supersederOf = new Map<Id, AdmittedRecord>();
  private readonly retractionOf = new Map<Id, AdmittedRecord>();

  async append(candidate: CandidateRecord, knowledgeTime: string): Promise<AdmittedRecord> {
    const admitted: AdmittedRecord = { ...candidate, seq: this.log.length + 1, knowledgeTime };
    this.log.push(admitted);
    this.byId.set(admitted.id, admitted);
    if (admitted.supersedes !== undefined) this.supersederOf.set(admitted.supersedes, admitted);
    if (admitted.retracts !== undefined) this.retractionOf.set(admitted.retracts, admitted);
    return admitted;
  }

  async get(id: Id): Promise<AdmittedRecord | undefined> {
    return this.byId.get(id);
  }

  async scanFrom(after: number, limit: number): Promise<AdmittedRecord[]> {
    // seq is 1-based and dense: slice is an exact-delta range scan.
    return this.log.slice(after, after + limit);
  }

  async head(): Promise<number> {
    return this.log.length;
  }

  async findSuperseder(id: Id): Promise<AdmittedRecord | undefined> {
    return this.supersederOf.get(id);
  }

  async findRetraction(id: Id): Promise<AdmittedRecord | undefined> {
    return this.retractionOf.get(id);
  }
}
