/**
 * @geofarm/feeds-weather — the weather provider as participant (RFC-0011,
 * RFC-0016 I1).
 *
 * An engaged external Actor authoring under representation: stations enter
 * as Entity introductions, measurements as Observation Events, forecasts
 * as future-dated Assertions with stated confidence and outward grounds.
 * Ownership lands with the organization; provenance stays with the feed
 * (RFC-0011 §5).
 *
 * The adapter is config + translation with no semantics and no state of
 * its own (PLAN-001 §4, module rule 4): foreign identifiers ride as body
 * payload, resolution is by projection, and every record enters through
 * the boundary like anyone's.
 *
 * Epistemic classification is configuration, reviewed like code, with the
 * conservative default of RFC-0011 §9: a channel not known to be a
 * measurement is admitted as an interpretation (Assertion) or skipped —
 * never promoted to observation by optimism.
 */

import { newId, type CandidateRecord, type Id } from "../../world/index.ts";
import type { AdmittedRecord } from "../../world/index.ts";
import type { Boundary } from "../../boundary/index.ts";

export const PACKAGE = "@geofarm/feeds-weather" as const;

export type EpistemicClass = "measurement" | "interpretation";

export type WeatherFeedConfig = {
  /** The organization the feed is engaged by (represents). */
  org: Id;
  /** Auditable classification of the provider's channels (RFC-0011 §2). */
  channels: Record<string, EpistemicClass>;
  /** The outward ground cited by the provider's derived numbers. */
  ground: string;
};

export type StationInput = { foreignId: string; name: string; lon: number; lat: number };
export type ChannelReadingInput = {
  foreignStationId: string;
  channel: string;
  time: string;
  value: number;
};
export type ForecastInput = {
  foreignStationId: string;
  issued: string;
  validAt: string;
  channel: string;
  value: number;
  probability: number;
};

export type IngestReport = {
  admitted: number;
  skipped: { input: unknown; reason: string }[];
};

export class WeatherFeed {
  constructor(
    private readonly boundary: Boundary,
    private readonly actor: Id,
    private readonly config: WeatherFeedConfig,
  ) {}

  private acting(): { actor: Id; onBehalfOf: Id[] } {
    return { actor: this.actor, onBehalfOf: [this.config.org] };
  }

  /** Resolve a station by foreign id through the feed's own projection —
   * stateless: the world is the only memory (RFC-0011 §3). */
  private async findStation(foreignId: string): Promise<AdmittedRecord | undefined> {
    const known = (await this.boundary.project(this.actor, { read: { form: "known" } })) as {
      viewable: Id[];
    };
    for (const id of known.viewable) {
      const reading = (await this.boundary.project(this.actor, {
        read: { form: "record", id },
      })) as { level: string; record?: AdmittedRecord } | undefined;
      const r = reading?.record;
      if (
        r !== undefined &&
        r.classification === "weather-station" &&
        (r.body as { foreignId?: string } | undefined)?.foreignId === foreignId
      ) {
        return r;
      }
    }
    return undefined;
  }

  /** Introduce-then-join (RFC-0011 §3): unknown stations are introduced;
   * known ones are found, never duplicated. */
  async ensureStation(input: StationInput): Promise<Id> {
    const existing = await this.findStation(input.foreignId);
    if (existing !== undefined) return existing.id;
    const candidate: CandidateRecord = {
      id: newId(),
      kind: "entity",
      classification: "weather-station",
      actors: this.acting(),
      occurrence: { start: "1970-01-01T00:00:00Z" }, // stood before our records
      geometry: { form: "position", coordinates: [input.lon, input.lat] },
      subjects: [],
      body: { foreignId: input.foreignId, name: input.name },
    };
    const result = await this.boundary.append(this.actor, candidate);
    if (!result.accepted) throw new Error(`station refused: ${result.reasons.join("; ")}`);
    return result.record.id;
  }

  /** Measurements become Observation Events; interpreted channels become
   * Assertions; unconfigured channels are skipped with a reason. */
  async ingestReadings(inputs: ChannelReadingInput[]): Promise<IngestReport> {
    const report: IngestReport = { admitted: 0, skipped: [] };
    for (const input of inputs) {
      const cls = this.config.channels[input.channel];
      if (cls === undefined) {
        report.skipped.push({ input, reason: `unconfigured channel: ${input.channel}` });
        continue;
      }
      const station = await this.findStation(input.foreignStationId);
      if (station === undefined) {
        report.skipped.push({ input, reason: `unknown station: ${input.foreignStationId}` });
        continue;
      }
      const candidate: CandidateRecord =
        cls === "measurement"
          ? {
              id: newId(),
              kind: "event",
              classification: "reading",
              actors: this.acting(),
              occurrence: { start: input.time },
              subjects: [station.id],
              body: { channel: input.channel, value: input.value },
            }
          : {
              id: newId(),
              kind: "assertion",
              classification: "weather-estimate",
              actors: this.acting(),
              occurrence: { start: input.time },
              subjects: [station.id],
              grounds: [{ source: this.config.ground, citation: input.channel }],
              confidence: 0.5, // an interpretation with unstated certainty
              body: { channel: input.channel, value: input.value },
            };
      const result = await this.boundary.append(this.actor, candidate);
      if (result.accepted) report.admitted++;
      else report.skipped.push({ input, reason: result.reasons.join("; ") });
    }
    return report;
  }

  /** Forecasts are present claims about the future (RFC-0007 §5):
   * future-dated Assertions, confidence stated, grounds cited. */
  async ingestForecasts(inputs: ForecastInput[]): Promise<IngestReport> {
    const report: IngestReport = { admitted: 0, skipped: [] };
    for (const input of inputs) {
      const station = await this.findStation(input.foreignStationId);
      if (station === undefined) {
        report.skipped.push({ input, reason: `unknown station: ${input.foreignStationId}` });
        continue;
      }
      const result = await this.boundary.append(this.actor, {
        id: newId(),
        kind: "assertion",
        classification: "forecast",
        actors: this.acting(),
        occurrence: { start: input.validAt },
        subjects: [station.id],
        grounds: [{ source: this.config.ground, citation: `issued ${input.issued}` }],
        confidence: input.probability,
        body: { channel: input.channel, value: input.value },
      });
      if (result.accepted) report.admitted++;
      else report.skipped.push({ input, reason: result.reasons.join("; ") });
    }
    return report;
  }
}
