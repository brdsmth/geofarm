/**
 * M6 — many hands (P-38..P-41).
 *
 * RFC-0002 §1.4 (representation: one mechanism for membership and
 * delegation; dual attribution, I7), §2.1 (predicate scopes), §3.1
 * (granting is authorship of Grants), §4 (grant lifecycle by Event;
 * revocation is supersession), §8.5 (the tripwire), T2 (audit is a query);
 * RFC-0011 §5 (engaged sources author under representation); RFC-0016
 * C1–C3, S5, S6 under real two-party collaboration.
 *
 * Everything here goes through the Session and the boundary: the whole
 * milestone is grants and sharing flows; no new access machinery exists.
 */
import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { newId, type Id } from "../packages/world/index.ts";
import { ownerOf } from "../packages/access/index.ts";
import { Boundary } from "../packages/boundary/index.ts";
import { Session } from "../packages/client/interaction/index.ts";
import { MemoryPersistence, PendingStore } from "../packages/client/stores/index.ts";
import { sharing } from "../packages/client/surface/index.ts";
import { AskEngagement, viewerStores } from "../packages/agent/index.ts";
import { RuleReasoner } from "../packages/agent/reasoner.ts";
import { agentWorld } from "../packages/agent/fixtures.ts";
import { actorIntro, farmWorld, westGeom } from "../packages/projection/fixtures.ts";
import { grantShape, shapeOf, structural } from "../tools/instruments/index.ts";

const NOW = "2026-07-01T00:00:00Z";
const SEASON_END = "2026-11-01T00:00:00Z";

/** The agronomic predicate (RFC-0016 C2): kinds of content, whole farm. */
const AGRONOMY = ["field", "note", "diagnosis", "spray", "reading", "anomaly"];

function open(actor: Id, boundary: Boundary): Session {
  return new Session(actor, boundary, new PendingStore(new MemoryPersistence()), NOW);
}

async function cast() {
  const world = await farmWorld();
  const boundary = new Boundary(world.journal);
  const owner = open(world.owner, boundary);
  await owner.sync();
  return { ...world, boundary, ownerSession: owner };
}

describe("P-38 — membership is representation; every record carries the chain (C1)", () => {
  test("a worker acts for the farm; the farm owns what they record; the chain is preserved", async () => {
    const { journal, boundary, org, ownerSession, west } = await cast();
    const worker = newId();
    await journal.admit(actorIntro(worker));

    // The owner, acting for the org, brings the worker in: a Grant, authored
    // like any record (RFC-0002 §3.1), through the one door.
    ownerSession.commit(
      ownerSession.share({ grantee: worker, scope: {}, capabilities: ["represent"], at: NOW }),
    );
    expect((await ownerSession.send()).admitted).toBe(1);

    // Who I am here is knowledge (RFC-0014 §2): the worker's chain is a
    // projection of the grants in their own Reading.
    const workerSession = open(worker, boundary);
    await workerSession.sync();
    expect(workerSession.chain).toEqual({ actor: worker, onBehalfOf: [org] });

    workerSession.select([west.id]);
    workerSession.commit(workerSession.annotate("note", { text: "sprayer calibrated" }, NOW));
    expect((await workerSession.send()).admitted).toBe(1);

    // Dual attribution end-to-end (I7): by the worker, for the farm.
    await ownerSession.sync();
    const note = ownerSession.reading
      .all()
      .find((r) => (r.body as { text?: string } | undefined)?.text === "sprayer calibrated");
    expect(note).toBeDefined();
    expect(note?.actors).toEqual({ actor: worker, onBehalfOf: [org] });
    expect(ownerOf(note!)).toBe(org);
    // And the surface says it the way a farm would.
    expect(sharing.actingFor("Sam", "Miller Farm")).toBe("Sam, for Miller Farm");
  });
});

