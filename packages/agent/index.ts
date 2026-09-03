/**
 * @geofarm/agent — the intelligence as participant (RFC-0010).
 *
 * The AI is an Actor, never a feature: scoped, attributed, evidence-bound.
 * Its conversational context is not constructed — it is *read*, in four
 * strata, from the same three stores every viewer already holds (P-32:
 * View + Pending + Reading; no separate AI-context store exists):
 *
 *   Frame        — the viewer's View, inherited whole (RFC-0010 §2.1);
 *   Gesture      — the indicated things: selection, drawn regions, the ask;
 *   Neighborhood — the semantic surroundings, bounded by the Conversable;
 *   Engagement   — the exchange so far, ephemeral, promoted-or-evaporating.
 *
 * Three rings bound reasoning (RFC-0010 §4): Frame ⊂ Conversable
 * (viewer-scope ∩ AI-scope) ⊂ Reach. The Neighborhood is assembled inside
 * the Conversable by construction, and every conversational claim must
 * stand on evidence within it — laundering the Reach through inference is
 * structurally refused, not discouraged.
 *
 * Module rule 8 (PLAN-001 §4): agent outputs are Assertion-shaped or
 * nothing. `CandidateAssertion` has a private constructor; the one gate
 * that mints it requires subjects, evidence-or-grounds, stated confidence,
 * and Conversable derivability. Unevidenced output is unrepresentable.
 *
 * The boundary is the agent's only door (module rule 3); the reasoning
 * engine is a replaceable mechanism behind the `Reasoner` interface, and
 * no LLM provider is visible outside this package (RFC-0010 §0).
 */

import type {
  AdmittedRecord,
  CandidateRecord,
  Geometry,
  Ground,
  Id,
  TemporalExtent,
} from "../world/index.ts";
import { newId } from "../world/index.ts";
import { geometryIntersectsArea } from "../world/spatial.ts";
import { matchesScope } from "../access/index.ts";
import type { AppendResult, Boundary } from "../boundary/index.ts";

/** The door as the agent uses it: the walk and the append, wherever they are. */
export type Door = Pick<Boundary, "walk" | "append">;

/** The whole Reach, page after page (RFC-0012 §4) — each record once. */
export async function walkAll(door: Pick<Door, "walk">, actor: Id): Promise<AdmittedRecord[]> {
  const seen = new Set<Id>();
  const out: AdmittedRecord[] = [];
  let watermark = 0;
  for (;;) {
    const page = await door.walk(actor, watermark);
    if (page.records.length === 0) break;
    for (const r of page.records) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        out.push(r);
      }
    }
    watermark = page.watermark;
  }
  return out;
}
import type { Gesture, ReadingStore, View } from "../client/stores/index.ts";

export const PACKAGE = "@geofarm/agent" as const;

// ----------------------------------------------------------------- context

/** The viewer's three stores, read as they stand (RFC-0014; P-32).
 * Live views, not snapshots: `view` and `gestures` must track the
 * session, so the agent always engages inside the viewer's *current*
 * situation — use `viewerStores` to adapt a session. */
export type ViewerStores = {
  readonly view: View;
  readonly gestures: readonly Gesture[];
  readonly reading: ReadingStore;
};

/** Adapt a viewer's session (structurally — no client import) into the
 * live three-store window the agent reads. */
export function viewerStores(session: {
  view: View;
  pending: { gestures: readonly Gesture[] };
  reading: ReadingStore;
}): ViewerStores {
  return {
    get view() {
      return session.view;
    },
    get gestures() {
      return session.pending.gestures;
    },
    reading: session.reading,
  };
}

/** Stratum 1 — the shared way of looking, inherited whole (RFC-0010 §2). */
export type Frame = {
  view: View;
  /** What the lens stack currently reveals — chosen visibility is
   * information about what the conversation is about. */
  revealed: ReadonlySet<Id>;
};

/** Stratum 2 — the indicated things: *this, here* (RFC-0010 §2). */
export type GestureStratum = {
  selection: readonly Id[];
  regions: readonly Gesture[];
  ask: string;
};

/** One indicated or framed thing with its semantic surroundings
 * (RFC-0009 §7): projected state, derived timeline, standing claims. */
export type NeighborEntry = {
  id: Id;
  record: AdmittedRecord;
  /** What has happened here, up to the Frame's temporal binding. */
  timeline: AdmittedRecord[];
  /** Standing claims about it, with authors and confidences. */
  claims: AdmittedRecord[];
};

/** Stratum 3 — the reasoning substrate, pre-connected, bounded by the
 * Conversable ring: viewer-scope ∩ AI-scope (RFC-0010 §4). */
