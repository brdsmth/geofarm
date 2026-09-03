/**
 * M9 — the next phase (REVIEW-004 §7–8): the rescan debt paid, a model
 * behind the reasoner, live sources behind the adapters, the door over
 * a wire — each proven without a network, a model, or a database, since
 * what is architectural about each is what it must do offline.
 */
import { describe, expect, test } from "bun:test";
import { newId, type AdmittedRecord, type Area, type CandidateRecord, type Id } from "../packages/world/index.ts";
import { Journal, type JournalStore } from "../packages/journal/index.ts";
import { MemoryStore } from "../packages/journal/store-memory.ts";
import { MaterializedLog } from "../packages/journal/materialized.ts";
import { Boundary } from "../packages/boundary/index.ts";
import { boundaryHandler } from "../packages/boundary/http.ts";
import { RemoteBoundary } from "../packages/boundary/remote.ts";
import { ALREADY_RECORDED, WeatherFeed } from "../packages/feeds/weather/index.ts";
import { forecastToInputs, observationsToReadings } from "../packages/feeds/weather/nws.ts";
import { archiveStation, archiveToReadings } from "../packages/feeds/weather/open-meteo.ts";
import { ImageryFeed } from "../packages/feeds/imagery/index.ts";
import { itemsToScenes, priorVersionOf, type StacItem } from "../packages/feeds/imagery/earth-search.ts";
import { Session } from "../packages/client/interaction/index.ts";
import { MemoryPersistence, PendingStore } from "../packages/client/stores/index.ts";
import { AskEngagement, assembleContext, viewerStores } from "../packages/agent/index.ts";
import { ModelReasoner, parseJsonObject, renderContext, toOutputs, type Engine } from "../packages/agent/engine.ts";
import { RemoteReasoner, concludeFromWire, fromWire, toWire } from "../packages/agent/remote.ts";
import { agentWorld } from "../packages/agent/fixtures.ts";
import { actorIntro, farmWorld, grantRecord } from "../packages/projection/fixtures.ts";

const NOW = "2026-07-01T00:00:00Z";

// ------------------------------------------------- the rescan debt (P-55)

/** A store whose sequence skips, as a database sequence does after a
 * refused insert: the materialization must not assume density. */
class GappyStore extends MemoryStore {
  private next = 0;
  override async append(candidate: CandidateRecord, knowledgeTime: string): Promise<AdmittedRecord> {
    this.next += 3;
    const admitted = await super.append(candidate, knowledgeTime);
    (admitted as { seq: number }).seq = this.next;
    return admitted;
  }
  override async scanFrom(after: number, limit: number): Promise<AdmittedRecord[]> {
    return (await super.scanFrom(0, Number.MAX_SAFE_INTEGER)).filter((r) => r.seq > after).slice(0, limit);
  }
  override async head(): Promise<number> {
    return this.next;
  }
}

describe("P-55 — the materialized log is a copy keyed by watermark, never an authority", () => {
  test("walks by delta, tolerates sequence gaps, and rebuilds from nothing to the same answers", async () => {
    const store: JournalStore = new GappyStore();
    const journal = new Journal(store);
    const org = newId();
    await journal.admit(actorIntro(org, "organization"));
    for (let i = 0; i < 5; i++) await journal.admit(actorIntro(newId(), "person"));
    const log = new MaterializedLog(journal);
    expect(await log.refresh()).toBe(18); // six records, seq 3..18
    const all = await log.walkFrom(0, 1000);
    expect(all.records.map((r) => r.seq)).toEqual([3, 6, 9, 12, 15, 18]);
    const fromMid = await log.walkFrom(7, 2);
    expect(fromMid.records.map((r) => r.seq)).toEqual([9, 12]);
    expect(fromMid.watermark).toBe(12);
    // The delta, not a rescan: three more records extend the copy.
    for (let i = 0; i < 3; i++) await journal.admit(actorIntro(newId(), "person"));
    expect(await log.refresh()).toBe(27);
    const before = (await log.walkFrom(0, 1000)).records.map((r) => r.id);
    // Dropped and rebuilt, the copy reads the same — the log is the authority.
    log.drop();
    expect(log.watermark).toBe(0);
    await log.refresh();
    expect((await log.walkFrom(0, 1000)).records.map((r) => r.id)).toEqual(before);
  });

  test("the boundary answers the same after the log grows underneath it", async () => {
    const world = await farmWorld();
    const boundary = new Boundary(world.journal);
    const first = await boundary.walk(world.owner, 0);
    const note: CandidateRecord = {
      id: newId(),
      kind: "event",
      classification: "note",
      actors: { actor: world.owner, onBehalfOf: [world.org] },
      occurrence: { start: NOW },
      subjects: [world.west.id],
      body: { text: "after the copy was taken" },
    };
    await world.journal.admit(note); // behind the boundary's back
    const delta = await boundary.walk(world.owner, first.watermark);
    expect(delta.records.map((r) => r.id)).toEqual([note.id]);
    const reading = (await boundary.project(world.owner, { read: { form: "record", id: note.id } })) as { level: string };
    expect(reading.level).toBe("view");
  });
});

