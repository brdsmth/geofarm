# RFC-0002 — Actors, Access & Collaboration

| | |
|---|---|
| **RFC** | 0002 |
| **Title** | Actors, Access & Collaboration |
| **Status** | Draft |
| **Author** | Bradley |
| **Created** | 2026-07-23 |
| **Depends on** | RFC-0000, RFC-0001 |
| **Pursuant to** | REVIEW-001 |
| **Supersedes** | — |
| **Superseded by** | — |

---

## 0. Purpose and method

This RFC is the outcome of REVIEW-001. The architectural direction is settled and is not relitigated here: **Actor remains the sole primitive of agency; Identity is not introduced; Resource is not introduced; collaboration is modeled as Scoped Grants; access is Actor × Scope × Capability; a Grant is an Event.** This document's job is to give those decisions their full conceptual structure — precisely enough that every later RFC can write "projections are taken by an Actor, within scope" and mean something exact.

One sentence carries the whole model:

> **There is one world; its participants are many; each participant reaches the world only through scoped projections of it; and every extension of reach is itself a recorded part of the world's history.**

Method and boundaries, in the series' standing discipline:

- **No new primitives.** Entity, Event, Assertion, Actor (RFC-0001) suffice. This document introduces three *named constructs* — Scope, Capability, Grant — and demonstrates that each is a composition or classification of frozen parts, exactly as Layer, View, and Selection were (RFC-0005, RFC-0006).
- **No mechanism.** Authentication, authorization enforcement, RBAC, ACLs, credentials, sessions, APIs, storage — all deferred. This document defines how agency and collaboration *exist* in the architecture, not how they are checked.
- **A note on numbering.** This RFC precedes the dimensional RFCs in reading order but was drafted after them (REVIEW-001 §7). It builds only on RFC-0000 and RFC-0001; where it cites RFC-0003 through RFC-0007, it cites forward into documents that already exist, for refinement rather than foundation.

---

## 1. The Actor, structured

### 1.1 What an Actor is

Inherited whole from RFC-0001 §3.4, not redefined: **an Actor is that which has agency — it can own Entities, cause Events, and make Assertions.** People, organizations, machines, AI agents, and external services are Actors. An Actor is not a role, not a permission, not an account; authentication — the binding of a real person or system to its Actor — is mechanism, excluded by RFC-0001's ruling and by REVIEW-001's, and it stays excluded.

What this document adds is what RFC-0001 left unstructured: how Actors stand *to each other*, and how their reach into the world is bounded.

### 1.2 Responsibilities of Actors

Four, of which the first three are inherited and the fourth is new:

1. **Agency** — Actors are the only sources of change. Every Event has a causing Actor; every Assertion has an authoring Actor. Nothing happens in the model except that some Actor did it.
2. **Provenance** — Actors are the answer to *on whose account* every element of the world exists. Trust, filtering, and audit all resolve to Actors.
3. **Ownership** — Actors hold the original authority over content (§4.4).
4. **Access** — Actors are the holders of Grants: the subjects of *who may see, who may add, who may share, who may represent.* Access attaches to Actors and to nothing else — not to devices, not to sessions, not to features.

### 1.3 How Actors participate in the world

Every interaction the platform will ever offer is an Actor exercising a capability within a scope. The interaction model (RFC-0006) defined five verbs — Navigate, Reveal, Indicate, Ask, Author — and this document supplies their missing bound: the four read-only verbs are exercises of *view* (and *discover*) capabilities; Author is an exercise of *author*; sharing is an exercise of *grant*; acting for another is an exercise of *represent*. There is no participation outside this account — which is what makes collaboration architectural rather than featural.

### 1.4 Representation: one mechanism for membership and delegation

REVIEW-001 named two missing structures — membership and delegation — and drafting this document collapsed them into one. The unification survived challenge (§8) and is adopted:

> **Representation is the capability to act on behalf of another Actor, conferred — like all capability — by a Grant.** There is no separate membership machinery and no separate delegation machinery. An *employee* is an Actor holding a broad, long-lived representation grant from an organizational Actor. A *consultant* holds a narrower one. A *seasonal worker* holds a time-bounded one. An *AI agent* holds whatever representation its principal granted it. **These differ in scope and duration, not in kind.**

