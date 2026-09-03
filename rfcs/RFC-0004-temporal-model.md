# RFC-0004 — Temporal Model

| | |
|---|---|
| **RFC** | 0004 |
| **Title** | Temporal Model (Events & History) |
| **Status** | Draft |
| **Author** | Bradley |
| **Created** | 2026-07-23 |
| **Revised** | 2026-09-03 — Amendment 1 (per REVIEW-004 §6) |
| **Depends on** | RFC-0000, RFC-0001, RFC-0003 |
| **Supersedes** | — |
| **Superseded by** | — |

---

## 0. Purpose and method

The ontology is frozen (RFC-0001) and the spatial dimension now has structure (RFC-0003). This document gives the **temporal** dimension the same treatment RFC-0003 gave the spatial one: it takes time — declared a *dimension, not a primitive* in RFC-0001 — and asks what the smallest coherent structure of that dimension is.

The method continues from RFC-0003, and so does a symmetry that will organize the entire document:

> RFC-0003 gave the world **one shared space**. This RFC gives the world **one shared history**.

That parallel is not decoration. Nearly every temporal question below is answered the way its spatial twin was answered: the dimension is single and shared, positions in it are absolute rather than relative to a parent, and *relationships within it are derived, never declared.* Where RFC-0003 found that containment and adjacency fall out of geometry, this document finds that timelines fall out of history.

This RFC adds no primitives to the ontology. It discusses no storage and prescribes no event-sourcing mechanism. Whether the present is kept materialized or recomputed on demand, whether history is journaled one way or another — those are mechanism, deferred. What follows is only the conceptual model of how the farm exists in, and moves through, time.

---

## 1. The two times every event carries

Before anything else, one distinction governs the whole temporal model, and most confusion about time in systems comes from collapsing it.

Every recorded occurrence sits at **two** points in time, not one:

- **Occurrence time** — *when it happened, or was true, in the world.* The rain fell Monday. The soil was as it was on the day the sample was cut. The boundary moved at the moment the survey took effect.
- **Knowledge time** — *when the model came to hold it.* The rain gauge reported Monday evening. The lab returned the soil result three weeks later. The survey was entered the following month.

For a live sensor these nearly coincide and the distinction seems pedantic. For a lab result, a backdated correction, or a season reconstructed from memory, they diverge by weeks, and the divergence carries meaning the model must not lose. A farm that learned on Tuesday that Monday's soil was depleted did not *know* on Monday; any faithful account of why it acted as it did on Monday depends on separating what was true from what was known.

Holding both times is what lets the model answer not only *"what was the farm?"* at a past moment but *"what did the model believe the farm was?"* at that moment. For an AI-native platform whose recommendations must be auditable — *why did you advise this, then?* — the second question is as important as the first. Both times are conceptual properties of every occurrence; how they are recorded is mechanism, deferred.

---

## 2. What an Event is

RFC-0001 defined Event and froze it: a recorded, immutable, located, sourced occurrence; the atom of history from which state is projected. This document does not redefine it. It gives its temporal structure.

> **An Event is the record of a single occurrence, fixed at its occurrence time, entered at its knowledge time, and never altered thereafter.**

Three things about its temporal nature:

- **An Event has temporal extent, not merely a timestamp.** Just as geometry comes in forms by spatial dimension (position, path, area, volume — RFC-0003 §3), an occurrence comes in forms by temporal dimension: an **instant** (a reading, a gate opening) or an **interval** (a harvest across six hours, a drought across weeks, a growing season). The model must not assume every Event is instantaneous, or it forecloses the extended occurrences that fill a farm's real history.
- **An Event is immutable once recorded.** What happened, happened; when it happened does not change. Our *knowledge* of it may grow — a later Event may correct or refine it — but the earlier record is never edited or removed. Correction is *addition*, never rewriting (RFC-0001 §3.2). This is the mechanism-free heart of "history is preserved" (RFC-0000 §2.4): the past is append-only.
- **An Event is descriptive or performative.** Some Events *report* the world without changing it (a reading, a capture, a scouting note). Others *act upon* the world and change it (a planting, a spray, a boundary edit). This axis — does the occurrence *describe* state or *effect* it — is the distinction the next section rests on. It is a classification of Event, not a new primitive; the ontology already settled that (RFC-0001 §4).

