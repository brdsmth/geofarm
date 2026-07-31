/**
 * P-32..P-36 tests: the intelligence as participant (RFC-0010).
 *
 * Context is read, not constructed (four strata from View + Pending +
 * Reading); asks carry zero restatement (S7); every answer is
 * Assertion-shaped or nothing (module rule 8) and peels to evidence
 * (S8); promotion records an AI-attributed Assertion and everything
 * unpromoted evaporates (A3); the weekly anomaly job authors scoped,
 * signed, self-superseding flags (A4).
 */
import { describe, expect, test } from "bun:test";
import { Session } from "../client/interaction/index.ts";
import { MemoryPersistence, PendingStore } from "../client/stores/index.ts";
import {
  AskEngagement,
  CandidateAssertion,
  assembleContext,
  viewerStores,
  type PeelNode,
  type Reply,
} from "./index.ts";
import { RuleReasoner } from "./reasoner.ts";
import { AnomalyJob } from "./anomaly.ts";
import { agentWorld } from "./fixtures.ts";

const NOW = "2026-07-01T00:00:00Z";

async function engagedSession() {
  const world = await agentWorld();
  const session = new Session(world.agronomist, world.boundary, new PendingStore(new MemoryPersistence()), NOW);
  await session.sync();
  const engagement = new AskEngagement(
    world.boundary,
    world.agent,
    new RuleReasoner(),
    viewerStores(session),
    world.org,
  );
  return { ...world, session, engagement };
}

function claims(replies: Reply[]): CandidateAssertion[] {
  return replies.filter((r) => r.kind === "claim").map((r) => r.claim);
}

describe("P-32 — four-strata context assembly", () => {
  test("the Frame is the viewer's View, inherited whole — not a copy", async () => {
    const { boundary, agent, session, west } = await engagedSession();
    session.select([west.id]);
    const context = await assembleContext(boundary, agent, viewerStores(session), "why?", []);
    expect(context.frame.view).toBe(session.view);
    expect(context.gesture.selection).toEqual([west.id]);
  });

  test("the Neighborhood is bounded by the Conversable: viewer ∩ agent", async () => {
    const { boundary, agent, session, west, lien, hazard, diagnosis } = await engagedSession();
    session.select([west.id]);
    const context = await assembleContext(boundary, agent, viewerStores(session), "why?", []);
    // The diagnosis is in both scopes: conversable.
    expect(context.neighborhood.conversable.has(diagnosis.id)).toBe(true);
    // The lien is outside the agent's Reach; the hazard is outside the
    // viewer's scope. Neither exists for this conversation.
    expect(context.neighborhood.conversable.has(lien.id)).toBe(false);
    expect(context.neighborhood.conversable.has(hazard.id)).toBe(false);
  });

  test("a drawn region indicates what it touches (the circled corner)", async () => {
    const { boundary, agent, session, west, east } = await engagedSession();
    session.draw(
      {
        form: "area",
        rings: [
          [
            [-93.19, 41.51],
            [-93.17, 41.51],
            [-93.17, 41.53],
            [-93.19, 41.53],
            [-93.19, 41.51],
          ],
        ],
      },
      NOW,
    );
    const context = await assembleContext(boundary, agent, viewerStores(session), "why?", []);
    const indicated = context.neighborhood.entries.map((e) => e.id);
    expect(indicated).toContain(west.id);
    expect(indicated).not.toContain(east.id);
  });

  test("entries carry timeline and standing claims, bound to the View's time", async () => {
    const { boundary, agent, session, west, scoutingNote, diagnosis } = await engagedSession();
    session.select([west.id]);
    // Bind the View before the note was taken: the timeline honors it.
    session.navigateTime({ start: "2026-06-10T00:00:00Z" });
    const early = await assembleContext(boundary, agent, viewerStores(session), "why?", []);
    const westEarly = early.neighborhood.entries.find((e) => e.id === west.id);
    expect(westEarly?.timeline.map((r) => r.id)).not.toContain(scoutingNote.id);
    session.navigateTime({ start: NOW });
    const now = await assembleContext(boundary, agent, viewerStores(session), "why?", []);
    const westNow = now.neighborhood.entries.find((e) => e.id === west.id);
    expect(westNow?.timeline.map((r) => r.id)).toContain(scoutingNote.id);
    expect(westNow?.claims.map((r) => r.id)).toContain(diagnosis.id);
  });

  test("the Engagement stratum carries the exchange; no separate store holds it", async () => {
    const { session, engagement, west } = await engagedSession();
    session.select([west.id]);
    await engagement.ask("why is this struggling?");
    await engagement.ask("what changed?");
    expect(engagement.engagement.length).toBe(2);
    expect(engagement.engagement[0]?.ask).toBe("why is this struggling?");
    engagement.discard();
    expect(engagement.engagement.length).toBe(0);
  });
});

