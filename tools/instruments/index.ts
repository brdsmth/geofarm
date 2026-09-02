/**
 * The instruments (RFC-0016 §4 S9; REVIEW-002 §9 S10; PLAN-001 §1) —
 * the measurements the MVP exists to take, as pure functions over
 * admitted records. Built alongside the features, read at M8, and
 * reported to the review RFC-0016 §8 obligates. Nothing here decides
 * anything; thresholds are the review's to set (RFC-0016 §8).
 */

import type { AdmittedRecord, Id } from "../../packages/world/index.ts";
import { grantBodyOf, type Scope } from "../../packages/access/index.ts";

// ------------------------------------------------- S9 (c): grant shape

/**
 * RFC-0002 §8.5's tripwire: if real grants collapse to identity-scopes,
 * Resources were rebuilt with extra steps. Classify every grant's scope
 * by the dimensions it uses.
 */
export type GrantShape = "predicate" | "identity" | "mixed" | "universal";

export function shapeOf(scope: Scope): GrantShape {
  const predicateDims = (
    ["kinds", "classifications", "region", "period", "sources", "owners", "minConfidence"] as const
  ).filter((d) => scope[d] !== undefined);
  const identity = scope.ids !== undefined && scope.ids.length > 0;
  if (predicateDims.length === 0 && !identity) return "universal";
  if (predicateDims.length > 0 && identity) return "mixed";
  return identity ? "identity" : "predicate";
}

export type GrantShapeReading = {
  total: number;
  byShape: Record<GrantShape, number>;
  /** Only grants that confer something count as shares; revocations and
   * lapsed terms are grant history, not grant shape. */
  revocations: number;
};

export function grantShape(records: readonly AdmittedRecord[]): GrantShapeReading {
  const reading: GrantShapeReading = {
    total: 0,
    byShape: { predicate: 0, identity: 0, mixed: 0, universal: 0 },
    revocations: 0,
  };
  for (const r of records) {
    const body = grantBodyOf(r);
    if (body === undefined) continue;
    if (body.capabilities.length === 0) {
      reading.revocations++;
      continue;
    }
    reading.total++;
    reading.byShape[shapeOf(body.scope)]++;
  }
  return reading;
}

// ------------------------------------- S9 (a): bitemporal divergence

/**
 * RFC-0004 §11's question — "the most important idea or the most
 * over-built one" — measured: how often occurrence and knowledge time
 * meaningfully differ. The MVP designed three divergence sources in
 * (offline, backfill, forecasts); the reading says whether they showed up.
 */
export type DivergenceReading = {
  total: number;
  /** Records whose |knowledge − occurrence| exceeds the threshold. */
  diverging: number;
  rate: number;
  /** Records known before they occurred: forecasts and other claims about
   * the future (RFC-0007 §5) — divergence of the other sign. */
  knownBeforeOccurring: number;
  /** Records that arrived long after: backfill and offline authorship. */
  learnedLate: number;
  byClassification: Record<string, { total: number; diverging: number }>;
};

export function bitemporalDivergence(
  records: readonly AdmittedRecord[],
  thresholdMs = 24 * 60 * 60 * 1000,
): DivergenceReading {
  const reading: DivergenceReading = {
    total: 0,
    diverging: 0,
    rate: 0,
    knownBeforeOccurring: 0,
    learnedLate: 0,
    byClassification: {},
  };
  for (const r of records) {
    // Introductions posit identity with a nominal past; they measure
    // nothing about how the farm learns. Grants are about agency.
    if (r.kind === "actor" || grantBodyOf(r) !== undefined) continue;
    reading.total++;
    const gap = Date.parse(r.knowledgeTime) - Date.parse(r.occurrence.start);
    const bucket = (reading.byClassification[r.classification] ??= { total: 0, diverging: 0 });
    bucket.total++;
    if (Math.abs(gap) > thresholdMs) {
      reading.diverging++;
      bucket.diverging++;
      if (gap < 0) reading.knownBeforeOccurring++;
      else reading.learnedLate++;
    }
  }
  reading.rate = reading.total === 0 ? 0 : reading.diverging / reading.total;
  return reading;
}

// -------------------------------------- S9 (b): promotion of answers

/**
 * RFC-0010 §9's invisible-advice worry: conversational answers evaporate
 * unless kept. The rate of kept answers over offered claims is the
 * measure; the engagements themselves report the counts (they are the
 * only place an offered-but-unkept claim ever existed).
 */
export type PromotionReading = {
  offered: number;
  promoted: number;
  rate: number;
  /** Standing AI-authored claims in the world, by classification — the
   * promoted half read back from the record. */
  recorded: Record<string, number>;
};

export function promotionRate(
  engagements: readonly { offered: number; promoted: number }[],
  records: readonly AdmittedRecord[],
  agentActors: readonly Id[],
): PromotionReading {
  const offered = engagements.reduce((n, e) => n + e.offered, 0);
  const promoted = engagements.reduce((n, e) => n + e.promoted, 0);
  const recorded: Record<string, number> = {};
  for (const r of records) {
    if (r.kind === "assertion" && agentActors.includes(r.actors.actor)) {
      recorded[r.classification] = (recorded[r.classification] ?? 0) + 1;
    }
  }
  return { offered, promoted, rate: offered === 0 ? 0 : promoted / offered, recorded };
}

// --------------------------------------------------------- S1, S2, S5

/**
 * Structural criteria read from the source tree: one destination (S1),
 * three stores (S2), no audit feature (S5). Each is a grep, on purpose —
 * the criterion is that the thing does not exist, and absence is what a
 * grep can prove.
 */
export type StructuralReading = {
  /** S1: files under apps/ that define a route or a second page. */
  destinations: number;
  /** S2: store classes in the client packages. */
  stores: string[];
  /** S5: exported symbols named for audit anywhere in packages/. */
  auditSymbols: string[];
};

export function structural(sources: readonly { path: string; text: string }[]): StructuralReading {
  const destinations = sources.filter(
    (f) =>
      f.path.startsWith("apps/") &&
      (/\b(create\w*Router|new \w*Router)\b|history\.pushState|<Route\b|<a href="\//.test(f.text) ||
        (f.path.endsWith(".html") && !f.path.endsWith("index.html"))),
  ).length;
  const stores: string[] = [];
  const auditSymbols: string[] = [];
  for (const f of sources) {
    if (f.path.startsWith("packages/client/stores/")) {
      for (const m of f.text.matchAll(/export class (\w+Store)\b/g)) stores.push(m[1] as string);
    }
    if (f.path.startsWith("packages/") && !f.path.endsWith(".test.ts")) {
      for (const m of f.text.matchAll(/export (?:class|function|const|type) (\w*audit\w*)/gi)) {
        auditSymbols.push(`${f.path}:${m[1]}`);
      }
    }
  }
  return { destinations, stores, auditSymbols };
}
