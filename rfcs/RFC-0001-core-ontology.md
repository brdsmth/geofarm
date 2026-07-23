# RFC-0001 — Core Ontology

| | |
|---|---|
| **RFC** | 0001 |
| **Title** | Core Ontology |
| **Status** | Draft |
| **Author** | Bradley |
| **Created** | 2026-07-23 |
| **Depends on** | RFC-0000 |
| **Supersedes** | — |
| **Superseded by** | — |

---

## 0. Purpose and method

RFC-0000 established the philosophy. This document does one thing: it discovers the **smallest set of primitives** with which the entire agricultural intelligence platform can be described, and it freezes their names.

A frozen vocabulary is worth more than a complete one. Every word admitted here becomes a word that every future RFC, every conversation, and every model must use consistently. So the bar for admission is deliberately hostile. The method is subtraction, not collection:

1. **List every noun** the domain seems to demand — farm, field, sensor, layer, observation, recommendation, document, and so on.
2. **Challenge each one.** A noun survives only if it is *irreducible*: it cannot be expressed as a combination, projection, or special case of something already admitted.
3. **Merge on structural identity.** If two nouns differ only in what they *mean* and not in how they *behave* — same lifecycle, same relationships, same responsibilities — they are one primitive wearing two labels. Merge them.
4. **Reject on implementation provenance.** If a noun exists only because some future mechanism will need it — a table, an interface, a rendering surface, a connector — it is not a primitive of the domain. It is deferred to the RFC that owns that mechanism.

The result is intended to be *frozen*. Later RFCs may build enormous structures on these words, but they may not quietly add new primitives to this layer without amending this document in the open.

This RFC defines no tables, no interfaces, no surfaces, and no mechanisms. It defines only concepts and the relationships among them.

---

## 1. What qualifies as a primitive

A primitive must satisfy all three tests:

- **Irreducible.** It cannot be reconstructed from the other primitives. If it can, it is a *composition* and belongs to a later RFC, not here.
- **Distinct in responsibility.** It carries responsibilities no other primitive carries. If its responsibilities are a subset of another's, it is a *classification* of that other, not a peer.
- **Domain-native, not mechanism-native.** It exists because the farm exists, not because a future component will need somewhere to put it.

Anything failing a test is recorded in the challenge log (§4) with the reason, so the reduction is auditable rather than asserted.

---

## 2. The two dimensions are not primitives

RFC-0000 made space and time coequal grounds of the model. It is tempting to promote them to primitives — *Geometry*, *Location*, *Time*, *Timestamp*. We do not.

**Space and time are the dimensions every primitive is embedded in, not primitives themselves.** They are the coordinate system, not the nouns. Every primitive below has a place and a time *intrinsically*, the way a physical object has a position — not by holding a reference to a separate "Location" object. Promoting the axes to primitives would invert the philosophy: it would make position a thing you attach, rather than a property everything already has.

This is the first and most consequential rejection, and everything else follows from it. *Where* and *when* are not members of the vocabulary. They are the space the vocabulary lives in.

---

## 3. The primitives

Four primitives survive the reduction:

> **Entity** · **Event** · **Assertion** · **Actor**

Informally: the **nouns** of the world (Entity), the **history** of the world (Event), the **conclusions** about the world (Assertion), and the **agency** that owns, changes, and interprets it (Actor). Everything a farm contains, everything that happens to it, everything anyone concludes about it, and everyone involved — maps onto exactly one of these.

---

### 3.1 Entity

**Definition.** An Entity is a thing that exists at a place and persists through time. It is a stable identity that the rest of the model can refer to and attach meaning to. A field, a building, a machine, a sensor, an irrigation system, a fence, a management zone, and the farm itself are all Entities. So is an organization *when we speak of it as a located extent* rather than as an agent (see §3.4).

**Responsibilities.**
- To provide **persistent identity** — a continuous subject that remains "the same thing" while its attributes change. The northwest field is the same field across every season even as its crop, boundary, and health change.
- To occupy **space**. Every Entity has an extent, whether a point, a line, an area, or a volume. This is intrinsic, per §2.
- To be the **subject** that Events happen to and that Assertions are about. Entities are what the model *points at*.
- To **compose** with other Entities — a farm contains fields, a field contains a management zone, an irrigation system spans several fields.

