/**
 * @geofarm/client-render — the render core (RFC-0015).
 *
 * Marks are derived visual elements, many-to-many with content, and every
 * mark is answerable: picking resolves to world content through the
 * Reading (RFC-0015 §1). Each visible lens yields an independent mark
 * stream (§2); derivation is invalidated along exactly two axes (§3):
 * attention (the View changed) and knowledge (the Reading advanced) —
 * realized as a watermark-and-View-keyed cache that accelerates and never
 * adjudicates (§6; RFC-0014 law 2).
 *
 * World animation is temporal re-projection (§7): every frame is a true
 * frame — the as-of resolution below selects, per supersession chain, the
 * revision whose occurrence had happened by the bound time.
 *
 * No pixels here: this package derives; a visual shell consumes.
 */

import type { AdmittedRecord, Geometry, Id, TemporalExtent } from "../../world/index.ts";
import { geometryIntersectsArea } from "../../world/spatial.ts";
import { matchesScope } from "../../access/index.ts";
import type { ReadingStore, View } from "../stores/index.ts";

export const PACKAGE = "@geofarm/client-render" as const;

/** A derived visual element; `presents` is its answerability (RFC-0015 §1). */
export type Mark = {
  key: string;
  lens: string;
  geometry: Geometry;
  presents: Id[];
};

/**
 * As-of resolution (RFC-0004 §4 at the surface): for each supersession
 * chain, the standing revision at the bound moment — the newest link whose
 * occurrence start is within the binding. Links corrected later than the
 * bound time render as they then were: every frame a true frame.
 */
export function standingAsOf(
  records: readonly AdmittedRecord[],
  time: TemporalExtent,
): AdmittedRecord[] {
  const bound = time.end !== undefined ? Date.parse(time.end) : Date.parse(time.start);
  const happened = records.filter((r) => Date.parse(r.occurrence.start) <= bound);
  const supersededByThen = new Set<Id>();
  for (const r of happened) {
    if (r.supersedes !== undefined) supersededByThen.add(r.supersedes);
    if (r.retracts !== undefined) supersededByThen.add(r.retracts);
  }
  return happened.filter((r) => !supersededByThen.has(r.id));
}

/**
 * Derive the mark streams for a View over a Reading. Pure: same inputs,
 * same marks. One stream per visible lens; a record may appear in several
 * (one object, several marks); every mark carries what it presents.
 */
export function deriveMarks(reading: ReadingStore, view: View): Mark[] {
  const asOf = standingAsOf(reading.all(), view.time);
  const marks: Mark[] = [];
  for (const lens of view.lenses) {
    if (!lens.visible) continue;
    for (const r of asOf) {
      const place = reading.placeOf(r.id);
      if (place === undefined) continue; // nothing to draw, nothing implied
      if (!matchesScope(r, lens.filter, place)) continue;
      if (view.region !== undefined && !geometryIntersectsArea(place, view.region)) continue;
      marks.push({ key: `${lens.name}:${r.id}`, lens: lens.name, geometry: place, presents: [r.id] });
    }
  }
  return marks;
}

/** Picking (RFC-0015 §1): a pixel's question, answered from the Reading. */
export function pickAt(
  marks: readonly Mark[],
  reading: ReadingStore,
  point: [number, number],
): AdmittedRecord[] {
  const probe = {
    form: "area" as const,
    rings: [
      [
        [point[0] - 1e-6, point[1] - 1e-6],
        [point[0] + 1e-6, point[1] - 1e-6],
        [point[0] + 1e-6, point[1] + 1e-6],
        [point[0] - 1e-6, point[1] + 1e-6],
        [point[0] - 1e-6, point[1] - 1e-6],
      ] as [number, number][],
    ],
  };
  const hits = new Set<Id>();
  for (const m of marks) {
    if (geometryIntersectsArea(m.geometry, probe)) {
      for (const id of m.presents) hits.add(id);
    }
  }
  return [...hits]
    .map((id) => reading.get(id))
    .filter((r): r is AdmittedRecord => r !== undefined);
}

/**
 * The two-axis cache (RFC-0015 §3, §6): keyed by the Reading's watermark
 * (knowledge) and the View's derivation-relevant fields (attention).
 * Immortal per key — inputs are immutable; staleness is a key change, not
 * a discovery. Accelerates only: dropping it changes nothing but speed.
 */
export class MarkCache {
  private key = "";
  private marks: Mark[] = [];

  derive(reading: ReadingStore, view: View): { marks: Mark[]; recomputed: boolean } {
    const key = JSON.stringify([
      reading.watermark,
      view.region,
      view.time,
      view.lenses.map((l) => [l.name, l.visible, l.filter]),
    ]);
    if (key === this.key) return { marks: this.marks, recomputed: false };
    this.key = key;
    this.marks = deriveMarks(reading, view);
    return { marks: this.marks, recomputed: true };
  }
}
