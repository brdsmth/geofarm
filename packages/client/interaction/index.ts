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

import type { Area, CandidateRecord, Geometry, Id, TemporalExtent } from "../../world/index.ts";
import { newId } from "../../world/index.ts";
import type { AdmittedRecord } from "../../world/index.ts";
import type { Boundary } from "../../boundary/index.ts";
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

export type InspectionBundle = {
  record: AdmittedRecord;
  timeline: AdmittedRecord[];
  standing: AdmittedRecord | undefined;
};

export class Session {
  readonly actor: Id;
  private readonly boundary: Boundary;
  readonly reading: ReadingStore;
  readonly pending: PendingStore;
  private readonly trail: ViewTrail;

  constructor(actor: Id, boundary: Boundary, pending: PendingStore, now: string) {
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
    const standing = standingAsOf(this.reading.all(), this.view.time).find((r) => chain.has(r.id));
    return { record, timeline, standing };
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
      actors: { actor: this.actor, onBehalfOf: [] },
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
      actors: { actor: this.actor, onBehalfOf: [] },
      occurrence: { start: at },
      subjects: [...this.view.selection],
      body,
    };
    this.pending.addDraft(draft);
    return draft.id;
  }

  /** Commit a draft to the outbox; send the outbox through the door. */
  commit(draftId: Id): void {
    this.pending.commit(draftId);
  }

  async send(): Promise<{ admitted: number; rejected: { id: Id; reasons: readonly string[] }[] }> {
    const rejected: { id: Id; reasons: readonly string[] }[] = [];
    let admitted = 0;
    for (const submission of [...this.pending.submissions]) {
      const result = await this.boundary.append(this.actor, submission);
      if (result.accepted) {
        admitted++;
        this.pending.retire(submission.id);
      } else {
        rejected.push({ id: submission.id, reasons: result.reasons });
      }
    }
    return { admitted, rejected };
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