**What it is NOT.**
- **Not its current state.** An Entity's mutable attributes (this field's crop, this machine's location today) are a *projection* of the Events about it, not part of the Entity itself. The Entity is the enduring identity; the state is what the history has done to it. (This tension — whether Entity is therefore just a fold over Events — is interrogated in §6.)
- **Not an event.** An Entity does not *happen*; it *is*. A harvest is an Event; the combine that performed it is an Entity.
- **Not a class or category.** "Tractor" is a classification; *this* tractor is an Entity. The vocabulary names individuals, not types.
- **Not defined by economic value or function.** An "asset" is just an Entity we happen to own and value. No separate primitive is warranted (see §4).

**Relationships.**
- **Entity ⟷ Entity:** composition and spatial relation (containment, adjacency, overlap). These relations are largely *derivable from position* — the payoff of Spatial-First — rather than declared.
- **Event → Entity:** Events reference the Entities they occur to or upon.
- **Assertion → Entity:** Assertions are made about Entities.
- **Actor ⟷ Entity:** an Actor may own or operate Entities; a single real-world thing (a machine) may be *both* an Entity and an Actor in different roles (see §3.4 and §6).

---

### 3.2 Event

**Definition.** An Event is a recorded occurrence at a place and a time. It is immutable and attributed to a source. A planting, a harvest pass, a spray application, a sensor reading, a captured satellite image, a rainfall, a maintenance action, a boundary correction, a fuel delivery — all are Events. An Event is the atom of history.

**Responsibilities.**
- To record that **something happened** — an action, a measurement, or a change — as a permanent, append-only fact. Per RFC-0000 §2.5, the farm *is* the running total of its Events; present state is a reading taken from them.
- To be **immutable**. An Event is never edited or deleted. A mistaken Event is corrected by recording a further Event, never by rewriting the first. This is what makes history preservable rather than aspirational (RFC-0000 §2.4).
- To carry its own **place and time** — where and when the occurrence happened. Events are spatial too: a harvest pass has a path, a rainfall has an extent. Space is not the exclusive property of Entities.
- To name its **source** — the Actor that caused or reported it — so provenance is intrinsic to every fact.

**What it is NOT.**
- **Not the current state.** An Event is a single occurrence, not the accumulated result of many. The result is a projection over Events, not an Event.
- **Not a claim or a conclusion.** An Event records *what a source reported occurred*. It does not assert that the world is a certain way, and it is never "wrong" in the way a claim can be wrong — a faulty sensor's reading is a faithful Event of a faulty reading. Interpretation of Events is the job of Assertion (§3.3). This boundary is the load-bearing distinction of the whole ontology.
- **Not distinct from an "observation."** A measurement and an action are structurally identical — both are recorded, located, timed, sourced, immutable occurrences. Their difference is semantic classification, not primitive identity. Merged (see §4).
- **Not editable, ever.** Mutability would collapse the temporal model. Correction is addition.

**Relationships.**
- **Event → Entity:** an Event occurs to, upon, or about one or more Entities (a spray *on* a field, a reading *from* a sensor).
- **Event → Actor:** every Event is attributed to the Actor that is its source or cause.
- **Assertion → Event:** Assertions are derived from Events; Events are the evidence Assertions reason over.
- **Event → Entity (constitutive):** the sequence of Events about an Entity *is* the material from which that Entity's current state is projected.

---

### 3.3 Assertion

**Definition.** An Assertion is a claim about the world, produced by reasoning over Entities and Events, made by an Actor, located and timed, carrying a degree of confidence, and revisable. An interpreted NDVI reading, a disease diagnosis, a management-zone delineation, a yield estimate, and a recommendation are all Assertions. Where an Event says *what happened*, an Assertion says *what we conclude is true, or ought to be done.*

