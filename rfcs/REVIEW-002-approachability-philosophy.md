# REVIEW-002 — Design Philosophy Review: Built for People Who Farm

| | |
|---|---|
| **Review** | 002 |
| **Scope** | RFC-0000 through RFC-0016 and the standing roadmap |
| **Concern** | The platform is built for people who farm; architectural sophistication must never surface as experiential complexity |
| **Author** | Bradley |
| **Date** | 2026-07-23 |
| **Outcome** | RFC-0000 amended (Amendment 1): one new principle (§2.6) encoding three commitments; pending REVIEW-001 amendments executed in the same revision; a mandatory **User Experience Implications** section adopted for all future RFCs |

---

## 1. Executive summary

The concern is accepted as foundational, and the review's central finding makes the required revision small:

> **The series was already built on this principle — internally.** RFC-0001's third admission test (*domain-native, not mechanism-native*: a concept exists "because the farm exists, not because a future component will need somewhere to put it") is exactly the sponsor's principle, applied to the vocabulary for sixteen documents. The twin's correspondence disciplines made the model answer to reality; the interaction model made the mental gesture "zoom around my farm." What is missing is not alignment but **bindingness at the surface**: nothing currently forbids the sophisticated interior from leaking into the product's face. The revision closes that one gap.

Decisions, one line each: **Domain Language Over Software Language** — accepted, reformulated as the *vocabulary membrane* with a faithfulness duty that forbids both jargon and euphemism (§3). **Progressive Disclosure** — accepted in its architectural core only, reformulated as *wholeness at every scale*; pacing-over-time is UX policy that the property enables, and disclosure is explicitly barred from becoming a shadow permission system (§4). **The decoupling invariant** — accepted verbatim, with the argument for why it is architecture, not preference (§5). RFC-0000 is amended accordingly — the constitution's first amendment, executed openly per its own §5 rule, and folding in the two normative amendments REVIEW-001 §9 left pending (§6). The mandatory section is adopted for future RFCs with four required checks, and the existing series is spot-audited against it (§7).

---

## 2. The finding: alignment inside, silence at the surface

Three observations establish that this review amends rather than reforms:

1. **The vocabulary was always farm-shaped.** The ontology was produced by *subtraction from farm reality*, not by importing software categories — which is why its deepest concepts turn out to have plain-speech projections (§3's table): attribution is a signature, supersession is a correction, bitemporality is "when it happened versus when we found out." A model built from mechanism outward could not be translated this way at any price; this one translates because RFC-0001 refused mechanism-native concepts at the door.
2. **The precedent for surface-shaped architecture exists.** RFC-0000 §2.2 ("the map is the application") is already an experiential claim elevated to architecture, with an enforcement test ("a capability is not added until it has a place on the map"). The sponsor's principle is the same move on a second axis: §2.2 constrains *where* capability surfaces; the new principle constrains *what a user must understand* to use it.
3. **The gap is real.** Nothing in sixteen documents prevents an implementation from shipping "the ontology browser" — surfacing Entities, Assertions, scopes, and watermarks as themselves. The architecture's articulateness makes this *more* likely, not less: teams surface what their documents name. The constraint must therefore be constitutional, where every RFC inherits it, not stylistic, where every screen relitigates it.

---

## 3. Decision: Domain Language — accepted as the vocabulary membrane

**The challenge, taken seriously first.** Three objections were weighed. *(a) This is UX, not architecture* — naming is what designers do. Rejected: the platform already treats vocabulary as an architectural instrument (RFC-0001 froze the internal one precisely because words drive design); this principle is its dual — a second, *surface* vocabulary, with an architecturally governed membrane between them. What may cross the membrane is a design property of every concept, decidable at RFC time, long before any screen exists. *(b) Some technical concepts are load-bearing for trust* — users must grasp provenance, confidence, staleness, or the platform's honesty features die. Sustained — and answered by the faithfulness duty below: these concepts *surface*, but in the domain's own words, which already carry them ("who says so," "how sure," "as of Tuesday"). Farm speech is rich in exactly the epistemics this platform runs on — farmers live with forecasts, hearsay, and hindsight — so the membrane translates honesty; it never removes it. *(c) Renaming can lie* — the gravest objection. "Friendly" words can promise more than the architecture delivers: calling an Assertion a *fact* would undo RFC-0009 §5's deliberate deflation in a single label. Sustained, and made part of the principle itself.

**The decision.** Accepted, as three duties:

- **Two vocabularies, one membrane.** The internal vocabulary (frozen by RFC-0001 and its successors) names the architecture; the surface vocabulary is agriculture's own. Internal terms do not cross outward. Users think in fields, crops, records, seasons, crews, and shares — never in entities, events, scopes, or grants.
- **Faithful projection, both ways.** Every concept that surfaces must have a domain-language projection that is *accurate* — approachable words may not promise more than the architecture delivers (no "fact" for a claim, no "measured" for an estimate, no certainty theater), and technical honesty may not hide behind jargon as an excuse to be unintelligible. The membrane's duty runs against both failure modes: jargon and euphemism.
- **Leakage is a probe, not just a fault.** If a concept *cannot* be said in farm language, that is evidence the concept is mechanism-native and the design below should be re-examined — the RFC-0001 admission test, running continuously. The membrane is thus a design instrument, not a paint layer.

**The evidence that the duty is dischargeable** — the projection table, load-bearing concept by concept:

| Internal | Faithful surface projection |
|---|---|
| Entity | the thing itself — "the north field," "the grain bin" |
| Event / Observation | a record, a reading — "what happened," "what the gauge said" |
| Assertion | a read, a call, a recommendation — "what the agronomist thinks," "the AI's call" |
| confidence | "how sure" |
| supersession | a correction, an update — "scratch that — here's the better read" |
| Actor / provenance | "who" / "who says so" — the signature on everything |
| Grant / Scope / Capability | sharing — "let Maria see the west fields until harvest" |
| View / temporal binding | "where you're looking" / "as of" — the time slider |
| bitemporality | "when it happened" vs. "when we found out" |
| watermark | "up to date as of 6:14" |
| evidence / peel-back | "what's that based on?" |
| sub-world, twin, ontology, primitives, Marks | **nothing — never surface.** The farm on the map needs no name for the machinery of being the farm on the map |

Every load-bearing concept projects onto speech working farmers already use — the direct payoff of a domain-native ontology. The two projections requiring the most care are flagged for the record: the bitemporal distinction (essential to audit honesty, subtle in plain speech) and confidence-calibration ("how good has this source been") — both already named as UX-facing weight by RFC-0009 §9 and RFC-0010 §9.

---

## 4. Decision: Progressive Disclosure — its architectural core accepted as wholeness at every scale

**The challenge.** As stated — "advanced functionality should emerge naturally over time" — this is interface pacing: sequencing, defaults, onboarding. Architecture cannot and should not legislate *when* a person encounters a capability. Worse, disclosure-over-time can curdle into paternalism: "advanced tools" withheld by presumed role rather than granted by need — and the platform already has an architecture of *may* (grants, RFC-0002); a disclosure regime that gated capability would be a **shadow permission system**, exactly the second regime invariant I8 forbids.

**What survives the challenge is the capacity beneath the pattern.** Progressive disclosure is only possible if partial engagement is *coherent* — and that is an architectural property, and it already exists:

> **The platform is whole at every scale of engagement.** A participant using a sliver of the platform — one scope, two lenses, one verb — is using a *complete* product: their world is answered as if whole (the sub-world rule, RFC-0002 §2.3), their layers compose without gaps, their recording works without their viewing, their offline day is a full day's work. Simplicity is not a reduced edition; it is a small, complete projection of the same world — a *scope in the experience dimension*. The seasonal worker's whole product is "see where I am, record what I see" — and nothing about it is a stub, a locked door, or a degraded mode.

The scout who authors without browsing (RFC-0002 §3.1), the agronomist bounded to agronomy (RFC-0016 C2), the offline recorder (RFC-0012 §5) — the series built wholeness-at-every-scale repeatedly without naming it. The amendment names it and makes it binding: **every future capability must be usable in partial engagement without exposing the whole**; a capability that is only coherent when the entire system is understood fails review.

The boundary is drawn explicitly: *what a person may do* is grants (architecture); *what is foregrounded for them* is attention (experience policy, out of scope here and forever revisable). Disclosure sequencing, defaults, and onboarding are UX craft *enabled* by the architectural property — and are deliberately not encoded in RFC-0000, because pacing is exactly the kind of thing a constitution should not freeze.

---

## 5. Decision: the invariant — accepted, and why it is architecture

> **"The complexity of the architecture MUST NOT determine the complexity of the user experience."**

Accepted verbatim. Four arguments make this an architectural concern rather than a UX preference:

1. **The failure it forbids originates in architecture.** Systems leak their structure into their surfaces — the shape of the model becomes the shape of the screen, by default and without any decision. Only the architecture can forbid its own reflection; a UX guideline downstream is a request, not a constraint.
2. **It is enforceable where architecture is enforced.** Like §3's burden of proof, the invariant operates at RFC review: a design that requires its user to understand the *system* rather than the *farm* to benefit from it is sent back — regardless of internal elegance. That is a rejection criterion, not a styling note, and rejection criteria are what make a constitution real (RFC-0000 §5, "On whether this is falsifiable").
3. **The asymmetry is permanent and growing.** The architecture's sophistication compounds by design — more layers, deeper history, richer inference, more participants. Without a decoupling invariant, experiential complexity grows monotonically with capability, and the architecture's success becomes the product's failure. The invariant is a statement about *every future RFC*: capability may compound; the user's mental model may not.
4. **The deep reason: correspondence is the approachability strategy.** The user's mental model is meant to be *the farm* — place, time, weather, work, people, machines — which they already hold, expertly. Sixteen documents were spent making the model *correspond* to that reality (placed, dated, sourced, honest). Because the model corresponds to the farm, presenting the model's content *is* presenting the farm — no translation layer of metaphors required, no training course in the system's concepts. The architecture is presentable to farmers precisely because it modeled reality instead of mechanism. The invariant protects that achievement from being squandered at the last mile.

---

## 6. The revision executed: RFC-0000, Amendment 1

The smallest revision that permanently encodes the philosophy — five surgical changes, executed with this review:

1. **New principle §2.6 — "The system's complexity is never the user's"** — carrying the three commitments: the vocabulary membrane (§3), wholeness at every scale (§4), and the decoupling invariant (§5), with the mental-model-is-the-farm argument as its ground. Positioned sixth, standing slightly apart: 2.1–2.5 say what the platform *is*; 2.6 says what it must never *cost*.
2. **§3 gains the enforcement clause** — the reviewer's question extended: a design that requires its user to understand the system rather than the farm fails review; and every future RFC must close with a **User Experience Implications** section (§7 below).
3. **§1 gains the plural-operation paragraph** — the pending REVIEW-001 §9 amendment: the farm is operated by many hands; one world, many scoped projections.
4. **§2.1 gains the agency boundary** — the pending amendment RFC-0001 §6 requested: *world content* is spatial; *agency* may originate outside the world it acts on.
5. **Header, self-review addendum, and amendment log** — the revision is dated, its authority recorded, and §5 extended with the new principle's own honest risks.

Nothing else in RFC-0000 changes. The five original principles stand untouched — the review confirms none needed revision, only a sixth sibling.

---

## 7. The mandatory section: adopted

**Decision:** every future RFC (beginning with RFC-0008 and RFC-0013) and every future *amendment* to an existing RFC must include:

```
## User Experience Implications
```

with four required checks — the sponsor's six questions consolidated to remove workflow-adjacent drift:

1. **The projection.** How the capability is experienced, stated *in farm language* — how a farmer, an operator, and an agronomist would each describe it in their own words. (If the descriptions require system vocabulary, the design has failed the membrane and returns to drafting.)
2. **The concealment.** What implementation and architectural complexity is intentionally invisible beneath that experience.
3. **The leak check.** Whether any internal concept must surface; if so, the faithful projection it surfaces through, or the named-and-justified deviation per §3's standing rule.
4. **The wholeness check.** Whether every partial engagement with the capability is complete-in-itself — usable without understanding the whole.

**Not adopted:** retrofitting the section onto the sixteen existing documents. Rewriting frozen documents to satisfy a template adds churn without decisions; instead, the existing series was **spot-audited** here, and passes: the interaction model's surface is five verbs on one map (no internal term needs surfacing); collaboration surfaces as *sharing drawn on the map*; the AI surfaces as *ask and it answers, showing its basis*; sync surfaces as *up to date as of*; offline surfaces as *your day still counts*. The audit found the two carefully-flagged projections of §3 (bitemporality, calibration) and one standing obligation inherited from RFC-0015 §9: motion styling must make inferred motion *read as inferred* — the claim/presentation line's surface duty, which the membrane now owns explicitly.

**The risk, owned:** mandatory sections rot into boilerplate. The mitigation is the same as for every discipline in this series — the section is written as *checks that can fail*, and a User Experience Implications section that has never sent a design back to drafting is decoration, exactly as RFC-0000 §5 said of the constitution itself.

---

## 8. Risks

1. **Euphemism drift** — the membrane's faithfulness duty eroding claim-by-claim until approachable words overpromise ("fact," "measured," "always up to date"). Counter-weight: the honesty requirements of RFC-0007/0009/0012 outrank comfort, stated in §2.6 itself; the membrane translates honesty, never removes it.
2. **§2.6 cited as a veto on necessary precision** — "hide the uncertainty, it's complex" is a *violation* of 2.6, not an application of it: the principle demands uncertainty be said plainly, not unsaid.
3. **Wholeness hardening into role stereotypes** — "the worker's product" becoming a ceiling rather than a scope. Grants govern may; nothing in 2.6 licenses capability-by-caste.
4. **Boilerplate rot** of the mandatory section (§7, owned there).
5. **The membrane meeting the market** — some buyers (agronomists, consultants) *want* technical depth visible. The membrane does not forbid depth; it forbids depth as a *prerequisite* — the agronomist's richer tools live behind the same faithful surface, per wholeness-at-every-scale.

## 9. Self-review

**Is §2.6 really architecture?** The honest wobble. It is the series' second experiential principle (after 2.2), and a skeptic can say the constitution is drifting product-ward. The defense rests on enforceability (§5.2) and origin (§5.1): the principle rejects *designs*, at *RFC time*, for a failure mode that *architecture causes*. But the boundary between "constrains what users must understand" (architecture) and "constrains what users see" (UX) is genuinely finer here than for any prior principle, and §2.6's abstention — no layouts, no workflows, no pacing — is what keeps it on the right side. If future RFCs start citing 2.6 to argue about screens, the principle has escaped its cage, and this review is the reference for pushing it back.

**Was reformulating both sponsor principles a dodge?** Domain Language survived nearly intact (gaining only the faithfulness duty and the probe inversion). Progressive Disclosure was substantially rewritten — pacing dropped, wholeness kept — and a sponsor who wanted time-based emergence encoded will not find it in RFC-0000. That is deliberate and defended in §4: the architectural property is what makes the UX policy *possible*, and constitutions should encode capacities, not schedules. But it is a real narrowing of the ask, named as such.

**Folding in REVIEW-001's pending amendments** widened this revision beyond the sponsor's concern. Judged correct — amending a constitution twice in one season for known items is churn, and leaving executed-review debts unpaid while adding new principles would invert the series' own discipline — but it does make Amendment 1 carry three agendas, and the amendment log keeps them distinguishable.

**The spot-audit is a sample, not a proof.** §7 audited the series' surfaces at one altitude. The real test arrives with the MVP (RFC-0016's instruments), and one new measurement belongs on its list: **S10 — vocabulary leak rate** — count of internal terms appearing in the shipped surface (target: zero) and of user utterances importing system vocabulary (evidence the membrane failed silently). Recommended as an addition to RFC-0016 §4 at its next revision, not executed here.

**Overall.** Highest confidence: the invariant and the membrane — both enforceable, both grounded in the finding that the architecture was domain-native all along, which makes the surface duty cheap to honor and inexcusable to fail. Lowest confidence: that the mandatory section stays sharp rather than ritual, which no document can guarantee — only reviewers can. If this review is wrong, it is wrong about §2.6's containability; the tripwire is the first RFC that cites it about a screen. Stated plainly, so the constitution's first amendment is also the best-documented one.

---

*This review found the architecture already farm-shaped at its core and bound it, for the first time, at its face: two vocabularies with a faithful membrane, wholeness at every scale, and a permanent decoupling of the system's sophistication from the user's burden. The people this platform is for drive tractors, walk fields, and fix what breaks — and the constitution now says, in its own §2.6, that they will never need to learn our words to use their farm.*
