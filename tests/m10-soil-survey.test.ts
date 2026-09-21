/**
 * M10 — the soil survey as a source (RFC-0011; RFC-0016 E5).
 *
 * A third shape of source — a survey of delineated ground — proven the
 * way M9 proved the others: without a network or a database, since what
 * is architectural is what it must do offline. The mapped unit is a
 * place; what the survey says of it is a claim, never an observation
 * (RFC-0011 §2 Amendment 1a); republication is supersession (§4); a pull
 * repeated admits nothing (§3); and what the provider said is kept, so
 * the same version is never asked for twice and a dead service is
 * answered from the held copy.
 */
import { describe, expect, test } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newId, type Area, type Id } from "../packages/world/index.ts";
import { Journal } from "../packages/journal/index.ts";
import { MemoryStore } from "../packages/journal/store-memory.ts";
import { Boundary } from "../packages/boundary/index.ts";
import { ALREADY_RECORDED, SoilSurveyFeed, type SurveyUnitInput } from "../packages/feeds/soil-survey/index.ts";
import {
  MemorySurveyCache,
  SSURGO_GROUND,
  acresOf,
  archiveSurvey,
  areasOf,
  downloadUrl,
  polygonsOf,
  readSurvey,
  rowsOf,
  toSurveyUnits,
  toWkt,
  type SdaDoc,
} from "../packages/feeds/soil-survey/sda.ts";
import { Session } from "../packages/client/interaction/index.ts";
import { MemoryPersistence, PendingStore } from "../packages/client/stores/index.ts";
import { actorIntro, farmRegion, farmWorld, grantRecord } from "../packages/projection/fixtures.ts";
import { FEED_ACTORS, SOIL_SURVEY_CLASSIFICATIONS, engageSources, seedFarm } from "../apps/web/src/seed.ts";
import { mirrorSurveyArea } from "../apps/server/soil.ts";

const NOW = "2026-07-01T00:00:00Z";

// ------------------------------------------------ the provider's answers

const versionsDoc = (saverest = "2025-09-08T17:04:42.937", saversion = "31"): SdaDoc => ({
  Table: [
    ["_t", "areasymbol", "areaname", "saversion", "saverest"],
    ["area", "IA099", "Jasper County, Iowa", saversion, saverest],
  ],
});

const SQUARE_A = "POLYGON ((-93.2 41.5, -93.19 41.5, -93.19 41.51, -93.2 41.51, -93.2 41.5))";
const SQUARE_B = "POLYGON ((-93.18 41.5, -93.17 41.5, -93.17 41.51, -93.18 41.51, -93.18 41.5))";
const SQUARE_C = "POLYGON ((-93.16 41.5, -93.15 41.5, -93.15 41.51, -93.16 41.51, -93.16 41.5))";

const unitsDoc = (otleyPieces: string[] = [SQUARE_A, SQUARE_B]): SdaDoc => ({
  Table: [
    ["_t", "mukey", "musym", "muname", "mukind", "farmlndcl", "iacornsr", "areasymbol", "wkt"],
    ...otleyPieces.map((wkt) => [
      "unit", "407650", "281B", "Otley silty clay loam, 2 to 5 percent slopes", "Consociation",
      "All areas are prime farmland", "91", "IA099", wkt,
    ]),
    ["unit", "999", "W", "Water", "Miscellaneous area", null, null, "IA099", SQUARE_C],
  ],
});

/** The service drops empty result sets and numbers the rest — here the
 * horizons landed in `Table1` because nothing came before them but the
 * summaries, and there is no `index` table at all. */
const propertiesDoc: SdaDoc = {
  Table: [
    ["_t", "mukey", "slopegradwta", "drclassdcd", "hydgrpdcd", "aws0100wta", "flodfreqdcd", "wtdepannmin"],
    ["summary", "407650", "3.5", "Moderately well drained", "C", "19.46", "None", "61"],
  ],
  Table1: [
    ["_t", "cokey", "chkey", "hzname", "hzdept_r", "hzdepb_r", "claytotal_r", "om_r", "ph1to1h2o_r"],
    ["horizon", "c1", "h1", "Ap", "0", "18", "30", "3.5", "6"],
    ["horizon", "c1", "h2", "A", "18", "43", "33", "2.5", "5.8"],
  ],
  Table2: [
    ["_t", "mukey", "cokey", "compname", "comppct_r", "majcompflag", "drainagecl"],
    ["component", "407650", "c1", "Otley", "95", "Yes", "Moderately well drained"],
    ["component", "407650", "c2", "Mahaska", "5", "No ", "Somewhat poorly drained"],
  ],
  Table3: [
    ["_t", "mukey", "cokey", "interphr"],
    ["index", "407650", "c1", "0.89"],
  ],
};

