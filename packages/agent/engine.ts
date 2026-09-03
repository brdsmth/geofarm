/**
 * @geofarm/agent — the model engine: a language model behind the same
 * Reasoner interface the rules stood behind (RFC-0010 §0: mechanism is
 * replaceable; REVIEW-004 §7: replacing the rule reasoner is the next
 * phase's first job).
 *
 * What the engine is given is the situation (the four strata, rendered
 * as text a model can read, every record carrying its identity); what it
 * may propose is exactly what the rules could: claims that cite, proposals
 * that point, questions that ask. Nothing here trusts the model. Its
 * output is parsed against a schema, and every claim still passes the
 * one shape gate in `AskEngagement` — an invented id, a subject outside
 * the Conversable, a claim leaning on the Reach, all die there, counted
 * and never delivered (RFC-0010 §4; module rule 8). S7 and S8 were proven
 * against an engine that could not be tempted to launder; this is the
 * engine that can, and the gate is what keeps them true.
 *
 * The transport to a particular model — a local one, a hosted one — is
 * an `Engine`: a function from (system, user) to a parsed object. No
 * provider is visible outside this package.
 */

import { z } from "zod";
import type { AdmittedRecord, Id } from "../world/index.ts";
import type { AgentContext, NeighborEntry, Reasoner, ReasonerOutput } from "./index.ts";

// ----------------------------------------------------------------- schema

/** What a model may say, flat and fully required so that every engine's
 * structured-output mode can hold it to the letter. Fields a kind does
 * not use are empty, never absent. */
export const OutputSchema = z.object({
  outputs: z.array(
    z.object({
      type: z.enum(["claim", "reveal", "question"]),
      text: z.string(),
      /** claim: one of the claim classifications the farm uses. */
      classification: z.string(),
      /** claim: the things it is about (ids from the situation). */
      subjects: z.array(z.string()),
      /** claim: the records it stands on (ids from the situation). */
      evidence: z.array(z.string()),
      /** claim: 0..1, stated. */
      confidence: z.number(),
      /** reveal: the hidden records to bring into view (ids). */
      about: z.array(z.string()),
    }),
  ),
});
export type ModelOutputs = z.infer<typeof OutputSchema>;

export const CLAIM_CLASSIFICATIONS = ["reading", "advisory", "diagnosis"] as const;

// ----------------------------------------------------------------- engine

export type EngineRequest = { system: string; user: string };

/** A model behind a function: given the situation, return the parsed
 * object (or anything — it is validated on the way back). */
export type Engine = {
  name: string;
  complete(request: EngineRequest): Promise<unknown>;
};

// ----------------------------------------------------------------- prompt

export const SYSTEM_PROMPT = `You are the farm's assistant — a participant in the farm's shared record, looking at the same map as the person asking, at the same moment, with the same things selected. Answer from the records listed in the situation, and only from them.

Rules:
1. Anything you say about the farm is a "claim". A claim names the records it stands on ("evidence": ids from the situation) and the things it is about ("subjects": ids). No records to point at means no claim — say so with a "question" instead.
2. State "confidence" between 0 and 1 honestly. A single note is weak evidence; agreeing records are stronger. Never exceed the confidence of the claims you lean on.
3. When something is indicated and records exist about it, answer with claims. Ask one short clarifying "question" only when nothing is indicated or the question cannot be understood.
4. Records marked "hidden by layers" may be pointed at with a "reveal" ("about": their ids) when they matter; do not describe their contents in a claim.
5. Never mention anything absent from the situation. Never invent ids, names, numbers, or dates.
6. Speak plainly to the person, in farm language: say "Maria's note from June 20", not "record miller:031". Keep each output to two or three sentences.
7. Claim classifications: "reading" (what the records show), "diagnosis" (what is likely going on), "advisory" (what to consider doing).

Return only JSON of the form {"outputs":[...]}. Fields a kind does not use are empty strings, empty lists, or 0.`;

export type RenderOptions = {
  /** Timeline rows per indicated thing. */
  timelineRows?: number;
  /** Other conversable records listed for citation, in all. */
  otherRows?: number;
  /** Of those, at most this many of any one classification, so a season
   * of hourly readings cannot crowd out the one note that matters. */
  perClassification?: number;
};

type Named = (id: Id) => string;

function namesIn(records: ReadonlyMap<Id, AdmittedRecord>): Named {
  const names = new Map<Id, string>();
  for (const r of records.values()) {
    const name = (r.body as { name?: string } | undefined)?.name;
    if (name !== undefined) names.set(r.id, name);
  }
  return (id) => names.get(id) ?? id;
}

function day(iso: string): string {
  return iso.slice(0, 10);
}

