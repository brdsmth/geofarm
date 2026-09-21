/**
 * @geofarm/feeds-soil-survey — a mapped survey as participant (RFC-0011).
 *
 * A third shape of source. A sampled source reports from points
 * (feeds-weather); a catalog reports captures (feeds-imagery); a survey
 * reports *delineations*: areas of ground someone walked, drew a line
 * around, and described. Two records per delineated unit:
 *
 *   - The unit itself enters as an Entity introduction — a place, with
 *     the part of its outline the farm engaged the survey for as its
 *     geometry (one area, or a collection when the unit lies in several
 *     pieces). Introduce-then-join (RFC-0011 §3): a unit the world holds
 *     is found by its foreign id, never introduced twice.
 *   - What the survey says about the unit enters as an Assertion about
 *     that place — never an Observation. A survey's properties are
 *     modeled and interpolated from pits dug elsewhere; RFC-0011 §2
 *     Amendment 1(a) classifies that toward claim. Confidence is the
 *     surveyor's own: the share of the unit they say matches the soils
 *     they named it for. Grounds cite the published survey and version.
 *
 * Upstream republication is absorbed as supersession (RFC-0011 §4): a new
 * version of the survey supersedes the description it replaces, and a
 * redrawn outline supersedes the unit — their overwrite, our history.
 *
 * Config + translation, no semantics, no state (PLAN-001 §4, module rule
 * 4): what the records are called is configuration (Amendment 1(b)), the
 * description's content is the provider's and rides as body, and the
 * world is the only memory.
 */

import { newId, type CandidateRecord, type Coordinate, type Geometry, type Id } from "../../world/index.ts";
import type { AdmittedRecord } from "../../world/index.ts";
import type { Boundary } from "../../boundary/index.ts";

export const PACKAGE = "@geofarm/feeds-soil-survey" as const;

export const ALREADY_RECORDED = "already recorded";

export type SurveyFeedConfig = {
  /** The organization the survey is engaged by (represents). */
  org: Id;
  /** The outward ground the descriptions cite (RFC-0009 §3). */
  ground: string;
  /** What the admitted records are called — border configuration. */
  classifications?: { unit: string; description: string };
};

const SURVEY_NAMES = { unit: "soil-unit", description: "soil-survey" };

export type SurveyUnitInput = {
  /** The provider's persistent key for the unit. */
  foreignId: string;
  name: string;
  /** The provider's short symbol for the unit, as printed on its maps. */
  symbol?: string;
  /** The unit's pieces over the engaged region: polygons, each a list of
   * closed rings (outline first, holes after). */
  parts: Coordinate[][][];
  /** The published version this delivery was read from. */
  version: string;
  /** When that version was published (ISO). */
  published: string;
  /** Cited beside the ground: which survey, which version. */
  citation: string;
  /** Share of the unit (0..1) the provider says matches the soils it is
   * named for; absent, the conservative default applies. */
  purity?: number;
  /** Facts of the shape that ride with the unit (e.g. its size here). */
  extent?: Record<string, unknown>;
  /** Everything the survey says about the unit — the provider's words. */
  description: Record<string, unknown>;
};

export type SurveyReport = {
  introduced: number;
  redrawn: number;
  described: number;
  skipped: { input: SurveyUnitInput; reason: string }[];
};

type UnitBody = { foreignId?: string };
type DescriptionBody = { foreignId?: string; version?: string };

function geometryOf(parts: Coordinate[][][]): Geometry | undefined {
  const areas = parts.filter((rings) => rings.length > 0).map((rings) => ({ form: "area" as const, rings }));
  if (areas.length === 0) return undefined;
  return areas.length === 1 ? (areas[0] as Geometry) : { form: "collection", members: areas };
}

export class SoilSurveyFeed {
  constructor(
    private readonly boundary: Boundary,
    private readonly actor: Id,
    private readonly config: SurveyFeedConfig,
  ) {}

