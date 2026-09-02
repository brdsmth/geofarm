/**
 * P-18/P-19 tests: grants, capabilities, attenuation, sub-worlds.
 * RFC-0002 §1.4 (representation), §3.1 (the four capabilities, lattice,
 * author⊥view), §4 (grant lifecycle by Event), C3/I4 (attenuation),
 * C4/I5 (access state as projection), §4.4 (ownership by contribution).
 */
import { describe, expect, test } from "bun:test";
import { newId, type CandidateRecord, type Geometry, type Id } from "../world/index.ts";
import { Journal } from "../journal/index.ts";
import { MemoryStore } from "../journal/store-memory.ts";
import { AccessEngine, GRANT_CLASSIFICATION, matchesScope, type GrantBody, type Scope } from "./index.ts";

const westField: Geometry = {
  form: "area",
  rings: [
    [
      [-93.2, 41.5],
      [-93.15, 41.5],
      [-93.15, 41.55],
      [-93.2, 41.55],
      [-93.2, 41.5],
    ],
  ],
};

const LATER = "2100-01-01T00:00:00Z"; // an "as of now" that follows all admissions

function actorIntro(id: Id): CandidateRecord {
  return {
    id,
    kind: "actor",
    classification: "person",
    actors: { actor: id, onBehalfOf: [] },
    occurrence: { start: "2026-01-01T00:00:00Z" },
    subjects: [],
  };
}

function grant(
  grantor: Id,
  body: GrantBody,
  onBehalfOf: Id[] = [],
): CandidateRecord {
  return {
    id: newId(),
    kind: "event",
    classification: GRANT_CLASSIFICATION,
    actors: { actor: grantor, onBehalfOf },
    occurrence: { start: "2026-06-01T00:00:00Z" },
    subjects: [body.grantee], // grants are Events about agency (RFC-0002 §4.1)
    body,
  };
}

async function world() {
  // Deterministic knowledge clock: one second per admission, so knowledge-
  // time projections between admissions are cleanly testable (C4).
  let tick = 0;
  const journal = new Journal(
    new MemoryStore(),
    () => new Date(Date.parse("2026-06-01T00:00:00Z") + ++tick * 1000).toISOString(),
  );
  const engine = new AccessEngine(journal);
  const org = newId();
  const owner = newId();
  const agronomist = newId();
  await journal.admit({ ...actorIntro(org), classification: "organization" });
  await journal.admit(actorIntro(owner));
  await journal.admit(actorIntro(agronomist));
  // The org's field, introduced by the owner acting for the org — org-owned
  // (RFC-0002 §4.4, RFC-0011 §5).
  const field = await journal.admit({
    id: newId(),
    kind: "entity",
    classification: "field",
    actors: { actor: owner, onBehalfOf: [org] },
    occurrence: { start: "1990-01-01T00:00:00Z" },
    geometry: westField,
    subjects: [],
  });
  return { journal, engine, org, owner, agronomist, field };
}

describe("P-18 — grants confer, expire, and revoke by Event", () => {
  test("no grant, no reach: a stranger's sub-world excludes org content", async () => {
    const { engine, agronomist, field } = await world();
    const sw = await engine.subWorldAt(agronomist, LATER);
    const reachable = sw.holdings.some(
      (h) => h.capabilities.includes("view") && matchesScope(field, h.scopes[0] as Scope, field.geometry),
    );
    expect(reachable).toBe(false);
  });

  test("a predicate grant confers view over matching content", async () => {
    const { journal, engine, org, agronomist, field } = await world();
    await journal.admit(
      grant(org, {
        grantee: agronomist,
        scope: { classifications: ["field", "note", "diagnosis"] },
        capabilities: ["view"],
      }),
    );
    const sw = await engine.subWorldAt(agronomist, LATER);
    const covers = sw.holdings.some(
      (h) =>
        h.capabilities.includes("view") &&
        h.scopes.every((s) => matchesScope(field, s, field.geometry)),
    );
    expect(covers).toBe(true);
  });

  test("revocation is supersession; access state is a projection (C4/I5)", async () => {
    const { journal, engine, org, agronomist, field } = await world();
    const g = await journal.admit(
      grant(org, { grantee: agronomist, scope: {}, capabilities: ["view"] }),
    );
    const before = await engine.subWorldAt(agronomist, LATER);
    expect(before.holdings.length).toBeGreaterThan(1);
    // Revoke: supersede with no capabilities (RFC-0002 §4).
    await journal.admit({
      ...grant(org, { grantee: agronomist, scope: {}, capabilities: [] }),
      supersedes: g.id,
    });
    const after = await engine.subWorldAt(agronomist, LATER);
    const stillReaches = after.holdings.some(
      (h) =>
        h.capabilities.includes("view") &&
        h.scopes.every((s) => matchesScope(field, s, field.geometry)),
    );
    expect(stillReaches).toBe(false);
    // The audit question: what could they see before? Still answerable —
    // project to a knowledge time between the two grants (T2).
    const g2 = await journal.get(g.id);
    const midpoint = new Date(Date.parse(g2?.knowledgeTime as string) + 1).toISOString();
    const then = await engine.subWorldAt(agronomist, midpoint);
    expect(then.holdings.length).toBeGreaterThan(1);
  });

  test("expiry was fixed at issuance (RFC-0002 §4.1)", async () => {
    const { journal, engine, org, agronomist } = await world();
    await journal.admit(
      grant(org, {
        grantee: agronomist,
        scope: {},
        capabilities: ["view"],
        until: "2026-09-01T00:00:00Z", // season's end
      }),
    );
    const during = await engine.subWorldAt(agronomist, "2026-08-01T00:00:00Z");
    const after = await engine.subWorldAt(agronomist, "2026-10-01T00:00:00Z");
    // In force: original authority, the received holding, and the horizon
    // (the grant itself, viewable by its grantee — RFC-0002 §2.3).
    expect(during.holdings.length).toBe(3);
    expect(after.holdings.length).toBe(1); // only original authority remains
  });
});

