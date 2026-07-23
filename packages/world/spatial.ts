/**
 * Derived spatial relationships (RFC-0003 §5): computed from geometry in
 * the one shared frame, never stored. Pure functions, no I/O.
 *
 * Soundness note for access (RFC-0002 §2.3, S6): scope-inclusion tests must
 * never over-include. Every predicate here is exact for simple polygons;
 * where a case is not decided exactly, it returns the conservative answer
 * (not-contained / not-intersecting), which under-includes and cannot leak.
 */

import type { Area, Coordinate, Geometry, TemporalExtent } from "./index.ts";

type Ring = Coordinate[];

// ------------------------------------------------------------- primitives

function orient(a: Coordinate, b: Coordinate, c: Coordinate): number {
  const v = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  return v > 0 ? 1 : v < 0 ? -1 : 0;
}

function onSegment(a: Coordinate, b: Coordinate, p: Coordinate): boolean {
  return (
    orient(a, b, p) === 0 &&
    Math.min(a[0], b[0]) <= p[0] &&
    p[0] <= Math.max(a[0], b[0]) &&
    Math.min(a[1], b[1]) <= p[1] &&
    p[1] <= Math.max(a[1], b[1])
  );
}

export function segmentsIntersect(
  a1: Coordinate,
  a2: Coordinate,
  b1: Coordinate,
  b2: Coordinate,
): boolean {
  const o1 = orient(a1, a2, b1);
  const o2 = orient(a1, a2, b2);
  const o3 = orient(b1, b2, a1);
  const o4 = orient(b1, b2, a2);
  if (o1 !== o2 && o3 !== o4) return true;
  return (
    (o1 === 0 && onSegment(a1, a2, b1)) ||
    (o2 === 0 && onSegment(a1, a2, b2)) ||
    (o3 === 0 && onSegment(b1, b2, a1)) ||
    (o4 === 0 && onSegment(b1, b2, a2))
  );
}

