# RFC-0007 — Digital Twin Model

| | |
|---|---|
| **RFC** | 0007 |
| **Title** | Digital Twin Model |
| **Status** | Draft |
| **Author** | Bradley |
| **Created** | 2026-07-23 |
| **Depends on** | RFC-0000, RFC-0001, RFC-0003, RFC-0004, RFC-0005, RFC-0006 |
| **Supersedes** | — |
| **Superseded by** | — |

---

## 0. Purpose and method

RFC-0001 §4 dispositioned "Digital Twin" in one line: *the assembled model of all Entities, Events, and Assertions — the product, not a primitive.* That line prevented the twin from contaminating the ontology. It also left a debt: if the twin is "the whole," what exactly is the whole, what turns an accumulation of records into a *twin* of something, and what does such a twin know?

This document pays that debt. Its method is the one every RFC since RFC-0003 has used — **the twin adds nothing.** No primitive, no mechanism, no new kind of knowledge. The claim to be defended is stronger and more interesting than "the twin is everything":

> **The Digital Twin is not a component of the platform. It is the platform's content, taken whole, under three disciplines the previous RFCs already imposed — placed, dated, sourced — and read through one organizing question: *how does the model know each thing it holds?***

The twin, in other words, *emerges* from the spatial and temporal models, exactly as the task requires. What this RFC contributes is the emergence made explicit: the boundary of the twin (§2), the epistemic strata that organize its contents (§3–§6), and the thing that separates a twin from a pile of data — that it knows the shape of its own ignorance (§7).

Nothing here discusses how any intelligence is implemented. Where the AI appears, it appears as what RFC-0005 §9 established: an Actor whose outputs are Assertions — content of the twin, never machinery of it.

---

## 1. What makes a twin a twin

A database holds records. A twin holds a **counterpart**: a body of content every element of which claims correspondence to one real farm. The difference is not in the records; it is in the disciplines the records are admitted under — and each was frozen before this document was written:

- **Placed.** Every element occupies the one shared space (RFC-0003). The twin has the same geography as the farm because its contents *are* geographies — there is no un-locatable content to drift free of the world it mirrors.
- **Dated.** Every element sits in the one shared history, at an occurrence time and a knowledge time (RFC-0004). The twin does not merely resemble the farm now; it corresponds to the farm *through time* — every past state reconstructable, every element's arrival into knowledge on record.
- **Sourced.** Every element carries the Actor it came from (RFC-0001). The twin's correspondence to reality is never anonymous; each element can answer *on whose account* it is in the model.

These three disciplines are the entire definition. A twin is not achieved by adding a "twin layer" or a synchronization engine — it is what the content *already is* when nothing placeless, dateless, or sourceless was ever admitted. This is why the twin can only emerge and could never have been built as a feature: the correspondence was enforced element-by-element at admission, by the ontology itself, and the twin is the sum of a million small correspondences.

One thing the twin is **not**, and the exclusion is load-bearing: the twin is **representational, never operational**. It records the farm; it does not run the farm. Nothing in the twin actuates anything in the world. When something in the world is done — by a person, a machine, an organization — that is an Actor acting, and the act enters the twin as an Event. The direction of causation is always world → twin at the level of record; the twin influences the world only the way any account of reality does — by being consulted by Actors who then act. Collapsing this (a twin that "controls" the farm) would fuse record and agency, the two things the ontology most carefully separated.

---

## 2. The boundary: what belongs to the twin

**In:** all world content — every Entity, every Event, every Assertion. The fields and fences and machines; the rains and passes and readings; the diagnoses and estimates and recommendations. If it is placed, dated, and sourced, it is the twin. There is no second tier, no "core twin" versus "auxiliary data": a scouting photo and a surveyed boundary differ in importance, not in membership.

*(Amendment 1, per REVIEW-001 §9.)* The twin is one, and no reader holds it whole: **every Actor reads the twin as a scoped projection of it** — their accessible sub-world (RFC-0002 §2.3), answered as if it were the whole. One twin, many scoped readings. The boundary this section draws therefore has two gates, not one: the **promotion gate** (below) governs what *enters* the twin; the **access dimension** governs what each reader's twin *contains for them*. Neither gate is visible in the other's terms, and neither replaces the other.