describe("P-19 — sub-worlds, attenuation, representation", () => {
  test("authority only attenuates: a re-grant cannot widen reach (I4)", async () => {
    const { journal, engine, org, agronomist, field } = await world();
    const contractor = newId();
    await journal.admit(actorIntro(contractor));
    // Org grants the agronomist notes-only view...
    await journal.admit(
      grant(org, {
        grantee: agronomist,
        scope: { classifications: ["note"] },
        capabilities: ["view"],
      }),
    );
    // ...the agronomist re-grants "everything" to the contractor.
    await journal.admit(
      grant(agronomist, { grantee: contractor, scope: {}, capabilities: ["view"] }),
    );
    const sw = await engine.subWorldAt(contractor, LATER);
    // The contractor's received reach carries the agronomist's own bound:
    // the field entity (classification "field") stays out of every holding
    // the contractor received.
    const reachesField = sw.holdings.some(
      (h) =>
        h.capabilities.includes("view") &&
        h.scopes.every((s) => matchesScope(field, s, field.geometry)),
    );
    expect(reachesField).toBe(false);
  });

  test("representation flows the principal's reach through, in scope (§1.4)", async () => {
    const { journal, engine, org, owner, field } = await world();
    // The owner represents the org (membership): org's reach flows through.
    await journal.admit(
      grant(org, { grantee: owner, scope: {}, capabilities: ["represent"] }, []),
    );
    const sw = await engine.subWorldAt(owner, LATER);
    // Org owns the field (introduced for it); the owner, representing the
    // org, reaches it with the org's full capabilities.
    const reaches = sw.holdings.some(
      (h) =>
        h.capabilities.includes("view") &&
        h.capabilities.includes("author") &&
        h.scopes.every((s) => matchesScope(field, s, field.geometry)),
    );
    expect(reaches).toBe(true);
  });

  test("author does not imply view (RFC-0002 §3.1): the sensor writes blind", async () => {
    const { journal, engine, org, field } = await world();
    const sensor = newId();
    await journal.admit({ ...actorIntro(sensor), classification: "sensor" });
    await journal.admit(
      grant(org, {
        grantee: sensor,
        scope: { classifications: ["reading"] },
        capabilities: ["author"],
      }),
    );
    const sw = await engine.subWorldAt(sensor, LATER);
    const reading: CandidateRecord = {
      id: newId(),
      kind: "event",
      classification: "reading",
      actors: { actor: sensor, onBehalfOf: [] },
      occurrence: { start: "2026-07-15T06:00:00Z" },
      subjects: [field.id],
      body: { mm: 4 },
    };
    const fieldRecord = field;
    // May author its reading about the org's field...
    expect(
      engine.mayAuthor(sw, { ...reading, seq: 0, knowledgeTime: "" }, fieldRecord.geometry, [
        fieldRecord,
      ]),
    ).toBe(false); // ...not yet: the field itself is outside the reading-only scope
    // Scope the grant the way RFC-0002 §3.1 words it — subjects in scope:
    await journal.admit(
      grant(org, {
        grantee: sensor,
        scope: { classifications: ["reading", "field"] },
        capabilities: ["author"],
      }),
    );
    const sw2 = await engine.subWorldAt(sensor, LATER);
    expect(
      engine.mayAuthor(sw2, { ...reading, seq: 0, knowledgeTime: "" }, fieldRecord.geometry, [
        fieldRecord,
      ]),
    ).toBe(true);
    // And still cannot view anything: author ⊥ view.
    const views = sw2.holdings.some(
      (h) => h.capabilities.includes("view") && h.scopes.every((s) => matchesScope(fieldRecord, s, fieldRecord.geometry)),
    );
    expect(views).toBe(false);
  });

  test("spatial scopes bound by geometry: shares drawn on the map", async () => {
    const { journal, engine, org, agronomist } = await world();
    const eastHalf: Scope = {
      region: {
        form: "area",
        rings: [
          [
            [-93.17, 41.4],
            [-93.0, 41.4],
            [-93.0, 41.6],
            [-93.17, 41.6],
            [-93.17, 41.4],
          ],
        ],
      },
    };
    await journal.admit(
      grant(org, { grantee: agronomist, scope: eastHalf, capabilities: ["view"] }),
    );
    const sw = await engine.subWorldAt(agronomist, LATER);
    // A pond entirely in the west lies outside the drawn share.
    const westPond: CandidateRecord & { seq: number; knowledgeTime: string } = {
      id: newId(),
      kind: "entity",
      classification: "pond",
      actors: { actor: org, onBehalfOf: [] },
      occurrence: { start: "2000-01-01T00:00:00Z" },
      geometry: { form: "position", coordinates: [-93.19, 41.52] },
      subjects: [],
      seq: 0,
      knowledgeTime: "",
    };
    const inScope = sw.holdings.some(
      (h) =>
        h.capabilities.includes("view") &&
        h.scopes.every((s) => matchesScope(westPond, s, westPond.geometry)),
    );
    expect(inScope).toBe(false);
  });
});
