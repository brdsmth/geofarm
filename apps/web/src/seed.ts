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

function rect(w: number, s: number, e: number, n: number): Coordinate[][] {
  return [
    [
      [w, s],
      [e, s],
      [e, n],
      [w, n],
      [w, s],
    ],
  ];
}

export type SeededWorld = {
  session: Session;
  names: Map<Id, string>;
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

  const actor = (id: Id, classification: string, name: string): CandidateRecord => ({
    id,
    kind: "actor",
    classification,
    actors: { actor: id, onBehalfOf: [] },
    occurrence: { start: "2000-01-01T00:00:00Z" },
    subjects: [],
    body: { name },
  });
  await journal.admit(actor(org, "organization", "Miller Farm"));
  await journal.admit(actor(you, "person", "You"));
  await journal.admit(actor(maria, "person", "Maria (agronomist)"));
  await journal.admit(actor(sam, "person", "Sam (operator)"));

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

  // The farm line and its places (quarter-section scale, central Iowa).
  const farm = entity("farm", "Miller Farm", {
    form: "area",
    rings: rect(-93.206, 41.496, -93.158, 41.532),
  });
  const north80 = entity("field", "North 80", { form: "area", rings: rect(-93.202, 41.5215, -93.1905, 41.5295) });
  const creek = entity("field", "Creek Field", { form: "area", rings: rect(-93.187, 41.5215, -93.172, 41.5295) });
  // West 40 as first surveyed — a correction will widen it in 2026.
  const west40 = entity("field", "West 40", { form: "area", rings: rect(-93.202, 41.5115, -93.1935, 41.519) });
  const home = entity("field", "Home Quarter", { form: "area", rings: rect(-93.1895, 41.4985, -93.1755, 41.508) });
  const bottom = entity("field", "River Bottom", { form: "area", rings: rect(-93.1895, 41.5105, -93.1755, 41.519) });
  const pond = entity("pond", "Stock Pond", { form: "area", rings: rect(-93.1715, 41.5105, -93.168, 41.5135) });
  const barn = entity("building", "Machine Shed", { form: "position", coordinates: [-93.1915, 41.5095] });
  const road = entity("road", "Gravel Lane", {
    form: "path",
    coordinates: [
      [-93.206, 41.5095],
      [-93.1915, 41.5095],
      [-93.172, 41.51],
      [-93.158, 41.5105],
    ],
  });

  const things = [farm, north80, creek, west40, home, bottom, pond, barn, road];
  for (const t of things) await journal.admit(t);

  // The West 40 boundary correction (W2): resurveyed wider, spring 2026.
  const west40corrected: CandidateRecord = {
    ...entity("field", "West 40", { form: "area", rings: rect(-93.202, 41.5085, -93.1935, 41.519) }),
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
    event("note", creek.id, "2026-06-20T00:00:00Z", "Yellowing along the drainage line", maria),
    event("note", bottom.id, "2026-06-24T00:00:00Z", "Standing water at the north end", maria),
    event("note", west40.id, "2026-06-27T00:00:00Z", "New line looks right after the survey", you),
    event("maintenance", barn.id, "2026-03-14T00:00:00Z", "Serviced the planter", sam),
  ];
  for (const h of history) await journal.admit(h);

  const boundary = new Boundary(journal);
  const session = new Session(you, boundary, new PendingStore(new MemoryPersistence()), NOW);
  await session.sync();

  const names = new Map<Id, string>();
  for (const r of session.reading.all()) {
    const n = (r.body as { name?: string } | undefined)?.name;
    if (n !== undefined) names.set(r.id, n);
  }
  return { session, names };
}