Temporal relationships between Events — before, after, during, overlapping — are, like their spatial cousins, **derived, not declared.** Order is read from the times; it is never stored as a fact about the Events. This is the temporal echo of RFC-0003 §5, and it recurs decisively in §9.

---

## 3. What an Observation is

The task asks for Observation specifically, and the ontology has already placed it: RFC-0001 merged Observation into Event as a classification, not a peer. This document honors that freeze and sharpens what the classification *is*.

> **An Observation is the descriptive classification of Event: a record of what a source perceived or measured about the world, which reports state without changing it.**

A sensor reading, a captured image, a soil-sample result, a scouting note — each is an Observation. It is an Event (recorded, immutable, located, sourced, dually timed) whose purpose is to *report* rather than to *act*. The performative Events — plantings, sprays, boundary edits, deliveries — are its counterpart: same temporal structure, opposite relation to the world.

The line that must stay bright is the one between **Observation and Assertion**, because both concern the state of the world and it is tempting to fuse them:

- An **Observation** is a *direct record from a source.* It is immutable and, as a record, never wrong: a faulty sensor's reading is a faithful Observation of a faulty reading. It says *"this source reported this value, here, then."*
- An **Assertion** is a *derived claim* (RFC-0001 §3.3). It is revisable and can be superseded: it says *"we conclude the world is thus,"* and a better conclusion replaces it. The water-stress *diagnosis* drawn from the reading is an Assertion; the reading itself is an Observation.

Temporally, this difference is exactly the difference between a *point in history that is fixed* and a *claim about the world that our growing knowledge revises.* An Observation, once recorded, is permanent. An Assertion changes as understanding improves — but, crucially, revision preserves history too (§5): superseding an Assertion adds a new one and marks the old superseded; it never deletes. Both the immutable record and the revisable claim live under the same discipline — the past only grows.

---

## 4. What changes over time, and what never does

This is the temporal model's center of gravity, and it has a clean answer.

**What never changes — the invariants:**

- **Identity.** The persistent handle from RFC-0001 and RFC-0003 §4. A field is the same field across every season, every boundary edit, every change of crop and owner. Identity is not a function of time; it is the axis along which time is measured for a thing.
- **The recorded past.** Every Event, once entered, is fixed at its occurrence time. What happened, and when it happened, are immutable. Our account of the past may *grow* — corrections and late-arriving knowledge are added — but nothing already recorded is unmade.

**What changes — the derivative:**

- **State.** Everything we would call the "current" condition of a thing — its geometry (RFC-0003), its crop, its health, its ownership — is *not stored as truth and mutated.* It is **projected**: computed by taking the immutable Events that reference the thing and folding them forward to a chosen moment. "The field's current crop" is the result of projecting its planting and harvest Events up to now. Change the moment, and the projection changes; the Events do not.
- **Standing understanding.** The set of Assertions currently held is a projection too — the un-superseded claims as of a moment. It changes as new Assertions supersede old ones, while every prior claim remains in the record.

So the temporal model reduces to a single sentence:

> **The mutable present is a projection of the immutable past onto persistent identities.**