/** A stand-in for the service that answers by what was asked, counts
 * every question, and can be switched off. */
function service(state: { versions: SdaDoc; units: SdaDoc; down?: boolean }) {
  const asked: string[] = [];
  const fetchImpl = (async (_url: string, init: { body: string }) => {
    if (state.down === true) throw new Error("service unreachable");
    const query = (JSON.parse(init.body) as { query: string }).query;
    const kind = query.includes("sacatalog") ? "versions" : query.includes("GetClippedMapunits") ? "units" : query.includes("'summary'") ? "properties" : "archive";
    asked.push(kind);
    const doc = kind === "versions" ? state.versions : kind === "units" ? state.units : kind === "properties" ? propertiesDoc : { Table: [["x"], ["1"], ["2"]] };
    return new Response(JSON.stringify(doc), { status: 200 });
  }) as unknown as typeof fetch;
  return { asked, fetchImpl };
}

async function engagedWorld(scope: string[] = SOIL_SURVEY_CLASSIFICATIONS) {
  const world = await farmWorld();
  const boundary = new Boundary(world.journal);
  const survey = newId();
  await world.journal.admit(actorIntro(survey, "service"));
  await world.journal.admit(grantRecord(world.org, { grantee: survey, scope: { classifications: scope }, capabilities: ["represent"] }));
  const feed = new SoilSurveyFeed(boundary, survey, { org: world.org, ground: SSURGO_GROUND });
  return { world, boundary, survey, feed };
}

const units = (v?: SdaDoc, u?: SdaDoc): SurveyUnitInput[] => toSurveyUnits(u ?? unitsDoc(), propertiesDoc, areasOf(v ?? versionsDoc()));

// ------------------------------------------------------------ translation