/** Ray-cast point-in-ring; boundary points count as inside. */
export function pointInRing(p: Coordinate, ring: Ring): boolean {
  for (let i = 0; i < ring.length - 1; i++) {
    if (onSegment(ring[i] as Coordinate, ring[i + 1] as Coordinate, p)) return true;
  }
  let inside = false;
  for (let i = 0, j = ring.length - 2; i < ring.length - 1; j = i++) {
    const [xi, yi] = ring[i] as Coordinate;
    const [xj, yj] = ring[j] as Coordinate;
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** Rings[0] is the outer boundary; further rings are holes (RFC-0003 §3). */
export function pointInArea(p: Coordinate, area: Area): boolean {
  const outer = area.rings[0];
  if (outer === undefined || !pointInRing(p, outer)) return false;
  for (const hole of area.rings.slice(1)) {
    // Strictly inside a hole is outside; hole boundaries still count inside.
    if (pointInRing(p, hole) && !hole.some((_, i) => i < hole.length - 1 && onSegment(hole[i] as Coordinate, hole[i + 1] as Coordinate, p))) {
      return false;
    }
  }
  return true;
}

function ringEdges(ring: Ring): [Coordinate, Coordinate][] {
  const edges: [Coordinate, Coordinate][] = [];
  for (let i = 0; i < ring.length - 1; i++) {
    edges.push([ring[i] as Coordinate, ring[i + 1] as Coordinate]);
  }
  return edges;
}

function ringsCross(a: Ring, b: Ring): boolean {
  for (const [a1, a2] of ringEdges(a)) {
    for (const [b1, b2] of ringEdges(b)) {
      if (segmentsIntersect(a1, a2, b1, b2)) return true;
    }
  }
  return false;
}

// ------------------------------------------------------- area relationships

export function areaIntersectsArea(a: Area, b: Area): boolean {
  const ao = a.rings[0];
  const bo = b.rings[0];
  if (ao === undefined || bo === undefined) return false;
  if (ao.some((p) => pointInArea(p, b))) return true;
  if (bo.some((p) => pointInArea(p, a))) return true;
  return ringsCross(ao, bo);
}

/** Containment of b within a: every vertex inside, no boundary crossing. */
export function areaContainsArea(a: Area, b: Area): boolean {
  const bo = b.rings[0];
  if (bo === undefined) return false;
  if (!bo.every((p) => pointInArea(p, a))) return false;
  for (const ringOfA of a.rings) {
    // Shared boundary points are permitted; crossings are not. A crossing
    // implies some vertex of one ring strictly inside and another outside,
    // already excluded above for b's vertices — but a's holes can still cut
    // through b, so check b's edges against every ring of a.
    for (const [b1, b2] of ringEdges(bo)) {
      for (const [a1, a2] of ringEdges(ringOfA)) {
        if (
          segmentsIntersect(a1, a2, b1, b2) &&
          !onSegment(a1, a2, b1) &&
          !onSegment(a1, a2, b2) &&
          !onSegment(b1, b2, a1) &&
          !onSegment(b1, b2, a2)
        ) {
          return false;
        }
      }
    }
  }
  return true;
}

function pathWithinArea(path: Coordinate[], area: Area): boolean {
  if (!path.every((p) => pointInArea(p, area))) return false;
  for (let i = 0; i < path.length - 1; i++) {
    for (const ring of area.rings) {
      for (const [a1, a2] of ringEdges(ring)) {
        const p1 = path[i] as Coordinate;
        const p2 = path[i + 1] as Coordinate;
        if (
          segmentsIntersect(a1, a2, p1, p2) &&
          !onSegment(a1, a2, p1) &&
          !onSegment(a1, a2, p2) &&
          !onSegment(p1, p2, a1) &&
          !onSegment(p1, p2, a2)
        ) {
          return false;
        }
      }
    }
  }
  return true;
}

function pathIntersectsArea(path: Coordinate[], area: Area): boolean {
  if (path.some((p) => pointInArea(p, area))) return true;
  const outer = area.rings[0];
  if (outer === undefined) return false;
  for (let i = 0; i < path.length - 1; i++) {
    for (const [a1, a2] of ringEdges(outer)) {
      if (segmentsIntersect(a1, a2, path[i] as Coordinate, path[i + 1] as Coordinate)) return true;
    }
  }
  return false;
}

// ---------------------------------------------------- geometry vs. region

/** Does any part of g lie within the region? (Visibility — RFC-0003 §6.) */
export function geometryIntersectsArea(g: Geometry, region: Area): boolean {
  switch (g.form) {
    case "position":
      return pointInArea(g.coordinates, region);
    case "path":
      return pathIntersectsArea(g.coordinates, region);
    case "area":
      return areaIntersectsArea(g, region);
    case "volume":
      return areaIntersectsArea({ form: "area", rings: g.base }, region);
    case "collection":
      return g.members.some((m) => geometryIntersectsArea(m, region));
  }
}

/** Does the whole of g lie within the region? (Scope inclusion — RFC-0002.) */
export function geometryWithinArea(g: Geometry, region: Area): boolean {
  switch (g.form) {
    case "position":
      return pointInArea(g.coordinates, region);
    case "path":
      return pathWithinArea(g.coordinates, region);
    case "area":
      return areaContainsArea(region, g);
    case "volume":
      return areaContainsArea(region, { form: "area", rings: g.base });
    case "collection":
      return g.members.every((m) => geometryWithinArea(m, region));
  }
}

// -------------------------------------------------------------------- time

/** Interval overlap (RFC-0004 §2); open ends are unbounded. */
export function temporalOverlaps(a: TemporalExtent, b: TemporalExtent): boolean {
  const aStart = Date.parse(a.start);
  const bStart = Date.parse(b.start);
  const aEnd = a.end === undefined ? aStart : Date.parse(a.end);
  const bEnd = b.end === undefined ? Number.POSITIVE_INFINITY : Date.parse(b.end);
  return aStart <= bEnd && bStart <= aEnd;
}

/** Is a entirely within b? Instants are their own extent. */
export function temporalWithin(a: TemporalExtent, b: TemporalExtent): boolean {
  const aStart = Date.parse(a.start);
  const aEnd = a.end === undefined ? aStart : Date.parse(a.end);
  const bStart = Date.parse(b.start);
  const bEnd = b.end === undefined ? Number.POSITIVE_INFINITY : Date.parse(b.end);
  return aStart >= bStart && aEnd <= bEnd;
}
