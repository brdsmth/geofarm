/**
 * @geofarm/client-stores — the application holds exactly three things
 * (RFC-0014): a Reading of the world, a View onto it, and Pending work not
 * yet given to it. There is no fourth store.
 *
 * Loss triage (RFC-0014 §1): the Reading is disposable (re-project), the
 * View is cheap (a value), Pending is the only fragile state — durable
 * locally until admitted, behind a persistence port (RFC-0013 §2: an
 * embedded on-device store; here a file adapter carries the guarantee and
 * the tests).
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type {
  AdmittedRecord,
  Area,
  CandidateRecord,
  Geometry,
  Id,
  TemporalExtent,
} from "../../world/index.ts";
import type { Scope } from "../../access/index.ts";

export const PACKAGE = "@geofarm/client-stores" as const;

// ----------------------------------------------------------------- Reading

/**
 * The world as known: a scoped projection at a knowledge-time watermark
 * (RFC-0012 §3, RFC-0014 §2). Append-only in the client too: the walk
 * delivers history and the Reading only ever grows.
 */
export class ReadingStore {
  private records: AdmittedRecord[] = [];
  private index = new Map<Id, AdmittedRecord>();
  watermark = 0;

  ingest(page: { records: AdmittedRecord[]; watermark: number }): void {
    if (page.watermark < this.watermark) {
      throw new Error("knowledge only grows: refusing to move the watermark backward");
    }
    for (const r of page.records) {
      this.records.push(r);
      this.index.set(r.id, r);
    }
    this.watermark = page.watermark;
  }

  get(id: Id): AdmittedRecord | undefined {
    return this.index.get(id);
  }

  all(): readonly AdmittedRecord[] {
    return this.records;
  }

  /** Resolved place: own geometry, else inherited through known subjects. */
  placeOf(id: Id): Geometry | undefined {
    const r = this.index.get(id);
    if (r === undefined) return undefined;
    if (r.geometry !== undefined) return r.geometry;
    const inherited = r.subjects
      .map((s) => this.index.get(s)?.geometry)
      .filter((g): g is Geometry => g !== undefined);
    if (inherited.length === 0) return undefined;
    return inherited.length === 1
      ? inherited[0]
      : { form: "collection", members: inherited };
  }
}

// -------------------------------------------------------------------- View

/** A lens in the stack: a named filter over the Reading (RFC-0005, T1 —
 * the same Scope form serves imposed, chosen, and named roles). */
export type Lens = { name: string; filter: Scope; visible: boolean };

/**
 * Attention as a value (RFC-0006 §1, RFC-0014 §3): spatial scope, temporal
 * binding, lens stack, selection — one value, undesynchronizable. Every
 * change produces a new View; history is free and undo is navigation.
 */
export type View = {
  region: Area | undefined;
  time: TemporalExtent;
  lenses: Lens[];
  selection: Id[];
};

export function defaultView(now: string): View {
  return { region: undefined, time: { start: now }, lenses: [], selection: [] };
}

export const withRegion = (v: View, region: Area): View => ({ ...v, region });
export const withTime = (v: View, time: TemporalExtent): View => ({ ...v, time });
export const withSelection = (v: View, selection: Id[]): View => ({ ...v, selection });
export const withLens = (v: View, lens: Lens): View => ({
  ...v,
  lenses: [...v.lenses.filter((l) => l.name !== lens.name), lens],
});
export const toggleLens = (v: View, name: string): View => ({
  ...v,
  lenses: v.lenses.map((l) => (l.name === name ? { ...l, visible: !l.visible } : l)),
});

/** The trail of recent Views: undo for the consequence-free verbs. */
export class ViewTrail {
  private trail: View[];
  constructor(initial: View) {
    this.trail = [initial];
  }
  get current(): View {
    return this.trail[this.trail.length - 1] as View;
  }
  push(v: View): void {
    this.trail.push(v);
  }
  back(): View {
    if (this.trail.length > 1) this.trail.pop();
    return this.current;
  }
}

// ----------------------------------------------------------------- Pending

/** A drawn, ephemeral indication (RFC-0006 §3): a query region until
 * promoted, nothing afterward unless kept. */
export type Gesture = { id: string; geometry: Geometry; at: string };

export type PendingState = {
  gestures: Gesture[];
  /** Editing state (RFC-0014 §4): candidate records being composed. */
  drafts: CandidateRecord[];
  /** Committed by their author, not yet admitted: the outbox. */
  submissions: CandidateRecord[];
};

/** The durability port: Pending must survive process death (RFC-0014 §1). */
export interface PendingPersistence {
  load(): PendingState | undefined;
  save(state: PendingState): void;
}

export class MemoryPersistence implements PendingPersistence {
  private state: PendingState | undefined;
  load(): PendingState | undefined {
    return this.state;
  }
  save(state: PendingState): void {
    this.state = structuredClone(state);
  }
}

/** File-backed persistence: the kill-and-restart guarantee, testably. */
export class FilePersistence implements PendingPersistence {
  constructor(private readonly path: string) {}
  load(): PendingState | undefined {
    if (!existsSync(this.path)) return undefined;
    return JSON.parse(readFileSync(this.path, "utf8")) as PendingState;
  }
  save(state: PendingState): void {
    writeFileSync(this.path, JSON.stringify(state));
  }
}

export class PendingStore {
  private state: PendingState;
  private readonly persistence: PendingPersistence;

  constructor(persistence: PendingPersistence) {
    this.persistence = persistence;
    this.state = persistence.load() ?? { gestures: [], drafts: [], submissions: [] };
  }

  private mutate(fn: (s: PendingState) => void): void {
    fn(this.state);
    this.persistence.save(this.state); // durable on every change
  }

  get gestures(): readonly Gesture[] {
    return this.state.gestures;
  }
  get drafts(): readonly CandidateRecord[] {
    return this.state.drafts;
  }
  get submissions(): readonly CandidateRecord[] {
    return this.state.submissions;
  }

  addGesture(g: Gesture): void {
    this.mutate((s) => s.gestures.push(g));
  }
  dropGesture(id: string): void {
    this.mutate((s) => {
      s.gestures = s.gestures.filter((g) => g.id !== id);
    });
  }
  /** Evaporation (second law): gestures die with the session unless kept. */
  clearGestures(): void {
    this.mutate((s) => {
      s.gestures = [];
    });
  }

  addDraft(d: CandidateRecord): void {
    this.mutate((s) => s.drafts.push(d));
  }
  abandonDraft(id: Id): void {
    // Deletes nothing from the world, because it never touched the world.
    this.mutate((s) => {
      s.drafts = s.drafts.filter((d) => d.id !== id);
    });
  }

  /** Commit a draft: it becomes a submission awaiting admission. */
  commit(id: Id): void {
    this.mutate((s) => {
      const draft = s.drafts.find((d) => d.id === id);
      if (draft === undefined) return;
      s.drafts = s.drafts.filter((d) => d.id !== id);
      s.submissions.push(draft);
    });
  }

  /** A submission was admitted (or rejected back to its author): retire it. */
  retire(id: Id): void {
    this.mutate((s) => {
      s.submissions = s.submissions.filter((d) => d.id !== id);
    });
  }
}
