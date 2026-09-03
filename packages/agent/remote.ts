/**
 * The engine across a wire (RFC-0010 §0: transport is mechanism).
 *
 * A shell in a browser cannot hold a model or a key; the intelligence's
 * engine runs where the intelligence's Actor does. What crosses the wire
 * is the assembled context — the viewer's Conversable, which by
 * construction lies inside the agent's own Reach (RFC-0010 §4), so the
 * engine learns nothing the agent could not already read — and what
 * comes back are proposals, which still face the shape gate on the
 * viewer's side. The gate does not move; only the mechanism did.
 */

import type { AdmittedRecord, Id } from "../world/index.ts";
import type { AgentContext, NeighborEntry, Reasoner, ReasonerOutput } from "./index.ts";
import { toOutputs } from "./engine.ts";

/** The context with its sets and maps flattened for JSON. Entries carry
 * ids only; their records are in `records`. */
export type WireContext = {
  agent: Id;
  frame: { view: AgentContext["frame"]["view"]; revealed: Id[] };
  gesture: AgentContext["gesture"];
  neighborhood: {
    records: AdmittedRecord[];
    entries: { id: Id; timeline: Id[]; claims: Id[] }[];
  };
  engagement: AgentContext["engagement"];
};

export function toWire(context: AgentContext): WireContext {
  return {
    agent: context.agent,
    frame: { view: context.frame.view, revealed: [...context.frame.revealed] },
    gesture: context.gesture,
    neighborhood: {
      records: [...context.neighborhood.records.values()],
      entries: context.neighborhood.entries.map((e) => ({
        id: e.id,
        timeline: e.timeline.map((r) => r.id),
        claims: e.claims.map((r) => r.id),
      })),
    },
    engagement: context.engagement,
  };
}

export function fromWire(wire: WireContext): AgentContext {
  const records = new Map<Id, AdmittedRecord>(wire.neighborhood.records.map((r) => [r.id, r]));
  const pick = (ids: Id[]): AdmittedRecord[] =>
    ids.map((id) => records.get(id)).filter((r): r is AdmittedRecord => r !== undefined);
  const entries: NeighborEntry[] = [];
  for (const e of wire.neighborhood.entries) {
    const record = records.get(e.id);
    if (record === undefined) continue;
    entries.push({ id: e.id, record, timeline: pick(e.timeline), claims: pick(e.claims) });
  }
  return {
    agent: wire.agent,
    frame: { view: wire.frame.view, revealed: new Set(wire.frame.revealed) },
    gesture: wire.gesture,
    neighborhood: { conversable: new Set(records.keys()), records, entries },
    engagement: wire.engagement,
  };
}

/** A proposal as the reasoner shapes it lacks the fields its kind does
 * not use; the schema wants them present and empty. */
function filled(o: unknown): unknown {
  if (typeof o !== "object" || o === null) return o;
  const r = o as Record<string, unknown>;
  return {
    type: r.type,
    text: r.text ?? "",
    classification: r.classification ?? "",
    subjects: r.subjects ?? [],
    evidence: r.evidence ?? [],
    confidence: r.confidence ?? 0,
    about: r.about ?? [],
  };
}

export class RemoteReasoner implements Reasoner {
  constructor(
    private readonly url: string,
    private readonly opts: { fetchImpl?: typeof fetch; token?: string; onError?: (e: unknown) => void } = {},
  ) {}

  async conclude(context: AgentContext): Promise<ReasonerOutput[]> {
    try {
      const res = await (this.opts.fetchImpl ?? fetch)(this.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.opts.token !== undefined ? { Authorization: `Bearer ${this.opts.token}` } : {}),
        },
        body: JSON.stringify({ context: toWire(context) }),
      });
      if (!res.ok) throw new Error(`engine ${res.status}`);
      const doc = (await res.json()) as { outputs?: unknown };
      // Re-validated here: the wire is not trusted either.
      return toOutputs({ outputs: Array.isArray(doc.outputs) ? doc.outputs.map(filled) : [] });
    } catch (error) {
      this.opts.onError?.(error);
      return [];
    }
  }
}

/** The server side: a request body → the reasoner's proposals. */
export async function concludeFromWire(reasoner: Reasoner, body: unknown): Promise<{ outputs: ReasonerOutput[] }> {
  const wire = (body as { context?: WireContext } | undefined)?.context;
  if (wire === undefined || typeof wire !== "object") return { outputs: [] };
  return { outputs: await reasoner.conclude(fromWire(wire)) };
}
