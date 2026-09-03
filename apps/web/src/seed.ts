/**
 * The demo farm: a seeded in-process world.
 * surface-exempt-file: these strings are world content (field names, notes
 * a person wrote) — records, not the system's own copy (RFC-0000 §2.6).
 *
 * The journal, boundary, and Session are the real packages (RFC-0012's
 * Boundary port is transport-agnostic — an in-browser world and a remote
 * one are the same contract). The farm here is Miller Farm: five named
 * fields, a pond, a barn, a road, and three seasons of history including
 * one boundary correction so the season slider shows true frames (W2/H3).
 */

import type { CandidateRecord, Coordinate, Geometry, Id } from "../../../packages/world/index.ts";
import { Journal } from "../../../packages/journal/index.ts";
import { Boundary } from "../../../packages/boundary/index.ts";
import { LocalStore } from "./store-local.ts";
import { WeatherFeed } from "../../../packages/feeds/weather/index.ts";

/** Identities are cheap and opaque (RFC-0004 §6); the demo's are stable
 * across reloads — and across worlds: the same farm seeded into a browser
 * or into a server's journal has the same people in it, so a remembered
 * View and an unsent outbox still point at the same farm tomorrow. */
let seq = 0;
const newId = (): Id => `miller:${String(++seq).padStart(3, "0")}`;

/** The cast (RFC-0016 §1), by stable identity. */
export const CAST = {
  org: "miller:001",
  you: "miller:002",
  maria: "miller:003",
  sam: "miller:004",
  assistant: "miller:005",
} as const;

/** The engaged external sources (RFC-0011 §1): each an Actor holding a
 * representation grant over the classifications it may author. */
export const FEED_ACTORS = {
  weather: "miller:nws",
  archive: "miller:open-meteo",
  imagery: "miller:earth-search",
} as const;

/** What the weather sources' records are called — border configuration
 * (RFC-0011 §2 Amendment 1), chosen so a station's reading and the
 * assistant's "reading" (an answer) never share a name. */
export const WEATHER_NAMES = { site: "weather-station", measurement: "weather-reading", estimate: "weather-estimate" };
export const WEATHER_CLASSIFICATIONS = [WEATHER_NAMES.site, WEATHER_NAMES.measurement, "forecast", WEATHER_NAMES.estimate];

export const NOW = "2026-07-01T12:00:00Z";

/** The farm line, traced from the imagery (see `seedFarm`); exported so
 * the feeds know what region the farm engaged them for. */
export const FARM_RING: Coordinate[] = [
  [-93.1978, 41.52245],
  [-93.1882, 41.52245],
  [-93.1879, 41.5195],
  [-93.1877, 41.514],
  [-93.1878, 41.5082],
  [-93.1978, 41.5082],
];
export const FARM_CENTER: Coordinate = [-93.1927, 41.5153];

/** The agronomic predicate (RFC-0016 C2): what an agronomist's engagement
 * covers — the people, the places, and everything grown or observed;
 * nothing financial. A scope is a list of kinds, never of things. */
export const AGRONOMY = [
  "organization",
  "person",
  "agent",
  "service",
  "farm",
  "field",
  "pond",
  "building",
  "road",
  "planting",
  "harvest",
  "spray",
  "note",
  "maintenance",
  "diagnosis",
  "reading",
  "anomaly",
  "soil-site",
  "soil-sample",
  ...WEATHER_CLASSIFICATIONS,
  "imagery",
];

function ring(pts: Coordinate[]): Coordinate[][] {
  return [[...pts, pts[0] as Coordinate]];
}

export type SeededWorld = {
  journal: Journal;
  boundary: Boundary;
  /** The people who can look at this farm, in a chosen order. */
  people: Id[];
  /** The AI Actor (RFC-0010 §1): scoped, attributed, a participant. */
  assistant: Id;
  org: Id;
  feeds: typeof FEED_ACTORS;
  /** Forget the browser's copy of the world and reseed on next load. */
  reset: () => void;
};

/** The browser's world: seeded once, restored from the device thereafter. */
export async function seedWorld(storage: Storage): Promise<SeededWorld> {
  const store = new LocalStore("geofarm-world-1", storage);
  let seeding = true;
  let tick = 0;
  const journal = new Journal(store, () =>
    seeding
      ? new Date(Date.parse("2026-06-01T00:00:00Z") + ++tick * 1000).toISOString()
      : new Date().toISOString(),
  );
  const world: SeededWorld = {
    journal,
    boundary: new Boundary(journal),
    people: [CAST.you, CAST.sam, CAST.maria],
    assistant: CAST.assistant,
    org: CAST.org,
    feeds: FEED_ACTORS,
    reset: () => store.forget(),
  };

  // A world already on this device: replay it as ordinary history — same
  // records, same order, same knowledge times — and seed nothing.
  if (await store.restore()) {
    seeding = false;
    return world;
  }
  await seedFarm(journal);
  seeding = false;
  await store.persist();
  return world;
}

