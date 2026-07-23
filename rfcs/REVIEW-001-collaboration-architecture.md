# REVIEW-001 — Architectural Review: Collaborative, Multi-Actor Operation

| | |
|---|---|
| **Review** | 001 |
| **Scope** | RFC-0000 through RFC-0006 (as numbered at review time) |
| **Concern** | Collaborative, multi-user operation as a foundational capability |
| **Author** | Bradley |
| **Date** | 2026-07-23 |
| **Outcome** | Two RFCs inserted (retitled from sponsor's working titles); series renumbered; no new primitives admitted |

---

## 1. Executive summary

The concern is legitimate and foundational: the platform is to become the operating system of an agricultural *organization*, and the current series — while never contradicting multi-actor operation — was written from the vantage of a single, all-seeing viewer. That assumption is real, it is identifiable in specific sections, and it must be revised before any further RFC is written, because everything downstream (knowledge, AI reasoning, integration, API) inherits it.

The review's verdicts, in one paragraph each:

**The ontology survives intact.** Four primitives — Entity, Event, Assertion, Actor — are sufficient for full collaborative operation. This is not a coincidence: RFC-0001 §3.4 built Actor precisely as "the answer to *who owns this, who did this, who claims this*," unified across humans, organizations, machines, AI agents, and external services. The collaboration concern does not reveal a missing primitive; it reveals an **unstructured** one. Actor was admitted and then left nearly featureless. The smallest revision is to give Actor its structure — membership, delegation — and to define access as a *derived, event-recorded relationship* between Actors and the world.

**Identity is rejected as a primitive** (§3). It is Actor under another name, and worse, the name collides fatally with the series' existing, heavily load-bearing use of "identity" for entity-persistence (RFC-0002 §4). The concept lands as a normative amendment to Actor, not as new vocabulary.

**Resource is rejected as a primitive** (§4). It imports container-thinking from document-centric software into a world model that deliberately has no containers. The platform's unit of sharing is not the object but the **scope** — a predicate over the one world — and per-object sharing survives as the degenerate scope. The uniformity Resource promises (features inherit collaboration automatically) is achieved more cheaply and more natively by defining access *once, over the substrate* (§5).

**The chosen model** is the **Scoped Grant model**: access is a relationship *Actor × Scope × Power*, established by Grant Events, revoked by superseding Events, and read — like everything else in this architecture — as a projection of history. Sharing becomes an act of authorship; access state becomes auditable, bitemporal history; and "share the west parcels with the contractor" becomes, literally, a spatial act performable on the map. Collaboration lands *inside* all five founding principles rather than beside them (§5.4).

**Two RFCs are inserted** and the series renumbered: **RFC-0002 — Actors, Access & Collaboration** (sponsor's working title "Identity, Resources & Collaboration," retitled per §3–§4) and **RFC-0008 — Content & Grant Lifecycle** (working title "Resource Lifecycle," retitled likewise). Existing RFC-0002…0006 become RFC-0003…0007. Required revisions to existing documents are enumerated in §9; none is structural, most are narrow.

---

## 2. Architectural analysis

### 2.1 What the architecture already provides

The review's first finding is how much collaborative machinery the series already contains — built for other reasons, waiting to be used:

- **A unified theory of participants.** Actor already spans "farm owners, managers, operators, agronomists, consultants, contractors, accountants, adjusters, lenders, and future AI agents" — the sponsor's entire cast — under one concept (RFC-0001 §3.4). Critically, **AI agents already participate on equal architectural footing**: an AI is an Actor, its outputs are Assertions with provenance and confidence, its acts are Events. No special path for AI collaboration needs to be invented; the sponsor's hardest question ("how do AI agents participate?") was answered in RFC-0001 before it was asked.
- **Attribution everywhere, by construction.** Every Event names its source Actor; every Assertion names its author (RFC-0001 §3.2–3.3). In a multi-user system this is the difference between a shared record and a shared mess: *who said what, when, about where* is intrinsic to every element, not an audit feature.
- **Concurrency without destructive conflict.** The world is append-only (RFC-0003 §5). Two Actors recording simultaneously cannot overwrite each other, because nothing overwrites anything. Contention narrows to supersession races on Assertions and geometry — real, but small, and resolvable by ordinary supersession semantics.
- **Provenance filtering as trust control.** "Show only this agronomist's notes; hide the AI's low-confidence claims" already exists as a Reveal gesture (RFC-0004 §5, RFC-0005 §7).
- **Handoff.** Views are shareable values (RFC-0005 §1.3): a consultant can be handed exactly the way-of-looking that raised a question.
- **An honest flag.** RFC-0005 §10 explicitly named collaboration as missing rather than absorbing it. This review is that flag being answered.

### 2.2 The implicit assumption: the omniscient viewer

What the series lacks is precise, and it is one thing, appearing in several costumes:

> **Every projection in RFC-0002 through RFC-0006 is defined over the whole world.** Visibility (RFC-0002 §6) queries all geometries; a layer's scope filters *the* world (RFC-0004 §1); the View's contents are "the derived visibility" of everything (RFC-0005 §1); the twin has one boundary for all comers (RFC-0006 §2). Nowhere does any document ask: *visible to whom? projectable by whom? authorable by whom?*

The viewer of RFC-0002…0006 sees everything and may author anything. For a single farmer that is a harmless simplification. For an organization with lenders, adjusters, competitors-as-contractors, and seasonal workers, it is untenable: the accountant must not browse agronomic experiments; the contractor must not see the lien documents; the neighboring operation contracted for harvest must not inherit five years of yield history.

The fix is a single interposition, stated once and inherited everywhere:

> **Every projection is taken by an Actor, against that Actor's accessible sub-world.** One world; many Actors; each Actor's reachable content defined by the access relationships then in force. Collaboration is many scoped projections of one shared world.

Everything else in this review is the smallest set of concepts needed to define "accessible sub-world" without breaking the frozen vocabulary.

### 2.3 What is genuinely missing

Four gaps, none of them a primitive:

1. **Actor structure.** Organizations exist (Actor), but *membership* (this person acts within this organization) and *delegation* (this consultant, this AI, acts on behalf of that Actor) are unmodeled. Both are Actor⟷Actor relationships — exactly the "typology of relationships" RFC-0001 §6 anticipated needing without admitting Relationship as a primitive.
2. **The act of sharing.** No concept exists for granting another Actor access to anything.
3. **Scoped visibility and authorship.** No concept exists for *bounding* what an Actor can see or record.
4. **Co-presence.** Two Actors attending to the same View simultaneously (RFC-0005 §10's flag). This review scopes it out: co-presence is an interaction-layer concern that presupposes the access model but does not shape the ontology. It is assigned to the new RFC-0002's mandate, not solved here.

---

## 3. Decision on Identity

**Verdict: rejected as a primitive. The concept lands on Actor, which must be amended, not replaced.**

Three independent grounds, any one of which would suffice:

**(a) Redundancy — it fails RFC-0001's second admission test.** A primitive must carry "responsibilities no other primitive carries." Every responsibility proposed for Identity — being the subject of ownership, the grantee of access, the author of acts, the participant in collaboration — is verbatim the responsibility list of Actor (RFC-0001 §3.4). Admitting Identity would not add a concept; it would split one concept across two names, and every future document would have to police a distinction without a difference.

**(b) Name collision — the word is already load-bearing elsewhere.** "Identity" is the series' term for *entity-persistence*: the stable sameness of a thing across change (RFC-0002 §4: "identity is not geometry"; RFC-0003 §4: identity as invariant; references are "by identity" throughout). This is arguably the single most load-bearing word in the architecture — references, selections, projections, and the twin's peel-back rule all hang on it. Introducing a primitive named Identity meaning *who is acting* would poison every existing sentence containing the word. Even were the concept sound, the name is unavailable.

**(c) Mechanism provenance — the residue is authentication.** What remains of "Identity" after Actor absorbs the agency is the *binding of a real-world person to their Actor* — accounts, credentials, login. RFC-0001 §3.4 already ruled on this in advance: "Not a role, permission, or account. How Actors authenticate... is a mechanism concern, deferred." That ruling was correct and stands. A concept that exists only because authentication will someday exist fails the third admission test (domain-native, not mechanism-native).

**What survives of the sponsor's concern** — and it is substantial — becomes a **normative amendment to Actor** (specified for the new RFC-0002):

- **Membership**: an Actor may act *within* an organizational Actor; organizational agency is exercised through members.
- **Delegation**: an Actor may act *on behalf of* another. Every delegated act carries **dual attribution** — the acting Actor and the Actor acted-for — so "the consultant's AI agent, acting for the agronomist, acting for the farm" is a recorded chain, not a blur. This single structure covers consultants, contractors, seasonal workers, and AI agents identically.
- Both relationships are established and dissolved **by Events**, so org structure and delegation history are placed in time, auditable, and reconstructable as-of any moment — for free, by the machinery of RFC-0003.

---

## 4. Decision on Resource

**Verdict: rejected as a primitive. The unit of sharing is the Scope — a predicate over the one world — not the object.**

**(a) It fails the domain-nativity test outright.** A Resource is defined by what the *platform* does to it (viewed, edited, shared, owned) — not by what it *is* on a farm. It exists because a sharing mechanism wants a uniform handle. That is the textbook case of RFC-0001 §1's third rejection: mechanism-native, not domain-native.

**(b) It imports container-thinking the architecture spent five RFCs evicting.** Docs, Figma, Notion, and GitHub share *files, documents, repos* because their worlds are **made of** files, documents, and repos — the container is the native unit of their content. This platform's world is deliberately not made of anything container-like: it is one continuous, placed, dated, sourced record, and RFC-0004 §1 was emphatic that even layers — the most container-tempting concept — are lenses, never containers. Resource would reintroduce at the access layer the very thing evicted from the content layer, and the seams would show immediately: is a million-Event history a million Resources? Is a field-plus-its-timeline one Resource or thousands? Every answer is arbitrary because the question is imported, not native.

**(c) The domain's own sharing grammar is scope-shaped, not object-shaped.** Listen to how the sponsor's cast actually shares: *give the agronomist the agronomy* (a classification scope); *give the contractor the west fields, this season* (a spatial-temporal scope); *give the lender read access to yield history* (a classification + time scope); *give the adjuster everything about the hail event* (a spatial-temporal-topical scope). Nobody on a farm shares "objects." They share *regions of the world along its natural dimensions* — place, time, kind, source. The architecture already has the machinery for exactly this: a predicate over world content is what RFC-0004 calls a filter, and "a filter is an anonymous layer" (§5). Sharing shares scopes. **A Scope is a lens turned from presentation to permission** — same form, new role, zero new primitives.

**(d) The degenerate case is preserved.** Docs-style "share this one thing" is the scope whose predicate is a single identity (plus, ordinarily, its history and the Assertions about it). Object-grain sharing is *inside* the scope model as its narrowest case; nothing is lost by refusing the superclass.

**The honest residue — the strongest pro-Resource argument, stated fairly.** Not everything shareable is world content. Saved Views and named layer definitions are *apparatus* — explicitly outside the twin (RFC-0006 §2) — yet they are exactly the artifacts people will share most casually ("look at this"). Does apparatus need Resource? No: a saved View is an authored artifact with an author, a date, and (through its spatial scope) even a place; grants can range over apparatus by the same predicates (kind + provenance) that range over world content. Whether promoted apparatus should simply *enter* the world as content is a real question — deferred to the new RFC-0002 (§11). If that RFC finds apparatus demands its own access regime, Resource re-earns its hearing; this is the named condition under which this rejection should be revisited.

---

## 5. Comparison of the three architectural approaches

### 5.1 Approach 1 — every major object is a Resource

**Right about the goal, wrong about the unit.** Its virtue is uniformity: collaboration semantics defined once, inherited by everything, no per-feature permissions. That goal is correct and this review adopts it wholesale. Its vice is §4 entire: the object is the wrong unit for a container-less world; granularity is unanswerable; the abstraction is mechanism-native. Adopted in spirit, rejected in noun.

### 5.2 Approach 2 — domain objects own their collaboration semantics

**Rejected without reservation.** This is the sponsor's own anti-goal — "permissions bolted onto individual features" — stated as an architecture. It is also the exact failure mode this series has twice diagnosed and twice refused in other dimensions: per-object timelines fragmented one history into many (RFC-0003 §9); per-tool worlds fragmented one farm into many (RFC-0000 §1). Per-object collaboration semantics would fragment one access model into many, and future features would *not* inherit collaboration — each would reimplement it, divergently, forever. The proposal fails the meta-principle (RFC-0000 §3) on contact.

### 5.3 Approach 3 — a hybrid

**Rejected as the worst of the three.** A hybrid means two access regimes and a standing question — "which regime does this live in?" — asked at every future feature, answered inconsistently, drifting always toward Approach 2 one convenient exception at a time. Hybrids are what get chosen when neither pure model is trusted; the correct response to that distrust is a better pure model, not both flawed ones.

### 5.4 The chosen model — the Scoped Grant model (Approach 1's goal, achieved natively)

> **Access is a derived relationship: Actor × Scope × Power, established by Grant Events, ended by superseding Events, and read as a projection of history — exactly as every other state in this architecture is read.**

- **Scope** — a predicate over the one world along its intrinsic dimensions: space (a drawn region, a farm's extent), time (this season, since engagement began), classification (agronomy, financials, equipment), provenance (only what this Actor authored), confidence. A filter in the access role. Not a primitive — a named reuse.
- **Power** — what the grant confers within the scope: at minimum *view* (take projections) and *author* (append), and *grant* (extend access onward, within one's own bounds — sharing as delegated granting, which is how "who can share?" gets the same answer as everything else). The exact enumeration is the new RFC-0002's to freeze (§11).
- **Grant** — the act of sharing, and it is an **Event**: recorded, dated (bitemporally), sourced, immutable, superseded-not-deleted. A classification of Event, not a new primitive — and note the architecture *predicted* it: RFC-0003 §7 ruled that only Events about agency may be placeless, and grants are precisely Events about agency (though a grant over the west parcels carries its scope's geometry — even sharing has a place).
- **Ownership** — already an Actor⟷Entity relationship (RFC-0001 §3.4), now sharpened: the owner is the Actor whose grant-authority over a scope is *original* rather than received. Transfer is an Event. (Full treatment: lifecycle RFC.)

**Why this satisfies every sponsor question architecturally:**

| Question | Answer |
|---|---|
| Who owns something? | The Actor holding original grant-authority over it (recorded relationship, transferable by Event) |
| Who can view it? | Any Actor whose projected grant-state includes a view-power scope covering it |
| Who can modify it? | Nobody, ever (RFC-0003) — *append* is the question, and: any Actor with author-power over a covering scope |
| Who can share it? | Any Actor with grant-power over a covering scope — sharing is delegated granting |
| How does collaboration work? | Many Actors, each taking scoped projections of one world, each authoring attributed additions into it |
| How do AI agents participate? | As Actors with granted scopes and recorded delegations — no special path |
| How do future features inherit collaboration? | **The inheritance theorem**: every future feature's content enters the world as Entities, Events, or Assertions (RFC-0004 §9 — "open because closed"); scopes quantify over world content by predicate; therefore every future feature is born collaborative, with zero feature-level access design. |

**Why it is the smallest revision:** it adds no primitive, no mutable state, and no second machinery. Access state is a projection of Events — auditable ("what could the adjuster see in March?" is answerable *exactly*, bitemporally), revocable without erasure, and consistent with every frozen commitment. And it lands inside all five founding principles: scopes are *spatial* (share by drawing a fence on the map — access control as a literal act of geography); grants are *events*; access history is *preserved*; the AI is a *scoped Actor*; and the map remains the surface on which sharing itself is performed. Collaboration does not strain the principles; it exercises them.

---

## 6. Recommended ontology changes

**To the primitive set: none.** Entity, Event, Assertion, Actor stand. This is the review's headline and its proof of the series' soundness.

**Normative amendments (to be executed per §9):**

1. **RFC-0001 §3.4 (Actor)** — add membership and delegation as named Actor⟷Actor relationship types with dual attribution; note that Actor structure changes by Event.
2. **RFC-0001 §4 (challenge log)** — append the newly challenged nouns:

| Noun | Disposition | Reasoning |
|---|---|---|
| **Identity (as account/participant)** | → Actor / mechanism | Redundant with Actor; name collides with entity-identity; residue is authentication (deferred) |
| **Resource** | → rejected (mechanism-native) | Container-thinking; the unit of sharing is the Scope over the one world |
| **Scope** | → named reuse of filter | A lens turned from presentation to permission; not a primitive |
| **Grant / Share** | → Event classification | The act of extending access; recorded, dated, sourced, superseded-not-deleted |
| **Permission / Role** | → derived / mechanism | Access state is a projection of Grant Events; role bundles are convenience naming, deferred |
| **Team / Workspace** | → organizational Actor / rejected | Membership relationships; "workspace" is container-thinking re-entering |

3. **RFC-0000** — the narrow amendment RFC-0001 §6 already requested (world content is spatial; agency may originate outside), plus explicit acknowledgment that the world is plural-operated (§9).

---

## 7. Recommended roadmap changes

Two insertions, both accepted as *foundational* (they change what every subsequent RFC must assume), both **retitled** from the sponsor's working titles to reflect the review's decisions — the working titles named the two concepts the review rejected:

- **RFC-0002 — Actors, Access & Collaboration** *(working title: "Identity, Resources & Collaboration")*. Mandate: Actor structure (membership, delegation, dual attribution); organization; ownership as original grant-authority; Scope; Power (frozen enumeration); Grant semantics; discoverability (existence-visibility vs content-visibility — see §10/§11); co-presence; status of promoted apparatus (saved Views, named layers). Implementation-independent throughout; authentication, authorization mechanisms, and all enforcement are out of scope.
- **RFC-0008 — Content & Grant Lifecycle** *(working title: "Resource Lifecycle")*. Mandate: the sponsor's lifecycle questions (creation, ownership, transfer, sharing, duplication, archival, restoration, versioning, deletion, invariants) answered for world content, grants, and apparatus — harmonizing cloud-software lifecycle expectations with an append-only world in which many answers are already constrained: *created* = authored; *versioned* = supersession; *deleted* = never (retraction Events); *restored* = re-projection; *archived* = a visibility state, not a location.

**Renumbering** (insertion of new 0002 shifts the written series; lifecycle takes 0008; the planned roadmap shifts by two):

| Old | New | Title | Status |
|---|---|---|---|
| 0000 | 0000 | Vision and Design Principles | written |
| 0001 | 0001 | Core Ontology | written |
| — | **0002** | **Actors, Access & Collaboration** | **to be written** |
| 0002 | 0003 | Spatial World Model | written, renumbered |
| 0003 | 0004 | Temporal Model | written, renumbered |
| 0004 | 0005 | Layer Model | written, renumbered |
| 0005 | 0006 | Map Interaction Model | written, renumbered |
| 0006 | 0007 | Digital Twin Model | written, renumbered |
| — | **0008** | **Content & Grant Lifecycle** | **to be written** |
| 0007 | 0009 | Knowledge Graph & Semantic Model | planned |
| 0008 | 0010 | AI Context and Reasoning | planned |
| 0009 | 0011 | Integration Architecture | planned |
| 0010 | 0012 | Public API & Synchronization | planned |
| 0011 | 0013 | Storage & Persistence | planned |
| 0012 | 0014 | Frontend State Architecture | planned |
| 0013 | 0015 | Rendering Pipeline | planned |
| 0014 | 0016 | Initial MVP Scope | planned |

RFC-0002 is deliberately placed *before* the spatial model: access is a fact about Actors and the world as a whole, prior to the structure of either dimension — and every projection-defining RFC downstream must be able to say "projections are taken by an Actor, within scope" by reference rather than by anticipation.

---

## 8. Updated RFC dependency graph

```
RFC-0000 (Vision & Principles)
    │
RFC-0001 (Core Ontology)
    │
    ├────────────────────────────┐
    │                            │
RFC-0002 (Actors, Access         │
    │     & Collaboration)  RFC-0003 (Spatial World Model)
    │                            │
    │                       RFC-0004 (Temporal Model)
    │                            │
    ├───────────────┬───────► RFC-0005 (Layer Model)
    │               │            │
    │               ├───────► RFC-0006 (Map Interaction Model)
    │               │            │
    │               └───────► RFC-0007 (Digital Twin Model)
    │                            │
    └───────────────────────► RFC-0008 (Content & Grant Lifecycle)
                                 │
                            RFC-0009 (Knowledge & Semantic Model)
                                 │
                            RFC-0010 (AI Context & Reasoning)
                                 │
                            RFC-0011…0016 (Integration, API,
                            Storage, Frontend, Rendering, MVP)
```

- RFC-0002 depends only on 0000 + 0001 (it structures Actor and defines access over world content in the abstract). RFC-0003 and RFC-0004 do **not** depend on 0002 — space and time are actor-independent, and keeping them so preserves their timelessness.
- RFC-0005, 0006, 0007 gain a dependency on 0002 (their projections become actor-scoped) — the normative substance of §9.
- RFC-0008 depends on 0002–0007 (lifecycle ranges over content, grants, and apparatus).

---

## 9. Required revisions to existing RFCs

Renumbering of files, headers, and cross-references is mechanical and performed with this review. Content revisions are specified below and **deliberately not yet executed**.

| RFC (new №) | Changed assumption | Sections | Class |
|---|---|---|---|
| 0000 | The operator is one person; viewer is implicitly universal | §1 voice; §2.3; new sentence in §2 or §3 | **Normative (narrow)** + editorial |
| 0001 | Actor is structureless; challenge log predates six nouns | §3.4; §4; §6 | **Normative** |
| 0003 (spatial) | none — space is actor-independent | — | Editorial only (renumbering) |
| 0004 (temporal) | none structural; knowledge time gains an actor-relative reading | §1 note | Editorial |
| 0005 (layer) | Projections range over the whole world | §1, §3, §5 | **Normative (narrow)** |
| 0006 (interaction) | The viewer sees everything; Author is unbounded; AI shares total context | §1, §7, §8, §10 | **Normative** |
| 0007 (twin) | One twin boundary for all comers | §2, §7, §8 | **Normative (narrow)** |

Details:

- **RFC-0000 — Vision and Design Principles.** *Assumption changed:* the problem statement speaks of "the person who runs the farm" and §2.3's embedded-AI argument assumes one viewer and one shared context. *Revisions:* (normative, narrow) add the plural-operation acknowledgment — the world is one, its operators are many, and every principle is to be read under many scoped projections; execute RFC-0001 §6's pending amendment (world content is spatial; agency may originate outside it). (Editorial) re-voice §1 from "the operator" to "the organization and its many hands." The five principles themselves survive unamended — none presumes a single user, which is why the insertion is possible at all.
- **RFC-0001 — Core Ontology.** *Assumption changed:* Actor admitted but unstructured; sharing unconceived. *Revisions:* (normative) §3.4 gains membership, delegation, dual attribution, and by-Event structural change; §4 gains the six challenge-log rows of §6 above; §6's Actor-versus-Spatial-First discussion updated to point at RFC-0000's executed amendment. The four primitives and both dimensions are untouched.
- **RFC-0003 — Spatial World Model.** *No changed assumption.* Geometry, the shared frame, derived relationships, and visibility are all actor-independent facts about the world. Renumbering only. (Visibility's *consumer* becomes scoped, but that is RFC-0005/0006's text, not this one's.)
- **RFC-0004 — Temporal Model.** *No structural change.* (Editorial) §1 gains a note that knowledge time now supports actor-relative readings — "what could this Actor have known on Monday?" is derivable from grant history plus knowledge times — strengthening, not altering, the bitemporal case.
- **RFC-0005 — Layer Model.** *Assumption changed:* "a filter over the one world" becomes "a filter over the Actor's accessible sub-world." *Revisions:* (normative, narrow) §1 scope definition and §3's presented-content intersection each gain the access bound as a third term; §5's unification extends — scope, filter, layer are one operation in three roles (imposed, chosen, named). "Layers compose without reconciliation" (§2) survives per-viewer unchanged.
- **RFC-0006 — Map Interaction Model.** *Assumption changed:* the View's spatial scope resolves against everything; Author appends anywhere; "the AI sees what you see" floats on a shared total world. *Revisions:* (normative) §1 — the View is a *scoped* projection, its owner an Actor; §7 — the viewer/AI shared frame is the intersection of two scoped contexts, and the "AI knows what the View hides" question inherits an access dimension (what the AI *may* surface, not merely what it *does*); §8 — Author operates within granted scope; promotion and grant land as sibling gates; §10 — the collaboration flag is answered by reference to RFC-0002, with co-presence remaining open there.
- **RFC-0007 — Digital Twin Model.** *Assumption changed:* "the twin" is presented as one whole equally available to any reader. *Revisions:* (normative, narrow) §2 — the twin remains one, but every Actor holds a scoped projection of it; the boundary section gains the access dimension alongside the promotion gate; §7 — the twin's self-knowledge of ignorance is actor-relative (an Actor's blind spots include what they are not permitted to see — and the *existence-vs-content* distinction lands here); §8 updated accordingly. "One twin, many scoped readings" is the sentence the revision must land.

---

## 10. Risks

1. **Predicate-scoping must be made sound against derivation — the load-bearing risk.** The architecture's superpower is that relationships, visibility, and state are *derived* from the whole world (RFC-0003 §5, and everywhere since). A scoped projection must therefore scope the *derivations*, not just the elements — and absence itself can leak: a gap in an Actor's coverage map, an adjacency that computes strangely around an excluded thing, an ignorance-map (RFC-0007 §7) that outlines a hidden object by its silhouette. If predicate-scoping cannot be made leak-sound, per-object grain becomes the only enforceable unit and Resource comes creeping back as mechanism. This is the review's biggest bet, named plainly.
2. **Revocation cannot reach memory.** Append-only history means what an Actor saw while granted may have been noted, exported, or simply remembered. The model must promise *no further projections*, never retroactive secrecy — and the new RFC-0002 must say so explicitly, or the platform will be sold as promising what no architecture can deliver.
3. **Scope-based sharing is architecturally right and UX-unproven.** Users arrive trained on "share this file." The degenerate single-identity scope must be as effortless as Docs sharing, or the native model will be experienced as enterprise-grade complexity — the precise feel the sponsor forbade. (Mitigation: sharing *by drawing on the map* is more intuitive than any ACL dialog; this is an opportunity wearing a risk's clothing.)
4. **Delegation chains can diffuse accountability.** "AI, for the consultant, for the agronomist, for the farm" is recorded — but recorded diffusion is still diffusion. RFC-0002 must decide whether chains attenuate powers and how responsibility reads at each link.
5. **Grant-state-as-projection is conceptually heavy.** Every access check is conceptually a history projection. Materialization is mechanism (fine, deferred) — but *reasoning* about access in every future RFC now requires temporal thinking. The cost of elegance is cognitive, perpetual, and worth watching.
6. **Renumbering churn.** External references to old numbers break; two of the sponsor's requested titles were changed by this review. Both are one-time costs, cheapest now; git history and this document are the audit trail.
7. **Decisions here bind two unwritten RFCs.** This review fixes the model before RFC-0002 and RFC-0008 are drafted; drafting may surface contradictions. The review should be read as *binding intent, revisable by the drafts through explicit amendment* — RFC-0000 §3's deviation rule applies to reviews too.

---

## 11. Deferred decisions

To RFC-0002 (Actors, Access & Collaboration): the frozen enumeration of Powers; discoverability semantics (whether an Actor may know a thing *exists* without seeing its content — existence-visibility as a distinct power); default scopes within an organization; delegation-chain attenuation; co-presence (two Actors, one View); the formal status of promoted apparatus (saved Views, named layers — world content or governed apparatus?); cross-organization collaboration (landlord and tenant on one field — two owners of overlapping scopes over shared world content); whether grants may carry conditions (time-bounded engagements, season-scoped access).

To RFC-0008 (Content & Grant Lifecycle): ownership transfer semantics; duplication (what copying means in a reference-based one-world model — likely: nothing, and the RFC must say why); archival-as-visibility-state; the interaction of retraction Events with previously-scoped readers.

To later RFCs: simultaneous-supersession contention (mechanism, RFC-0013+); anonymized cross-organization aggregation (benchmarking — touches RFC-0009 and RFC-0011); enforcement of all of the above (pure mechanism, RFC-0012+).

---

## 12. Self-review

**Did the series' aesthetic dictate the verdicts?** The gravest suspicion first: this review rejects both proposed primitives, preserving the series' cherished "no new primitives" streak — exactly what motivated reasoning would produce. The defense is that both rejections rest on failures of RFC-0001's admission tests that can be checked independently (Identity fails distinctness against Actor's own §3.4 text; Resource fails domain-nativity by its own definition-by-platform-verbs), and that the review *did* accept everything else the sponsor asked for: collaboration as foundational, two inserted RFCs, renumbering, and normative amendments to four documents including the constitution. The streak survived because Actor was genuinely built for this in RFC-0001 — but a reviewer who finds the admission tests themselves too strict should discount both verdicts together, not separately.

**Is the Scoped Grant model elegant beyond its evidence?** Access-as-projected-Events is beautiful and untested. Risk 1 (derivation leakage) is not a footnote — if scoping derivations proves unsound, the model's unit of enforcement collapses to the object, and this review's central rejection collapses with it. The honest status of the Scoped Grant model is *the best-fitting conjecture given the frozen commitments*, not a proven design. RFC-0002's drafting is the experiment; this review has only stated the hypothesis sharply.

**Was the three-way comparison fair?** Approach 2 was dispatched in five sentences, partly because the sponsor's own framing pre-condemned it ("bolted on"). A stronger steelman: domain-specific collaboration semantics can encode domain *safety* (only certified applicators may author spray Events) that a uniform model must express awkwardly as scope-plus-power vocabulary. The review's answer — such rules are authorship constraints within the uniform model, not a second access regime — is right, I believe, but the steelman deserved the sentence it gets only here.

**Should the new material really sit at RFC-0002, ahead of space and time?** Placing access before the dimensional RFCs implies agency-structure is more fundamental than geometry — arguably backwards for a Spatial-First platform, and it forces two timeless documents to be renumbered. The alternative (append as 0007/0008, no renumbering) was rejected because reading order is teaching order: every projection downstream of 0002 can now inherit "taken by an Actor, within scope" instead of retrofitting it. But the renumbering cost is real, the placement judgment is contestable, and the sponsor should ratify it deliberately.

**Two unwritten RFCs now carry this review's weight.** The review resolves questions (Identity, Resource, the model) but *creates* a dependency: six documents' revisions (§9) reference RFC-0002's not-yet-frozen content. If RFC-0002's drafting overturns any §5 decision, §9's revision list is stale on arrival. Sequencing recommendation: draft RFC-0002 *before* executing any §9 revision; treat this review as input to that draft, not as settled law above it.

**What the review did not evaluate.** Real-time co-editing mechanics, offline/partition behavior, and adversarial threat modeling (a malicious contractor with author power can pollute the record — append-only means visible pollution, not prevented pollution) were all out of conceptual scope but are named here so their absence is a decision, not an oversight. The threat model in particular deserves a review of its own once RFC-0002 exists.

**Overall.** Highest confidence: the rejection of Identity (three independent grounds, one fatal on naming alone) and the diagnosis of the omniscient viewer (checkable against specific sections). Lowest confidence: that predicate-scoping survives derivation leakage (Risk 1), and the RFC-0002 placement. If this review is wrong, it is most likely wrong where it is most confident of its taste — the refusal of Resource — and the named revisitation condition (apparatus demanding its own regime) is the tripwire to watch. Stated plainly, so the drafters of RFC-0002 and RFC-0008 know exactly which claims they are load-testing.

---

*This review finds the architecture sound and the concern real: four primitives suffice, one assumption falls. The world stays single; its viewers multiply; access becomes history like everything else. RFC-0002 — Actors, Access & Collaboration — is now the most important unwritten document in the series.*