describe("M10 — the provider's answers, translated", () => {
  test("well-known text becomes closed rings; holes survive; slivers the clip left behind are dropped", () => {
    expect(polygonsOf(SQUARE_A)).toEqual([[[[-93.2, 41.5], [-93.19, 41.5], [-93.19, 41.51], [-93.2, 41.51], [-93.2, 41.5]]]]);
    const multi = "MULTIPOLYGON (((0 0, 4 0, 4 4, 0 4, 0 0), (1 1, 2 1, 2 2, 1 2, 1 1)), ((10 10, 11 10, 11 11, 10 10)))";
    const parts = polygonsOf(multi);
    expect(parts.length).toBe(2);
    expect(parts[0]?.length).toBe(2); // an outline and its hole
    const mixed = `GEOMETRYCOLLECTION (LINESTRING (0 0, 1 1), ${SQUARE_A}, POINT (5 5), POLYGON ((0 0, 1 1, 0 0)))`;
    expect(polygonsOf(mixed).length).toBe(1); // the line, the point, and the collapsed triangle are not ground
    // Coordinates are held to ~10 cm: the survey's lines have not earned more.
    expect(polygonsOf("POLYGON ((-93.1234567891 41.5, -93.1 41.5, -93.1 41.6, -93.1234567891 41.5))")[0]?.[0]?.[0]).toEqual([-93.123457, 41.5]);
    expect(toWkt({ form: "area", rings: [[[0, 0], [1, 0], [1, 1], [0, 0]]] })).toBe("POLYGON((0 0,1 0,1 1,0 0))");
  });

  test("acres are right to a fraction of a percent at farm scale", () => {
    // 0.01° × 0.01° at 41.5°N ≈ 1113.2 m × 833.7 m ≈ 229.3 acres.
    expect(Math.abs(acresOf(polygonsOf(SQUARE_A)) - 229.3)).toBeLessThan(1.5);
    const holed = polygonsOf("POLYGON ((0 0, 0.01 0, 0.01 0.01, 0 0.01, 0 0), (0 0, 0.005 0, 0.005 0.01, 0 0.01, 0 0))");
    expect(acresOf(holed)).toBeCloseTo(acresOf(polygonsOf("POLYGON ((0 0, 0.005 0, 0.005 0.01, 0 0.01, 0 0))")), 0);
  });

  test("tables are found by what they say they are, never by position", () => {
    expect(rowsOf(propertiesDoc, "horizon").length).toBe(2);
    expect(rowsOf(propertiesDoc, "component").map((r) => r.compname)).toEqual(["Otley", "Mahaska"]);
    expect(rowsOf({}, "summary")).toEqual([]); // an empty answer is no tables at all
  });

  test("one unit in several pieces is one delivery; blanks are absent, not zero", () => {
    const out = units();
    expect(out.map((u) => u.foreignId)).toEqual(["407650", "999"]);
    const otley = out[0] as SurveyUnitInput;
    expect(otley.parts.length).toBe(2);
    expect(otley.symbol).toBe("281B");
    expect(otley.purity).toBe(0.95); // the surveyor's own: 95% of it is the soil it is named for
    expect(otley.published).toBe("2025-09-08T17:04:42.937Z");
    expect(otley.citation).toBe("Jasper County, Iowa (IA099), version 31, 2025-09-08");
    const d = otley.description as Record<string, unknown>;
    expect(d.cornSuitabilityRating).toBe(91);
    expect(d.productivityIndex).toBe(0.89);
    expect(d.drainage).toBe("Moderately well drained");
    expect("bedrockCm" in d).toBe(false);
    const soils = d.soils as { name: string; major: boolean; horizons: { name: string; pH: number }[] }[];
    expect(soils.map((s) => [s.name, s.major])).toEqual([["Otley", true], ["Mahaska", false]]);
    expect(soils[0]?.horizons.map((h) => h.name)).toEqual(["Ap", "A"]);
    // Water: nothing said of it, so nothing claimed about it — and no purity to borrow.
    expect(out[1]?.purity).toBeUndefined();
    expect((out[1]?.description as { soils: unknown[] }).soils).toEqual([]);
  });
});

// ------------------------------------------------------------ the adapter

