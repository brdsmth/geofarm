/**
 * M5 test fixture: the farm world with an intelligence in it.
 *
 * Extends the M2 cast (RFC-0016 §1) with the AI Actor and the content its
 * two modes need: a represent grant giving it a scoped Reach (agronomy,
 * imagery, its own claim classifications — never the financials), an
 * imagery history over the west field for the anomaly job, and one
 * genuinely hidden hazard: within the agent's Reach, outside the
 * agronomist's scope — the three-rings test case (RFC-0010 §4).
 */

import { newId, type CandidateRecord, type Id } from "../world/index.ts";
import { actorIntro, farmWorld, grantRecord, westGeom } from "../projection/fixtures.ts";
import { Boundary } from "../boundary/index.ts";

/** Classifications the agent may read and write within (its Reach). */
export const AGENT_SCOPE = [
  "field",
  "note",
  "diagnosis",
  "imagery",
  "anomaly",
  "advisory",
  "hazard",
  "reading",
];

/** A scene footprint that covers the west field with margin. */
export const westScene = (foreignId: string, capturedAt: string, hash: string): CandidateRecord => ({
  id: newId(),
  kind: "event",
  classification: "imagery",
  actors: { actor: "", onBehalfOf: [] }, // filled by the fixture
  occurrence: { start: capturedAt },
  geometry: {
    form: "area",
    rings: [
      [
        [-93.21, 41.49],
        [-93.14, 41.49],
        [-93.14, 41.56],
        [-93.21, 41.56],
        [-93.21, 41.49],
      ],
    ],
  },
  subjects: [],
  payload: { contentAddress: hash, mediaType: "image/tiff" },
  body: { foreignId },
});

export async function agentWorld() {
  const base = await farmWorld();
  const { journal, org, owner } = base;
  const boundary = new Boundary(journal);

  const agent = newId();
  await journal.admit(actorIntro(agent, "agent"));

  // The AI's standing (RFC-0002 §5.3): it represents the org within a
  // predicate scope — its Reach is the org's world, agronomy-shaped.
  await journal.admit(
    grantRecord(org, {
      grantee: agent,
      scope: { classifications: AGENT_SCOPE },
      capabilities: ["represent"],
    }),
  );

  // The viewer promoting an answer must be able to read what lands: let
  // the agronomist see the agent's claim classifications too.
  await journal.admit(
    grantRecord(org, {
      grantee: base.agronomist,
      scope: { classifications: ["reading", "anomaly"] },
      capabilities: ["view"],
    }),
  );

  // The genuinely hidden hazard: org content in the agent's Reach that
  // the agronomist's grant does not admit (RFC-0010 §4 ring three).
  const hazard = await journal.admit({
    id: newId(),
    kind: "event",
    classification: "hazard",
    actors: { actor: owner, onBehalfOf: [org] },
    occurrence: { start: "2026-06-15T00:00:00Z" },
    geometry: westGeom,
    subjects: [base.west.id],
    body: { text: "herbicide carryover reported on the neighboring parcel" },
  });

  // Five weeks of imagery over the west field; indexes live behind the
  // payload port, keyed by content address.
  const sceneIndexes = new Map<string, number>();
  const scenes: Record<string, Id> = {};
  const weeks: [string, string, number][] = [
    ["W-1", "2026-06-01T10:00:00Z", 0.82],
    ["W-2", "2026-06-08T10:00:00Z", 0.8],
    ["W-3", "2026-06-15T10:00:00Z", 0.81],
  ];
  for (const [foreignId, at, index] of weeks) {
    const hash = `sha-${foreignId}`;
    const scene = westScene(foreignId, at, hash);
    scene.actors = { actor: owner, onBehalfOf: [org] };
    const admitted = await journal.admit(scene);
    scenes[foreignId] = admitted.id;
    sceneIndexes.set(hash, index);
  }

  /** Add a later scene mid-test (the next week arriving). */
  const addScene = async (foreignId: string, at: string, index: number): Promise<Id> => {
    const hash = `sha-${foreignId}`;
    const scene = westScene(foreignId, at, hash);
    scene.actors = { actor: owner, onBehalfOf: [org] };
    const admitted = await journal.admit(scene);
    scenes[foreignId] = admitted.id;
    sceneIndexes.set(hash, index);
    return admitted.id;
  };

  /** The mechanism port: index by content address. */
  const sceneIndex = (r: { payload?: { contentAddress: string } }): number | undefined =>
    r.payload === undefined ? undefined : sceneIndexes.get(r.payload.contentAddress);

  return { ...base, boundary, agent, hazard, scenes, addScene, sceneIndex };
}
