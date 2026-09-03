/**
 * The National Weather Service (api.weather.gov) as a sampled source —
 * the first live provider behind the weather adapter (REVIEW-004 §7).
 * Free, keyless, US-only; it asks for a User-Agent that names the caller.
 *
 * Translation only (PLAN-001 §4, module rule 4): the functions below turn
 * the provider's JSON into the adapter's inputs and hold no state. The
 * border classification is exported beside them as configuration:
 * station observations are measurements; the hourly forecast is a set of
 * claims about the future with the provider's own stated probability
 * where it states one, and an unstated one (0.5) where it does not
 * (RFC-0011 §2 Amendment 1 — never promoted by optimism).
 */

import type { ChannelReadingInput, EpistemicClass, ForecastInput, StationInput } from "./index.ts";

export const NWS_BASE = "https://api.weather.gov";

/** The provider's channels, classified at the border. */
export const NWS_CHANNELS: Record<string, EpistemicClass> = {
  tempC: "measurement",
  dewpointC: "measurement",
  humidityPct: "measurement",
  windKph: "measurement",
  precipMm: "measurement",
};

/** The outward ground the forecast cites: NWS's gridded forecast. */
export const NWS_GROUND = "nws-gridpoint-forecast";

export type NwsFetch = (url: string) => Promise<unknown>;

/** A fetch that carries the User-Agent the service requires. */
export function nwsFetch(userAgent: string, fetchImpl: typeof fetch = fetch): NwsFetch {
  return async (url) => {
    const res = await fetchImpl(url, { headers: { "User-Agent": userAgent, Accept: "application/geo+json" } });
    if (!res.ok) throw new Error(`nws ${res.status}: ${url}`);
    return res.json();
  };
}

type Quantity = { value: number | null; unitCode?: string; qualityControl?: string } | undefined;

export type NwsObservationFeature = {
  properties: {
    timestamp: string;
    temperature?: Quantity;
    dewpoint?: Quantity;
    relativeHumidity?: Quantity;
    windSpeed?: Quantity;
    precipitationLastHour?: Quantity;
  };
};

export type NwsForecastPeriod = {
  startTime: string;
  temperature: number;
  temperatureUnit: "F" | "C";
  probabilityOfPrecipitation?: { value: number | null };
};

/** Quality-control flags the provider itself marks as rejected or bad. */
const REJECTED = new Set(["X", "B"]);

function usable(q: Quantity): number | undefined {
  if (q === undefined || q.value === null || !Number.isFinite(q.value)) return undefined;
  if (q.qualityControl !== undefined && REJECTED.has(q.qualityControl)) return undefined;
  return q.value;
}

/** Observations → measurements, one per channel per timestamp. Missing
 * and rejected values are left out; nothing is interpolated. */
export function observationsToReadings(
  features: readonly NwsObservationFeature[],
  foreignStationId: string,
): ChannelReadingInput[] {
  const out: ChannelReadingInput[] = [];
  for (const f of features) {
    const p = f.properties;
    const time = new Date(p.timestamp).toISOString();
    const channels: [string, Quantity][] = [
      ["tempC", p.temperature],
      ["dewpointC", p.dewpoint],
      ["humidityPct", p.relativeHumidity],
      ["windKph", p.windSpeed],
      ["precipMm", p.precipitationLastHour],
    ];
    for (const [channel, q] of channels) {
      const value = usable(q);
      if (value !== undefined) out.push({ foreignStationId, channel, time, value: round(value) });
    }
  }
  return out;
}

/** Hourly forecast periods → claims about the future. Temperature carries
 * no stated probability (0.5, unstated); rain carries the provider's own. */
export function forecastToInputs(
  periods: readonly NwsForecastPeriod[],
  foreignStationId: string,
  issued: string,
  hours = 48,
): ForecastInput[] {
  const out: ForecastInput[] = [];
  for (const period of periods.slice(0, hours)) {
    const validAt = new Date(period.startTime).toISOString();
    const tempC = period.temperatureUnit === "F" ? ((period.temperature - 32) * 5) / 9 : period.temperature;
    out.push({ foreignStationId, issued, validAt, channel: "tempC", value: round(tempC), probability: 0.5 });
    const pop = period.probabilityOfPrecipitation?.value;
    if (pop !== undefined && pop !== null) {
      out.push({ foreignStationId, issued, validAt, channel: "rainChancePct", value: pop, probability: pop / 100 });
    }
  }
  return out;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// ------------------------------------------------------------------ pulls

export type NwsPoint = {
  gridId: string;
  gridX: number;
  gridY: number;
  forecastHourly: string;
  observationStations: string;
};

export async function nwsPoint(get: NwsFetch, lat: number, lon: number): Promise<NwsPoint> {
  const doc = (await get(`${NWS_BASE}/points/${lat.toFixed(4)},${lon.toFixed(4)}`)) as {
    properties: NwsPoint;
  };
  return doc.properties;
}

/** The nearest observing station the service lists for the point. */
export async function nwsNearestStation(get: NwsFetch, point: NwsPoint): Promise<StationInput> {
  const doc = (await get(point.observationStations)) as {
    features: { properties: { stationIdentifier: string; name: string }; geometry: { coordinates: [number, number] } }[];
  };
  const first = doc.features[0];
  if (first === undefined) throw new Error("nws: no observing station for this point");
  return {
    foreignId: `nws:${first.properties.stationIdentifier}`,
    name: first.properties.name,
    lon: first.geometry.coordinates[0],
    lat: first.geometry.coordinates[1],
  };
}

export async function nwsObservations(
  get: NwsFetch,
  station: StationInput,
  opts: { start?: string; end?: string; limit?: number } = {},
): Promise<ChannelReadingInput[]> {
  const id = station.foreignId.replace(/^nws:/, "");
  const q = new URLSearchParams();
  if (opts.start !== undefined) q.set("start", opts.start);
  if (opts.end !== undefined) q.set("end", opts.end);
  q.set("limit", String(opts.limit ?? 500));
  const doc = (await get(`${NWS_BASE}/stations/${id}/observations?${q}`)) as {
    features: NwsObservationFeature[];
  };
  return observationsToReadings(doc.features, station.foreignId);
}

export async function nwsHourlyForecast(
  get: NwsFetch,
  point: NwsPoint,
  station: StationInput,
  hours = 48,
): Promise<ForecastInput[]> {
  const doc = (await get(point.forecastHourly)) as {
    properties: { updateTime: string; periods: NwsForecastPeriod[] };
  };
  const issued = new Date(doc.properties.updateTime).toISOString();
  return forecastToInputs(doc.properties.periods, station.foreignId, issued, hours);
}
