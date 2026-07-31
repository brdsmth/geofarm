/**
 * The demo farm: a seeded in-process world.
 *
 * The journal, boundary, and Session are the real packages (RFC-0012's
 * Boundary port is transport-agnostic — an in-browser world and a remote
 * one are the same contract). The farm here is Miller Farm: five named
 * fields, a pond, a barn, a road, and three seasons of history including
 * one boundary correction so the season slider shows true frames (W2/H3).
 */

import { newId, type CandidateRecord, type Coordinate, type Id } from "../../../packages/world/index.ts";
import { Journal } from "../../../packages/journal/index.ts";
import { MemoryStore } from "../../../packages/journal/store-memory.ts";
import { Boundary } from "../../../packages/boundary/index.ts";
import { Session } from "../../../packages/client/interaction/index.ts";
import { MemoryPersistence, PendingStore } from "../../../packages/client/stores/index.ts";

export const NOW = "2026-07-01T12:00:00Z";

function ring(pts: Coordinate[]): Coordinate[][] {
  return [[...pts, pts[0] as Coordinate]];
}

export type SeededWorld = {
  session: Session;
  names: Map<Id, string>;
  boundary: Boundary;
  /** The AI Actor (RFC-0010 §1): scoped, attributed, a participant. */
  assistant: Id;
  org: Id;
};

export async function seedWorld(): Promise<SeededWorld> {
  let tick = 0;
  const journal = new Journal(
    new MemoryStore(),
    () => new Date(Date.parse("2026-06-01T00:00:00Z") + ++tick * 1000).toISOString(),
  );

  const org = newId();
  const you = newId();
  const maria = newId();
  const sam = newId();

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
  const assistant = newId();
  await journal.admit(actor(org, "organization", "Miller Farm"));
  await journal.admit(actor(you, "person", "You"));
  await journal.admit(actor(maria, "person", "Maria (agronomist)"));
  await journal.admit(actor(sam, "person", "Sam (operator)"));
  await journal.admit(actor(assistant, "agent", "Farm assistant"));

  // Membership: everyone here acts for the farm (RFC-0002 §1.4).
  for (const person of [you, maria, sam]) {
    await journal.admit({
      id: newId(),
      kind: "event",
      classification: "grant",
      actors: { actor: org, onBehalfOf: [] },
      occurrence: { start: "2020-01-01T00:00:00Z" },
      subjects: [person],
      body: { grantee: person, scope: {}, capabilities: ["represent"] },
    });
  }

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
    subjects: [assistant],
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
        ],
      },
      capabilities: ["represent"],
    },
  });

  const entity = (
    classification: string,
    name: string,
    geometry: CandidateRecord["geometry"],
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
  const farm = entity("farm", "Miller Farm", {
    form: "area",
    rings: ring([
      [-93.1978, 41.52245],
      [-93.1882, 41.52245],
      [-93.1879, 41.5195],
      [-93.1877, 41.514],
      [-93.1878, 41.5082],
      [-93.1978, 41.5082],
    ]),
  });
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
  ): CandidateRecord => ({
    id: newId(),
    kind: "event",
    classification,
    actors: { actor: who, onBehalfOf: [org] },
    occurrence: { start: when },
    subjects: [subject],
    body: { text },
  });

  const yellowing = event(
    "note",
    creek.id,
    "2026-06-20T00:00:00Z",
    "Yellowing along the drainage line",
    maria,
  );
  const history: CandidateRecord[] = [
    event("planting", north80.id, "2024-05-02T00:00:00Z", "Planted corn"),
    event("planting", creek.id, "2024-05-04T00:00:00Z", "Planted soybeans"),
    event("harvest", north80.id, "2024-10-19T00:00:00Z", "Harvested — 214 bu/ac"),
    event("planting", north80.id, "2025-04-28T00:00:00Z", "Planted soybeans"),
    event("planting", creek.id, "2025-05-01T00:00:00Z", "Planted corn"),
    event("harvest", creek.id, "2025-10-24T00:00:00Z", "Harvested — 231 bu/ac"),
    event("planting", north80.id, "2026-05-06T00:00:00Z", "Planted corn"),
    event("planting", creek.id, "2026-05-08T00:00:00Z", "Planted corn"),
    event("planting", home.id, "2026-05-12T00:00:00Z", "Planted soybeans"),
    event("spray", north80.id, "2026-06-11T00:00:00Z", "Sprayed — post-emerge pass"),
    yellowing,
    event("note", bottom.id, "2026-06-24T00:00:00Z", "Standing water at the north end", maria),
    event("note", west40.id, "2026-06-27T00:00:00Z", "New line looks right after the survey", you),
    event("maintenance", barn.id, "2026-03-14T00:00:00Z", "Serviced the planter", sam),
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

  const boundary = new Boundary(journal);
  const session = new Session(you, boundary, new PendingStore(new MemoryPersistence()), NOW);
  await session.sync();

  const names = new Map<Id, string>();
  for (const r of session.reading.all()) {
    const n = (r.body as { name?: string } | undefined)?.name;
    if (n !== undefined) names.set(r.id, n);
  }
  return { session, names, boundary, assistant, org };
}