  private acting(): { actor: Id; onBehalfOf: Id[] } {
    return { actor: this.actor, onBehalfOf: [this.config.org] };
  }

  private get names(): { unit: string; description: string } {
    return this.config.classifications ?? SURVEY_NAMES;
  }

  /** The standing revision of every unit and description the feed can
   * see, by foreign id — one walk per batch (REVIEW-003 §2.F). The walk
   * is in admission order, so a later revision replaces the one before. */
  private async standing(): Promise<{ units: Map<string, AdmittedRecord>; descriptions: Map<string, AdmittedRecord> }> {
    const units = new Map<string, AdmittedRecord>();
    const descriptions = new Map<string, AdmittedRecord>();
    for (const r of (await this.boundary.walk(this.actor, 0, Number.MAX_SAFE_INTEGER)).records) {
      const foreign = (r.body as UnitBody | undefined)?.foreignId;
      if (foreign === undefined) continue;
      if (r.classification === this.names.unit) units.set(foreign, r);
      else if (r.classification === this.names.description) descriptions.set(foreign, r);
    }
    return { units, descriptions };
  }

  /** A delivery of the survey over the engaged region. Re-delivery is
   * ordinary: what the world already holds is found, not repeated. */
  async ingestSurvey(inputs: SurveyUnitInput[]): Promise<SurveyReport> {
    const report: SurveyReport = { introduced: 0, redrawn: 0, described: 0, skipped: [] };
    const { units, descriptions } = await this.standing();
    for (const input of inputs) {
      const geometry = geometryOf(input.parts);
      if (geometry === undefined) {
        report.skipped.push({ input, reason: "no outline over the engaged region" });
        continue;
      }

      // The place: introduced once, redrawn only when the outline moved.
      let unit = units.get(input.foreignId);
      const sameOutline = unit !== undefined && JSON.stringify(unit.geometry) === JSON.stringify(geometry);
      if (unit === undefined || !sameOutline) {
        const candidate: CandidateRecord = {
          id: newId(),
          kind: "entity",
          classification: this.names.unit,
          actors: this.acting(),
          // A first outline stood before our records; a redrawn one
          // stands from the version that redrew it.
          occurrence: { start: unit === undefined ? "1970-01-01T00:00:00Z" : input.published },
          geometry,
          subjects: [],
          body: {
            foreignId: input.foreignId,
            name: input.name,
            ...(input.symbol !== undefined ? { symbol: input.symbol } : {}),
            ...(input.extent ?? {}),
          },
        };
        if (unit !== undefined) candidate.supersedes = unit.id;
        const result = await this.boundary.append(this.actor, candidate);
        if (!result.accepted) {
          report.skipped.push({ input, reason: result.reasons.join("; ") });
          continue;
        }
        if (unit === undefined) report.introduced++;
        else report.redrawn++;
        unit = result.record;
        units.set(input.foreignId, unit);
      }

      // The claim: one per published version; a new version supersedes.
      const prior = descriptions.get(input.foreignId);
      if ((prior?.body as DescriptionBody | undefined)?.version === input.version && prior?.subjects[0] === unit.id) {
        report.skipped.push({ input, reason: ALREADY_RECORDED });
        continue;
      }
      const claim: CandidateRecord = {
        id: newId(),
        kind: "assertion",
        classification: this.names.description,
        actors: this.acting(),
        occurrence: { start: input.published },
        subjects: [unit.id],
        grounds: [{ source: this.config.ground, citation: input.citation }],
        confidence: input.purity ?? 0.5, // an interpretation with unstated certainty
        body: { foreignId: input.foreignId, version: input.version, ...input.description },
      };
      if (prior !== undefined) claim.supersedes = prior.id;
      const result = await this.boundary.append(this.actor, claim);
      if (result.accepted) {
        report.described++;
        descriptions.set(input.foreignId, result.record);
      } else report.skipped.push({ input, reason: result.reasons.join("; ") });
    }
    return report;
  }
}
