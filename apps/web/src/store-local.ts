/**
 * The browser's copy of the world: the in-memory store, persisted whole in
 * Web Storage so the farm's history survives a reload. The demo has no
 * server; this is the swappable store port of RFC-0013 §2 with the
 * smallest possible adapter behind it. Append-only in storage too: the
 * saved log is only ever replaced by a longer one.
 */

import type { AdmittedRecord, CandidateRecord } from "../../../packages/world/index.ts";
import { MemoryStore } from "../../../packages/journal/store-memory.ts";

export class LocalStore extends MemoryStore {
  private restoring = false;

  constructor(
    private readonly key: string,
    private readonly storage: Storage,
  ) {
    super();
  }

  override async append(candidate: CandidateRecord, knowledgeTime: string): Promise<AdmittedRecord> {
    const admitted = await super.append(candidate, knowledgeTime);
    if (!this.restoring) await this.persist();
    return admitted;
  }

  /** Replay a saved log, if there is one. True when the world was restored. */
  async restore(): Promise<boolean> {
    let saved: AdmittedRecord[];
    try {
      const raw = this.storage.getItem(this.key);
      if (raw === null) return false;
      saved = JSON.parse(raw) as AdmittedRecord[];
    } catch {
      return false;
    }
    if (saved.length === 0) return false;
    this.restoring = true;
    for (const r of saved) {
      const { seq: _seq, knowledgeTime, ...candidate } = r;
      await super.append(candidate, knowledgeTime);
    }
    this.restoring = false;
    return true;
  }

  async persist(): Promise<void> {
    try {
      this.storage.setItem(this.key, JSON.stringify(await this.scanFrom(0, Number.MAX_SAFE_INTEGER)));
    } catch {
      // Storage refused: the world lives for this session only. Nothing
      // false is said — the shell can still work; it just won't remember.
    }
  }

  forget(): void {
    try {
      this.storage.removeItem(this.key);
    } catch {
      // nothing to forget
    }
  }
}