// ---------------------------------------------- the sources (P-53)

async function engagedWorld() {
  const fixture = await farmWorld();
  const boundary = new Boundary(fixture.journal);
  const weatherActor = newId();
  const imageryActor = newId();
  await fixture.journal.admit(actorIntro(weatherActor, "service"));
  await fixture.journal.admit(actorIntro(imageryActor, "service"));
  await fixture.journal.admit(
    grantRecord(fixture.org, {
      grantee: weatherActor,
      scope: { classifications: ["weather-station", "reading", "forecast", "weather-estimate"] },
      capabilities: ["represent"],
    }),
  );
  await fixture.journal.admit(
    grantRecord(fixture.org, { grantee: imageryActor, scope: { classifications: ["imagery"] }, capabilities: ["represent"] }),
  );
  const weather = new WeatherFeed(boundary, weatherActor, {
    org: fixture.org,
    channels: { tempC: "measurement", precipMm: "measurement", tempMaxC: "interpretation" },
    ground: "provider",
  });
  const imagery = new ImageryFeed(boundary, imageryActor, fixture.org);
  return { ...fixture, boundary, weather, imagery, weatherActor };
}

const farmArea: Area = {
  form: "area",
  rings: [
    [
      [-93.25, 41.45],
      [-93.0, 41.45],
      [-93.0, 41.6],
      [-93.25, 41.6],
      [-93.25, 41.45],
    ],
  ],
};