export type Neighborhood = {
  /** Every id whose content both parties' scopes admit. */
  conversable: ReadonlySet<Id>;
  /** The conversable records, indexed — evidence chains resolve here. */
  records: ReadonlyMap<Id, AdmittedRecord>;
  /** Surroundings of the indicated things. */
  entries: NeighborEntry[];
};

/** Stratum 4 — the exchange so far: apparatus, ephemeral (RFC-0010 §2). */
export type Turn = { ask: string; replies: Reply[] };

/** The exchange as an engine reads it: what was asked and what was
 * answered, in words — a candidate-Assertion's text and confidence, a
 * proposal's text, a question. Sealed claims stay with the engagement;
 * only their saying travels, which is what lets a context cross a wire. */
export type ReplySummary = { kind: Reply["kind"]; text: string; confidence?: number };
export type EngagementTurn = { ask: string; replies: readonly ReplySummary[] };

export function summarizeTurn(turn: Turn): EngagementTurn {
  return {
    ask: turn.ask,
    replies: turn.replies.map((r) =>
      r.kind === "claim"
        ? { kind: r.kind, text: r.claim.text, confidence: r.claim.confidence }
        : { kind: r.kind, text: r.text },
    ),
  };
}

export type AgentContext = {
  /** Who is reasoning: the AI Actor's own identity, in view of itself —
   * its prior claims in the Neighborhood are recognizably its own. */
  agent: Id;
  frame: Frame;
  gesture: GestureStratum;
  neighborhood: Neighborhood;
  engagement: readonly EngagementTurn[];
};

/**
 * Assemble the four strata (P-32). Reading, not construction: the Frame
 * and Gesture are the viewer's stores verbatim; the Neighborhood is the
 * intersection of the viewer's Reading with what the agent's own walk
 * through the boundary admits — the Conversable ring, computed from the
 * two sub-worlds' actual contents, never from privileged machinery.
 */
export async function assembleContext(
  boundary: Door,
  agentActor: Id,
  stores: ViewerStores,
  ask: string,
  engagement: readonly Turn[],
): Promise<AgentContext> {
  // The agent's side of the ring: its own scoped feed (RFC-0012 §4).
  const agentSees = new Set((await walkAll(boundary, agentActor)).map((r) => r.id));

  const conversable = new Set<Id>();
  const records = new Map<Id, AdmittedRecord>();
  for (const r of stores.reading.all()) {
    if (agentSees.has(r.id)) {
      conversable.add(r.id);
      records.set(r.id, r);
    }
  }

  const { view } = stores;
  const bound = Date.parse(view.time.end ?? view.time.start);

  // What the lens stack reveals (the Frame is also what it chooses to show).
  const revealed = new Set<Id>();
  for (const r of records.values()) {
    const place = stores.reading.placeOf(r.id);
    for (const lens of view.lenses) {
      if (lens.visible && matchesScope(r, lens.filter, place)) {
        revealed.add(r.id);
        break;
      }
    }
  }

  // The indicated things: selection, plus whatever conversable content the
  // drawn regions touch (the circle around the struggling corner).
  const indicated = new Set<Id>(view.selection.filter((id) => conversable.has(id)));
  for (const g of stores.gestures) {
    for (const r of records.values()) {
      const place = stores.reading.placeOf(r.id);
      if (place !== undefined && touches(place, g.geometry)) indicated.add(r.id);
    }
  }

  const entries: NeighborEntry[] = [];
  for (const id of indicated) {
    const record = records.get(id);
    if (record === undefined) continue;
    const about = [...records.values()].filter((r) => r.subjects.includes(id));
    entries.push({
      id,
      record,
      timeline: about
        .filter((r) => Date.parse(r.occurrence.start) <= bound)
        .sort((a, b) => Date.parse(a.occurrence.start) - Date.parse(b.occurrence.start)),
      claims: about.filter((r) => r.kind === "assertion"),
    });
  }

  return {
    agent: agentActor,
    frame: { view, revealed },
    gesture: { selection: view.selection, regions: stores.gestures, ask },
    neighborhood: { conversable, records, entries },
    engagement: engagement.map(summarizeTurn),
  };
}

// ------------------------------------------------------------------ claims

/**
 * A conversational answer that asserts something about reality: a
 * candidate-Assertion (RFC-0010 §6) — full Assertion shape, unrecorded,
 * View-resident, gone with the engagement unless promoted.
 *
 * The constructor is private (module rule 8): the only mint is `shape`,
 * which refuses anything unevidenced or not derivable within the
 * Conversable. There is no output category of "just information."
 */