function saying(r: AdmittedRecord): string {
  const b = r.body as Record<string, unknown> | undefined;
  if (b === undefined) return "";
  if (typeof b.text === "string") return b.text;
  if (typeof b.finding === "string") return b.finding;
  if (typeof b.name === "string") return b.name;
  if (typeof b.channel === "string" && b.value !== undefined) return `${b.channel}: ${String(b.value)}`;
  if (typeof b.crop === "string") return `crop: ${b.crop}`;
  return "";
}

/** One record, one line, identity first (RFC-0015 §1 in prose). */
export function renderRecord(r: AdmittedRecord, name: Named, hidden: boolean): string {
  const parts = [`[${r.id}]`, day(r.occurrence.start), r.classification];
  const said = saying(r);
  if (said !== "") parts.push(`— ${said}`);
  parts.push(`— by ${name(r.actors.actor)}`);
  if (r.kind === "assertion") {
    if (r.confidence !== undefined) parts.push(`(${Math.round(r.confidence * 100)}% sure)`);
    if (r.evidence !== undefined && r.evidence.length > 0) parts.push(`evidence: ${r.evidence.join(", ")}`);
    if (r.grounds !== undefined && r.grounds.length > 0) parts.push(`grounds: ${r.grounds.map((g) => g.source).join(", ")}`);
  }
  if (r.subjects.length > 0) parts.push(`about: ${r.subjects.map(name).join(", ")}`);
  if (r.supersedes !== undefined) parts.push(`(corrects ${r.supersedes})`);
  if (hidden) parts.push("(hidden by layers)");
  return parts.join(" ");
}

/** One line per (site, classification, channel): count, span, range, last. */
function summarizeChannels(records: readonly AdmittedRecord[], name: Named): string[] {
  type Acc = { n: number; first: string; last: string; lastValue: number; min: number; max: number; site: Id; cls: string; channel: string };
  const acc = new Map<string, Acc>();
  for (const r of records) {
    const b = r.body as { channel?: string; value?: number } | undefined;
    if (typeof b?.channel !== "string" || typeof b.value !== "number") continue;
    const site = r.subjects[0] ?? "";
    const key = `${site}|${r.classification}|${b.channel}`;
    const a = acc.get(key);
    if (a === undefined) {
      acc.set(key, { n: 1, first: r.occurrence.start, last: r.occurrence.start, lastValue: b.value, min: b.value, max: b.value, site, cls: r.classification, channel: b.channel });
    } else {
      a.n++;
      a.min = Math.min(a.min, b.value);
      a.max = Math.max(a.max, b.value);
      if (r.occurrence.start < a.first) a.first = r.occurrence.start;
      if (r.occurrence.start > a.last) {
        a.last = r.occurrence.start;
        a.lastValue = b.value;
      }
    }
  }
  return [...acc.values()]
    .sort((x, y) => (x.site + x.cls + x.channel).localeCompare(y.site + y.cls + y.channel))
    .map((a) => `${name(a.site)} [${a.site}] · ${a.cls} · ${a.channel}: ${a.n} values ${day(a.first)}..${day(a.last)}, ${a.min}–${a.max}, latest ${a.lastValue} on ${day(a.last)}`);
}

function renderEntry(e: NeighborEntry, name: Named, revealed: ReadonlySet<Id>, rows: number, bound: number): string[] {
  const out = [`${renderRecord(e.record, name, !revealed.has(e.id))}`];
  const timeline = e.timeline.slice(-rows);
  if (timeline.length > 0) {
    out.push("  what has happened here, oldest first:");
    for (const r of timeline) out.push(`    ${renderRecord(r, name, !revealed.has(r.id))}`);
  }
  const later = e.claims.filter((c) => Date.parse(c.occurrence.start) > bound);
  if (later.length > 0) {
    out.push("  claims made after the moment being looked at (you may cite them, but say they are later):");
    for (const r of later) out.push(`    ${renderRecord(r, name, !revealed.has(r.id))}`);
  }
  return out;
}

