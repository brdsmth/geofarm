/**
 * @geofarm/agent — the default engine: rules, not weights.
 *
 * A deliberately small deterministic Reasoner (RFC-0010 §0: mechanism is
 * replaceable; an LLM engine slots behind the same interface without one
 * architectural change). It demonstrates the participation duties any
 * engine owes: conclusions cite the record they lean on, ambiguous intent
 * is asked back (intent is inference, never input — RFC-0010 §2), and
 * filtered-but-conversable content is surfaced by proposing to bring it
 * into the Frame, never by describing it invisibly (§4 rule 1).
 */

import type { AgentContext, ReasonerOutput } from "./index.ts";

/** The standing (unsuperseded-within-the-Conversable) subset of claims. */
function standing(context: AgentContext, claims: readonly { id: string }[]): Set<string> {
  const superseded = new Set<string>();
  for (const r of context.neighborhood.records.values()) {
    if (r.supersedes !== undefined) superseded.add(r.supersedes);
    if (r.retracts !== undefined) superseded.add(r.retracts);
  }
  return new Set(claims.map((c) => c.id).filter((id) => !superseded.has(id)));
}

export class RuleReasoner {
  conclude(context: AgentContext): ReasonerOutput[] {
    const { entries } = context.neighborhood;

    // Nothing indicated: the Ask verb pointed back (RFC-0010 §2).
    if (entries.length === 0) {
      return [
        {
          type: "question",
          text: "What should I look at? Pick something on the map or circle an area.",
        },
      ];
    }

    const out: ReasonerOutput[] = [];
    for (const entry of entries) {
      const live = standing(context, entry.claims);
      const claims = entry.claims.filter((c) => live.has(c.id));

      for (const claim of claims) {
        const body = claim.body as { finding?: string; text?: string } | undefined;
        const what = body?.finding ?? body?.text ?? claim.classification;
        out.push({
          type: "claim",
          classification: "reading",
          text: `The standing view here is: ${what}.`,
          subjects: [entry.id],
          evidence: [claim.id],
          confidence: claim.confidence ?? 0.5,
        });
      }

      if (claims.length === 0 && entry.timeline.length > 0) {
        // No standing claim: report the record's latest word, cited.
        const latest = entry.timeline[entry.timeline.length - 1];
        if (latest !== undefined) {
          const body = latest.body as { text?: string } | undefined;
          out.push({
            type: "claim",
            classification: "reading",
            text: `Nothing settled here yet; the latest note says: ${body?.text ?? latest.classification}.`,
            subjects: [entry.id],
            evidence: [latest.id],
            confidence: 0.5,
          });
        }
      }

      // Conversable content about this thing that the lens stack hides:
      // surface by pointing, not by describing (§4 rule 1).
      if (context.frame.view.lenses.length > 0) {
        const hidden = entry.timeline.find((r) => !context.frame.revealed.has(r.id));
        if (hidden !== undefined) {
          out.push({
            type: "reveal",
            about: [hidden.id],
            text: "There's more recorded here than what's shown — want me to show it?",
          });
        }
      }
    }
    return out;
  }
}
