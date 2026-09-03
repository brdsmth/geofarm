/**
 * @geofarm/feeds-weather — a sampled source as participant (RFC-0011,
 * RFC-0016 I1; S4 generalized it: a weather station and a soil-sampling
 * site are the same shape of source, unlike only in what their records
 * are called and what their channels mean — both border configuration,
 * RFC-0011 §2 Amendment 1).
 *
 * An engaged external Actor authoring under representation: sites enter
 * as Entity introductions, measurements as Observation Events, forecasts
 * and modeled values as Assertions with stated confidence and outward
 * grounds. Ownership lands with the organization; provenance stays with
 * the feed (RFC-0011 §5).
 *
 * The adapter is config + translation with no semantics and no state of
 * its own (PLAN-001 §4, module rule 4): foreign identifiers ride as body
 * payload, resolution is by projection, and every record enters through
 * the boundary like anyone's. Re-delivery is ordinary: a reading the
 * world already holds is found, not duplicated — introduce-then-join
 * (RFC-0011 §3) applied to measurements as well as to sites — so a pull
 * repeated tomorrow admits only what is new. The world is the only memory.
 *
 * Epistemic classification is configuration, reviewed like code, with the
 * conservative default of RFC-0011 §2: a channel not known to be a
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
  /**
   * What the admitted records are called (S4, RFC-0016 §4; RFC-0011 §2
   * Amendment 1): a sampled source is a sampled source — a weather station
   * and a soil-sampling site are unlike only in what they are called and
   * what their channels mean, both of which are border configuration.
   */
  classifications?: { site: string; measurement: string; estimate: string };
};

const WEATHER_NAMES = { site: "weather-station", measurement: "reading", estimate: "weather-estimate" };

/** The forecast classification is shared by every sampled source: a
 * claim about the future is a claim about the future (RFC-0007 §5). */
export const FORECAST_CLASSIFICATION = "forecast";

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

/** The reason a re-delivered record is found rather than admitted again. */
export const ALREADY_RECORDED = "already recorded";

type Body = { foreignId?: string; channel?: string; value?: number };

export class WeatherFeed {
  constructor(
    private readonly boundary: Boundary,
    private readonly actor: Id,
    private readonly config: WeatherFeedConfig,
  ) {}

  private acting(): { actor: Id; onBehalfOf: Id[] } {
    return { actor: this.actor, onBehalfOf: [this.config.org] };
  }

  private get names(): { site: string; measurement: string; estimate: string } {
    return this.config.classifications ?? WEATHER_NAMES;
  }

  /** Everything the feed can see, in one walk (RFC-0012 §4) — resolution
   * is by projection and stateless, but it is taken once per batch, not
   * once per record (REVIEW-003 §2.F). */
  private async known(): Promise<AdmittedRecord[]> {
    return (await this.boundary.walk(this.actor, 0, Number.MAX_SAFE_INTEGER)).records;
  }

  private stationsIn(known: readonly AdmittedRecord[]): Map<string, AdmittedRecord> {
    const out = new Map<string, AdmittedRecord>();
    for (const r of known) {
      const foreign = (r.body as Body | undefined)?.foreignId;
      if (r.classification === this.names.site && foreign !== undefined) out.set(foreign, r);
    }
    return out;
  }

  /** Introduce-then-join (RFC-0011 §3): unknown stations are introduced;
   * known ones are found, never duplicated. */
  async ensureStation(input: StationInput): Promise<Id> {
    const existing = this.stationsIn(await this.known()).get(input.foreignId);
    if (existing !== undefined) return existing.id;
    const candidate: CandidateRecord = {
      id: newId(),
      kind: "entity",
      classification: this.names.site,
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
   * Assertions; unconfigured channels are skipped with a reason; readings
   * the world already holds are found, not repeated. */
  async ingestReadings(inputs: ChannelReadingInput[]): Promise<IngestReport> {
    const report: IngestReport = { admitted: 0, skipped: [] };
    const known = await this.known();
    const stations = this.stationsIn(known);
    const held = new Set<string>();
    for (const r of known) {
      if (r.classification !== this.names.measurement && r.classification !== this.names.estimate) continue;
      const body = r.body as Body | undefined;
      if (body?.channel !== undefined) held.add(`${r.subjects[0]}|${body.channel}|${r.occurrence.start}`);
    }
    for (const input of inputs) {
      const cls = this.config.channels[input.channel];
      if (cls === undefined) {
        report.skipped.push({ input, reason: `unconfigured channel: ${input.channel}` });
        continue;
      }
      const station = stations.get(input.foreignStationId);
      if (station === undefined) {
        report.skipped.push({ input, reason: `unknown station: ${input.foreignStationId}` });
        continue;
      }
      const key = `${station.id}|${input.channel}|${input.time}`;
      if (held.has(key)) {
        report.skipped.push({ input, reason: ALREADY_RECORDED });
        continue;
      }
      const candidate: CandidateRecord =
        cls === "measurement"
          ? {
              id: newId(),
              kind: "event",
              classification: this.names.measurement,
              actors: this.acting(),
              occurrence: { start: input.time },
              subjects: [station.id],
              body: { channel: input.channel, value: input.value },
            }
          : {
              id: newId(),
              kind: "assertion",
              classification: this.names.estimate,
              actors: this.acting(),
              occurrence: { start: input.time },
              subjects: [station.id],
              grounds: [{ source: this.config.ground, citation: input.channel }],
              confidence: 0.5, // an interpretation with unstated certainty
              body: { channel: input.channel, value: input.value },
            };
      const result = await this.boundary.append(this.actor, candidate);
      if (result.accepted) {
        report.admitted++;
        held.add(key);
      } else report.skipped.push({ input, reason: result.reasons.join("; ") });
    }
    return report;
  }

  /** Forecasts are present claims about the future (RFC-0007 §5):
   * future-dated Assertions, confidence stated, grounds cited. The same
   * forecast (station, channel, moment, issue) is admitted once. */
  async ingestForecasts(inputs: ForecastInput[]): Promise<IngestReport> {
    const report: IngestReport = { admitted: 0, skipped: [] };
    const known = await this.known();
    const stations = this.stationsIn(known);
    const held = new Set<string>();
    for (const r of known) {
      if (r.classification !== FORECAST_CLASSIFICATION) continue;
      const body = r.body as Body | undefined;
      const issued = r.grounds?.[0]?.citation ?? "";
      if (body?.channel !== undefined) held.add(`${r.subjects[0]}|${body.channel}|${r.occurrence.start}|${issued}`);
    }
    for (const input of inputs) {
      const station = stations.get(input.foreignStationId);
      if (station === undefined) {
        report.skipped.push({ input, reason: `unknown station: ${input.foreignStationId}` });
        continue;
      }
      const citation = `issued ${input.issued}`;
      const key = `${station.id}|${input.channel}|${input.validAt}|${citation}`;
      if (held.has(key)) {
        report.skipped.push({ input, reason: ALREADY_RECORDED });
        continue;
      }
      const result = await this.boundary.append(this.actor, {
        id: newId(),
        kind: "assertion",
        classification: FORECAST_CLASSIFICATION,
        actors: this.acting(),
        occurrence: { start: input.validAt },
        subjects: [station.id],
        grounds: [{ source: this.config.ground, citation }],
        confidence: input.probability,
        body: { channel: input.channel, value: input.value },
      });
      if (result.accepted) {
        report.admitted++;
        held.add(key);
      } else report.skipped.push({ input, reason: result.reasons.join("; ") });
    }
    return report;
  }
}