export class CandidateAssertion {
  private constructor(
    readonly classification: string,
    readonly text: string,
    readonly subjects: readonly Id[],
    readonly evidence: readonly Id[],
    readonly grounds: readonly Ground[],
    readonly confidence: number,
    readonly occurrence: TemporalExtent,
    readonly geometry: Geometry | undefined,
    readonly author: Id,
  ) {}

  /**
   * The one gate. Well-formedness (RFC-0009 §5): subjects present,
   * evidence or grounds present, confidence stated. Derivability
   * (RFC-0010 §4 rule 2): subjects and evidence must lie within the
   * Conversable — a claim leaning on the Reach is refused whole, never
   * trimmed into something the engine did not conclude.
   */
  static shape(
    draft: ClaimDraft,
    neighborhood: Neighborhood,
    author: Id,
    occurrence: TemporalExtent,
  ): CandidateAssertion | undefined {
    if (draft.subjects.length === 0) return undefined;
    if (draft.evidence.length === 0 && (draft.grounds?.length ?? 0) === 0) return undefined;
    if (!(draft.confidence >= 0 && draft.confidence <= 1)) return undefined;
    for (const s of draft.subjects) {
      if (!neighborhood.records.has(s)) return undefined;
    }
    for (const e of draft.evidence) {
      if (!neighborhood.records.has(e)) return undefined;
    }
    const place =
      draft.geometry ??
      inheritedPlace(draft.subjects.map((s) => neighborhood.records.get(s) as AdmittedRecord));
    return new CandidateAssertion(
      draft.classification,
      draft.text,
      [...draft.subjects],
      [...draft.evidence],
      [...(draft.grounds ?? [])],
      draft.confidence,
      occurrence,
      place,
      author,
    );
  }
}

/** Answers *at* the place (RFC-0010 §3): own geometry, else the subjects'. */
function inheritedPlace(subjects: readonly AdmittedRecord[]): Geometry | undefined {
  const gs = subjects.map((r) => r.geometry).filter((g): g is Geometry => g !== undefined);
  if (gs.length === 0) return undefined;
  return gs.length === 1 ? gs[0] : { form: "collection", members: gs };
}

// ---------------------------------------------------------------- reasoner

/** What a reasoning engine may propose. Everything that asserts is a
 * claim draft (shaped or refused); what asserts nothing is bound to
 * nothing (RFC-0010 §6): a proposal to bring content into the Frame, or
 * the Ask verb pointed back (intent is inference, asked when ambiguous). */
export type ClaimDraft = {
  type: "claim";
  classification: string;
  text: string;
  subjects: Id[];
  evidence: Id[];
  grounds?: Ground[];
  confidence: number;
  geometry?: Geometry;
};

export type RevealProposal = {
  type: "reveal";
  /** The honest way to surface located content: point at it (§4 rule 1). */
  about: Id[];
  text: string;
};

export type Clarification = { type: "question"; text: string };

export type ReasonerOutput = ClaimDraft | RevealProposal | Clarification;

/**
 * The replaceable mechanism (RFC-0010 §0): any engine — rules today, an
 * LLM tomorrow — receives the assembled context and proposes outputs. What
 * survives every swap is what it is given (the four strata, Conversable-
 * bounded) and what its claims must satisfy (the shape gate).
 */
export interface Reasoner {
  conclude(context: AgentContext): Promise<ReasonerOutput[]> | ReasonerOutput[];
}

/** What the viewer receives. Claims are sealed candidate-Assertions. */
export type Reply =
  | { kind: "claim"; claim: CandidateAssertion }
  | { kind: "reveal"; about: Id[]; text: string }
  | { kind: "question"; text: string };

// -------------------------------------------------------------- engagement

/**
 * One conversational engagement (RFC-0010 §1): the Ask verb, read-only by
 * construction — nothing here touches the world except `promote`, which is
 * the viewer's deliberate act. The exchange is apparatus: it evaporates
 * with this object; the one answer worth keeping becomes a real Assertion.
 */
export class AskEngagement {
  private turns: Turn[] = [];
  /** Operator instrument (no-laundering tripwire): proposals refused at
   * the shape gate. A count, never content — refusals must not leak what
   * they refused, not even by implication (RFC-0010 §4 rule 3). */
  refused = 0;
  /** Instrument (RFC-0016 S9): claims offered to the viewer, and claims
   * the viewer chose to keep — the promotion rate's two counts. An
   * unkept claim exists nowhere else, so only the engagement can count. */
  offered = 0;
  promoted = 0;