**Responsibilities.**
- To hold **derived meaning** — the output of interpretation, inference, or judgment — as a first-class, addressable thing rather than an ephemeral computation. Insight must be as durable and as located as the facts it rests on.
- To carry **provenance and confidence**. An Assertion knows what Entities and Events it was derived from, who or what made it, and how sure it is. This is what lets the platform keep measurement and inference from being confused — the central risk of any AI-native system.
- To be **revisable and supersedable**. Unlike an Event, an Assertion is a claim, and claims can be improved. A better interpretation supersedes an earlier one. Crucially, revision is itself recorded as history — superseding does not erase.
- To span **descriptive and prescriptive** claims. "This area is diseased" and "you should treat this area" are both Assertions; the difference between describing and recommending is a classification of Assertion, not a new primitive (interrogated in §6).

**What it is NOT.**
- **Not a fact of record.** An Assertion can be wrong, can be disputed, and can be replaced. It must never be mistaken for an Event. A yield *measurement* is an Event; a yield *estimate* is an Assertion.
- **Not a stored computation or a report.** The document that presents an Assertion, and the mechanism that computes it, are downstream. The Assertion is the claim itself.
- **Not general knowledge.** A universal agronomic fact ("aphids thrive in this temperature band") is not an Assertion about *this* farm. Where such knowledge lives is a genuine open tension with Spatial-First, examined in §6 — but it is not admitted as a farm-model primitive here.
- **Not a recommendation only.** Recommendation is one shape of Assertion (the prescriptive shape), not a peer primitive (see §4).

**Relationships.**
- **Assertion → Event / Entity:** an Assertion is *about* Entities and *derived from* Events (and possibly from other Assertions). Its provenance edges point back into the evidence.
- **Assertion → Actor:** every Assertion is made by an Actor — an agronomist, an AI agent, an external service.
- **Assertion → Assertion:** an Assertion may supersede or contradict another; the supersession relationship is what makes revision safe without loss.

---

### 3.4 Actor

**Definition.** An Actor is that which has agency in the model: it can own Entities, cause Events, and make Assertions. An organization, a person, an autonomously operating machine, an AI agent, and an external data source are all Actors. Where Entity answers *what exists* and Event answers *what happened*, Actor answers *who or what did it, reported it, or is responsible for it.*

**Responsibilities.**
- To be the **subject of agency and provenance** — the answer to "who owns this," "who did this," "who claims this," "where did this data come from." Every Event has an Actor as its source; every Assertion has an Actor as its author.
- To carry **ownership and responsibility** relationships that are not spatial and therefore cannot live on Entity alone.
- To unify **human, mechanical, autonomous, and external** agency under one concept, so that the AI's own Assertions, a satellite provider's data, and a farmhand's scouting note are all attributable in the same way.

**What it is NOT.**
- **Not necessarily spatial.** An external data source or a distant organization has agency without a farm location. This is the clearest reason Actor cannot simply be a kind of Entity, and it is the point of sharpest tension with RFC-0000's "everything has a place" — addressed in §6.
- **Not the same as the Entity that represents it.** A machine may be an Entity (a located thing on the map) *and* an Actor (the cause of a tillage Event). These are two roles of one real-world thing, not one primitive. The model relates them; it does not merge them.
- **Not a role, permission, or account.** How Actors authenticate or what they are allowed to do is a mechanism concern, deferred. Actor is the locus of agency, nothing more.

**Relationships.**
- **Actor → Entity:** ownership and operation ("this organization owns this farm," "this operator runs this machine").
- **Actor → Event:** source or cause of every Event.
- **Actor → Assertion:** author of every Assertion.
- **Actor ⟷ Entity (coincidence):** an Actor may be represented by an Entity when it also exists at a place; the two are related by role, never identified.

---

## 4. Challenge log: merged and rejected nouns

Every noun the domain suggested, and its disposition. This is the audit trail of the reduction.

