/**
 * P-37: the three rings, end to end (RFC-0010 §4; M5 acceptance).
 *
 * Frame ⊂ Conversable (viewer-scope ∩ AI-scope) ⊂ Reach, and the three
 * rules that govern them:
 *
 *   1. Filtered-but-conversable content is surfaced by bringing it into
 *      the Frame — proposing, pointing — never by describing invisibly.
 *   2. Conclusions delivered to a viewer are derivable within the
 *      Conversable: reasoning over the Reach and asserting to a narrower
 *      viewer would launder inaccessible content through inference.
 *      Refused structurally, even against a misbehaving engine.
 *   3. Reach-knowledge that cannot be told is acted on autonomously:
 *      authored into the world, where properly-scoped Actors see it
 *      through ordinary lenses — never leaked in conversation.
 */
import { describe, expect, test } from "bun:test";
import { newId } from "../packages/world/index.ts";
import { Session } from "../packages/client/interaction/index.ts";
import { MemoryPersistence, PendingStore } from "../packages/client/stores/index.ts";
import {
  AskEngagement,
  viewerStores,
  type AgentContext,
  type ReasonerOutput,
  type Reasoner,
} from "../packages/agent/index.ts";
import { RuleReasoner } from "../packages/agent/reasoner.ts";
import { agentWorld } from "../packages/agent/fixtures.ts";

const NOW = "2026-07-01T00:00:00Z";

async function cast() {
  const world = await agentWorld();
  const session = new Session(
    world.agronomist,
    world.boundary,
    new PendingStore(new MemoryPersistence()),
    NOW,
  );
  await session.sync();
  return { ...world, session };
}

describe("ring one — surfacing means bringing into the Frame", () => {
  test("lens-hidden conversable content is proposed, not described", async () => {
    const { session, boundary, agent, org, west } = await cast();
    // The viewer reveals only field boundaries; the scouting note and
    // diagnosis are conversable but filtered out of the Frame.
    session.reveal({ name: "fields", filter: { classifications: ["field"] }, visible: true });
    session.select([west.id]);
    const engagement = new AskEngagement(
      boundary,
      agent,
      new RuleReasoner(),
      viewerStores(session),
      org,
    );
    const replies = await engagement.ask("what's going on here?");
    const reveal = replies.find((r) => r.kind === "reveal");
    expect(reveal).toBeDefined();
    if (reveal?.kind !== "reveal") return;
    // The proposal points at real conversable content the viewer's own
    // scope admits — acting on it is a Reveal verb, not a disclosure.
    for (const id of reveal.about) {
      expect(session.reading.get(id)).toBeDefined();
    }
  });

  test("a proposal may only point at the Conversable", async () => {
    const { session, boundary, agent, org, hazard, west } = await cast();
    session.select([west.id]);
    const pointing: Reasoner = {
      conclude: (): ReasonerOutput[] => [
        { type: "reveal", about: [hazard.id], text: "look at this" },
      ],
    };
    const engagement = new AskEngagement(boundary, agent, pointing, viewerStores(session), org);
    const replies = await engagement.ask("anything I should know?");
    expect(replies.length).toBe(0);
    expect(engagement.refused).toBe(1);
  });
});