Nothing that is *real* — identity, recorded fact — changes. Only the *reading* changes, and it changes not because the past was altered but because more of the past accumulated, or because we chose to read it as of a different moment. This is why the farm can be viewed as it was at any point in its recorded life (RFC-0000's historical-imagery vision): pick a moment, project the Events up to it, and the state as-of-then reassembles itself. Whether that projection is precomputed or derived on demand is mechanism, deferred.

---

## 5. How history is preserved

History is not preserved by keeping a log *beside* the present. History is preserved by making **history the primary substance and the present its derivative** (RFC-0000 §2.5). There is nothing to overwrite because the present was never the stored thing.

Four conceptual commitments, none of them a storage scheme:

- **Append-only.** The record only grows. New occurrences are added; none are removed.
- **Immutable past.** No recorded Event is ever edited. A mistake is corrected by a further Event that supersedes or amends the first, and the correction is itself dated in both times (§1), so the model retains not just the right answer but the history of getting it right.
- **Reconstructable as-of any moment.** Because the present is a projection (§4), *every* past present is equally reconstructable — project up to that moment and stop. The farm has not one state but a state for every moment of its recorded life.
- **Bitemporal preservation.** Because every occurrence carries both an occurrence time and a knowledge time (§1), the model preserves two histories at once: how the *world* evolved, and how the model's *understanding* of the world evolved. Late-arriving knowledge revises the first without erasing the second.

Revision, corrections, and superseded Assertions are therefore not exceptions to preservation — they are *how preservation works.* The system that never overwrites is not the system that never changes its mind; it is the system that records every change of mind as a further, dated fact.

*(Amendment 1, per REVIEW-004 §4.4 — decided.)* One shape question the offline experiment forced: **a record supersedes at most one record.** When two Actors have corrected the same thing without hearing each other (RFC-0012 §5), the chain has two standing heads, and settling it takes two acts — a supersession of the head that stands and a retraction of the one that does not. A merge-shaped supersession, one record superseding several, is deliberately not admitted: a fork should be *visibly* settled, one decision per head, each separately revisitable, never quietly collapsed into a single act whose halves cannot be told apart later. Two acts is the honest cost, and it is small.

---

## 6. Can objects exist before events?

Yes — and answering otherwise is the most common way a temporal model goes wrong.

A naive event-sourced instinct says no: an object *is* the fold of its Events, so before its first Event it does not exist; existence begins with a "creation" Event. This document rejects that instinct, on the authority of RFC-0001 and RFC-0003 §4, which made **identity primitive, not derived.** An Entity is not merely the accumulation of its Events; it is a persistent identity that Events are *about.* Events need a subject to attach to, and the subject cannot be conjured by the first Event that references it — it must already be there to be referenced.

The deeper reason is that **the world precedes the record.** A field that has existed for fifty years enters the model today; it was real, and located, for decades before any Event in our history mentions it. To insist it did not exist until our first Event is to confuse *the thing* with *our knowledge of the thing* — precisely the collapse §1 forbids. Its existence lives in occurrence time (since long ago); our first record of it lives in knowledge time (today).

So the honest account is:

- An object's **existence in the world** may predate every Event in our history, without limit.
- An object's **appearance in the model** begins when it is first introduced — but that introduction is a knowledge-time event that may *backdate* the object's existence to a real past moment, or simply to "since before our records begin."
- What an object can never lack is **identity** — but identity is primitive and cheap, posited independent of any Event, not earned by one.

Objects can exist before events. Events do not create objects; they record what befalls objects whose identities the model already holds.

---

## 7. Can events exist without geometry?

Usually no, occasionally yes — and the exception is exactly the seam RFC-0001 §6 and RFC-0003 §1 already named.

An Event's relation to space takes one of three forms:

- **Intrinsic geometry.** The occurrence has a shape of its own: a rainfall's extent, a harvest pass's path, a drone flight's line. The geometry belongs to the Event.
- **Inherited geometry.** The occurrence has no shape of its own but happens *at* the things it references: a reading is located at its sensor, a spray at its field. Its "where" resolves through its references (by identity, per RFC-0003 §7), and may be the union of several (§8).
- **No geometry.** The occurrence has neither its own shape nor any spatial referent: an organization is renamed, a data feed lapses, an Actor's credential changes.

The third case is real but confined. It arises precisely when an Event concerns **agency rather than the world** — when it is about an Actor, which RFC-0003 §1 already exempted from geometry. Events *about the world* always have a place, intrinsic or inherited; only Events *about agency* may be placeless. This is not a new exception; it is the same crack running through the whole model wherever agency meets Spatial-First, inherited here rather than re-opened.

So: events can exist without geometry, but a placeless Event is a signal that the occurrence is not about the world at all.

---

## 8. Can events reference multiple spatial objects?

Yes, without qualification, and the fact that this needs asking exposes the flaw §9 corrects.

A single spray covers three fields. A boundary adjustment moves land *between* two fields and references both. A drone flight passes over a dozen. An ownership transfer references the farm (its subject) and two organizations (its Actors). One occurrence is routinely *about* many things and *by* one or more.

An Event therefore holds a **set of references** (RFC-0003 §7), by identity, of any size — the Entities it concerns and the Actors that caused or witnessed it. Its inherited geometry, when it has no intrinsic shape, is the union of its referents' geometries: the spray-on-three-fields is one Event over three areas, not three Events. There is no duplication, because the Event is one record pointing at several identities, not several records.

This has a consequence that the naive model cannot absorb: **an Event does not belong to any one of the objects it references.** The spray is not the first field's Event with copies filed under the other two. It is a single occurrence that concerns three fields equally and belongs to none of them. Which raises the question the whole document has been building toward.

---

## 9. Timelines do not belong to objects — time is first-class

Here the space/time symmetry completes, and here is the document's central claim.

The tempting arrangement — the one RFC-0000 §2.4 flagged and rejected — is that each object owns its timeline: a field *has* a history, a machine *has* a maintenance log, each thing carrying its own sequence of Events. It is intuitive, and it is wrong, for reasons §7 and §8 have already exposed:

- **Multi-object Events have no home.** A spray on three fields must be duplicated across three timelines or arbitrarily filed under one. Duplication violates single identity; arbitrary filing loses truth.
- **Between-object Events have no home.** Land moved from field A to field B belongs to the boundary between them, to neither timeline cleanly.
- **Objectless Events have no home.** An organization rename (§7) references no spatial object and so fits in no object's timeline at all.
- **The whole cannot be reassembled.** "What happened on this farm in April" would require merging every object's private timeline back together — laboriously reconstructing the single history that per-object ownership tore apart in the first place.

Every one of these is the same failure: **treating history as a property distributed across objects rather than as a dimension the objects share.** It is the exact mistake RFC-0003 refused in space — no thing carries its own coordinate system; all geometry lives in one shared frame, and spatial relationships are *derived* from it, never owned. Time is no different:

> **There is one history: the totality of Events across the whole world, ordered in the one shared time. Objects do not own timelines. An object's timeline is a *derived view* of the one history — the slice of it whose Events reference that object.**

"The field's history" is not something the field holds; it is a *query* — the projection of the single history filtered to Events that name the field's identity. "The farm's history" is the same history under a wider filter; "what happened in this region in April" is the same history under a spatial-and-temporal filter (§2, RFC-0003 §6). Multi-object, between-object, and objectless Events all have exactly one natural home — the one history — and every per-object and whole-farm question is a different lens on it. Nothing is duplicated; nothing is orphaned; nothing must be reassembled, because it was never divided.

This is the temporal completion of Spatial-First. RFC-0003: one shared space, relationships derived. RFC-0004: one shared history, timelines derived. Space and time are the two coequal dimensions RFC-0000 promised — and in both, the dimension is single and shared, and everything relational within it is a projection, never a possession. Time is not an attribute of objects. **Time is a first-class architectural concern**, the second axis the whole world is embedded in.

---

## 10. The frozen temporal model

Symmetric with RFC-0003's spatial summary.

- **Assumption — one shared time.** A single timeline in which every occurrence is placed and against which any two are ordered. Every occurrence carries two positions in it: **occurrence time** (when it was true in the world) and **knowledge time** (when the model came to hold it).
- **Structure — the Event in time.** An Event is a recorded occurrence with temporal extent (instant or interval), immutable once entered, and either descriptive (an Observation, reporting the world) or performative (acting upon it). Temporal relationships — before, during, overlapping — are derived from the times, never declared.
- **Invariant — identity and the recorded past.** Neither changes. The past only grows.
- **Derivative — the present.** State is the projection of the immutable Events onto persistent identities, as of a chosen moment. Every past present is equally reconstructable.
- **History is preserved by construction.** Append-only, immutable past, correction-by-addition, bitemporal — the world's evolution and the model's understanding of it, both retained. A record supersedes at most one record; a fork is settled one head at a time (Amendment 1).
- **One history, not many.** Time is first-class. Objects do not own timelines; an object's timeline is a derived filter of the single shared history.

Objects may exist before any Event (the world precedes the record). Events about the world always have a place, intrinsic or inherited; only Events about agency may be placeless. An Event may reference any number of objects and belongs to none of them.

---

## 11. Self-review

The reduction, interrogated.

**Is bitemporality (§1) an over-commitment — is it smuggling in mechanism?** Distinguishing occurrence time from knowledge time is the heaviest idea in this document, and a reader could reasonably call it premature: many farm facts have coincident times, and carrying two everywhere may be complexity the domain rarely exercises. I have kept it because the cases where the two diverge — late lab results, backdated corrections, auditability of past advice — are exactly the cases an AI-native platform must not fumble, and a model that admits only one time cannot represent them at all, at any later date, without being rewritten. It is conceptual, not a storage scheme, so it stays. But it is the idea most likely to be accused of front-running a need, and if the platform never once separates the two times, §1 was ballast.

**Does the space/time symmetry force a false parallel?** The document leans hard on "one shared space ↔ one shared history," and symmetry is seductive in a way that can paper over real differences. Space is reversible and navigable in all directions; time has an arrow, an asymmetry between a fixed past and an open future, and a "now" that space has no analogue for. I have used the symmetry only where it genuinely holds — single shared dimension, absolute rather than relative positions, derived rather than owned relationships — and the asymmetries (the arrow of time, the openness of the future, the privileged "now" of projection) appear precisely where the parallel would otherwise mislead. But a later RFC handling forecasts and plans will strain the symmetry hardest, because the future is where time stops resembling space, and §9's tidy "one history" will have to accommodate claims about moments that have not occurred.

**Is "objects can exist before events" (§6) in tension with the projection model (§4)?** §4 says state is projected from Events; §6 says objects exist before any Event. If an object has no Events yet, projecting its state yields nothing — so in what sense does it exist? The resolution is that *identity* precedes Events while *state* is projected from them: a just-introduced object with no history has a firm identity and an empty (or backdated) state, which is exactly right — we know *that* it is, and not yet much about *what* it is. I am satisfied this holds, but it depends entirely on identity being primitive rather than event-derived, and if a future RFC ever weakens that, §6 collapses.

**Did merging Observation into Event (honoring RFC-0001) cost real fidelity here?** §3 keeps observations and actions as two classifications of one Event. The temporal model actually stresses this merge harder than RFC-0001 did, because a descriptive Event (reports state) and a performative one (changes state) have genuinely different relationships to projection — one is evidence to fold in, the other is a change to apply. A reader could argue that difference is large enough to warrant two primitives after all. I still think it is a classification, not a split, because both are immutable dually-timed records referencing identities, and the descriptive/performative difference is in how a *projection* reads them, not in what they *are*. But this is the merge most worth re-examining if projection logic ever finds the two irreconcilable.

**Is "the present is a projection" a storage claim in disguise?** I have insisted this is conceptual and deferred materialization to mechanism, but the line is thin: "project the immutable Events onto identities" reads a great deal like a prescription for how to compute state, which edges toward the event-sourcing implementation the task excludes. My defense is that the claim is about *what the present is* (a derivative of history) not *how it is produced or kept*, and a system could honor it while materializing state aggressively or not at all. But §4 and §5 are where an implementer will most want to read architecture into philosophy, and the boundary deserves the explicit guard I have tried to give it.

**Does first-class time (§9) leave per-object history too weak?** By making an object's timeline a derived filter rather than a possession, I may have made the most common real query — "show me this field's history" — sound second-class, a mere projection of something grander. In practice it is the query users run most. I am confident the architecture is right (ownership fragments history and cannot absorb multi-object and objectless Events), but the document should not be read as deprioritizing per-object views; they are first-class *experiences* built on a first-class *history*, and the distinction between a derived view and an unimportant one must not be blurred. This is a framing risk, not an architectural one, but worth naming.

**Overall.** The claims I am most confident in are the invariants (§4) and first-class time (§9) — both are clean, both complete a symmetry with RFC-0003 that has independent force, and both fall directly out of commitments already frozen. The claim I am least confident in is bitemporality (§1): it is either the most important idea here or the most over-built one, and which it is depends on how often the platform's real history separates what was true from what was known. If this temporal model is wrong, it is probably wrong there. Stated plainly, so the next author knows which stone to turn first.

## 12. Amendment log

| Amendment | Date | Authority | Changes |
|---|---|---|---|
| 1 | 2026-09-03 | REVIEW-004 §4.4, §6 (adopted after milestone M8) | §5: decided that a record supersedes at most one record — no merge-shaped supersession. Settling a fork is a supersession plus a retraction, two visible acts. The record envelope (RFC-0013 §1, `supersedes: Id`) already had this shape; it is now a decision rather than an accident. §10 restated accordingly. |

**User Experience Implications (Amendment 1).** *Projection:* "Two people redrew this line — both are kept until someone settles it," and settling is picking the line that stands and saying the other one is withdrawn. *Concealment:* chains, heads, and linkage are invisible. *Leak check:* no internal term surfaces. *Wholeness:* a farm where nobody ever corrects the same thing twice at once never meets this clause.

---

*This RFC gives the temporal dimension its shape without adding to the vocabulary. With space (RFC-0003) and time (RFC-0004) both structured, the world is fully placed and dated; the RFCs that follow turn from what the world **is** to how it is **selected, layered, and reasoned over**.*