| Noun | Disposition | Reasoning |
|------|-------------|-----------|
| **Organization** | → Actor (and Entity) | Its agency (owning, being responsible) is Actor; its spatial extent, when needed, is an Entity. Two roles, no new primitive. |
| **Farm** | → Entity | A located, persistent, composite thing. Nothing distinguishes it structurally from any other Entity except scale and containment. |
| **Field** | → Entity | Same as Farm. The archetypal Entity, but not privileged. |
| **Road, Pond, Building, Fence, Gate, Pivot, Sensor, Weather Station** | → Entity | All located, persistent things. Their differences are classification, not structure. |
| **Equipment / Machine** | → Entity (+ Actor) | An Entity when parked at a location; an Actor when it causes an Event. Coincidence of roles, not a primitive. |
| **Asset** | → Entity | "Asset" adds economic framing (ownership, value) to an Entity. Framing is not a primitive. |
| **Geometry / Location** | → dimension | The *where* of every primitive; an axis, not a noun (§2). |
| **Time / Timestamp / Season** | → dimension | The *when* of every primitive; an axis, not a noun (§2). A season is an interval, still not a primitive. |
| **Observation / Measurement / Reading** | → Event | Structurally identical to any other recorded, located, timed, sourced occurrence. Merged into Event. |
| **Satellite tile / Imagery** | → Event | A capture at a time over an area. Its raster nature is payload, a mechanism concern. |
| **Recommendation** | → Assertion | The prescriptive shape of a claim by an Actor. Merged into Assertion. |
| **Diagnosis / NDVI / Yield estimate / Zone** | → Assertion | Derived, confidence-bearing, revisable claims. Merged. |
| **Disease outbreak** | → Assertion | An inferred region — a diagnosis with spatial extent — not a recorded fact. |
| **Crop** | → Entity state (via Events) | What is growing in a field is a projection of planting/harvest Events onto the field Entity. Not a primitive. |
| **Document / Report / Photo / Contract** | → payload of Event or Assertion | The content that evidences or presents a fact or claim, not an independent domain concept. Borderline; re-examined in §6. |
| **Layer** | → deferred (projection) | A named, filtered selection of the world by classification and time. Fully derivable from the four primitives; belongs to the Layer Model RFC, not the vocabulary. |
| **View / Viewport** | → deferred (frame) | A composition of a spatial scope, a temporal scope, and a selection. It frames the vocabulary; it is not part of it. Belongs to the Map Interaction RFC. Re-examined in §6. |
| **Source / Provenance** | → Actor | The origin of an Event or Assertion is the Actor that produced it. |
| **Integration** | → rejected (mechanism) | A connector to an external system exists only because of implementation. Its *domain* residue is the external Actor it speaks for. |
| **Knowledge / Knowledge graph / Semantic model** | → the whole, not a part | The accumulated Assertions and their relationships. An emergent product of the model, not a primitive within it. General (placeless) knowledge is a separate tension (§6). |
| **World** | → rejected (empty frame) | The root container. Containment is an Entity⟷Entity relationship; the root needs no primitive of its own. |
| **Digital twin** | → the whole, not a part | The assembled model of all Entities, Events, and Assertions. The product, not a primitive. |
| **Relationship** | → intrinsic connective tissue | Promoting relationships to a primitive dissolves every other primitive into undifferentiated graph. Relationships are described per-primitive, not admitted as one. Re-examined in §6. |
| **Plan / Forecast** | → Assertion | A claim about a hypothetical or future state. The forward-looking shape of an Assertion. |

---

## 5. The frozen vocabulary

Four words. Every future RFC must use them as defined and must not introduce a fifth primitive at this layer without amending this document.

- **Entity** — a thing that exists at a place and persists through time; the stable identity the model refers to.
- **Event** — a recorded, immutable, located, sourced occurrence; the atom of history from which state is projected.
- **Assertion** — a located, revisable, confidence-bearing claim derived by an Actor from Entities and Events.
- **Actor** — that which has agency: owns Entities, causes Events, makes Assertions.

Embedded in two dimensions that are not primitives: **space** and **time**.

---

## 6. Self-review: should any primitive be merged or removed?

The task of a reduction is to be suspicious of its own result. Four is a satisfying number, which is itself a reason for suspicion. The following are the honest pressure points.

**Should Assertion merge into Event?** This is the most important question in the document. Both are located, timed, sourced, and carry a payload; on the surface they look like one primitive with a classification flag ("recorded" vs "derived"). I have kept them separate on a single behavioral difference: an Event is immutable and never wrong-as-recorded, while an Assertion is revisable and can be superseded because it is a *claim*. For an AI-native platform, conflating a measurement with an inference is the most dangerous possible error, and a vocabulary that makes the two the same word invites exactly that error at every layer above. I judge the separation worth its cost. But I hold this loosely: if a later RFC shows that immutability-plus-provenance can carry the distinction as attributes of a single primitive without inviting confusion, these two should merge, and this is the merge most likely to be correct. It is flagged as the primary open question.