describe("P-53 — a pull repeated admits only what is new (RFC-0011 §3 for readings)", () => {
  test("readings, forecasts, and scenes the world holds are found, not duplicated", async () => {
    const { weather, imagery, boundary, owner } = await engagedWorld();
    await weather.ensureStation({ foreignId: "S1", name: "S1", lon: -93.12, lat: 41.53 });
    const readings = [
      { foreignStationId: "S1", channel: "tempC", time: "2026-06-30T06:00:00Z", value: 21 },
      { foreignStationId: "S1", channel: "tempMaxC", time: "2026-06-30T00:00:00Z", value: 27 },
    ];
    expect((await weather.ingestReadings(readings)).admitted).toBe(2);
    const again = await weather.ingestReadings([
      ...readings,
      { foreignStationId: "S1", channel: "tempC", time: "2026-06-30T07:00:00Z", value: 22 },
    ]);
    expect(again.admitted).toBe(1);
    expect(again.skipped.map((s) => s.reason)).toEqual([ALREADY_RECORDED, ALREADY_RECORDED]);

    const forecast = { foreignStationId: "S1", issued: NOW, validAt: "2026-07-02T00:00:00Z", channel: "tempC", value: 30, probability: 0.5 };
    expect((await weather.ingestForecasts([forecast])).admitted).toBe(1);
    expect((await weather.ingestForecasts([forecast])).skipped[0]?.reason).toBe(ALREADY_RECORDED);
    // A newer issue of the same forecast is a new claim (RFC-0007 §5).
    expect((await weather.ingestForecasts([{ ...forecast, issued: "2026-07-01T12:00:00Z" }])).admitted).toBe(1);

    const scene = { foreignId: "SC-1", capturedAt: "2026-05-01T00:00:00Z", footprint: farmArea.rings, contentHash: "sha256:v1" };
    expect((await imagery.backfillArchive([scene])).admitted).toBe(1);
    const redo = await imagery.backfillArchive([scene, { ...scene, foreignId: "SC-1-v2", reprocesses: "SC-1" }]);
    expect(redo.admitted).toBe(1);
    expect(redo.skipped[0]?.reason).toBe(ALREADY_RECORDED);
    const s = new Session(owner, boundary, new PendingStore(new MemoryPersistence()), NOW);
    await s.sync();
    expect(s.reading.all().filter((r) => r.classification === "imagery").length).toBe(2);
  });

  test("NWS: observations become measurements; missing and rejected values stay out", () => {
    const readings = observationsToReadings(
      [
        {
          properties: {
            timestamp: "2026-09-03T16:35:00+00:00",
            temperature: { value: 31, unitCode: "wmoUnit:degC", qualityControl: "V" },
            precipitationLastHour: { value: null, qualityControl: "Z" },
            relativeHumidity: { value: 58.81392, qualityControl: "V" },
            windSpeed: { value: 9.36, qualityControl: "X" },
          },
        },
      ],
      "nws:KTNU",
    );
    expect(readings).toEqual([
      { foreignStationId: "nws:KTNU", channel: "tempC", time: "2026-09-03T16:35:00.000Z", value: 31 },
      { foreignStationId: "nws:KTNU", channel: "humidityPct", time: "2026-09-03T16:35:00.000Z", value: 58.81 },
    ]);
  });

  test("NWS: the hourly forecast becomes claims with the provider's own probability where it states one", () => {
    const inputs = forecastToInputs(
      [
        { startTime: "2026-09-03T12:00:00-05:00", temperature: 89, temperatureUnit: "F", probabilityOfPrecipitation: { value: 12 } },
        { startTime: "2026-09-03T13:00:00-05:00", temperature: 90, temperatureUnit: "F", probabilityOfPrecipitation: { value: null } },
      ],
      "nws:KTNU",
      "2026-09-03T16:27:03Z",
    );
    expect(inputs.length).toBe(3);
    expect(inputs[0]).toEqual({ foreignStationId: "nws:KTNU", issued: "2026-09-03T16:27:03Z", validAt: "2026-09-03T17:00:00.000Z", channel: "tempC", value: 31.67, probability: 0.5 });
    expect(inputs[1]?.channel).toBe("rainChancePct");
    expect(inputs[1]?.probability).toBe(0.12);
    expect(inputs[2]?.channel).toBe("tempC"); // no rain claim without a stated chance
  });

  test("Open-Meteo: the archive is a model's reconstruction — every channel an interpretation", async () => {
    const doc = {
      latitude: 41.51142,
      longitude: -93.242065,
      daily: {
        time: ["2026-06-01", "2026-06-02"],
        temperature_2m_max: [28.9, null],
        temperature_2m_min: [17.0, 15.3],
        precipitation_sum: [1.2, 0.0],
      },
    };
    const station = archiveStation(doc);
    expect(station.foreignId).toBe("open-meteo:41.511,-93.242");
    const readings = archiveToReadings(doc, station.foreignId);
    expect(readings.length).toBe(5); // one null gap stays a gap
    expect(readings[0]).toEqual({ foreignStationId: station.foreignId, channel: "tempMaxC", time: "2026-06-01T00:00:00Z", value: 28.9 });
    // Through the border: estimates, never readings (RFC-0011 §2 Amendment 1).
    const { weather, boundary, owner } = await engagedWorld();
    await weather.ensureStation(station);
    const report = await weather.ingestReadings(readings.filter((r) => r.channel === "tempMaxC"));
    expect(report.admitted).toBe(1);
    const s = new Session(owner, boundary, new PendingStore(new MemoryPersistence()), NOW);
    await s.sync();
    const estimate = s.reading.all().find((r) => r.classification === "weather-estimate");
    expect(estimate?.kind).toBe("assertion");
    expect(s.reading.all().some((r) => r.classification === "reading" && (r.body as { channel?: string }).channel === "tempMaxC")).toBe(false);
  });

  test("Earth Search: a tile becomes the part of it the farm engaged, pixels stay payload, reprocessing links only in-batch", () => {
    const item = (id: string, datetime: string): StacItem => ({
      id,
      bbox: [-94.216471, 41.457524, -92.881318, 42.452621],
      properties: { datetime, "eo:cloud_cover": 8.49, platform: "sentinel-2c", "proj:epsg": 32615, "grid:code": "MGRS-15TVG" },
      assets: {
        visual: { href: `https://example/${id}/TCI.tif`, type: "image/tiff; application=geotiff; profile=cloud-optimized" },
        thumbnail: { href: `https://example/${id}/preview.jpg`, type: "image/jpeg" },
        red: { href: `https://example/${id}/B04.tif` },
        nir: { href: `https://example/${id}/B08.tif` },
      },
    });
    expect(priorVersionOf("S2C_15TVG_20260629_1_L2A")).toBe("S2C_15TVG_20260629_0_L2A");
    expect(priorVersionOf("S2C_15TVG_20260629_0_L2A")).toBeUndefined();
    const scenes = itemsToScenes(
      [
        item("S2C_15TVG_20260629_1_L2A", "2026-06-29T17:12:05.902000Z"),
        item("S2C_15TVG_20260629_0_L2A", "2026-06-29T17:12:05.902000Z"),
        item("S2C_15TVG_20260619_2_L2A", "2026-06-19T17:12:05Z"), // its prior is not here
      ],
      farmArea,
    );
    expect(scenes.map((s) => s.foreignId)).toEqual(["S2C_15TVG_20260619_2_L2A", "S2C_15TVG_20260629_0_L2A", "S2C_15TVG_20260629_1_L2A"]);
    expect(scenes[0]?.reprocesses).toBeUndefined();
    expect(scenes[2]?.reprocesses).toBe("S2C_15TVG_20260629_0_L2A");
    const s = scenes[1]!;
    expect(s.footprint).toEqual([[[-93.25, 41.457524], [-93.0, 41.457524], [-93.0, 41.6], [-93.25, 41.6], [-93.25, 41.457524]]]);
    expect(s.contentHash).toContain("TCI.tif");
    expect(s.mediaType).toBe("image/tiff");
    expect(s.details).toMatchObject({ cloudCover: 8.49, tile: "MGRS-15TVG", epsg: 32615 });
    expect((s.details as { thumbnail: string }).thumbnail).toContain("preview.jpg");
    // A tile elsewhere is not the farm's.
    const elsewhere: Area = { form: "area", rings: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] };
    expect(itemsToScenes([item("X_0_L2A", "2026-01-01T00:00:00Z")], elsewhere)).toEqual([]);
  });
});

