/**
 * Open-Meteo's historical archive (ERA5 reanalysis) as a sampled source:
 * years of daily weather for any point, free and keyless — the archive
 * backfill behind the weather adapter (RFC-0011 §4: backfill is ordinary
 * late-arriving knowledge).
 *
 * The border judgment, made once and recorded here: a reanalysis is a
 * model's reconstruction of the weather, not a station's report of it.
 * Every channel is therefore an *interpretation* — admitted as an
 * estimate with the model cited as its ground — never as a measurement
 * (RFC-0011 §2 Amendment 1, the conservative default). The station is
 * the grid cell the archive answered for.
 */

import type { ChannelReadingInput, EpistemicClass, StationInput } from "./index.ts";

export const OPEN_METEO_ARCHIVE = "https://archive-api.open-meteo.com/v1/archive";

export const OPEN_METEO_CHANNELS: Record<string, EpistemicClass> = {
  tempMaxC: "interpretation",
  tempMinC: "interpretation",
  precipMm: "interpretation",
};

export const OPEN_METEO_GROUND = "open-meteo-era5-reanalysis";

const DAILY: Record<string, string> = {
  tempMaxC: "temperature_2m_max",
  tempMinC: "temperature_2m_min",
  precipMm: "precipitation_sum",
};

export type OpenMeteoArchive = {
  latitude: number;
  longitude: number;
  daily: { time: string[] } & Record<string, (number | null)[] | string[]>;
};

/** The archive's grid cell, as the site the estimates are about. */
export function archiveStation(doc: Pick<OpenMeteoArchive, "latitude" | "longitude">): StationInput {
  return {
    foreignId: `open-meteo:${doc.latitude.toFixed(3)},${doc.longitude.toFixed(3)}`,
    name: "Weather model grid point",
    lon: doc.longitude,
    lat: doc.latitude,
  };
}

/** Daily archive → one estimate per channel per day; gaps stay gaps. */
export function archiveToReadings(doc: OpenMeteoArchive, foreignStationId: string): ChannelReadingInput[] {
  const out: ChannelReadingInput[] = [];
  doc.daily.time.forEach((day, i) => {
    for (const [channel, key] of Object.entries(DAILY)) {
      const series = doc.daily[key] as (number | null)[] | undefined;
      const value = series?.[i];
      if (value === undefined || value === null || !Number.isFinite(value)) continue;
      out.push({ foreignStationId, channel, time: `${day}T00:00:00Z`, value });
    }
  });
  return out;
}

export async function fetchArchive(
  lat: number,
  lon: number,
  startDate: string,
  endDate: string,
  fetchImpl: typeof fetch = fetch,
): Promise<OpenMeteoArchive> {
  const q = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    start_date: startDate,
    end_date: endDate,
    daily: Object.values(DAILY).join(","),
    timezone: "UTC",
  });
  const res = await fetchImpl(`${OPEN_METEO_ARCHIVE}?${q}`);
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  return (await res.json()) as OpenMeteoArchive;
}