/** Miller Farm, admitted into any journal: the cast, their grants, the
 * places, three seasons of work, and the engaged sources. */
export async function seedFarm(journal: Journal): Promise<void> {
  seq = Object.keys(CAST).length; // the cast is numbered first; the rest follow
  const { org, you, maria, sam, assistant } = CAST;

  // Introductions land farm-owned (RFC-0002 §4.4) so every member's
  // Reading can put a name to a signature — a record whose author has no
  // visible name is attributed in id only, which reads as anonymous.
  const actor = (id: Id, classification: string, name: string): CandidateRecord => ({
    id,
    kind: "actor",
    classification,
    actors: { actor: id, onBehalfOf: id === org ? [] : [org] },
    occurrence: { start: "2000-01-01T00:00:00Z" },
    subjects: [],
    body: { name },
  });
  await journal.admit(actor(org, "organization", "Miller Farm"));
  await journal.admit(actor(you, "person", "You"));
  await journal.admit(actor(maria, "person", "Maria (agronomist)"));
  await journal.admit(actor(sam, "person", "Sam (operator)"));
  await journal.admit(actor(assistant, "agent", "Farm assistant"));

  // Membership: the owner and the operator act for the farm over
  // everything (RFC-0002 §1.4 — a broad, long-lived representation).
  for (const person of [you, sam]) {
    await journal.admit({
      id: newId(),
      kind: "event",
      classification: "grant",
      actors: { actor: org, onBehalfOf: [] },
      occurrence: { start: "2020-01-01T00:00:00Z" },
      subjects: [org],
      body: { grantee: person, scope: {}, capabilities: ["represent"] },
    });
  }

  // The agronomist's engagement (RFC-0016 C2; M6): a narrower, season-
  // bounded representation over the agronomic classifications of the whole
  // farm — a predicate, not a list of fields. She sees the people, the
  // places, and the agronomy; never the books.
  await journal.admit({
    id: newId(),
    kind: "event",
    classification: "grant",
    actors: { actor: you, onBehalfOf: [org] },
    occurrence: { start: "2026-03-01T00:00:00Z" },
    subjects: [org],
    body: {
      grantee: maria,
      scope: { classifications: AGRONOMY },
      capabilities: ["represent"],
      until: "2026-11-01T00:00:00Z",
    },
  });

  // The assistant's standing (RFC-0002 §5.3): it represents the farm
  // within a predicate scope — agronomy, never the books. Its Reach is
  // what this grant admits; the people above see everything, so the
  // Conversable ring in any engagement here is exactly this scope.
  await journal.admit({
    id: newId(),
    kind: "event",
    classification: "grant",
    actors: { actor: org, onBehalfOf: [] },
    occurrence: { start: "2026-01-01T00:00:00Z" },
    subjects: [org],
    body: {
      grantee: assistant,
      scope: {
        classifications: [
          "farm",
          "field",
          "pond",
          "building",
          "road",
          "planting",
          "harvest",
          "spray",
          "note",
          "maintenance",
          "diagnosis",
          "reading",
          "anomaly",
          "advisory",
          "soil-site",
          "soil-sample",
          ...WEATHER_CLASSIFICATIONS,
          "imagery",
        ],
      },
      capabilities: ["represent"],
    },
  });

  const entity = (
    classification: string,
    name: string,
    geometry: Geometry,
    since = "1994-03-01T00:00:00Z",
  ): CandidateRecord => ({
    id: newId(),
    kind: "entity",
    classification,
    actors: { actor: you, onBehalfOf: [org] },
    occurrence: { start: since },
    geometry,
    subjects: [],
    body: { name },
  });

  // The farm line and its places, traced from the imagery the map renders
  // (REVIEW-003 §3): every line below follows something visible in the
  // World_Imagery tiles at this spot — the section roads on all four
  // sides, the field edge at 41.5185, the treed creek running northeast,
  // and the notch around the neighbor's acreage and pond. The first pixel
  // a farmer studies must agree with the ground under it.
  const farm = entity("farm", "Miller Farm", { form: "area", rings: ring(FARM_RING) });
  const north80 = entity("field", "North 80", {
    form: "area",
    rings: ring([
      [-93.1978, 41.5185],
      [-93.1978, 41.52245],
      [-93.1882, 41.52245],
      [-93.188, 41.5209],
      [-93.1893, 41.5209],
      [-93.1893, 41.5185],
    ]),
  });
  const creek = entity("field", "Creek Field", {
    form: "area",
    rings: ring([
      [-93.1955, 41.5185],
      [-93.1955, 41.5122],
      [-93.1928, 41.5128],
      [-93.1892, 41.513],
      [-93.1877, 41.5137],
      [-93.1877, 41.5185],
    ]),
  });
  // West 40 as first platted — the 2026 resurvey found the line undershot.
  const west40 = entity("field", "West 40", {
    form: "area",
    rings: ring([
      [-93.1978, 41.5122],
      [-93.1978, 41.5185],
      [-93.1961, 41.5185],
      [-93.1961, 41.5122],
    ]),
  });
  const home = entity("field", "Home Quarter", {
    form: "area",
    rings: ring([
      [-93.1928, 41.5082],
      [-93.1928, 41.5128],
      [-93.1892, 41.513],
      [-93.1877, 41.5137],
      [-93.1878, 41.5082],
    ]),
  });
  const bottom = entity("field", "River Bottom", {
    form: "area",
    rings: ring([
      [-93.1978, 41.5082],
      [-93.1978, 41.5122],
      [-93.1955, 41.5122],
      [-93.1928, 41.5128],
      [-93.1928, 41.5082],
    ]),
  });
  const pond = entity("pond", "Stock Pond", {
    form: "area",
    rings: ring([
      [-93.1893, 41.5201],
      [-93.1887, 41.5201],
      [-93.1887, 41.5206],
      [-93.1893, 41.5206],
    ]),
  });
  const barn = entity("building", "Machine Shed", { form: "position", coordinates: [-93.1976, 41.5207] });
  const road = entity("road", "Gravel Lane", {
    form: "path",
    coordinates: [
      [-93.1978, 41.5205],
      [-93.195, 41.5202],
      [-93.1915, 41.5203],
      [-93.1897, 41.5205],
    ],
  });

  const things = [farm, north80, creek, west40, home, bottom, pond, barn, road];
  for (const t of things) await journal.admit(t);

  // The West 40 boundary correction (W2): resurveyed wider, spring 2026 —
  // the corrected east line lands on the boundary visible in the imagery.
  const west40corrected: CandidateRecord = {
    ...entity("field", "West 40", {
      form: "area",
      rings: ring([
        [-93.1978, 41.5122],
        [-93.1978, 41.5185],
        [-93.1955, 41.5185],
        [-93.1955, 41.5122],
      ]),
    }),
    supersedes: west40.id,
    occurrence: { start: "2026-05-10T00:00:00Z" },
  };
  await journal.admit(west40corrected);

  // Three seasons of work and notes.
  const event = (
    classification: string,
    subject: Id,
    when: string,
    text: string,
    who: Id = sam,
    extra: Record<string, unknown> = {},
  ): CandidateRecord => ({
    id: newId(),
    kind: "event",
    classification,
    actors: { actor: who, onBehalfOf: [org] },
    occurrence: { start: when },
    subjects: [subject],
    body: { text, ...extra },
  });
  const planted = (subject: Id, when: string, crop: string): CandidateRecord =>
    event("planting", subject, when, `Planted ${crop}`, sam, { crop });

  const yellowing = event(
    "note",
    creek.id,
    "2026-06-20T00:00:00Z",
    "Yellowing along the drainage line",
    maria,
  );
  const history: CandidateRecord[] = [
    planted(north80.id, "2024-05-02T00:00:00Z", "corn"),
    planted(creek.id, "2024-05-04T00:00:00Z", "soybeans"),
    planted(west40.id, "2024-05-06T00:00:00Z", "corn"),
    event("harvest", north80.id, "2024-10-19T00:00:00Z", "Harvested — 214 bu/ac"),
    event("harvest", creek.id, "2024-10-21T00:00:00Z", "Harvested — 58 bu/ac"),
    event("harvest", west40.id, "2024-10-22T00:00:00Z", "Harvested — 198 bu/ac"),
    planted(north80.id, "2025-04-28T00:00:00Z", "soybeans"),
    planted(creek.id, "2025-05-01T00:00:00Z", "corn"),
    planted(home.id, "2025-05-03T00:00:00Z", "corn"),
    event("harvest", creek.id, "2025-10-24T00:00:00Z", "Harvested — 231 bu/ac"),
    event("harvest", north80.id, "2025-10-26T00:00:00Z", "Harvested — 61 bu/ac"),
    event("harvest", home.id, "2025-10-28T00:00:00Z", "Harvested — 224 bu/ac"),
    planted(north80.id, "2026-05-06T00:00:00Z", "corn"),
    planted(creek.id, "2026-05-08T00:00:00Z", "corn"),
    planted(home.id, "2026-05-12T00:00:00Z", "soybeans"),
    planted(west40.id, "2026-05-14T00:00:00Z", "soybeans"),
    event("spray", north80.id, "2026-06-11T00:00:00Z", "Sprayed — post-emerge pass"),
    yellowing,
    event("note", bottom.id, "2026-06-24T00:00:00Z", "Standing water at the north end", maria),
    event("note", west40.id, "2026-06-27T00:00:00Z", "New line looks right after the survey", you),
    event("maintenance", barn.id, "2026-03-14T00:00:00Z", "Serviced the planter", sam),
    // The books (RFC-0016 C2's other half): what the agronomist's
    // engagement does not cover, and the assistant never discusses.
    event("invoice", home.id, "2026-04-02T00:00:00Z", "Seed invoice — Pioneer, $18,400", you),
    event("lien", bottom.id, "2026-01-15T00:00:00Z", "Operating line — First Ag Bank", you),
  ];
  for (const h of history) await journal.admit(h);

  // Maria's read on the yellowing: a claim with its basis attached, so
  // the assistant's answers have somewhere real to peel back to
  // (RFC-0009 §5 — nothing here "just knows").
  await journal.admit({
    id: newId(),
    kind: "assertion",
    classification: "diagnosis",
    actors: { actor: maria, onBehalfOf: [org] },
    occurrence: { start: "2026-06-22T00:00:00Z" },
    subjects: [creek.id],
    evidence: [yellowing.id],
    confidence: 0.7,
    body: { text: "Nitrogen running short along the drainage line" },
  });

  // The soil lab (S4 — the sixth layer): an engaged external Actor
  // admitted through the same door as the weather provider, with the
  // border configured for soil instead of weather. Sites are sample
  // points; samples are measurements. No new code anywhere.
  const boundary = new Boundary(journal);
  const lab = newId();
  await journal.admit(actor(lab, "service", "Prairie Soil Lab"));
  await journal.admit({
    id: newId(),
    kind: "event",
    classification: "grant",
    actors: { actor: you, onBehalfOf: [org] },
    occurrence: { start: "2025-10-01T00:00:00Z" },
    subjects: [org],
    body: { grantee: lab, scope: { classifications: ["soil-site", "soil-sample"] }, capabilities: ["represent"] },
  });
  const soil = new WeatherFeed(boundary, lab, {
    org,
    channels: { pH: "measurement", organicMatterPct: "measurement", cec: "measurement" },
    ground: "prairie-soil-lab-methods-2025",
    classifications: { site: "soil-site", measurement: "soil-sample", estimate: "soil-estimate" },
  });
  const sites: [string, string, number, number, number, number][] = [
    ["N80-A", "North 80 — sample A", -93.1955, 41.5205, 6.4, 3.1],
    ["N80-B", "North 80 — sample B", -93.191, 41.5195, 6.1, 2.8],
    ["CRK-A", "Creek Field — sample A", -93.192, 41.5155, 5.7, 3.6],
    ["HQ-A", "Home Quarter — sample A", -93.1905, 41.5105, 6.8, 2.4],
    ["RB-A", "River Bottom — sample A", -93.1955, 41.5102, 6.2, 4.2],
  ];
  for (const [foreignId, name, lon, lat, pH, om] of sites) {
    await soil.ensureStation({ foreignId, name, lon, lat });
    await soil.ingestReadings([
      { foreignStationId: foreignId, channel: "pH", time: "2025-10-20T00:00:00Z", value: pH },
      { foreignStationId: foreignId, channel: "organicMatterPct", time: "2025-10-20T00:00:00Z", value: om },
    ]);
  }

  // The live sources (RFC-0011 §1: connecting is granting): the weather
  // service, the weather archive, and the imagery catalog, each engaged
  // over the classifications it may author. Their content arrives later,
  // through the door, as anyone's would.
  const engaged: [Id, string, string[]][] = [
    [FEED_ACTORS.weather, "National Weather Service", WEATHER_CLASSIFICATIONS],
    [FEED_ACTORS.archive, "Open-Meteo weather archive", WEATHER_CLASSIFICATIONS],
    [FEED_ACTORS.imagery, "Earth Search (Sentinel-2)", ["imagery"]],
  ];
  for (const [id, name, classifications] of engaged) {
    await journal.admit(actor(id, "service", name));
    await journal.admit({
      id: newId(),
      kind: "event",
      classification: "grant",
      actors: { actor: org, onBehalfOf: [] },
      occurrence: { start: "2026-01-01T00:00:00Z" },
      subjects: [org],
      body: { grantee: id, scope: { classifications }, capabilities: ["represent"] },
    });
  }
}