// ------------------------------------------------ the engine (P-52)

/** An engine that answers with whatever it is told to — including lies. */
const scripted = (outputs: unknown, seen: { user?: string } = {}): Engine => ({
  name: "scripted",
  async complete({ user }) {
    seen.user = user;
    return outputs;
  },
});

async function cast() {
  const world = await agentWorld();
  const session = new Session(world.agronomist, world.boundary, new PendingStore(new MemoryPersistence()), NOW);
  await session.sync();
  session.reveal({ name: "fields", filter: { classifications: ["field"] }, visible: true });
  session.select([world.west.id]);
  return { ...world, session };
}

describe("P-52 — a model behind the reasoner, held to the same gate", () => {
  test("the situation reaches the engine with identities, the moment, and what is hidden", async () => {
    const { session, boundary, agent, west, diagnosis } = await cast();
    const context = await assembleContext(boundary, agent, viewerStores(session), "why is this struggling?", []);
    const text = renderContext(context);
    expect(text).toContain(`[${west.id}]`);
    expect(text).toContain(`[${diagnosis.id}]`);
    expect(text).toContain("(hidden by layers)"); // the diagnosis is conversable but filtered out
    expect(text).toContain("The moment being looked at: 2026-07-01");
    expect(text).toContain("why is this struggling?");
  });

  test("what the model says is parsed leniently and delivered strictly", async () => {
    const { session, boundary, agent, org, west, diagnosis, hazard, lien } = await cast();
    const seen: { user?: string } = {};
    const engine = scripted(
      {
        outputs: [
          { type: "claim", classification: "reading", text: "The standing diagnosis holds.", subjects: [west.id], evidence: [diagnosis.id], confidence: 0.7, about: [] },
          { type: "claim", classification: "advisory", text: "Hold off — there's a hazard.", subjects: [west.id], evidence: [hazard.id], confidence: 0.9, about: [] }, // the Reach: laundering
          { type: "claim", classification: "advisory", text: "This ground carries risk.", subjects: [west.id], evidence: [lien.id], confidence: 0.9, about: [] }, // outside even the Reach
          { type: "claim", classification: "reading", text: "Invented.", subjects: [west.id], evidence: ["not-a-record"], confidence: 0.4, about: [] },
          { type: "claim", classification: "reading", text: "No basis.", subjects: [west.id], evidence: [], confidence: 0.4, about: [] },
          { type: "reveal", text: "There's a note here you can't see.", classification: "", subjects: [], evidence: [], confidence: 0, about: [diagnosis.id] },
          { type: "question", text: "Which corner?", classification: "", subjects: [], evidence: [], confidence: 0, about: [] },
        ],
      },
      seen,
    );
    const engagement = new AskEngagement(boundary, agent, new ModelReasoner(engine), viewerStores(session), org);
    const replies = await engagement.ask("should I plant?");
    expect(seen.user).toContain("should I plant?");
    expect(replies.map((r) => r.kind)).toEqual(["claim", "reveal", "question"]);
    expect(engagement.refused).toBe(4); // the two launderings, the invented id, the baseless one
    const surface = JSON.stringify(replies);
    expect(surface).not.toContain(hazard.id);
    expect(surface).not.toContain("hazard");
    expect(surface).not.toContain("carries risk");
    // Malformed output is an absent answer, never an invented one.
    const broken = new AskEngagement(boundary, agent, new ModelReasoner(scripted("not json at all")), viewerStores(session), org);
    expect(await broken.ask("anything?")).toEqual([]);
    const failing: Engine = { name: "down", complete: () => Promise.reject(new Error("no model")) };
    const errors: unknown[] = [];
    const down = new AskEngagement(boundary, agent, new ModelReasoner(failing, { onError: (e) => errors.push(e) }), viewerStores(session), org);
    expect(await down.ask("anything?")).toEqual([]);
    expect(errors.length).toBe(1);
  });

  test("fenced JSON and unknown classifications are tolerated; empties are dropped", () => {
    const raw = parseJsonObject('```json\n{"outputs":[{"type":"claim","text":"x","classification":"weird","subjects":["a"],"evidence":["b","b"],"confidence":1.7,"about":[]},{"type":"question","text":"  ","classification":"","subjects":[],"evidence":[],"confidence":0,"about":[]}]}\n```');
    const outputs = toOutputs(raw);
    expect(outputs.length).toBe(1);
    expect(outputs[0]).toMatchObject({ type: "claim", classification: "reading", evidence: ["b"], confidence: 1 });
    expect(toOutputs({ outputs: "nope" })).toEqual([]);
  });

  test("the context crosses a wire whole, and the remote engine's proposals still face the gate", async () => {
    const { session, boundary, agent, org, west, diagnosis, hazard } = await cast();
    const context = await assembleContext(boundary, agent, viewerStores(session), "well?", []);
    const back = fromWire(JSON.parse(JSON.stringify(toWire(context))));
    expect([...back.neighborhood.conversable].sort()).toEqual([...context.neighborhood.conversable].sort());
    expect(back.neighborhood.entries.map((e) => e.id)).toEqual(context.neighborhood.entries.map((e) => e.id));
    expect(back.neighborhood.entries[0]?.timeline.length).toBe(context.neighborhood.entries[0]?.timeline.length);
    expect(renderContext(back)).toBe(renderContext(context));

    // A server holding a scripted engine, reached through an in-process fetch.
    const server = new ModelReasoner(
      scripted({
        outputs: [
          { type: "claim", classification: "reading", text: "Holds.", subjects: [west.id], evidence: [diagnosis.id], confidence: 0.6, about: [] },
          { type: "claim", classification: "reading", text: "Leak.", subjects: [west.id], evidence: [hazard.id], confidence: 0.6, about: [] },
        ],
      }),
    );
    const fetchImpl = (async (_url: string, init?: RequestInit) =>
      new Response(JSON.stringify(await concludeFromWire(server, JSON.parse(String(init?.body)))), {
        headers: { "Content-Type": "application/json" },
      })) as unknown as typeof fetch;
    const engagement = new AskEngagement(boundary, agent, new RemoteReasoner("/api/engine", { fetchImpl }), viewerStores(session), org);
    const replies = await engagement.ask("well?");
    expect(replies.length).toBe(1);
    expect(engagement.refused).toBe(1);
  });
});