describe("ring two — no laundering: conclusions derivable within the Conversable", () => {
  test("a misbehaving engine cannot deliver Reach-based conclusions", async () => {
    const { session, boundary, agent, org, west, hazard, lien, diagnosis } = await cast();
    session.select([west.id]);
    const misbehaving: Reasoner = {
      conclude: (context: AgentContext): ReasonerOutput[] => [
        {
          // Leans on the hazard: in the agent's Reach, outside the
          // viewer's scope. Laundering — must die at the gate.
          type: "claim",
          classification: "advisory",
          text: "hold off on planting here",
          subjects: [west.id],
          evidence: [hazard.id],
          confidence: 0.9,
        },
        {
          // Leans on the lien: outside even the agent's Reach.
          type: "claim",
          classification: "advisory",
          text: "this ground carries risk",
          subjects: [west.id],
          evidence: [lien.id],
          confidence: 0.9,
        },
        {
          // Concerns a subject the viewer cannot see: existence leaks too.
          type: "claim",
          classification: "advisory",
          text: "about the hazard itself",
          subjects: [hazard.id],
          evidence: [...context.neighborhood.conversable].slice(0, 1),
          confidence: 0.9,
        },
        {
          // Honest: stands entirely on conversable evidence.
          type: "claim",
          classification: "reading",
          text: "the standing diagnosis holds",
          subjects: [west.id],
          evidence: [diagnosis.id],
          confidence: 0.7,
        },
      ],
    };
    const engagement = new AskEngagement(boundary, agent, misbehaving, viewerStores(session), org);
    const replies = await engagement.ask("should I plant?");
    // Only the honest conclusion survives, and nothing in what the viewer
    // receives names the hidden content — not even by implication.
    expect(replies.length).toBe(1);
    expect(engagement.refused).toBe(3);
    const surface = JSON.stringify(replies);
    expect(surface).not.toContain(hazard.id);
    expect(surface).not.toContain(lien.id);
    expect(surface).not.toContain("hold off");
    expect(surface).not.toContain("carries risk");
  });

  test("what survives the gate still admits, and what was refused never lands", async () => {
    const { session, boundary, agent, org, journal, west, diagnosis } = await cast();
    session.select([west.id]);
    const before = (await journal.walkFrom(0, 10_000)).records.length;
    const engagement = new AskEngagement(
      boundary,
      agent,
      new RuleReasoner(),
      viewerStores(session),
      org,
    );
    const replies = await engagement.ask("why is this struggling?");
    const claim = replies.find((r) => r.kind === "claim");
    expect(claim?.kind).toBe("claim");
    if (claim?.kind !== "claim") return;
    expect(claim.claim.evidence).toContain(diagnosis.id);
    const promoted = await engagement.promote(claim.claim);
    expect(promoted.accepted).toBe(true);
    const after = (await journal.walkFrom(0, 10_000)).records.length;
    expect(after).toBe(before + 1); // the one deliberate promotion, nothing else
  });
});

describe("ring three — genuinely hidden knowledge is handled autonomously", () => {
  test("the hazard becomes world content through the agent's own mode, never a whisper", async () => {
    const { session, boundary, agent, org, owner, agronomist, west, hazard } = await cast();
    // Conversationally, the hazard does not exist for this viewer.
    session.select([west.id]);
    const engagement = new AskEngagement(
      boundary,
      agent,
      new RuleReasoner(),
      viewerStores(session),
      org,
    );
    const replies = await engagement.ask("anything I should know before planting?");
    expect(JSON.stringify(replies)).not.toContain(hazard.id);

    // Autonomously, the agent authors what it knows, within its scope.
    const advisory = await boundary.append(agent, {
      id: newId(),
      kind: "assertion",
      classification: "advisory",
      actors: { actor: agent, onBehalfOf: [org] },
      occurrence: { start: NOW },
      subjects: [west.id],
      evidence: [hazard.id],
      confidence: 0.8,
      body: { text: "hold planting until carryover risk is assessed" },
    });
    expect(advisory.accepted).toBe(true);
    if (!advisory.accepted) return;

    // Properly-scoped Actors see it through ordinary lenses…
    const ownerRead = await boundary.project(owner, {
      read: { form: "record", id: advisory.record.id },
    });
    expect((ownerRead as { level: string }).level).toBe("view");

    // …while for the narrow viewer it dissolves into absence, and even a
    // fresh sync brings nothing across.
    const viewerRead = await boundary.project(agronomist, {
      read: { form: "record", id: advisory.record.id },
    });
    expect(viewerRead).toBeUndefined();
    await session.sync();
    expect(session.reading.get(advisory.record.id)).toBeUndefined();
    expect(session.reading.get(hazard.id)).toBeUndefined();
  });
});