**Should Actor merge into Entity?** Tempting, because on a farm most Actors (people, machines, the organization) are also located things. I have kept Actor separate because at least two important Actors — an external data source and the AI itself — have agency without a farm location, and because *agency* and *spatial existence* are genuinely different responsibilities that happen to coincide in some real-world things. If the platform ever decides that non-spatial agency can be modeled as an Entity with a null or abstract place, Actor could collapse into Entity. I have resisted that because it would weaken Spatial-First by normalizing placeless Entities (see next point). This merge is plausible but, I think, a mistake.

**Does Actor violate Spatial-First?** Yes, partially, and honestly. RFC-0000 said nothing enters the model without a place, yet an external data source is an Actor with no farm location. The resolution I have taken is that Actor is *agency*, not a thing *in the world* — the satellite provider is not on the farm, it acts upon the farm's model from outside — so it is not a counterexample to "everything *in the farm* has a place" so much as a reminder that agency can originate outside the modeled world. This is a real seam, not a clean fit, and RFC-0000 should perhaps be amended to say explicitly that *world content* is spatial while *agency* may originate outside it. I flag this for RFC-0000's next revision rather than papering over it here.

**Was Document wrongly rejected?** This is the closest rejection. A scouting photo, a soil lab report, and a signed contract feel like first-class things, and treating them merely as "payload of an Event or Assertion" may prove too thin — evidence has its own lifecycle (versioning, authenticity, retention) that neither Event nor Assertion obviously owns. I have rejected it because in every case I could construct, the document is the *content that evidences* a fact or claim rather than an independent domain concept, and admitting it risks reopening the door to a general "attachment" primitive that dissolves the discipline. But if a later RFC finds that evidence needs to be reasoned about independently of the facts it supports, Document is the fifth primitive most likely to earn admission. It is the leading candidate for un-rejection.

**Were Layer and View wrongly deferred?** RFC-0000 leaned heavily on both — layers as the organizing principle of the map, the viewport as the context that makes embedded AI possible. It would have been easy to promote them here. I deferred them because both are *compositions and projections* of the four primitives (a layer is a filtered selection by classification and time; a view is a spatial scope plus a temporal scope plus a selection), and admitting a composition as a primitive is precisely the error §1 forbids. The risk is that by deferring them I have hidden real vocabulary in later RFCs. I accept this risk because the test is structural, not aesthetic: if it can be built from the four, it is not a primitive, however central it is to the experience. Centrality to the *interface* is not membership in the *ontology*.

**Is "Relationship" being suppressed unfairly?** I chose not to admit Relationship as a primitive because doing so tends to dissolve every other primitive into an undifferentiated graph where nothing has intrinsic responsibility. But I concede the four primitives lean on relationships heavily — provenance, containment, supersession, ownership, coincidence-of-role — and a future RFC may need to name and constrain those relationships formally. That would be a *typology of relationships*, not the admission of Relationship as a peer of Entity, and it belongs to a later document.

**Is four too few — did the merges destroy real distinctions?** The aggressive merges (Observation→Event, Recommendation→Assertion, Asset→Entity, Source→Actor) each erased a distinction that some domain expert cares about. My defense is that every erased distinction was *semantic classification* rather than *structural behavior* — an aphid observation and a rainfall are the same *kind of thing that happened*, differing only in what they mean. Classification is expressible without new primitives. If any of these merges is wrong, it will show up as a primitive being asked to carry two genuinely different lifecycles at once; that is the signal to split it, and this document should be amended when that signal appears.

**Overall.** The set I am most confident in is Entity and Event — they are clearly irreducible and clearly distinct. The set I am least confident in is the Event/Assertion boundary, which I have drawn deliberately and would defend, but which is the one most likely to be revisited. If this ontology is wrong, it is probably wrong there. That is stated plainly so the next author knows exactly which seam to test first.

---

*This RFC freezes the vocabulary. The primitives are Entity, Event, Assertion, and Actor. RFC-0003 begins to give the spatial half of that vocabulary its structure — without adding to it.*