// -------------------------------------------- the door over HTTP (P-54)

describe("P-54 — the door over a wire is the same door", () => {
  test("walk, append, and project round-trip; the Session cannot tell", async () => {
    const world = await farmWorld();
    const handler = boundaryHandler(new Boundary(world.journal), { token: "t" });
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      const res = await handler(new Request(`http://local${url}`, init));
      return res ?? new Response("nope", { status: 404 });
    }) as unknown as typeof fetch;
    const remote = new RemoteBoundary("/api", { fetchImpl, token: "t" });
    const s = new Session(world.owner, remote, new PendingStore(new MemoryPersistence()), NOW);
    await s.sync();
    expect(s.reading.all().length).toBeGreaterThan(5);
    s.select([world.west.id]);
    s.commit(s.annotate("note", { text: "over the wire" }, NOW));
    expect((await s.send()).admitted).toBe(1);
    await s.sync();
    expect(s.reading.all().some((r) => (r.body as { text?: string } | undefined)?.text === "over the wire")).toBe(true);
    const known = (await remote.project(world.owner, { read: { form: "known" } })) as { viewable: Id[] };
    expect(known.viewable.length).toBe(s.reading.all().length);
    // The wrong token is no door at all: the Session defers, nothing merges.
    const locked = new Session(world.owner, new RemoteBoundary("/api", { fetchImpl, token: "x" }), new PendingStore(new MemoryPersistence()), NOW);
    locked.select([world.west.id]);
    locked.commit(locked.annotate("note", { text: "kept" }, NOW));
    expect((await locked.send()).deferred).toBe(1);
    expect(await handler(new Request("http://local/elsewhere"))).toBeUndefined();
  });
});