  constructor(
    private readonly boundary: Door,
    private readonly agentActor: Id,
    private readonly reasoner: Reasoner,
    private readonly stores: ViewerStores,
    /** The principal the agent acts for (RFC-0002 §5.3 dual attribution). */
    private readonly principal?: Id,
  ) {}

  get engagement(): readonly Turn[] {
    return this.turns;
  }

  /**
   * Ask (S7): the question arrives bare — place, time, lenses, selection,
   * and drawn regions are inherited from the View and Pending, restated by
   * no one. The answer is situated because the context was.
   */
  async ask(text: string): Promise<Reply[]> {
    const context = await assembleContext(
      this.boundary,
      this.agentActor,
      this.stores,
      text,
      this.turns,
    );
    const bound: TemporalExtent = context.frame.view.time;
    const replies: Reply[] = [];
    for (const out of await this.reasoner.conclude(context)) {
      switch (out.type) {
        case "claim": {
          const claim = CandidateAssertion.shape(out, context.neighborhood, this.agentActor, bound);
          if (claim === undefined) this.refused++;
          else {
            this.offered++;
            replies.push({ kind: "claim", claim });
          }
          break;
        }
        case "reveal": {
          // Pointing shares content too: a proposal may only point at what
          // is conversable (§4 rule 1 — surfacing is bringing-into-Frame,
          // and only the Conversable may be brought).
          if (out.about.every((id) => context.neighborhood.conversable.has(id))) {
            replies.push({ kind: "reveal", about: out.about, text: out.text });
          } else {
            this.refused++;
          }
          break;
        }
        case "question":
          replies.push({ kind: "question", text: out.text });
          break;
      }
    }
    this.turns.push({ ask: text, replies });
    return replies;
  }

  /**
   * Peel-back (S8, RFC-0010 §7): walk a claim's evidence inward through
   * the record graph to observations, collecting outward grounds at every
   * level. Shape-gated claims always peel — their evidence resolves within
   * the Conversable by construction.
   */
  async peel(claim: CandidateAssertion): Promise<PeelNode[]> {
    const context = await assembleContext(
      this.boundary,
      this.agentActor,
      this.stores,
      "",
      this.turns,
    );
    return claim.evidence.map((id) => peelRecord(id, context.neighborhood.records, new Set()));
  }

  /**
   * Promotion (A3): the candidate becomes a recorded Assertion, attributed
   * to the AI Actor, acting for its principal, admitted through the one
   * door. Everything not promoted leaves no residue.
   */
  async promote(claim: CandidateAssertion): Promise<AppendResult> {
    const candidate: CandidateRecord = {
      id: newId(),
      kind: "assertion",
      classification: claim.classification,
      actors: {
        actor: this.agentActor,
        onBehalfOf: this.principal !== undefined ? [this.principal] : [],
      },
      occurrence: claim.occurrence,
      ...(claim.geometry !== undefined ? { geometry: claim.geometry } : {}),
      subjects: [...claim.subjects],
      evidence: [...claim.evidence],
      ...(claim.grounds.length > 0 ? { grounds: [...claim.grounds] } : {}),
      confidence: claim.confidence,
      body: { text: claim.text },
    };
    const result = await this.boundary.append(this.agentActor, candidate);
    if (result.accepted) this.promoted++;
    return result;
  }

  /** The second law: the exchange evaporates (RFC-0010 §2, stratum 4). */
  discard(): void {
    this.turns = [];
  }
}

// --------------------------------------------------------------- peel-back

export type PeelNode = {
  record: AdmittedRecord;
  /** Inward: the records this one leans on. */
  evidence: PeelNode[];
  /** Outward: the knowledge it cites but the world does not hold. */
  grounds: Ground[];
};

function peelRecord(
  id: Id,
  records: ReadonlyMap<Id, AdmittedRecord>,
  visiting: Set<Id>,
): PeelNode {
  const record = records.get(id);
  if (record === undefined) {
    // Unreachable for shape-gated claims; stated for the type system.
    throw new Error(`evidence does not resolve: ${id}`);
  }
  visiting.add(id);
  const inward = (record.evidence ?? []).filter((e) => !visiting.has(e) && records.has(e));
  return {
    record,
    evidence: inward.map((e) => peelRecord(e, records, visiting)),
    grounds: [...(record.grounds ?? [])],
  };
}

// ---------------------------------------------------------------- geometry

/** Does a place touch a drawn geometry? Region gestures only, for now —
 * a drawn point or path indicates by proximity in later refinement. */
function touches(place: Geometry, drawn: Geometry): boolean {
  if (drawn.form === "area") return geometryIntersectsArea(place, drawn);
  if (drawn.form === "collection") return drawn.members.some((m) => touches(place, m));
  return false;
}