Consequences:

- **Organizational structure is grant structure.** "Who is in this organization" is the projection of its standing representation grants — historical, auditable, and revisable like all grant history (§4). Hiring, engagement, and offboarding are Events by construction.
- **Dual attribution.** Every act performed under representation records both the acting Actor and the represented Actor — *by the consultant's AI, for the consultant, for the farm* is a preserved chain, not a blur. Attribution is never simplified to the end of the chain; the chain **is** the attribution (invariant I7).
- **Attenuation.** A representative can never do more than their representation confers, and can never confer more than they hold (invariant I4). Chains of representation therefore only narrow.

---

## 2. The Scope

### 2.1 What a Scope is

> **A Scope is a predicate over world content, expressed along the world's intrinsic dimensions: space (a region), time (a period), classification (kinds of content), provenance (whose contributions), confidence, and identity (enumerated things).**

A Scope selects; it never contains. "The west parcels, this season, agronomic content only" is a Scope. "Everything about the hail event of June 12" is a Scope. "This one recommendation" is a Scope — the degenerate, identity-enumerated case, which is how document-style *share this* survives inside the model without a Resource to carry it.

Scopes are possible because of what the earlier RFCs made true: all content is placed in one shared space (RFC-0003), dated in one shared history (RFC-0004), classified, and sourced (RFC-0001). A predicate over those dimensions can select *anything the world will ever contain* — which is the seed of the inheritance theorem (§7, T3).

### 2.2 Why Scope is architectural, not a UI filter

A Scope has the same *form* as a filter (RFC-0005 §5: a predicate over content) and a categorically different *role*, and the difference is the architecture:

- A **filter** is *chosen* by a viewer, composes freely, and is reversible at whim. It selects within the reachable.
- A **Scope** is *imposed* by a Grant, composes only downward, and is changed only by further Grants. It defines the reachable.

Formally: an Actor's effective projection is always *(chosen filters) ∧ (imposed scope)*. Filters range over the sub-world the scope admits; nothing a viewer chooses can range above it. The lens stack of RFC-0005 operates entirely beneath the scope; the scope is not the top lens — it is the horizon.

### 2.3 The sub-world rule

The rule that makes scoped access sound in a derivation-heavy architecture (REVIEW-001, Risk 1), stated normatively:

> **Every question an Actor can pose is answered as if their accessible sub-world were the whole world.** Visibility, spatial relationships, timelines, projections of state, aggregates, and the twin's self-knowledge of ignorance (RFC-0007 §7) are all computed *within* the Actor's sub-world — never computed globally and then redacted.

Scoping the inputs rather than the outputs is what prevents leakage-by-derivation: an excluded thing casts no adjacency, no silhouette in a coverage map, no perturbation in an aggregate, because for that Actor it does not participate in any computation at all. What an Actor *can* know is the shape of their own horizon — where their accessible world ends — which is not a leak but a requirement: an Actor should know the bounds of their own access.

Existence apart from content is governed by the *discover* capability (§3.1): a Scope may be granted at discover-depth (a thing exists here) without view-depth (what it is). Where nothing is granted, not even existence is answerable.

---

## 3. The Capability

### 3.1 The enumeration

> **A Capability is a named kind of act that a Grant confers within a Scope.** Four are frozen:

| Capability | Confers | Exercised as |
|---|---|---|
| **discover** | knowing that content exists within the scope, without its content | existence-only projections |
| **view** | taking full projections within the scope | Navigate, Reveal, Indicate, Ask (RFC-0006's four read verbs) |
| **author** | appending Events and Assertions whose subjects lie within the scope | the Author verb |
| **represent** | acting on behalf of the grantor, within the scope | any verb, dually attributed (§1.4) |

The enumeration is deliberately minimal, and one absence is structural: **there is no *grant* capability as a fifth kind.** Drafting began with one; challenge (§8) removed it. To grant is to author a Grant — and a Grant is an Event (§4) — so granting *is* authorship, exercised over grant-kind content. "May this Actor share onward?" reduces to "may this Actor author Grants within this scope?" — governed by the same *author* capability, bounded by the same attenuation law. Sharing needed no capability of its own because sharing is an act of record like every other act in this architecture.

Capabilities are ordered by strength where they overlap: *discover* < *view* (view implies discover within its scope). *Author* does not imply *view* (a sensor may append readings it could never browse) — independence that matters for machine Actors and is therefore kept.

### 3.2 Invariants every Capability satisfies

Any proposed future capability must satisfy all five, or it is not a capability but a category error:

- **C1 — Scope-bounded.** A capability exists only within a Scope. There is no unscoped power anywhere in the architecture; even an owner's authority is a scope (theirs: what they introduced or authored — §4.4).
- **C2 — Additive-only.** No capability confers mutation or erasure, because the world offers none (RFC-0004 §5). The strongest capability is the right to *add*. Nothing to bolt on, nothing to get wrong: destruction is not withheld by policy — it is absent from the model.
- **C3 — Attenuating.** No exercise of any capability can extend reach beyond what the exercising Actor holds. Granting and representing narrow or equal; they never widen (with ownership as the sole origin of authority, §4.4).
- **C4 — Projected.** Whether a capability is in force at time *t* is a projection of Grant history to *t* — never a lookup in a separate mutable register, because conceptually there is none (I5).
- **C5 — Attributed.** Every exercise records its exercising Actor, and the full representation chain when acting-for. No capability can be exercised anonymously.

---

## 4. The Grant

### 4.1 Conceptual representation

> **A Grant is an Event recording that one Actor conferred capabilities over a scope to another: (grantor, grantee, scope, capabilities, terms).** Its grantee is an Actor of any kind — a person, an AI agent, an organizational Actor (whose representatives then reach through it). Its terms may bound it in time — an engagement, a season, a single day.

As an Event, a Grant inherits everything RFC-0001 §3.2 and RFC-0004 fixed: it is immutable, dually timed, sourced (its grantor is its Actor), and permanent. The consequences:

- **Creation is an Event.** Access begins at a recorded moment, on a recorded account.
- **Change is an Event.** A modified grant is a superseding Grant; the prior stands in history.
- **Revocation is an Event.** Access ends by supersession, never by deletion; the fact that access existed is preserved forever.
- **Expiry is an Event whose time was fixed in advance.** A bounded grant carries its own end within its terms; the lapse is part of recorded history from the moment of granting, and projection past the bound simply excludes it — no further record is required for the access state to be correct, though the lapse may additionally be observed and recorded like any occurrence.

Grants are Events *about agency*, which the temporal model already licensed to be placeless (RFC-0004 §7) — and yet most grants have a place, inherited from their scope's geometry: a grant over the west parcels *is somewhere*. Sharing has a location, which is why it can be performed as a spatial act — drawn on the map like a fence (RFC-0006 §3's promotion gate, with the Grant as what the drawn region is promoted *into*).

### 4.2 Why Grants are Events: the emergent properties

Modeling access as recorded history rather than managed state is the review's central decision; these are the properties it buys, none of which needed building:

1. **Audit is not a system; it is a query.** *"Who could view this field on March 3?"* — project the Grant history to March 3, intersect scopes with the field. The platform answers historical collaboration questions with the same machinery that answers "what was planted here in 2023," because they are the same kind of question (theorem T2).
2. **Bitemporal honesty about access itself.** Grants carry occurrence and knowledge time, so *"what access was in force on March 3"* and *"what did the platform believe about access on March 3"* are both answerable — the distinction that matters when a revocation was backdated or an engagement recorded late.
3. **Collaboration disputes have a record.** Who shared what with whom, when, on whose authority — intrinsic, not reconstructed.
4. **One law governs everything.** The world's history and the history of *access to* the world obey the same append-only, supersession-based discipline. There is no second machinery to secure, no second model to teach, no seam between them.