describe("P-39 — the agronomist's predicate grant (C2)", () => {
  test("agronomy over the whole farm: a predicate, not an object list", async () => {
    const { journal, boundary, org, ownerSession, west, east, lien, diagnosis } = await cast();
    const maria = newId();
    await journal.admit(actorIntro(maria));

    // The engagement (RFC-0002 §1.4, RFC-0011 §5): a narrower, time-bounded
    // representation over the agronomic classifications — view + author in
    // scope, whole farm, until the season ends.
    const grantDraft = ownerSession.share({
      grantee: maria,
      scope: { classifications: AGRONOMY },
      capabilities: ["represent"],
      until: SEASON_END,
      at: NOW,
    });
    ownerSession.commit(grantDraft);
    expect((await ownerSession.send()).admitted).toBe(1);

    const mariaSession = open(maria, boundary);
    await mariaSession.sync();
    // Her world: the fields and the agronomy, both fields (whole farm)...
    expect(mariaSession.reading.get(west.id)).toBeDefined();
    expect(mariaSession.reading.get(east.id)).toBeDefined();
    expect(mariaSession.reading.get(diagnosis.id)).toBeDefined();
    // ...and the books do not exist for her (S6, RFC-0012 §6).
    expect(mariaSession.reading.get(lien.id)).toBeUndefined();
    expect(mariaSession.chain.onBehalfOf).toEqual([org]);

    // She authors in scope: the farm owns it, her signature stays.
    mariaSession.select([east.id]);
    mariaSession.commit(mariaSession.annotate("note", { text: "leaf tissue sampled" }, NOW));
    expect((await mariaSession.send()).admitted).toBe(1);
    await ownerSession.sync();
    const hers = ownerSession.reading
      .all()
      .find((r) => (r.body as { text?: string } | undefined)?.text === "leaf tissue sampled");
    expect(hers?.actors.actor).toBe(maria);
    expect(ownerOf(hers!)).toBe(org);

    // Out of scope: refused at the door, with no access code of its own.
    const outside = await boundary.append(maria, {
      id: newId(),
      kind: "event",
      classification: "lien",
      actors: { actor: maria, onBehalfOf: [org] },
      occurrence: { start: NOW },
      subjects: [east.id],
      body: { holder: "nobody" },
    });
    expect(outside.accepted).toBe(false);

    // The tripwire reads predicate (RFC-0002 §8.5).
    const grant = ownerSession.shares().find((s) => s.grant.grantee === maria);
    expect(grant).toBeDefined();
    expect(shapeOf(grant!.grant.scope)).toBe("predicate");
    expect(grant!.grant.until).toBe(SEASON_END);
  });

  test("sharing drawn on the map: a region gesture bounds the share (RFC-0002 §4.1)", async () => {
    const { journal, boundary, ownerSession, west, east } = await cast();
    const adjuster = newId();
    await journal.admit(actorIntro(adjuster));

    // Draw the west field's extent; promote the gesture into a Grant.
    const gesture = ownerSession.draw(westGeom, NOW);
    ownerSession.commit(
      ownerSession.share({
        grantee: adjuster,
        scope: { classifications: ["field", "note"] },
        capabilities: ["view"],
        gestureId: gesture,
        at: NOW,
      }),
    );
    expect(ownerSession.pending.gestures.length).toBe(0); // promoted, not lingering
    expect((await ownerSession.send()).admitted).toBe(1);
    await ownerSession.sync();

    const adjusterSession = open(adjuster, boundary);
    await adjusterSession.sync();
    expect(adjusterSession.reading.get(west.id)).toBeDefined();
    expect(adjusterSession.reading.get(east.id)).toBeUndefined();
    // The grant itself has a place: sharing has a location (§4.1).
    const share = ownerSession.shares().find((s) => s.grant.grantee === adjuster);
    expect(share?.record.geometry?.form).toBe("area");
    expect(share?.grant.scope.region).toBeDefined();
    expect(shapeOf(share!.grant.scope)).toBe("predicate");
  });
});