**At the edge:** Actors. An Actor's *agency* is present throughout the twin — as the source on every Event, the author on every Assertion, the owner in every ownership relation — but the Actor *itself* is not farm content unless it also exists as an Entity on the farm (the machine, the person present — RFC-0001 §3.4's coincidence of roles). The satellite provider is in the twin only as provenance; the tractor is in it fully. This is the same seam RFC-0003 §1 and RFC-0004 §7 traced: the twin is a twin *of the world*, and agency may stand outside the world it acts on.

**Out:** the apparatus of looking. Views, selections, lens stacks, ephemeral drawings, un-promoted measurements (RFC-0006) are not twin content — they are ways of *reading* the twin, disposable and private, corresponding to nothing on the farm. The gate between them is exactly RFC-0006's promotion gate: the moment a gesture is promoted — the circle becomes a zone, the measurement becomes a survey record — it crosses from apparatus into twin. The twin's boundary and the authorship gate are the same line seen from two sides.

**Out, and worth stating:** general knowledge. Agronomy that is true everywhere — pest lifecycles, crop physiology, chemistry — corresponds to no *place on this farm* and so is not twin content (RFC-0001 §4 already declined it as a primitive). The twin holds what is true *of this farm*; what is true of farming is context that Actors (human and AI) bring when they read the twin and author Assertions into it. The Assertion that results ("this pattern is armyworm damage") is in the twin — placed, dated, sourced; the textbook fact behind it is not. Where general knowledge lives is a real open question (RFC-0001 §6 flagged it), but its home is not here.

---

## 3. What the twin knows: the epistemic strata

The task's central questions — what is observed, inferred, predicted, historical, current — are not five kinds of content requiring five mechanisms. They are **two classifications and three readings**, all derived from structure already frozen. This is the twin's organizing insight: *epistemic status is not a new attribute; it is a fact about where each element already sits in the ontology and in time.*

**Two classifications** (what kind of holding it is):

| Stratum | What it is | Already defined as |
|---|---|---|
| **Observed** | what a source directly recorded of the world | Observation Events — immutable, never wrong-as-records (RFC-0004 §3) |
| **Inferred** | what an Actor concluded from evidence | Assertions — derived, confidence-bearing, supersedable (RFC-0001 §3.3) |