### 4.3 What revocation cannot do

Stated here so the architecture never over-promises (REVIEW-001, Risk 2): **revocation ends further projections; it does not reach memory.** What an Actor projected while granted may have been noted, exported, or remembered — no architecture can rescind knowledge. The model's promise is exact: after revocation, no new projection includes the revoked scope; every projection that ever occurred remains attributable. Nothing stronger is claimed, and nothing stronger should ever be sold.

### 4.4 Ownership: the origin of authority

Attenuation (C3) requires an origin — authority must start somewhere before it can narrow. That origin is ownership:

> **The owner of content is the Actor whose authority over it is original rather than received: the introducer of an Entity, the author of an Event or Assertion.** Ownership is the root of every grant chain; every capability in force traces back through attenuating grants to an owner.

Ownership follows *contribution*, not containment: the landlord who introduced the field Entity owns it; the tenant who authored five years of operational Events over that field owns *those*; each reaches the other's content only by grant. Two organizations thus collaborate over one place without either owning the other's record — the multi-organization case (§5.4) falls directly out of this definition. Ownership is itself transferable, by Event; its lifecycle belongs to RFC-0008.

---

## 5. Participation

How each of the sponsor's cast members participates — each answered by the model already given, none requiring addition:

### 5.1 Organizations

An organization is an Actor (RFC-0001 §4 — no Organization primitive) with one structural property: **it acts only through representation.** Nothing is ever done *by* an organization except as some representing Actor does it, dually attributed. The organization is the durable holder of ownership and grants — the root of its members' authority — while every actual act traces to a person, machine, or agent. Organizational structure, membership, and its entire history are projections of representation grants (§1.4).

### 5.2 People — internal and external

Owners, managers, operators, agronomists, accountants: Actors holding representation grants of varying scope from their organization. Consultants, contractors, adjusters, lenders, seasonal workers: Actors *outside* the organization holding scoped, usually time-bounded grants — engagement-shaped access. The architecture makes no distinction of kind between an employee and an external collaborator, and this is deliberate: the difference is the breadth and duration of what they hold, read at any moment from grant history. Offboarding either is revocation; neither leaves a hole in the record.

### 5.3 AI agents

An AI agent is an Actor — RFC-0001 made it so before collaboration was designed, which is why nothing special is needed now:

- It **holds grants** like any Actor: scoped view of the world it may reason over, scoped author for the Assertions it may record.
- It **represents** a principal — the platform, an organization, a consultant — with dual attribution on everything it does; its acts are never anonymous and never confused with its principal's own.
- Its **context is its scoped View** (RFC-0006 §1): what the embedded intelligence sees is the viewer's View intersected with the *agent's own* scope — the two-scoped shared frame RFC-0006 §7 anticipated.
- Its **claims are Assertions** with provenance and confidence, filterable and supersedable like anyone's; its **track record accrues** like any predictor's (RFC-0007 §5).

A future of many agents — per-organization agents, per-task agents, agents engaged by consultants — is a future of many Actors holding attenuating grants. It arrives without amendment (T3).

### 5.4 Multiple organizations, one world

The model's quiet radicalism, stated plainly: **the world is not partitioned by organization.** There is one shared space and one shared history (RFC-0003, RFC-0004); organizations are Actors holding ownership and grants *within* it. Organizational boundaries are grant boundaries, not world boundaries. A landlord and a tenant operate over the same field as two Actors with interleaved ownership (§4.4) and mutual grants; a co-op's agronomist holds scopes across many members' farms; an adjuster holds a two-week scope over one hail event across property lines. Confidentiality between organizations is the ordinary operation of scopes — not a tenancy wall, which the conceptual model does not have. (Whether mechanism partitions storage is mechanism's business, invisible at this altitude.)

---

## 6. Normative invariants

Each survived challenge (§8); together they are the collaboration architecture's contract with every future RFC:

- **I1 — Every act has an Actor.** Inherited from RFC-0001; restated because access hangs on it: nothing anonymous can occur.
- **I2 — Every capability exercise is scope-bounded.** No unscoped power exists; ownership is original authority over one's contributions, not exemption from scoping.
- **I3 — Access is conferred only by Grant, and a Grant is an Event.** Immutable, sourced, dually timed, permanent. No other mechanism confers access.
- **I4 — Authority only attenuates.** No grant or representation confers more than the grantor holds; chains narrow monotonically from owners.
- **I5 — Access state is a projection of Grant history.** Conceptually there is no separate access record; "may X do Y" is always "project the grants to now." (Materialization is mechanism and changes nothing.)
- **I6 — No capability mutates or erases.** The world changes only by addition; the access model inherits, and can never override, append-only history.
- **I7 — Attribution preserves the full chain.** Every represented act records every link; attribution is never collapsed.
- **I8 — Authorization ranges over world content by predicate, never by feature.** No future feature may introduce feature-specific authorization semantics; a feature's collaboration behavior is exhaustively determined by its content's participation in Actor × Scope × Capability.

Two candidate invariants from the sponsor's list were **rejected** on scrutiny: *"every Grant references one grantee-person"* (false — grantees are Actors of any kind, including organizational Actors reached through representation) and *"authorization is evaluated over object ownership"* (inverted — ownership is the *origin* of grant chains, never the unit of evaluation; evaluation is always over scoped content, or Resources would be recreated at the root).

---

## 7. Theorems

Three, each doing load-bearing work; no others earned inclusion.

**T1 — Scope–Lens Correspondence.** *Any selection of world content expressible as a lens is expressible as a scope, and conversely.* Both are predicates over the same placed, dated, classified, sourced content; they differ in role (chosen vs imposed), not in form. Consequences: presentation and authorization share one selection algebra — there is nothing sharable that cannot be shown, nothing showable that cannot be shared, and the acts of *looking at* and *granting access to* a region of the world are performed with the same gestures on the same map. The sharing interface is the layer interface; no second vocabulary exists to learn or to build.

**T2 — Historical Collaboration.** *Because Grants are Events in the one bitemporal history, every question about collaboration is a historical query requiring no audit subsystem.* Who could see what, when; who shared what, on whose authority; what an Actor could have known on the day they acted (grant history ∧ knowledge times — RFC-0004 §1) — all are projections. Collaboration is not *logged*; it is *constituted by* records, which is strictly stronger.

**T3 — Future Feature Inheritance.** *Every future feature is born collaborative.* Proof sketch: a feature's content enters the world as Entities, Events, and Assertions (RFC-0005 §9 — "open because closed"); scopes are predicates over world content, so they range over the new content with no amendment (§2.1); capabilities and grants quantify over scopes (§3, §4); therefore view, authorship, sharing, delegation, and audit apply to the feature from its first day, with zero feature-level access design — and I8 forbids the alternative. The theorem's premise is made unconditional by this document's final settlement (§8.6): even the apparatus of looking, once promoted and named, enters the world as content.

---

## 8. Challenge review

This section records the attempt to break the design, question by question, including the two demolitions that succeeded and reshaped the document.

**8.1 Could Scope be removed?** Try it. Without Scope, a Grant must name its content — by enumeration, recreating per-object shares (Resource by the back door, at million-Event granularity), or not at all, making capabilities unbounded (an *author* grant over everything). Both failure modes are catastrophic and opposite, which is the signature of a load-bearing concept: Scope is exactly the thing whose removal collapses the model into one or the other. **Survives.**

**8.2 Could Capability be merged into Actor** — capabilities as attributes or roles of the Actor? That is role-based thinking, and it fails twice: an Actor's powers vary *by scope* (view here, author there), so capability-as-actor-attribute loses C1 immediately; and roles are mutable state, losing C4's projection property and T2 with it. "Roles" survive only as *naming conveniences* — a bundle of typical grants ("operator," "adjuster") that mechanism may template — never as architecture. **Survives.**