/** The situation, in text: the four strata, ids included (RFC-0010 §2). */
export function renderContext(context: AgentContext, opts: RenderOptions = {}): string {
  const { frame, gesture, neighborhood, engagement } = context;
  const name = namesIn(neighborhood.records);
  const revealed = frame.revealed;
  const bound = Date.parse(frame.view.time.end ?? frame.view.time.start);
  const lines: string[] = [];

  lines.push(`The moment being looked at: ${day(frame.view.time.start)}.`);
  const shown = frame.view.lenses.filter((l) => l.visible).map((l) => l.name);
  lines.push(`Layers shown: ${shown.length > 0 ? shown.join(", ") : "none"}.`);
  lines.push(
    gesture.selection.length > 0
      ? `Selected: ${gesture.selection.map((id) => `${name(id)} [${id}]`).join("; ")}.`
      : "Selected: nothing.",
  );
  if (gesture.regions.length > 0) lines.push("The person has circled an area on the map; the indicated things below fall inside it.");
  lines.push(`You are [${context.agent}]; claims by that id are your own earlier answers.`);

  lines.push("", "== Indicated things ==");
  if (neighborhood.entries.length === 0) lines.push("(nothing indicated)");
  const shownIds = new Set<Id>();
  for (const e of neighborhood.entries) {
    lines.push(...renderEntry(e, name, revealed, opts.timelineRows ?? 30, bound));
    shownIds.add(e.id);
    for (const r of e.timeline) shownIds.add(r.id);
    for (const r of e.claims) shownIds.add(r.id);
  }

  // Everything else conversable, most recent first: the wider neighborhood
  // a model may cite. Agency and grants are not world content to cite.
  // Sampled sources are summarized per channel first (what a season of
  // readings amounts to), then a few of every kind are listed by identity.
  const rest = [...neighborhood.records.values()]
    .filter((r) => !shownIds.has(r.id) && r.kind !== "actor" && r.classification !== "grant")
    .filter((r) => Date.parse(r.occurrence.start) <= bound)
    .sort((a, b) => Date.parse(b.occurrence.start) - Date.parse(a.occurrence.start));
  const summaries = summarizeChannels(rest, name);
  if (summaries.length > 0) {
    lines.push("", "== Measured and estimated channels, summarized (cite the latest readings listed below, or the site) ==");
    lines.push(...summaries);
  }
  const perClass = opts.perClassification ?? 8;
  const seen = new Map<string, number>();
  const others: AdmittedRecord[] = [];
  for (const r of rest) {
    const n = seen.get(r.classification) ?? 0;
    if (n >= perClass) continue;
    seen.set(r.classification, n + 1);
    others.push(r);
    if (others.length >= (opts.otherRows ?? 60)) break;
  }
  lines.push("", `== Other records you may cite (${others.length}) ==`);
  for (const r of others) lines.push(renderRecord(r, name, !revealed.has(r.id)));

  if (engagement.length > 0) {
    lines.push("", "== The conversation so far ==");
    for (const t of engagement) {
      lines.push(`Asked: ${t.ask}`);
      for (const r of t.replies) lines.push(`  ${r.kind}: ${r.text}`);
    }
  }
  lines.push("", "== The question ==", gesture.ask === "" ? "(none — the person is looking, not asking)" : gesture.ask);
  return lines.join("\n");
}

// ---------------------------------------------------------------- parsing

/** Tolerate a fenced or prefixed JSON body: models add prose; we do not. */
export function parseJsonObject(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end <= start) return undefined;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return undefined;
    }
  }
}

/** Model output → reasoner outputs. Only shape is checked here; whether a
 * claim may be delivered is the gate's question, not the parser's. */
export function toOutputs(raw: unknown): ReasonerOutput[] {
  const parsed = OutputSchema.safeParse(raw);
  if (!parsed.success) return [];
  const out: ReasonerOutput[] = [];
  for (const o of parsed.data.outputs) {
    const text = o.text.trim();
    if (text === "") continue;
    switch (o.type) {
      case "claim": {
        const classification = (CLAIM_CLASSIFICATIONS as readonly string[]).includes(o.classification)
          ? o.classification
          : "reading";
        out.push({
          type: "claim",
          classification,
          text,
          subjects: dedupe(o.subjects),
          evidence: dedupe(o.evidence),
          confidence: Math.min(1, Math.max(0, o.confidence)),
        });
        break;
      }
      case "reveal":
        if (o.about.length > 0) out.push({ type: "reveal", about: dedupe(o.about), text });
        break;
      case "question":
        out.push({ type: "question", text });
        break;
    }
  }
  return out;
}

function dedupe(ids: string[]): string[] {
  return [...new Set(ids.map((s) => s.trim()).filter((s) => s !== ""))];
}

// --------------------------------------------------------------- reasoner

export class ModelReasoner implements Reasoner {
  constructor(
    private readonly engine: Engine,
    private readonly opts: RenderOptions & {
      /** What to do when the engine fails: nothing, by default — an
       * absent answer is honest; an invented one is not. */
      onError?: (error: unknown) => void;
    } = {},
  ) {}

  get name(): string {
    return this.engine.name;
  }

  async conclude(context: AgentContext): Promise<ReasonerOutput[]> {
    let raw: unknown;
    try {
      raw = await this.engine.complete({ system: SYSTEM_PROMPT, user: renderContext(context, this.opts) });
    } catch (error) {
      this.opts.onError?.(error);
      return [];
    }
    return toOutputs(typeof raw === "string" ? parseJsonObject(raw) : raw);
  }
}