**Three readings** (where it sits against time — all projections in RFC-0004's sense):

| Stratum | What it is | Already defined as |
|---|---|---|
| **Historical** | the recorded past — everything whose occurrence time has passed | the one history itself (RFC-0004 §9) |
| **Current** | the state of things as of now | the projection of history onto identities at the present moment (RFC-0004 §4) |
| **Predicted** | claims whose occurrence time has not yet arrived | future-dated Assertions (§5 below) |

So "what does the twin know?" has a precise, three-part answer:

1. **What was recorded** — the Events, exactly as their sources reported them, forever.
2. **What was concluded** — the Assertions, each with author, evidence, and confidence, standing until superseded.
3. **What is derivable on demand** — everything the record implies without anyone having said it: spatial relationships (RFC-0003 §5), timelines (RFC-0004 §9), current state (RFC-0004 §4), visibility within any region (RFC-0003 §6). The twin knows the field is inside the farm though no one ever asserted it; it knows the sprayer was in the west parcels during the wind advisory though no one ever joined those records. Derivable knowledge is the compounding return on the two shared dimensions — every admitted element enriches the answers to questions nobody has asked yet.

What the twin never holds is a fourth kind: unattributed, unplaced, undated "information." There is no stratum for it, which is the point.

---

## 4. Observed versus inferred: the line the twin lives by

The strata table makes the fact/conclusion boundary (drawn in RFC-0001, sharpened in RFC-0004 §3, defended in RFC-0005 §7) into the twin's constitutional principle, because a twin that blurs it is worse than no twin at all — it is a confident counterfeit.

- The **observed stratum** is the twin's bedrock: what sensors read, cameras captured, people saw, machines logged. It is immutable and audit-stable. Its failure mode is not wrongness but *sparseness and error-at-source* — a miscalibrated sensor produces faithful Observations of bad readings.
- The **inferred stratum** is the twin's interpretation of its bedrock: soil maps interpolated from samples, yield surfaces from harvest passes, diagnoses from imagery. It is where the twin is intelligent and where it can be wrong — which is why every element of it carries confidence and provenance and can be superseded without loss.

The architectural consequence, inherited and restated as the twin's rule: **the inferred stratum may always be peeled back to the observed stratum beneath it.** Every Assertion's evidence references (RFC-0001 §3.3) point down into Observations (or into other Assertions, which point down in turn). Any conclusion the twin holds can be interrogated to bedrock: *what was actually recorded, by whom, that makes you say so?* A twin element that cannot answer is malformed by construction. This peel-back property — not volume of data, not realism of display — is what makes the twin trustworthy, and it exists because the ontology made evidence-linkage intrinsic rather than optional.

---

## 5. The predicted stratum: the twin's future

Prediction is where RFC-0004 §11 and RFC-0005 §11 both flagged strain — the future is where time stops resembling space. The twin model resolves the strain, using only bitemporality:

> **A prediction is an Assertion whose knowledge time is now and whose occurrence time has not yet arrived.** The twin never contains the future; it contains present claims *about* the future.

This placement does three jobs:

- **It keeps the one history clean.** Nothing "happens" in the twin ahead of time. The forecasted rain is not an Event — Events are records of occurrence, and nothing has occurred. It is a claim, held now, about later; the history remains a record of the actual.
- **It makes predictions age honestly.** As occurrence time arrives, the prediction does not "become" fact — *observations arrive*, independently, and the prediction stands beside them as a claim whose moment has passed. It is then supersedable in the ordinary way, and — because nothing is ever deleted — permanently comparable with what actually happened.
- **It gives the twin a memory of its own foresight.** That comparison — forecast against outcome, estimate against measurement, recommendation against result — accumulates in the twin like everything else. The twin therefore holds not just predictions but its (and every predicting Actor's) *track record*, placed and dated and sourced: this provider's rain forecasts run wet in the valley; this model's yield estimates skew high on sandy ground. Trust in prediction becomes an inspectable, derivable fact about the record, not a sentiment. No mechanism was added to get this; it falls out of append-only history plus dual timestamps plus provenance.

The predicted stratum is thus not exotic. It is the inferred stratum pointed forward, disciplined by the same rules, with time's arrow doing the work of grading it.

---

## 6. Historical and current: the twin has no present tense

The last two strata dissolve into a single statement, which RFC-0004 §4 already proved and the twin inherits whole: **"current" is not a place in the twin — it is a reading of it.**

The twin is the totality of its history. "The farm now" is that history projected to the present moment; "the farm at planting 2023" is the identical operation with a different argument. Neither projection is stored as the truth; both are readings of the one record. Three consequences give the task's question its answer:

- **What is historical?** Everything, eventually — and everything immediately, in the sense that every element enters the twin as history the moment it is recorded. The twin has no antechamber where content is "current" before being archived; there is no archive, because there is nothing else.
- **What is current?** A distinguished projection: the one taken at the ever-moving present. It is privileged *experientially* (it is what most Views bind to, most questions concern, most work addresses) but not *architecturally* — it is computed like any other moment's state, and the platform's time navigation (RFC-0006 §4) is nothing but moving the projection's argument.
- **The twin is therefore never "out of date" in the way a snapshot is.** It can be *stale* — knowledge time lagging occurrence time, §7 — but it cannot be superseded-as-a-whole, because it is not a version of anything. It is the accumulating record, and every reading of it is as fresh as the record allows.

---

## 7. The twin knows its own ignorance

The final property, and the one that most separates a twin from a data pile: **the twin's incompleteness is itself derivable from the twin.**

The twin is always incomplete — a partial, lagging, unevenly sampled counterpart of an unboundedly detailed farm. That is not a flaw to hide; it is a fact to *know*, and the disciplines make it knowable without any new machinery:

- **Staleness is derivable.** Every element carries knowledge time; every identity's last-heard-from moment is a projection away. *This sensor last reported six days ago; this boundary was last confirmed in 2021* — the gap between now and the record's edge is computable everywhere, for everything.
- **Sparseness is derivable.** Coverage is a spatial query (RFC-0003 §6) over the record itself: where soil samples cluster and where none exist; which parcels imagery visits weekly and which monthly; where no Observation of any kind has ever landed. The twin can render its own blind spots as readily as its knowledge — ignorance has geometry too.
- **Uncertainty is carried.** Every inference states its confidence; every conclusion peels back to its evidence (§4); every predictor accrues a track record (§5). The twin does not merely hold claims — it holds how firmly each claim deserves to be held.

*(Amendment 1.)* Ignorance, like everything read from the twin, is **actor-relative**: an Actor's blind-spot map is computed within their sub-world, so it shows where *their accessible record* runs out — never the silhouette of what access excludes. What lies beyond an Actor's scope is not "ignorance" to them; without the *discover* capability (RFC-0002 §3.1) it is simply absent, and the existence-versus-content distinction lands exactly here: a reader may know a thing exists without its content only where discover was granted, and otherwise may not know even that.

So the honest answer to "what does the twin know?" is double: it knows what it holds and can derive, **and it knows — with places and dates — where its knowledge runs out.** For every consumer of the twin, human or AI, this second knowledge is as operative as the first: what the twin's account cannot support is as important as what it can, and the twin itself can say which is which. A "complete" twin is impossible; a twin *honest about the shape of its incompleteness* is buildable from the disciplines already frozen — and that honesty, not fidelity of imagery or density of sensors, is the property the word "twin" must be held to.

---

## 8. The frozen twin model

- **The twin is the platform's world content taken whole** — every Entity, Event, and Assertion — under the three admission disciplines: placed, dated, sourced. It is emergent; it has no machinery of its own.
- **Representational, never operational.** The twin records the farm; only Actors act. World → twin is the direction of record; the twin reaches the world only by being read.
- **Boundary:** world content in; Actors at the edge (agency in as provenance, presence in only as Entities); the apparatus of looking (Views, gestures) out until promoted; general knowledge out.
- **Epistemic strata, all derived:** *observed* (Observation Events) and *inferred* (Assertions) classify how content is held; *historical*, *current*, and *predicted* are readings against time — the record, its projection to now, and future-dated Assertions.
- **The peel-back rule:** every inference can be interrogated down to the observations beneath it; a conclusion that cannot is malformed.
- **Predictions are present claims about the future**, never future facts; the record grades them as their moments pass, and the twin accrues every predictor's track record.
- **No present tense:** "current" is a distinguished projection, not a stored state; the twin cannot be out of date, only honest or dishonest about staleness.
- **The twin knows its own ignorance:** staleness, sparseness, and uncertainty are derivable from the record — the twin can map its blind spots with the same machinery it maps its fields.
- **One twin, many scoped readings** *(Amendment 1)*: no reader holds the twin whole; every Actor's twin is their sub-world, answered as if whole, with ignorance actor-relative and existence governed by *discover*.

---

## 9. Self-review

**Is this RFC a definition or a restatement?** The gravest risk of a "the twin is everything" document is vacuity — six sections of prior RFCs replayed with a new title. The test: what does this document add that a careful reader of RFC-0001–0005 did not already have? Three things, I believe: the *boundary* (§2 — the twin/apparatus line identified with the promotion gate; Actors at the edge; general knowledge out), the *strata as derivations* (§3 — the claim that epistemic status requires no new attribute, which no prior RFC states), and *self-knowing ignorance* (§7 — staleness and sparseness as derivable properties, stated nowhere earlier). If a reviewer judges these three insufficient to justify an RFC, the honest alternative was to fold them into RFC-0004 and RFC-0006 as amendments and strike "Digital Twin" from the roadmap as a marketing word. I think the boundary and the ignorance property carry the document — but the margin is real, and this is the thinnest RFC in the series by intellectual novelty per page.

**Does "representational, never operational" (§1) foreclose too much?** Digital-twin practice elsewhere includes closed loops — the twin that schedules irrigation directly. I have ruled that out *as a property of the twin* while permitting it entirely *as a property of Actors*: an automated Actor may read the twin and act, and its acts enter as Events. The distinction preserves the ontology (record ≠ agency) at the cost of making "the platform turned on the pump" architecturally a statement about an Actor, never about the twin. I believe this is right and future-proof — but if actuation becomes central, the pressure to blur this line will be constant, and this section is the wall it will press on.

**Is excluding general knowledge (§2) sustainable?** The AI reading the twin needs agronomy the twin does not hold, so the platform's intelligence necessarily consults something outside the twin's boundary. That something — its curation, its trustworthiness, its versioning — is unmodeled anywhere in the RFC series so far, and RFC-0010 will collide with the gap directly. I have kept it out on principle (no correspondence to a place on this farm → not twin content) and I think the principle holds; but the roadmap's RFC-0009 (Knowledge Graph & Semantic Model) has just been handed its hardest question, and if no home is found, "the twin holds what is true of this farm" will be pressured into holding textbooks with fake geography, which would be a corruption. Flagged loudly.

**Is "the twin knows its own ignorance" (§7) over-claimed?** Staleness and sparseness are genuinely derivable. But *unknown unknowns* are not: the twin can map where it has no soil samples, but it cannot map the pest it has no concept of, the variable no sensor measures, the section no one thought to ever look at differently. §7's honest scope is *known-unknowns* — gaps in coverage of what the model already tracks. I have tried to phrase it within that scope, but the section's rhetoric ("maps its blind spots") invites a stronger reading than the mechanism supports. A future reader should take §7 as: the twin knows the shape of its ignorance *along the dimensions it measures*, and nothing more.

**Do the five strata carve at the joints?** "Observed/inferred" and "historical/current/predicted" are presented as orthogonal (classifications × readings), but the fit has a wrinkle: an *observed* element is never "predicted" (observations of the future are impossible), so the cross-product has a structurally empty cell. This is a feature — the empty cell *is* the arrow of time expressed in the taxonomy — but it means the tidy "two axes" framing is slightly less orthogonal than presented. Cosmetic, but worth noting before anyone builds taxonomy-driven tooling on the claimed orthogonality.

**The word "twin" itself.** The term imports expectations from manufacturing — high-frequency sensor sync, 3D geometry, simulation — that this model deliberately does not promise. What is defined here is closer to a *canonical historical counterpart* than an industrial twin. I have kept the word because the roadmap uses it and RFC-0000's vision matches its spirit, and §7 redefines its success criterion (honesty about incompleteness, not fidelity of mirroring) precisely to head off the imported expectations. If the term misleads more than it orients, renaming is cheap now and expensive later — a reviewer should decide deliberately, once.

**Overall.** The claims I am most confident in are the boundary identification (twin edge = promotion gate) and the strata-as-derivations — both do real work with zero new machinery, which is this series' standard of correctness. The claim I am least confident in is that this document needed to exist as a separate RFC rather than as amendments — its best contents are consolidations, and consolidation RFCs risk becoming the genre that later authors cite instead of the sources. If this RFC is wrong, it is wrong as a *document* rather than as a model: right claims, arguable address. Stated plainly, so the next author knows this stone is about the map of the RFCs, not the map of the farm.

---

## 10. Amendment log

| Amendment | Date | Authority | Changes |
|---|---|---|---|
| 1 | 2026-07-23 | REVIEW-001 §9 (executed at milestone M0) | §2: the twin's boundary gains the access dimension alongside the promotion gate — one twin, many scoped readings. §7: ignorance made actor-relative; the existence-versus-content distinction (discover capability) placed here. §8: the scoped-readings line added to the frozen model. |

**User Experience Implications (Amendment 1).** *Projection:* every user still sees "the farm" — theirs is simply the farm as shared with them, and it looks whole because it is answered whole. *Concealment:* sub-world computation and the discover lattice are invisible; no one is shown a redaction. *Leak check:* no internal term surfaces — not "twin," not "sub-world," not "discover"; the map needs no name for being the map. *Wholeness:* an adjuster with a two-week scope over one hail event has a complete, honest little world — its blind-spot map is *their* map, and nothing in it gestures at what they cannot see.

---

*This RFC names what the previous five built: the twin is the world content, whole, placed, dated, sourced — knowing what it holds, deriving what it implies, and mapping where its knowledge ends. RFC-0009 must now find a home for the knowledge that is true everywhere and nowhere; RFC-0010 will put the twin in front of the intelligence that reads it.*
