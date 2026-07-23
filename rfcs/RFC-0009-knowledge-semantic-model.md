# RFC-0009 — Knowledge & Semantic Model

| | |
|---|---|
| **RFC** | 0009 |
| **Title** | Knowledge & Semantic Model |
| **Status** | Draft |
| **Author** | Bradley |
| **Created** | 2026-07-23 |
| **Depends on** | RFC-0000, RFC-0001, RFC-0002, RFC-0003, RFC-0004, RFC-0007 |
| **Supersedes** | — |
| **Superseded by** | — |

---

## 0. Purpose and method

The world is placed, dated, sourced, scoped, and assembled into a twin. This document defines the **semantic model**: how every element of that world connects to every other — and therefore what the platform's intelligence actually reasons over.

Two debts fall due here. RFC-0001 §6 refused Relationship as a primitive but promised "a typology of relationships" to a later document; this is that document. And RFC-0007 §9 handed this RFC what it called its hardest question: where does knowledge that is *true everywhere and nowhere* — agronomy, physiology, chemistry — live in a model whose every element must have a place?

The discipline is unchanged: **no new primitives.** The semantic model is built entirely from the four (Entity, Event, Assertion, Actor), their two dimensions, and the constructs already derived from them. And the organizing claim continues the series' deepest pattern — relationships derived (RFC-0003), timelines derived (RFC-0004), layers derived (RFC-0005), access derived (RFC-0002):

> **The knowledge graph is not built. It is read.** There is no graph to maintain, no edge store to curate, no semantic layer to keep synchronized with the world. The graph *is* the world, read along its connections — some computed from the dimensions, some born with each element, some claimed by Actors. A maintained graph could drift from the world it describes; a read graph cannot, because there is nothing separate to drift.

The AI reasons over this — over identities, histories, evidence, confidence, and disagreement — never over rows, tables, or any storage-shaped picture of the world. No implementation appears in this document; the semantic model is what any implementation must present.

---

## 1. The three sources of connection

Every edge in the semantic model comes from exactly one of three sources. This trichotomy is the typology's spine, and its exhaustiveness is the model's central claim:

