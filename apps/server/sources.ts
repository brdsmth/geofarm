/**
 * The live sources, pulled on a cadence: the weather service, the weather
 * archive, the imagery catalog — and the intelligence's own weekly job.
 * surface-exempt-file: operator log lines — developer-facing, not copy.
 *
 * Nothing here is sync machinery (S3). Each pull is translation into
 * candidate content admitted through the door, and a pull repeated admits
 * only what the world does not already hold (RFC-0011 §3). "Continuous
 * and periodic following are the same act at different cadence"
 * (RFC-0012 §4); the cadence lives here, the act lives in the adapters.
 */

import type { Area, Coordinate, Id } from "../../packages/world/index.ts";
import type { Boundary } from "../../packages/boundary/index.ts";
import { WeatherFeed, type WeatherFeedConfig } from "../../packages/feeds/weather/index.ts";
import { NWS_CHANNELS, NWS_GROUND, nwsFetch, nwsHourlyForecast, nwsNearestStation, nwsObservations, nwsPoint } from "../../packages/feeds/weather/nws.ts";
import { OPEN_METEO_CHANNELS, OPEN_METEO_GROUND, archiveStation, archiveToReadings, fetchArchive } from "../../packages/feeds/weather/open-meteo.ts";
import { ImageryFeed } from "../../packages/feeds/imagery/index.ts";
import { searchScenes } from "../../packages/feeds/imagery/earth-search.ts";
import { AnomalyJob, type SceneIndex } from "../../packages/agent/anomaly.ts";
import { walkAll } from "../../packages/agent/index.ts";
import { vegetationIndexOf } from "./ndvi.ts";

export type SourcesConfig = {
  boundary: Boundary;
  org: Id;
  actors: { weather: Id; archive: Id; imagery: Id; assistant: Id };
  names: NonNullable<WeatherFeedConfig["classifications"]>;
  /** The region the farm engaged the sources for, and its centre. */
  engaged: Area;
  center: Coordinate;
  /** NWS asks callers to say who they are. */
  userAgent: string;
  /** How far back the archives reach on first pull. */
  years?: number;
  log: (line: string) => void;
};

const DAY = 24 * 60 * 60 * 1000;
const iso = (t: number): string => new Date(t).toISOString();
const date = (t: number): string => iso(t).slice(0, 10);

/** The weather service: the nearest station's observations for the last
 * week, and the next two days' hourly forecast. */
export async function pullWeather(cfg: SourcesConfig, opts: { forecast?: boolean } = {}): Promise<void> {
  const get = nwsFetch(cfg.userAgent);
  const feed = new WeatherFeed(cfg.boundary, cfg.actors.weather, {
    org: cfg.org,
    channels: NWS_CHANNELS,
    ground: NWS_GROUND,
    classifications: cfg.names,
  });
  const point = await nwsPoint(get, cfg.center[1], cfg.center[0]);
  const station = await nwsNearestStation(get, point);
  await feed.ensureStation(station);
  const since = iso(Date.now() - 7 * DAY);
  const readings = await feed.ingestReadings(await nwsObservations(get, station, { start: since }));
  cfg.log(`weather: ${station.name}: ${readings.admitted} new readings (${readings.skipped.length} already held or skipped)`);
  if (opts.forecast !== false) {
    const forecasts = await feed.ingestForecasts(await nwsHourlyForecast(get, point, station, 48));
    cfg.log(`weather: ${forecasts.admitted} new forecast claims`);
  }
}

/** The archive: daily estimates back `years`, in yearly pulls. */
export async function pullArchive(cfg: SourcesConfig): Promise<void> {
  const feed = new WeatherFeed(cfg.boundary, cfg.actors.archive, {
    org: cfg.org,
    channels: OPEN_METEO_CHANNELS,
    ground: OPEN_METEO_GROUND,
    classifications: cfg.names,
  });
  const years = cfg.years ?? 5;
  const end = Date.now() - 6 * DAY; // the archive lags a few days
  let admitted = 0;
  for (let y = years; y >= 0; y--) {
    const from = Math.max(end - (y + 1) * 365 * DAY, Date.UTC(2019, 0, 1));
    const to = Math.min(end - y * 365 * DAY - DAY, end);
    if (from > to) continue;
    const doc = await fetchArchive(cfg.center[1], cfg.center[0], date(from), date(to));
    const station = archiveStation(doc);
    await feed.ensureStation(station);
    admitted += (await feed.ingestReadings(archiveToReadings(doc, station.foreignId))).admitted;
  }
  cfg.log(`archive: ${admitted} new daily estimates`);
}