describe("M10 — a survey is a place and a claim about it", () => {
  test("units enter as entities; what the survey says enters as a claim with the surveyor's confidence and grounds", async () => {
    const { world, boundary, survey, feed } = await engagedWorld();
    const report = await feed.ingestSurvey(units());
    expect(report).toMatchObject({ introduced: 2, redrawn: 0, described: 2 });

    const all = (await boundary.walk(survey, 0, 10_000)).records;
    const unit = all.find((r) => r.classification === "soil-unit" && (r.body as { symbol?: string }).symbol === "281B");
    expect(unit?.kind).toBe("entity");
    expect(unit?.geometry?.form).toBe("collection"); // two pieces, one place
    expect((unit?.body as { acresHere: number }).acresHere).toBeGreaterThan(400);
    expect(unit?.actors).toEqual({ actor: survey, onBehalfOf: [world.org] });
    const water = all.find((r) => r.classification === "soil-unit" && (r.body as { symbol?: string }).symbol === "W");
    expect(water?.geometry?.form).toBe("area");

    const said = all.find((r) => r.classification === "soil-survey" && r.subjects[0] === unit?.id);
    // The conservative default (RFC-0011 §2 A1a): modeled ground is a claim.
    expect(said?.kind).toBe("assertion");
    expect(said?.confidence).toBe(0.95);
    expect(said?.grounds).toEqual([{ source: SSURGO_GROUND, citation: "Jasper County, Iowa (IA099), version 31, 2025-09-08" }]);
    expect(said?.geometry).toBeUndefined(); // placed by what it is about (RFC-0004 §7)
    expect(all.some((r) => r.kind === "event" && r.classification.startsWith("soil"))).toBe(false);
    const unsure = all.find((r) => r.classification === "soil-survey" && r.subjects[0] === water?.id);
    expect(unsure?.confidence).toBe(0.5); // certainty unstated is certainty not borrowed
  });

  test("a pull repeated admits nothing (RFC-0011 §3)", async () => {
    const { world, feed } = await engagedWorld();
    await feed.ingestSurvey(units());
    const head = await world.journal.head();
    const again = await feed.ingestSurvey(units());
    expect(again).toMatchObject({ introduced: 0, redrawn: 0, described: 0 });
    expect(again.skipped.every((s) => s.reason === ALREADY_RECORDED)).toBe(true);
    expect(await world.journal.head()).toBe(head);
  });

  test("republication is supersession (RFC-0011 §4): a new version replaces the claim; a moved line redraws the place", async () => {
    const { world, boundary, survey, feed } = await engagedWorld();
    await feed.ingestSurvey(units());
    const before = (await boundary.walk(survey, 0, 10_000)).records;
    const unit0 = before.find((r) => r.classification === "soil-unit" && (r.body as { symbol?: string }).symbol === "281B");
    const said0 = before.find((r) => r.classification === "soil-survey" && r.subjects[0] === unit0?.id);

    // Next year: same lines, new version.
    const v32 = versionsDoc("2026-09-10T12:00:00", "32");
    const next = await feed.ingestSurvey(units(v32));
    expect(next).toMatchObject({ introduced: 0, redrawn: 0, described: 2 });
    const chain = await world.journal.supersessionChain(said0?.id as Id);
    expect(chain.length).toBe(2);
    expect(chain[1]?.supersedes).toBe(said0?.id as Id);
    expect((chain[1]?.body as { version: string }).version).toBe("IA099@2026-09-10T12:00:00.000Z");

    // The year after: the surveyors moved a line.
    const v33 = versionsDoc("2027-09-12T12:00:00", "33");
    const moved = await feed.ingestSurvey(units(v33, unitsDoc([SQUARE_A])));
    expect(moved).toMatchObject({ introduced: 0, redrawn: 1, described: 2 });
    const places = await world.journal.supersessionChain(unit0?.id as Id);
    expect(places.map((p) => p.geometry?.form)).toEqual(["collection", "area"]);
    expect(places[1]?.occurrence.start).toBe("2027-09-12T12:00:00.000Z"); // the old line stands until then
    // The standing claim is about the standing place, and its history is whole.
    const claims = await world.journal.supersessionChain(said0?.id as Id);
    expect(claims.length).toBe(3);
    expect(claims[2]?.subjects).toEqual([places[1]?.id as Id]);
  });

  test("a survey engaged for less than it delivers is refused at the door, not trusted", async () => {
    const { feed } = await engagedWorld(["soil-unit"]); // may draw places; may not describe them
    const report = await feed.ingestSurvey(units());
    expect(report.introduced).toBe(2);
    expect(report.described).toBe(0);
    // Its representation of the farm does not reach descriptions.
    expect(report.skipped.map((s) => s.reason)).toEqual([
      "acting for a principal requires representation",
      "acting for a principal requires representation",
    ]);
  });

  test("T3 holds: a predicate that does not name the survey hides it, with no access code written", async () => {
    const { world, boundary, feed } = await engagedWorld();
    await feed.ingestSurvey(units());
    await world.journal.admit(
      grantRecord(world.org, { grantee: world.agronomist, scope: { classifications: ["field", "note"] }, capabilities: ["view"] }),
    );
    const maria = new Session(world.agronomist, boundary, new PendingStore(new MemoryPersistence()), NOW);
    await maria.sync();
    expect(maria.reading.all().some((r) => r.classification.startsWith("soil"))).toBe(false);

    const owner = new Session(world.owner, boundary, new PendingStore(new MemoryPersistence()), NOW);
    await owner.sync();
    owner.navigateTo(farmRegion);
    owner.reveal({ name: "ground", filter: { classifications: ["soil-unit"] }, visible: true });
    const marks = owner.marks().filter((m) => m.lens === "ground");
    expect(marks.length).toBe(2); // the places are marks; the claims ride in their stories
    const unit = owner.reading.all().find((r) => (r.body as { symbol?: string } | undefined)?.symbol === "281B");
    expect(owner.inspect(unit?.id as Id)?.timeline.map((r) => r.classification)).toEqual(["soil-survey"]);
    // A tap inside either piece finds the one place.
    expect(owner.pick([-93.175, 41.505]).map((r) => r.id)).toContain(unit?.id as Id);
    expect(owner.pick([-93.195, 41.505]).map((r) => r.id)).toContain(unit?.id as Id);
  });
});

// ------------------------------------------------------------- held copies