describe("P-33 — circle-and-ask (S7: zero context restatement)", () => {
  test("a bare ask answers situated: subjects, evidence, place from the View", async () => {
    const { session, engagement, west, diagnosis } = await engagedSession();
    session.select([west.id]);
    const ask = "Why is this corner struggling?";
    // The ask restates nothing: no ids, no coordinates, no dates.
    expect(ask).not.toMatch(/\d{4}-|\bfield\b|-93|41\.5/);
    const replies = await engagement.ask(ask);
    const answer = claims(replies)[0];
    expect(answer).toBeDefined();
    expect(answer?.subjects).toEqual([west.id]);
    expect(answer?.evidence).toContain(diagnosis.id);
    expect(answer?.geometry).toBeDefined();
    expect(answer?.text).toContain("nitrogen deficiency");
  });

  test("ambiguous intent is asked back, never assumed (intent is inference)", async () => {
    const { engagement } = await engagedSession();
    const replies = await engagement.ask("help?");
    expect(replies.every((r) => r.kind === "question")).toBe(true);
    expect(claims(replies).length).toBe(0);
  });
});

describe("P-34 — Assertion shape and evidence peel-back (S8)", () => {
  test("unevidenced output is unrepresentable (module rule 8)", async () => {
    const { boundary, agent, session, west } = await engagedSession();
    session.select([west.id]);
    const context = await assembleContext(boundary, agent, viewerStores(session), "why?", []);
    const bare = CandidateAssertion.shape(
      {
        type: "claim",
        classification: "reading",
        text: "I just know",
        subjects: [west.id],
        evidence: [],
        confidence: 0.9,
      },
      context.neighborhood,
      agent,
      session.view.time,
    );
    expect(bare).toBeUndefined();
    const unplaced = CandidateAssertion.shape(
      {
        type: "claim",
        classification: "reading",
        text: "about nothing",
        subjects: [],
        evidence: [west.id],
        confidence: 0.9,
      },
      context.neighborhood,
      agent,
      session.view.time,
    );
    expect(unplaced).toBeUndefined();
  });

  test("100% of sampled answers peel to records inward and grounds outward", async () => {
    const { session, engagement, west, east, scoutingNote } = await engagedSession();
    const sampled: CandidateAssertion[] = [];
    for (const focus of [[west.id], [east.id], [west.id, east.id]]) {
      session.select(focus);
      sampled.push(...claims(await engagement.ask("what's going on here?")));
    }
    expect(sampled.length).toBeGreaterThan(0);
    for (const answer of sampled) {
      const peel = await engagement.peel(answer);
      expect(peel.length).toBeGreaterThan(0);
      // Every leaf is a record that either cites the world no further
      // (an observation) or cites outward grounds — never a dead end.
      const leaves: PeelNode[] = [];
      const walk = (n: PeelNode): void => {
        if (n.evidence.length === 0) leaves.push(n);
        else n.evidence.forEach(walk);
      };
      peel.forEach(walk);
      for (const leaf of leaves) {
        const bottomed =
          (leaf.record.evidence?.length ?? 0) === 0 || leaf.grounds.length > 0;
        expect(bottomed).toBe(true);
      }
    }
    // The diagnosis answer peels through the claim to the scouting note.
    session.select([west.id]);
    const [answer] = claims(await engagement.ask("why?"));
    const peel = await engagement.peel(answer as CandidateAssertion);
    const secondLevel = peel[0]?.evidence.map((n) => n.record.id);
    expect(secondLevel).toContain(scoutingNote.id);
  });
});