/** The imagery catalog: every reasonably clear pass over the farm. */
export async function pullImagery(cfg: SourcesConfig, opts: { days?: number } = {}): Promise<void> {
  const feed = new ImageryFeed(cfg.boundary, cfg.actors.imagery, cfg.org);
  const days = opts.days ?? (cfg.years ?? 5) * 365;
  const scenes = await searchScenes({
    engaged: cfg.engaged,
    from: iso(Date.now() - days * DAY),
    to: iso(Date.now()),
    maxCloudCover: 40,
  });
  const report = await feed.backfillArchive(scenes);
  const reasons = new Map<string, number>();
  for (const s of report.skipped) reasons.set(s.reason, (reasons.get(s.reason) ?? 0) + 1);
  const skipped = [...reasons.entries()].map(([r, n]) => `${n} ${r}`).join(", ");
  cfg.log(`imagery: ${report.admitted} new passes of ${scenes.length} found${skipped !== "" ? ` (${skipped})` : ""}`);
}

/** The intelligence's autonomous mode (RFC-0010 §1): once a week, the
 * imagery is read for what looks anomalous, and the findings are authored
 * as claims that sit on the map like anyone's (RFC-0016 A4). */
export async function runAnomaly(cfg: SourcesConfig): Promise<void> {
  const cache = new Map<string, number | undefined>();
  const index: SceneIndex = (scene) => {
    const body = scene.body as { vegetationIndex?: number } | undefined;
    if (typeof body?.vegetationIndex === "number") return body.vegetationIndex;
    return cache.get(scene.id);
  };
  // Read the pixels first (mechanism), then judge (the job).
  const reach = await walkAll(cfg.boundary, cfg.actors.assistant);
  const scenes = reach.filter((r) => r.classification === "imagery");
  let read = 0;
  for (const scene of scenes.slice(-24)) {
    const value = await vegetationIndexOf(scene, cfg.engaged).catch(() => undefined);
    cache.set(scene.id, value);
    if (value !== undefined) read++;
  }
  const job = new AnomalyJob(cfg.boundary, cfg.actors.assistant, index, { principal: cfg.org });
  const run = await job.run();
  cfg.log(`anomaly: read ${read} passes; authored ${run.authored.length}, unchanged ${run.unchanged}, refused ${run.rejected.length}`);
}

/** Boot, then cadence. Every pull is guarded: a source that is down
 * today is a source that is down today, nothing more. */
export function schedule(cfg: SourcesConfig): { stop: () => void } {
  const guarded = (name: string, fn: () => Promise<void>) => async (): Promise<void> => {
    try {
      await fn();
    } catch (e) {
      cfg.log(`${name}: ${e instanceof Error ? e.message : String(e)}`);
    }
  };
  const weather = guarded("weather", () => pullWeather(cfg, { forecast: false }));
  const forecast = guarded("forecast", () => pullWeather(cfg));
  const archive = guarded("archive", () => pullArchive(cfg));
  const imagery = guarded("imagery", () => pullImagery(cfg));
  const recent = guarded("imagery", () => pullImagery(cfg, { days: 14 }));
  const anomaly = guarded("anomaly", () => runAnomaly(cfg));

  const timers: ReturnType<typeof setInterval>[] = [];
  void (async () => {
    await forecast();
    await archive();
    await imagery();
    await anomaly();
    timers.push(setInterval(weather, 60 * 60 * 1000));
    timers.push(setInterval(forecast, DAY));
    timers.push(setInterval(recent, DAY));
    timers.push(setInterval(anomaly, 7 * DAY));
  })();
  return { stop: () => timers.forEach(clearInterval) };
}