describe("the Reach is walked whole, page after page", () => {
  test("an agent's Conversable and a Session's Reading span more than one page", async () => {
    const { session, boundary, agent, org, west, journal } = await cast();
    for (let i = 0; i < 1200; i++) {
      await journal.admit({
        id: newId(),
        kind: "event",
        classification: "note",
        actors: { actor: org, onBehalfOf: [] },
        occurrence: { start: NOW },
        subjects: [west.id],
        body: { text: `note ${i}` },
      });
    }
    await session.sync();
    expect(session.reading.all().length).toBeGreaterThan(1200);
    const context = await assembleContext(boundary, agent, viewerStores(session), "", []);
    expect(context.neighborhood.conversable.size).toBeGreaterThan(1200);
  });
});

// ------------------------------------------------ reading the pixels

import { ndviMean, toUtm } from "../apps/server/ndvi.ts";

describe("the vegetation index reader's arithmetic", () => {
  test("the projection puts the central meridian at 500 km and the 45th parallel where the ellipsoid says", () => {
    const [e0, n0] = toUtm(3, 0, 31);
    expect(Math.abs(e0 - 500000)).toBeLessThan(0.01);
    expect(Math.abs(n0)).toBeLessThan(0.01);
    const [e45, n45] = toUtm(-93, 45, 15); // on zone 15's central meridian
    expect(Math.abs(e45 - 500000)).toBeLessThan(0.01);
    expect(Math.abs(n45 - 0.9996 * 4984944.38)).toBeLessThan(2); // the meridian arc to 45°, scaled
    const [e, n] = toUtm(-93.1927, 41.5153, 15); // the farm: just west of the meridian
    expect(e).toBeGreaterThan(480000);
    expect(e).toBeLessThan(500000);
    expect(n).toBeGreaterThan(4590000);
    expect(n).toBeLessThan(4600000);
  });

  test("the mean index ignores empty pixels and reads nothing from nothing", () => {
    expect(ndviMean([100, 100, 0], [300, 100, 0])).toBeCloseTo((0.5 + 0) / 2, 6);
    expect(ndviMean([], [])).toBeUndefined();
  });
});