describe("P-35 — promotion (A3)", () => {
  test("promotion records a real Assertion attributed to the AI Actor", async () => {
    const { session, engagement, boundary, agent, org, agronomist, west } = await engagedSession();
    session.select([west.id]);
    const [answer] = claims(await engagement.ask("why is this struggling?"));
    const result = await engagement.promote(answer as CandidateAssertion);
    expect(result.accepted).toBe(true);
    if (!result.accepted) return;
    expect(result.record.kind).toBe("assertion");
    expect(result.record.actors.actor).toBe(agent);
    expect(result.record.actors.onBehalfOf).toEqual([org]);
    expect(result.record.confidence).toBeGreaterThan(0);
    // The promoted claim is world content now: the viewer reads it back
    // through the ordinary door.
    await session.sync();
    expect(session.reading.get(result.record.id)).toBeDefined();
    const read = await boundary.project(agronomist, {
      read: { form: "record", id: result.record.id },
    });
    expect((read as { level: string }).level).toBe("view");
  });

  test("unpromoted answers leave no residue", async () => {
    const { session, engagement, journal, west, east } = await engagedSession();
    const before = (await journal.walkFrom(0, 10_000)).records.length;
    session.select([west.id]);
    await engagement.ask("why?");
    session.select([east.id]);
    await engagement.ask("and here?");
    engagement.discard();
    const after = (await journal.walkFrom(0, 10_000)).records.length;
    expect(after).toBe(before);
  });
});

describe("P-36 — the autonomous anomaly job (A4)", () => {
  test("a drop against the field's own record is flagged: scoped, signed, evidenced", async () => {
    const world = await agentWorld();
    await world.addScene("W-4", "2026-06-22T10:00:00Z", 0.55);
    const job = new AnomalyJob(world.boundary, world.agent, world.sceneIndex, {
      principal: world.org,
    });
    const run = await job.run();
    expect(run.rejected).toEqual([]);
    expect(run.authored.length).toBe(1);
    const flag = run.authored[0];
    expect(flag?.kind).toBe("assertion");
    expect(flag?.classification).toBe("anomaly");
    expect(flag?.actors.actor).toBe(world.agent);
    expect(flag?.subjects).toEqual([world.west.id]);
    expect(flag?.confidence).toBeGreaterThan(0.5);
    expect(flag?.evidence).toContain(world.scenes["W-4"]);
    expect(flag?.geometry).toBeDefined();
    // Steady state: running again authors nothing new.
    const again = await job.run();
    expect(again.authored.length).toBe(0);
    expect(again.unchanged).toBeGreaterThan(0);
  });

  test("recovery self-supersedes the standing flag (stale advice is revised, unasked)", async () => {
    const world = await agentWorld();
    await world.addScene("W-4", "2026-06-22T10:00:00Z", 0.55);
    const job = new AnomalyJob(world.boundary, world.agent, world.sceneIndex, {
      principal: world.org,
    });
    const first = await job.run();
    const flag = first.authored[0];
    // The field recovers; baseline now includes the bad week, and the
    // recovered index sits within threshold of it.
    await world.addScene("W-5", "2026-06-29T10:00:00Z", 0.8);
    const second = await job.run();
    expect(second.authored.length).toBe(1);
    const clearing = second.authored[0];
    expect(clearing?.supersedes).toBe(flag?.id as string);
    // The standing view through the boundary is the clearing, not the flag.
    const standing = await world.boundary.project(world.agent, {
      read: { form: "standing", id: flag?.id as string },
    });
    expect((standing as { id: string }).id).toBe(clearing?.id as string);
  });

  test("quiet fields stay quiet: no history, no flag, no noise", async () => {
    const world = await agentWorld();
    const job = new AnomalyJob(world.boundary, world.agent, world.sceneIndex, {
      principal: world.org,
    });
    const run = await job.run();
    expect(run.authored.length).toBe(0);
  });
});