- **Derived connections** — computed from the dimensions, never stored. Two things are connected because their geometries relate (containment, adjacency, overlap, proximity — RFC-0003 §5) or because their times relate (before, during, overlapping — RFC-0004 §2). Derived edges are always current, always consistent, and cost nothing to maintain because they are not maintained.
- **Intrinsic connections** — the references an element is *born with* and could not exist without: an Event's subjects and its source Actor; an Assertion's subjects, author, evidence, and what it supersedes; a Grant's grantor, grantee, and scope. Intrinsic edges are part of the element itself — recorded once, immutable with it, never edited after.
- **Claimed connections** — relationships that some Actor *declares*: this parcel belongs to that farm (by deed, against geography if need be — RFC-0003 §5's structural containment); these two fields are managed as one unit; this outbreak is the same one observed last year. A claimed connection is not a new kind of record. **It is an Assertion whose content is a connection** — authored, dated, confidence-bearing, supersedable, and evidence-carrying like any other claim.

The third source is the typology's quiet payoff, and it is why RFC-0001 was right to refuse Relationship as a primitive: the model needs no relationship records because *declared relationships are claims, and claims are already Assertions*. Someone said these things are connected; the saying has an author, a date, a degree of belief, and can be wrong — which is exactly what Assertion was built to carry. There is no fourth source. A relationship that is neither computable from the dimensions, nor born with an element, nor claimed by an Actor, does not exist in this model — and any future RFC proposing a "maintained" relationship class is proposing drift and must be refused.

---

## 2. The typology of relationships

The frozen families, each assigned to its source:

| Family | Examples | Source | Governed by |
|---|---|---|---|
| **Spatial** | contains, adjacent, overlaps, near, within | derived | RFC-0003 §5 |
| **Temporal** | before, during, overlapping, since | derived | RFC-0004 §2 |
| **Aboutness** | Event → its subjects; Assertion → its subjects | intrinsic | RFC-0001 §3.2–3.3 |
| **Provenance** | Event → source Actor; Assertion → author; representation chains | intrinsic | RFC-0001, RFC-0002 §1.4 |
| **Evidential** | Assertion → the Events and Assertions it derives from; → its grounds (§4) | intrinsic | this RFC, §5 |
| **Supersession** | Assertion → what it replaces; Grant → what it revises | intrinsic | RFC-0004 §5, RFC-0002 §4 |
| **Agency** | ownership; representation; Actor ⟷ Entity coincidence-of-role | intrinsic (recorded by Events) | RFC-0002 |
| **Structural** | belongs-to, part-of-by-decision, managed-with, same-as | claimed | this RFC, §1 |

Notes that carry weight:

- **Identity-sameness is a claim.** "This outbreak is the same as last season's" or "these two records describe one machine" — connecting identities is among the most consequential things an Actor can declare, and the model treats it as what it is: an Assertion (with evidence, confidence, and the possibility of being wrong), never a silent merge. Identities are primitive (RFC-0004 §6); joining them is interpretation.
- **Contradiction is derived, not declared.** Two standing Assertions about the same subject with incompatible content *contradict*; the model computes this from aboutness plus content, and preserves it. Nothing forces resolution: resolution, when it comes, is authorship (a superseding or reconciling Assertion). Until then the disagreement — two consultants, two diagnoses — stands with full provenance on both sides. **The model holds perspectives, not a single opinion**; a multi-Actor world requires nothing less, and a reasoning system is better served by visible disagreement than by a falsely unified truth.
- **Scope applies to edges.** Under the sub-world rule (RFC-0002 §2.3), an Actor's semantic model is the graph read *within their sub-world*: edges into content they cannot reach do not exist for them. The graph, like everything else, is per-Actor in reading and single in substance.

---

## 3. References: inward and outward

RFC-0003 §7 defined the reference — a link *by identity*, resolved on demand, never a frozen copy. The semantic model inherits it as the mechanism of every intrinsic edge, and makes one normative widening, stated openly:

> **References are of two kinds. An *inward* reference names a thing in the world by its identity. An *outward* reference — a ground — names something outside the world that has no identity in it: a publication, a guideline, a method, a named body of knowledge.**

Inward references are the connective tissue of everything so far. Outward references exist for one reason, developed in §4: the evidence of an Assertion sometimes rests on knowledge the world does not contain, and the model must be able to *cite* what it does not *hold*. A ground is a citation: precise enough to name its source (and version, where versions exist), carried in an Assertion's evidence exactly as inward references are, but resolving outside the model rather than within it.

This widening is the most consequential sentence in the document, and it is bounded on purpose: grounds appear **only** as evidence within Assertions. They are not subjects, not content, not things the world contains — the boundary that keeps them from becoming a back door (§10).

---

## 4. The home of general knowledge

RFC-0007's hardest question, answered:

> **General knowledge lives on the agency side of the seam — invoked in provenance, never held as content.** The world contains what is true *of this farm*. What is true *of farming* is competence that Actors bring: the agronomist's training, the AI's corpus, the guideline's recommendations. The model does not admit that knowledge as content — it would be placeless, violating the world's first discipline — but it *records its invocation*: an Assertion grounded in it cites it, by outward reference, as part of the claim's evidence.

The seam this exploits is the one the series has traced from the beginning: Actors may stand outside the world and act on its model from without (RFC-0001 §6, RFC-0003 §1, RFC-0004 §7). Knowledge that is true everywhere stands in the same place — outside the world, on the side of agency — and touches the record the same way Actors do: by attribution. The textbook is not in the twin; the *citing of the textbook* is. RFC-0007's fear — "textbooks with fake geography" — is thereby answered without either corruption (admitting placeless content) or amnesia (unexaminable expertise).

What this buys, concretely: when the AI asserts "this pattern is armyworm damage," its evidence names the imagery Events it read (inward) *and* the identification knowledge it applied (outward). When the agronomist recommends a rate, the recommendation cites the guideline. Expertise stops being invisible; every claim shows both what in the world it stands on and what beyond the world it leaned on. And because grounds are named, they are *filterable and auditable like provenance* — every claim resting on a superseded guideline is a query, not an archaeology project.

---

## 5. Evidence and the epistemic ladder

The semantic model's vertical structure — how the world's contents stand to truth — is a three-rung ladder, with each rung already frozen and only the ladder itself new:

**Rung 1 — Observations** (Events, descriptive): what sources reported. Immutable, never wrong *as records* — the bedrock (RFC-0004 §3, RFC-0007 §4).

**Rung 2 — Claims** (Assertions): what Actors concluded. Authored, confidence-bearing, supersedable, evidence-carrying.

**Rung 3 — Knowledge**: not a third kind of element, but a *state* of the claim-layer: the standing (un-superseded) Assertions, coherently connected, evidence-complete, read at some moment. "What the platform knows" is a projection of Rung 2 — which is why the knowledge graph needs no separate existence.

**The well-formedness rule** — RFC-0007 §4's peel-back property, now normative and complete:

> **Every Assertion's evidence must peel back, through zero or more intermediate Assertions, to leaves that are either Observations (inward) or grounds (outward).** An Assertion whose chain bottoms out nowhere — "I just know" — is malformed. The evidence relation is acyclic: no claim may, through any chain, be its own support.

**On "facts."** The word is used everywhere and this model deliberately deflates it. The only facts the platform possesses are **facts of record**: *that* this reading was recorded, *that* this claim was made, *that* this grant was issued — indisputable because they are the record itself. What the world is actually like is never held as unmediated fact: it is either observed (with the possibility of source error) or claimed (with stated confidence). A "fact" in casual usage — "this field is 40 acres" — is, in this model, a well-evidenced, uncontradicted, high-confidence standing claim; its firmness is earned by its evidence and its history, not conferred by a label. This is the epistemology an AI-native system must have: **nothing is true by fiat; everything answers "how do you know?"** — and the answer is always readable off the graph.

**On Document, once more.** RFC-0001 §6 named Document the leading candidate for un-rejection when evidence got its treatment. The treatment is now here, and the rejection **holds**: evidence is references (inward and outward) plus payloads already carried by Events (RFC-0003 §3.1); a lab report is an Event's payload, its findings enter as Observations, interpretations of it as Assertions citing them. Nothing in this section needed a Document noun — and the grounds mechanism absorbed even the citation case that made Document tempting.

---

## 6. Provenance and confidence

**Provenance** is the semantic model's trust dimension, and it is total: every element answers *who* — the observing source, the authoring Actor, the full representation chain when acting-for (RFC-0002 §1.4), and now the grounds leaned on. Nothing in the model is anonymous (RFC-0002, I1/C5), so nothing in the graph is unattributed; every path the AI walks is a path through *somebody's* contributions, and it always knows whose.

**Confidence** is governed by one rule with sharp consequences:

> **Confidence is authored, never computed.** A confidence is an Actor's stated degree of belief in their own claim, at its knowledge time. The model never combines, propagates, or updates confidences on its own — because a computed confidence would be a claim without a claimant, and this architecture has no such thing.

Consequences:

- **Propagation is reasoning, and reasoning is authorship.** If a diagnosis rests on three uncertain readings and a dated guideline, what confidence does a conclusion deserve? That is a judgment; whoever makes it — agronomist or AI Actor — *authors* it, owns it, and shows their evidence. Automated confidence evaluation is entirely permitted; it is simply *an AI Actor asserting*, attributed like everything else.
- **Confidence is calibratable, per Actor.** Because predictions and estimates are graded by the arriving record (RFC-0007 §5), every claiming Actor accrues a track record, and *stated* confidence can be audited against *earned* reliability. "This scout's 'certain' runs 70%" is a derivable, placed, dated observation about the record — the graph carries not just beliefs but the demonstrated quality of the believers.
- **Disagreement needs no arbiter.** Contradictory claims stand with their authors, confidences, and evidence (§2). Consumers — human or AI — weigh them by provenance, calibration, and evidence quality, all of which the graph exposes. The model's job is to make disagreement *legible*, not to adjudicate it silently.

---

## 7. What the AI reasons over

The point of the whole construction, stated as the interface it implies (behavior belongs to RFC-0010):

**The unit of reasoning is the semantic neighborhood.** For any element or region, the model presents: the identities present and their projected state (RFC-0004 §4); their timelines (derived); their spatial relations (derived); the standing claims about them with authors, confidences, and calibration; the evidence chains under those claims, peel-able to observations and grounds; the contradictions currently live; and the staleness and sparseness of the underlying record (RFC-0007 §7). That — not rows, not tables, not documents — is what intelligence consumes. A question like *"why is this corner yielding 18% lower?"* (RFC-0000 §2.3's founding gesture) is answered by walking exactly these edges: what is here, what happened here, what has been claimed about it, on what evidence, said by whom, how reliable, disagreeing with what, and how it compares across the timeline.

**The loop closes.** What the AI produces re-enters the same graph as Assertions — subjects inward, evidence inward and outward, author the AI Actor, confidence stated, attribution chained through its principal (RFC-0002 §5.3). The AI is not a consumer of the semantic model with a private way of knowing; it is a participant *in* it, its reasoning as inspectable, calibratable, and supersedable as anyone's. There is no separate "AI knowledge base" to reconcile with the world — one graph, into which reasoning accretes.

**Scoped, like everything.** The AI's neighborhood is read within its sub-world (RFC-0002 §2.3) intersected with the sharing viewer's View (RFC-0006 §7). It reasons over what it may reach, and its every step is attributed — the same two laws that govern every other participant.

The deeper claim beneath this section: **because the semantic model is the reasoning substrate, there is no translation layer between what the platform records and what its intelligence thinks about.** Systems whose AI reasons over exports, summaries, or schemas of their data have two representations that drift. This architecture has one. That is what "AI-native" has meant since RFC-0000: not a chat feature beside the data, but a record whose very shape — placed, dated, sourced, evidenced, confidence-bearing, disagreement-preserving — *is* a reasoning medium.

---

## 8. The frozen semantic model

- **The graph is read, not built** — no maintained edges, no separate semantic layer, nothing to drift.
- **Three sources of connection** — derived (from the dimensions), intrinsic (born with elements), claimed (Assertions whose content is a connection). No fourth. Relationship remains a non-primitive; the typology of §2 is frozen.
- **References are inward (by identity) or outward (grounds — citations of knowledge the world does not hold).** Grounds appear only as evidence within Assertions.
- **General knowledge lives in provenance, not content** — invoked and cited, never admitted as placeless world content.
- **The epistemic ladder** — Observations (bedrock) → Claims (interpretation) → Knowledge (the standing, evidence-complete projection of claims). Well-formedness: every claim peels back, acyclically, to observations and grounds.
- **Facts are facts of record**; everything about the world itself answers "how do you know?"
- **Confidence is authored, never computed**; propagation is authorship; calibration is derivable; disagreement is preserved and legible, per-Actor scoped.
- **The AI reasons over semantic neighborhoods** of this graph and accretes into it — one representation, no translation layer, no private knowledge base.

---

## 9. Self-review

**Is the trichotomy (§1) actually exhaustive?** The claim that every connection is derived, intrinsic, or claimed is the document's spine, and it was stress-tested during drafting against the awkward cases: identity-sameness (claimed — §2), contradiction (derived from aboutness plus content), representation chains (intrinsic, recorded by Events), ownership transfer (intrinsic via Events). All landed. The residual risk is a future relationship that is none of the three — the obvious candidate being *statistical association* ("fields like this one"), which is neither computed from dimensions alone, born with elements, nor claimed by anyone until some Actor asserts it. My answer: exactly — until asserted, an association is a potential reading, not an edge; the moment it matters, it is an Assertion. If that answer someday feels like a dodge, the trichotomy is where this document breaks.

**Are grounds a back door?** §3 calls the outward reference the document's most consequential sentence, and the danger is precise: once the model can cite placeless knowledge, pressure will build to *say things about* grounds — "this guideline is outdated" is a claim any agronomist will want to record, and its subject has no place. The boundary drawn (grounds appear only as evidence, never as subjects) holds the line but visibly strains against real use. Two futures: either such meta-claims are recast as claims about world content ("the recommendations on this farm resting on guideline X should be re-examined" — placed, dated, legitimate), which I believe covers the need; or the pressure wins and placeless content enters, which would be the series' first breach of Spatial-First for content. This is the seam most likely to move, and I have deliberately made moving it require an open amendment rather than a quiet widening.

**Did deflating "fact" dodge the mandate?** The task asked for Facts as a category; this document answers that the model holds facts *of record* and mediated claims about the world, nothing else. I consider the deflation the honest core of the RFC rather than a dodge — an AI-native platform that stamps some claims as unquestionable "facts" builds its own blind spot — but it does mean the everyday word "fact" has no first-class home here, and users will use it. The vocabulary cost is real; the epistemic cost of the alternative is worse.

**Is authored-only confidence too austere?** Forbidding computed confidence forces every uncertainty judgment through an authoring Actor, which is philosophically clean and operationally demanding — a platform full of derived surfaces (interpolations, projections) will want cheap uncertainty numbers everywhere. The escape hatch is honest (automated evaluators are AI Actors), but it means even routine uncertainty must be *somebody's claim*. I hold the line because the alternative — system-generated belief with no claimant — is exactly the confident counterfeit RFC-0007 §4 warned against; but I note this rule generates more Assertions, and more Actor-machinery, than any other single decision in the series.

**Does §7 pre-empt RFC-0010?** The line drawn: this document defines what the AI reasons *over* (the substrate and its edges); RFC-0010 defines how it reasons, when it speaks, and what its context assembly actually is. The semantic-neighborhood concept sits right on that line, and RFC-0010's author inherits it as a constraint, as RFC-0006 §10 already noted about the View. If neighborhood-as-unit proves wrong for real reasoning, the revision lands here, not there.

**What this document did not do.** It froze a typology but not a *vocabulary of kinds* — "belongs-to," "managed-with," "same-as" are examples, not an enumerated set of claimed-connection types. That enumeration is deliberately left open (claimed connections are Assertions; their content-types will grow as the platform grows), but a future RFC may need to standardize the common ones for interoperability, and nothing here prevents that. Named as an opening, not an omission.

**Overall.** Highest confidence: the read-not-built graph and the trichotomy — both are the series' central pattern applied one more time, and both did real work in every section that followed. Lowest confidence: the grounds boundary (§3–§4), which answers the series' hardest standing question with its most delicate mechanism — a reference that points outside the world, permitted in exactly one position. If this document is wrong, it is wrong there; and because that seam guards Spatial-First itself, it is flagged as the first stone for RFC-0010's author — whose intelligence will lean on grounds harder than anyone — to test.

---

*This RFC connects everything the series has built: one graph, read from the world itself — derived, intrinsic, and claimed — grounded outward only through citation, confident only through authorship. RFC-0010 now inherits a reasoning substrate with no translation layer; RFC-0008 still owes the lifecycle of the content this graph connects.*