describe("P-40 — revocation, and the June audit query (C3/S5)", () => {
  test("access ends by supersession; what she could see in June is a projection", async () => {
    const { journal, boundary, ownerSession, west, lien, diagnosis, scoutingNote } = await cast();
    const maria = newId();
    await journal.admit(actorIntro(maria));

    ownerSession.commit(
      ownerSession.share({
        grantee: maria,
        scope: { classifications: AGRONOMY },
        capabilities: ["represent"],
        at: "2026-06-01T00:00:00Z",
      }),
    );
    await ownerSession.send();
    await ownerSession.sync();
    const grant = ownerSession.shares().find((s) => s.grant.grantee === maria)!;
    const june = new Date(Date.parse(grant.record.knowledgeTime) + 1).toISOString();

    const mariaSession = open(maria, boundary);
    await mariaSession.sync();
    expect(mariaSession.reading.get(diagnosis.id)).toBeDefined();

    // The engagement ends: a Grant conferring nothing supersedes the
    // standing one (RFC-0002 §4.1). No delete, no register.
    ownerSession.commit(ownerSession.revoke(grant.record.id, NOW)!);
    expect((await ownerSession.send()).admitted).toBe(1);
    await ownerSession.sync();
    expect(ownerSession.shares().some((s) => s.grant.grantee === maria)).toBe(false);

    // Forward flow stops: her next walk brings the revocation and nothing
    // else; her authorship dissolves into absence (unknown subject).
    await mariaSession.sync();
    expect(mariaSession.chain.onBehalfOf).toEqual([]);
    const late = await boundary.append(maria, {
      id: newId(),
      kind: "event",
      classification: "note",
      actors: { actor: maria, onBehalfOf: [] },
      occurrence: { start: NOW },
      subjects: [west.id],
      body: { text: "one more thing" },
    });
    expect(late.accepted).toBe(false);
    // What she projected while granted was truly seen (§4.3): her Reading
    // still holds the diagnosis; only new projections exclude it.
    expect(mariaSession.reading.get(diagnosis.id)).toBeDefined();

    // The June question, answered from the owner's Reading alone (T2, S5).
    const inJune = ownerSession.reachOf(maria, june);
    const juneIds = new Set(inJune.map((r) => r.id));
    expect(juneIds.has(west.id)).toBe(true);
    expect(juneIds.has(diagnosis.id)).toBe(true);
    expect(juneIds.has(scoutingNote.id)).toBe(true);
    expect(juneIds.has(lien.id)).toBe(false);
    // And now: nothing but the record of her own revocation.
    const now = ownerSession.knownAsOf()!;
    const today = ownerSession.reachOf(maria, now);
    expect(today.every((r) => r.classification === "grant")).toBe(true);
  });

  test("S5: no audit feature exists in the codebase", () => {
    const root = join(import.meta.dir, "..");
    const files: { path: string; text: string }[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (/\.(ts|html)$/.test(name)) files.push({ path: relative(root, p), text: readFileSync(p, "utf8") });
      }
    };
    walk(join(root, "packages"));
    walk(join(root, "apps"));
    const reading = structural(files);
    expect(reading.auditSymbols).toEqual([]);
    // While we are here: S1 and S2, structurally.
    expect(reading.destinations).toBe(0);
    expect(reading.stores.sort()).toEqual(["PendingStore", "ReadingStore"]); // + the View, a value
  });
});

describe("S6 re-run — two parties and the intelligence between them", () => {
  test("the AI honors the Conversable intersection for an engaged collaborator", async () => {
    const { journal, boundary, org, owner, agent, west, hazard, lien } = await agentWorld();
    const maria = newId();
    await journal.admit(actorIntro(maria));
    const ownerSession = open(owner, boundary);
    await ownerSession.sync();
    ownerSession.commit(
      ownerSession.share({
        grantee: maria,
        scope: { classifications: AGRONOMY },
        capabilities: ["represent"],
        at: NOW,
      }),
    );
    await ownerSession.send();

    const mariaSession = open(maria, boundary);
    await mariaSession.sync();
    mariaSession.select([west.id]);
    const engagement = new AskEngagement(boundary, agent, new RuleReasoner(), viewerStores(mariaSession), org);
    const replies = await engagement.ask("what's the standing read here?");
    expect(replies.some((r) => r.kind === "claim")).toBe(true);
    const surface = JSON.stringify(replies);
    expect(surface).not.toContain(hazard.id); // in the agent's Reach, not hers
    expect(surface).not.toContain(lien.id); // in nobody's conversation
    expect(engagement.offered).toBeGreaterThan(0);
  });
});

describe("P-41 — the grant-shape instrument (RFC-0002 §8.5)", () => {
  test("shapes classify; the fixture world reads predicate-shaped", async () => {
    expect(shapeOf({})).toBe("universal");
    expect(shapeOf({ classifications: ["note"] })).toBe("predicate");
    expect(shapeOf({ ids: [newId()] })).toBe("identity");
    expect(shapeOf({ ids: [newId()], period: { start: NOW } })).toBe("mixed");

    const { journal, ownerSession } = await cast();
    const maria = newId();
    await journal.admit(actorIntro(maria));
    ownerSession.commit(
      ownerSession.share({ grantee: maria, scope: { classifications: AGRONOMY }, capabilities: ["represent"], at: NOW }),
    );
    await ownerSession.send();
    await ownerSession.sync();
    const reading = grantShape(ownerSession.reading.all());
    expect(reading.byShape.predicate).toBeGreaterThanOrEqual(2); // the fixture's C2 grant + this one
    expect(reading.byShape.identity).toBe(0);
    expect(reading.byShape.universal).toBe(1); // the owner's own membership
  });
});