describe("M10 — what the provider said is kept", () => {
  const engaged: Area = farmRegion;

  test("the same version is never asked for twice; a new version is asked for once", async () => {
    const cache = new MemorySurveyCache();
    const state = { versions: versionsDoc(), units: unitsDoc() };
    const svc = service(state);
    const first = await readSurvey({ engaged, cache, fetchImpl: svc.fetchImpl });
    expect(first.units.length).toBe(2);
    expect(first.held).toBe(false);
    expect(svc.asked).toEqual(["versions", "units", "properties"]);

    await readSurvey({ engaged, cache, fetchImpl: svc.fetchImpl });
    expect(svc.asked.slice(3)).toEqual(["versions"]); // "has it changed?" — no

    state.versions = versionsDoc("2026-09-10T12:00:00", "32");
    const next = await readSurvey({ engaged, cache, fetchImpl: svc.fetchImpl });
    expect(svc.asked.slice(4)).toEqual(["versions", "units", "properties"]);
    expect(next.version).toBe("IA099@2026-09-10T12:00:00.000Z");
  });

  test("a service that is down is answered from the held copy, and says so", async () => {
    const cache = new MemorySurveyCache();
    const state: { versions: SdaDoc; units: SdaDoc; down?: boolean } = { versions: versionsDoc(), units: unitsDoc() };
    const svc = service(state);
    await expect(readSurvey({ engaged, cache: new MemorySurveyCache(), fetchImpl: service({ ...state, down: true }).fetchImpl })).rejects.toThrow(
      "service unreachable",
    ); // nothing held, nothing invented
    const live = await readSurvey({ engaged, cache, fetchImpl: svc.fetchImpl });
    state.down = true;
    const held = await readSurvey({ engaged, cache, fetchImpl: svc.fetchImpl });
    expect(held.held).toBe(true);
    expect(held.units).toEqual(live.units);
  });

  test("the held copy never adjudicates: a delivery from it admits nothing the world already holds", async () => {
    const { world, feed } = await engagedWorld();
    const cache = new MemorySurveyCache();
    const state: { versions: SdaDoc; units: SdaDoc; down?: boolean } = { versions: versionsDoc(), units: unitsDoc() };
    const svc = service(state);
    await feed.ingestSurvey((await readSurvey({ engaged, cache, fetchImpl: svc.fetchImpl })).units);
    const head = await world.journal.head();
    state.down = true;
    await feed.ingestSurvey((await readSurvey({ engaged, cache, fetchImpl: svc.fetchImpl })).units);
    expect(await world.journal.head()).toBe(head);
  });

  test("the archive keeps every table verbatim, once per version, and admits nothing", async () => {
    const cache = new MemorySurveyCache();
    const svc = service({ versions: versionsDoc(), units: unitsDoc() });
    const mukeys = Array.from({ length: 12 }, (_, i) => String(1000 + i)); // two chunks of keys
    const first = await archiveSurvey(mukeys, "v1", { engaged, cache, fetchImpl: svc.fetchImpl });
    expect(first.refused).toEqual([]);
    expect(first.held).toBe(0);
    expect(first.fetched).toBe(svc.asked.length);
    expect(first.fetched).toBeGreaterThan(60); // thirty-odd tables, two chunks each
    expect(first.rows).toBe(first.fetched * 2);
    const again = await archiveSurvey(mukeys, "v1", { engaged, cache, fetchImpl: svc.fetchImpl });
    expect(again).toMatchObject({ fetched: 0, held: first.fetched, rows: first.rows });
    expect(svc.asked.length).toBe(first.fetched);
  });

  test("a survey area is kept whole by version; a half-written archive is never mistaken for a held one", async () => {
    const dir = await mkdtemp(join(tmpdir(), "geofarm-soil-"));
    try {
      const area = areasOf(versionsDoc())[0]!;
      expect(downloadUrl(area)).toBe("https://websoilsurvey.sc.egov.usda.gov/DSD/Download/Cache/SSA/wss_SSA_IA099_[2025-09-08].zip");
      let fetches = 0;
      const ok = (async () => (fetches++, new Response(new Uint8Array([80, 75, 3, 4]), { status: 200 }))) as unknown as typeof fetch;
      const missing = (async () => new Response("no", { status: 404 })) as unknown as typeof fetch;
      await expect(mirrorSurveyArea(area, dir, missing)).rejects.toThrow("404");
      expect(await readdir(dir)).toEqual([]);
      const first = await mirrorSurveyArea(area, dir, ok);
      expect(first).toMatchObject({ fetched: true, bytes: 4 });
      const again = await mirrorSurveyArea(area, dir, ok);
      expect(again).toMatchObject({ fetched: false, bytes: 4, path: first.path });
      expect(fetches).toBe(1);
      expect(await readdir(dir)).toEqual(["IA099_2025-09-08.zip"]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

// -------------------------------------------------------------- engagement

describe("M10 — connecting is granting, whenever it happens", () => {
  test("a farm seeded before the survey existed engages it on the next start, once", async () => {
    const journal = new Journal(new MemoryStore());
    await seedFarm(journal);
    expect(await journal.get(FEED_ACTORS.soilSurvey)).toBeDefined();
    expect(await engageSources(journal)).toEqual([]); // already engaged: nothing to do

    // An older farm: everyone but the survey. A later process — its seed
    // counter long gone — engages only what is missing, colliding with nothing.
    const older = new Journal(new MemoryStore());
    await seedFarm(older);
    const kept = new MemoryStore();
    const old = new Journal(kept);
    for (const r of (await older.walkFrom(0, 10_000)).records) {
      if (r.id.startsWith(FEED_ACTORS.soilSurvey)) continue;
      const { seq: _seq, knowledgeTime: _kt, ...candidate } = r;
      await old.admit(candidate);
    }
    expect(await old.get(FEED_ACTORS.soilSurvey)).toBeUndefined();
    expect(await engageSources(old)).toEqual(["USDA Soil Survey"]);
    expect(await engageSources(old)).toEqual([]);

    // And the engagement is real: the survey can author through the door.
    const feed = new SoilSurveyFeed(new Boundary(old), FEED_ACTORS.soilSurvey, { org: "miller:001", ground: SSURGO_GROUND });
    expect(await feed.ingestSurvey(units())).toMatchObject({ introduced: 2, described: 2 });
  });
});

// ----------------------------------------------------- over the chosen store

const pgUrl = process.env.GEOFARM_PG_URL;

describe.skipIf(pgUrl === undefined)("M10 — held copies over PostgreSQL", () => {
  test("every answer is kept by request and version; the newest is what a dead service is answered from", async () => {
    const { PostgresSurveyCache } = await import("../apps/server/soil.ts");
    const cache = await PostgresSurveyCache.open(pgUrl as string);
    try {
      const key = `test-${newId()}`;
      expect(await cache.get(key, "v1")).toBeUndefined();
      expect(await cache.latest(key)).toBeUndefined();
      await cache.put(key, { source: SSURGO_GROUND, version: "v1", request: "select 1", doc: versionsDoc() });
      await cache.put(key, { source: SSURGO_GROUND, version: "v2", request: "select 1", doc: versionsDoc("2026-09-10T12:00:00", "32") });
      expect(await cache.get(key, "v1")).toEqual(versionsDoc()); // an object back, not a string of one
      expect((await cache.latest(key))?.version).toBe("v2");
      // Asked again at the same version, the held copy is replaced, not doubled.
      await cache.put(key, { source: SSURGO_GROUND, version: "v1", request: "select 1", doc: { Table: [] } });
      expect(await cache.get(key, "v1")).toEqual({ Table: [] });

      // And a whole read runs through it exactly as through memory.
      const state = { versions: versionsDoc(), units: unitsDoc() };
      const svc = service(state);
      const region: Area = { form: "area", rings: [[[-93.2 - Math.random() / 1e3, 41.5], [-93.1, 41.5], [-93.1, 41.6], [-93.2, 41.6]].map((c) => c as [number, number])] };
      region.rings[0]?.push(region.rings[0][0] as [number, number]);
      await readSurvey({ engaged: region, cache, fetchImpl: svc.fetchImpl });
      const again = await readSurvey({ engaged: region, cache, fetchImpl: svc.fetchImpl });
      expect(svc.asked).toEqual(["versions", "units", "properties", "versions"]);
      expect(again.units.length).toBe(2);
    } finally {
      await cache.close();
    }
  });
});