**8.3 Could Grants exist without Events** — a managed access register? Then access history requires a separate audit system (the sponsor's stated anti-goal), revocation becomes deletion (violating RFC-0004 §5), and the one law of §4.2.4 splits into two. The entire dividend of §4.2 is forfeit. **Survives; the Event modeling is not a style choice but the source of the properties.**

**8.4 Should Organizations simply be Actors?** They already are (RFC-0001 §4), and drafting confirmed nothing more is needed: the only organizational structure this document required was *acts-only-through-representation* (§5.1), which is a property, not a primitive. **Survives — and the challenge caught one drafting error**: an early draft gave organizations a distinct "membership" mechanism; §1.4's unification removed it. **First demolition applied.**

**8.5 Does this architecture accidentally recreate Resources?** The honest pressure point. The degenerate identity-scope (§2.1) *looks* like an object share. The differences are real: it composes with every other predicate (this thing, *until harvest*, *view only*); it resolves to world content plus its derivations under the sub-world rule, not to a container; and nothing else in the model privileges object grain. The named tripwire stands: **if actual usage collapses to identity-scopes almost always, we will have built Resources with extra steps**, and the model should then be re-reviewed honestly rather than defended aesthetically. Watch the usage. **Survives, conditionally and on record.**

**8.6 The apparatus residue** (REVIEW-001's strongest pro-Resource argument, deferred to this RFC — settled here). Saved Views and named layer definitions are shareable but were "apparatus," outside the world (RFC-0007 §2). Resolution: **a named View or named lens is authored content — on naming, it crosses the promotion gate (RFC-0006 §3) and enters the world as an Entity** whose place is the region it frames, whose time is its binding, whose author is its creator. This is not fake geography: a saved View genuinely *concerns* a where and a when — that is its entire purpose. With apparatus admitted-on-promotion, T3's premise is unconditional, sharing a View is an ordinary Grant, and the last candidate for a second access regime is gone. **Second demolition applied — the residue is dissolved rather than special-cased.**

**8.7 Could the model support millions of Actors?** Architecturally, Actor count appears nowhere: Actors are cheap identities (RFC-0004 §6 made identity cheap by design); grants are Events, which the world already holds in millions; access evaluation is projection, whose materialization is mechanism's problem. The model already implies large N — every sensor is an Actor. **Survives.**

**8.8 Could future AI agents collaborate without architectural change?** §5.3 answers by construction: an agent is an Actor; T3 covers its content; represent covers its principal-relationships; attenuation bounds runaway chains ("the agent hired by the consultant hired by the manager" can never exceed the manager's own reach — I4 is the safety property). One real residue, named for RFC-0010: attenuation bounds what a chain may *do*, not how *responsibility* distributes along it — whether the consultant answers for their agent's bad Assertion is an accountability semantics question, not an access one. **Survives, with the residue assigned.**

**8.9 Temporary contractors?** A time-bounded, narrow grant (§4.1): access that carries its own end, differs from employment in scope and duration only (§5.2), leaves complete history at expiry. The easiest case in the document. **Survives.**

**8.10 Multiple organizations over the same world?** §4.4's contribution-based ownership plus §5.4's no-partition claim handle landlord/tenant, co-ops, and cross-boundary adjusters without addition. The stress case: *hostile* co-located organizations (adjacent competitors) — handled by the sub-world rule (neither computes over the other's content at all) with the known, accepted disclosure that each may notice the shape of their own horizon (§2.3). **Survives.**

**8.11 What still worries the author** — attempts that did not break the design but left marks: (a) the *frozen four* capabilities may be one short — a future "execute"-like capability (triggering an automation) is conceivable, and would have to pass C1–C5 and an amendment to §3.1; the freeze is real but amendable in the open. (b) The sub-world rule is conceptually total but *cognitively* demanding — every future RFC author must remember that nothing is ever computed globally-then-redacted; I8 polices features, but nothing polices a careless derivation design except review. (c) Public or open access (a grant to "anyone") was deliberately not modeled — it needs either a universal Actor or grant-free discover semantics, both with consequences; deferred to RFC-0012 (API & Synchronization), where "public" first becomes meaningful.

---

## 9. The frozen collaboration model

- **Actor** — the sole primitive of agency (RFC-0001), now structured: representation (one mechanism for membership and delegation), dual attribution, attenuation.
- **Scope** — a predicate over world content along its intrinsic dimensions; imposed, not chosen; the viewer's horizon. The sub-world rule: every question is answered as if the Actor's accessible sub-world were the whole world.
- **Capability** — discover, view, author, represent; frozen, ordered, scope-bounded, additive-only, attenuating, projected, attributed. Granting is authorship of Grants, not a fifth capability.
- **Grant** — an Event: (grantor, grantee, scope, capabilities, terms); created, changed, revoked, and expired as history; access state is a projection of it. Revocation ends projections, never memory.
- **Ownership** — original authority, following contribution; the root of every grant chain; transferable by Event.
- **Participation** — organizations act only through representation; internal and external collaborators differ in scope and duration, not kind; AI agents are Actors with grants, representation, and track records; many organizations share one unpartitioned world.
- **Invariants I1–I8; theorems T1–T3.** Named Views and lenses enter the world as content on promotion; no second access regime exists anywhere.

---

## 10. Self-review

**Highest confidence.** The Grant-as-Event decision (§4) — it was accepted architecture entering this document, and drafting *strengthened* it: every property in §4.2 fell out without addition, which is this series' recurring signature of a correct decision. Likewise the two demolition-driven unifications (§1.4, §3.1): membership/delegation collapsing into representation, and *grant* collapsing into authorship of Grants, both reduced machinery while widening coverage — reductions that give more than they cost are usually true.

**Lowest confidence.** Three, ranked: (1) **The apparatus settlement (§8.6)** is the newest decision in the series and the least reviewed — admitting named Views as Entities is elegant and unconditionalizes T3, but it slightly widens what "world content" means, and REVIEW-001 §4 warned against exactly this kind of widening; if it proves wrong, T3 gains a caveat and the tripwire of §8.5 becomes more dangerous. (2) **The frozen capability enumeration** — four is satisfyingly few, and RFC-0001 §6 taught that satisfying numbers deserve suspicion; the *author*-does-not-imply-*view* independence and the absence of an execution-like capability are the two places a fifth may someday force itself in. (3) **The sub-world rule's enforceability** — it is stated totally and inherited voluntarily; a single future derivation designed globally-then-redacted quietly breaks the leak-soundness the rule exists for, and no invariant can catch a design error that never announces itself.

**The placement tension, honestly.** This document sits at number 0002 and cites five higher-numbered documents for refinement. The dependency claim (§0) — foundations only in RFC-0000/0001 — held throughout drafting with one near-exception: the sub-world rule (§2.3) is hard to even *state* without RFC-0003's derived relationships in hand. Reading order and dependency order diverge here more than anywhere else in the series; the cost was accepted by REVIEW-001 and is re-accepted, but a reader starting at 0002 cold will feel it.

**What was not designed.** Co-presence (two Actors in one View) was assigned to this RFC by REVIEW-001 and is *intentionally returned* to the interaction layer: drafting showed it needs nothing from the access model beyond what §5.3 already provides (each participant's scope bounds what the shared session can show them — the intersection problem), and its remaining substance — simultaneous attention, divergence, merging — is interaction design, not collaboration architecture. RFC-0006's revision (REVIEW-001 §9) should absorb it. If that judgment is wrong, the gap is in interaction, not access.

**The standing bet, restated.** This document is the hypothesis REVIEW-001 stated, now fully drawn. Its deepest wager is unchanged: that predicate-scoping with the sub-world rule can be made sound in practice, so that the object never needs to return as the unit of access. Every invariant here strengthens the bet; none discharges it. The first implementation RFC that cannot honor the sub-world rule is the signal to reconvene — with this section as the agenda.

---

*This RFC structures agency: one world, many Actors, reach conferred only by recorded, attenuating, scoped grants — collaboration as history, not administration. The dimensional RFCs (0003, 0004) now read under it; the lifecycle of content and grants is RFC-0008's; and the revisions REVIEW-001 §9 enumerated may now be executed against a frozen target.*
