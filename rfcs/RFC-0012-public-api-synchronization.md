# RFC-0012 — Public API & Synchronization

| | |
|---|---|
| **RFC** | 0012 |
| **Title** | Public API & Synchronization |
| **Status** | Draft |
| **Author** | Bradley |
| **Created** | 2026-07-23 |
| **Depends on** | RFC-0000, RFC-0001, RFC-0002, RFC-0004, RFC-0007, RFC-0009, RFC-0011 |
| **Supersedes** | — |
| **Superseded by** | — |

---

## 0. Purpose and method

The platform architecture is complete: a world placed, dated, sourced, scoped, connected, and reasoned over. This document designs the last conceptual boundary — **the interface the platform exposes to external systems**: what any outside consumer, from a manufacturer's backend to a mobile device in a signal-dead field, is architecturally *offered*.

The discipline is strict and stated first: **no endpoints, no transports, no protocols, no formats.** Those are mechanism, and worse — they are *fashion*: transports will change several times in this platform's life. What must not change is the contract underneath: what is addressable, what operations exist, what consistency means, how synchronization works, what offline is, and how the contract itself evolves. This document is that contract. Any transport that honors it is a valid realization; any that violates it is wrong no matter how well-designed its machinery.

The organizing claim closes a circle the series opened in RFC-0001:

> **The interface is the ontology.** The platform does not expose an API shaped by its features; it exposes the world, shaped by the four primitives, the two dimensions, and the scopes that bound every participant. An interface shaped by features churns with every feature. An interface shaped by a frozen vocabulary is as stable as the vocabulary — and the vocabulary was frozen seven RFCs ago, on purpose, partly for this moment.

---

## 1. There are no Resources — what is addressable instead

The task asks this document to determine "Resources," and the architecture's answer was fixed by REVIEW-001 and RFC-0002 §8.5: **there are none.** A resource-shaped interface — enumerable objects with per-object operations — would reintroduce at the boundary the container-thinking the model evicted everywhere else, and the boundary is exactly where the outside world's habits would most eagerly accept it. The refusal is therefore repeated here, where it is most under pressure, and replaced with what the interface actually addresses:

- **Identities.** Every Entity, Event, Assertion, and Actor has a stable identity (RFC-0004 §6), and identity is the interface's only permanent handle. An identity is not a resource: it has no operations "on" it, no representation that is *it*, and its attributes are projections that move with time. What an identity offers is exactly what a reference offers inside the model (RFC-0003 §7): a fixed way to say *which thing*, resolved to current knowledge on demand.
- **Readings.** Everything else a consumer receives is a **reading**: a projection of the world, parameterized by scope-and-filter (which content), time (as-of when — occurrence and knowledge both), and form (state, timeline, neighborhood, visibility-within-a-region). A reading is a *value* — reproducible from its parameters, never an object with a lifecycle. The View (RFC-0006 §1.3) already proved this shape: a description of how to look, yielding fresh content whenever re-taken. The interface generalizes it: **every question to the platform is a View-shaped value; every answer is the projection it denotes.**
- **Submissions.** The only thing a consumer can *give* the platform: candidate content offered for admission — Events, Entities, Assertions, and (being Events) Grants — under the admission contract of RFC-0011 §2: placed, dated, sourced, epistemically classified.

Identities to point with, readings to ask with, submissions to contribute with. Nothing else is addressable, because there is nothing else: the world and readings of it.

---

## 2. The two operations and the clock

Everything the interface can do reduces to two operations and one axis:

| Operation | What it is | What it subsumes |
|---|---|---|
| **Project** | take a reading: scope ∧ filter, as-of a time, in a form | every query, fetch, search, inspection, export, "list," and "get" |
| **Append** | submit attributed content for admission | every write, edit (supersession), delete (retraction), import, share (Grants are Events), and transfer |

And the axis: **knowledge time** (RFC-0004 §1) — the platform's record of when it came to hold each element. Following the world is not a third operation but a repeated first: *project what is new* — a walk along knowledge time (§4).

The reduction is not aesthetic minimalism; each absence is load-bearing:

- **There is no update and no delete**, because the world has neither (RFC-0004 §5). "Edit" is appending a supersession; "delete" is appending a retraction; both are Appends, and the entire class of lost-update, stale-write, and delete-race pathology is absent from the interface *by construction*, not guarded against by machinery.
- **There is no permissions API** (§6): granting, revoking, and delegating are Appends of Grant Events; access state is a Projection of grant history. The interface needs no third pillar for administration, because administration was never a separate kind of act.
- **There is no RPC vocabulary of feature verbs** — no "assign," "approve," "close," "archive." Every domain act is the recording of an Event or Assertion that *means* that act, projected thereafter by whoever needs its consequences. Features speak the vocabulary; the interface speaks the primitives (I8 of RFC-0002, enforced at the boundary).

A consumer that can Project and Append, and that tracks where it stands in knowledge time, can do everything any participant can do. That is the whole surface.

---

## 3. Consistency: monotonic knowledge

What may a reader assume about what it sees? The append-only, bitemporal world makes the answer unusually clean:

> **Every reading is the world as known up to a knowledge-time watermark.** A reading is never "the latest data" in the mutable sense — it is a *complete, honest account as of a stated moment of knowledge*: everything admitted by then (within scope), nothing admitted since, with every element's own dual times intact.

Three properties follow, and they are the interface's entire consistency model:

- **Monotonicity.** Successive readings advance the watermark; knowledge only grows. A consumer never sees the record un-happen: what a reading contained, every later reading contains (scope permitting). There is no "the row changed" — there is only *more history*, some of which supersedes.
- **No read-modify-write.** The mutable-state hazard — read, compute, write back, collide — cannot arise, because Append does not modify what Project read. Two consumers acting on the same reading append two attributed records; if their claims conflict, the conflict is *preserved and derived* (RFC-0009 §2), not silently resolved by write order.
- **Honest staleness.** A reading's watermark is part of the reading. "How current is this?" is answerable, displayable, and reasonable-over — the interface-level face of the twin's self-known ignorance (RFC-0007 §7). Consumers are never given a false present; they are given a stated past, as recent as their last walk.

What the interface deliberately does not promise: a universal instantaneous "now." Simultaneity across a distributed boundary is mechanism's struggle; the *contract* is only that each consumer's knowledge advances monotonically along a coherent watermark. That weaker promise is what any transport can actually keep — and it is all the model needs, because the model never depended on a global present (RFC-0007 §6: "current" is a reading, not a place).

---

## 4. Synchronization: the world is already a log

Synchronization systems exist to answer "what changed?" — and they are usually large, because mutable systems must *reconstruct* change from state (diffs, dirty flags, change-capture). This architecture dissolves the problem in one observation:

> **The world is already its own change feed.** An append-only history *is* the log that sync systems labor to derive. "Everything that changed since my watermark" is not computed — it is *read*: the records admitted since, within scope. Supersessions arrive as what they are (new records that replace standing ones); retractions likewise; there is no second representation of change to generate, version, or reconcile.

The consequences arrange themselves:

- **Catch-up is a projection.** A consumer returning after an hour or a season asks the same question: *project my scope, from my watermark forward.* The answer is complete by construction — including **backfill**: content about the deep past that arrived recently (RFC-0011 §4) appears in the walk at its knowledge time, which is exactly when this consumer could first have learned it. Synchronizing along knowledge time is what makes late-arriving history unproblematic; a sync keyed to occurrence time would miss it forever.
- **Scope shapes the feed.** Each consumer's walk is bounded by its sub-world (RFC-0002 §2.3): the feed *is* a scoped projection, so nothing outside an Actor's grants ever transits the boundary — not as data, not as tombstones, not as gaps that describe what they hide. A grant newly issued admits its scope's *existing* content into the next walk (the consumer's accessible world grew; its watermark walk delivers the difference); a revocation removes forward flow only, honestly (RFC-0002 §4.3).
- **Continuous and periodic following are the same act at different cadence.** A live telemetry consumer and a nightly accounting export differ in how often they walk, not in what walking is. "Push versus pull" is transport; the contract knows only the walk.

---

## 5. Offline: high-latency participation

Farms are where connectivity goes to die, so offline is not an edge case — and the architecture's answer is that **offline is not a mode.** An offline participant is an ordinary participant with a large gap between walks:

- **What it holds is a reading** — its scope, projected at watermark K: stale, and *honestly* stale (§3), with staleness displayable and reasoning-relevant. A device in a dead zone holds "the world as known Tuesday 06:14," which is a true thing, not a broken one.
- **What it authors is late-arriving knowledge.** Content recorded offline — scouting notes, measurements, operations — carries its occurrence time (when it happened in the field) and receives its knowledge time at admission (when connectivity returned). This is not a special reconciliation path; it is bitemporality doing precisely what RFC-0004 §1 built it for. The offline scout and the slow lab are the same case.
- **Reconnection is two ordinary acts**: Append the pending submissions; Project from the old watermark. No merge step exists, because there is nothing to merge: appends cannot collide (§3), and concurrent supersessions of the same claim — the one true race — degrade to *preserved, derived disagreement* (RFC-0009 §2), resolved by whoever next authors a reconciliation. Offline concurrency produces visible perspectives, never corrupted state; the worst case of a partition is some extra honesty to read on return.
- **One consequence is stated rather than hidden**: an offline device evaluates capability against grants as-of its watermark. A revocation issued after K cannot reach a device that has not walked since K; enforcement lags knowledge, necessarily, for at most the gap between walks. The architecture makes the lag *bounded, visible, and honest* (the device knows its own watermark) rather than pretending a disconnected machine can hear anything at all. This is RFC-0002 §4.3's no-retroactive-secrecy, met at its physical limit.

---

## 6. Permissions: the interface has none

The most consequential absence. The interface exposes **no permission system** — no roles, no ACL surface, no rights-management vocabulary — because the architecture solved access below the interface, once (RFC-0002), and the boundary merely inherits:

- **Every consumer is an Actor** (external Actors — RFC-0011 §1), and every operation is scoped by construction: Project answers within the caller's sub-world; Append admits within the caller's author-grants. There is no unscoped path to refuse; the sub-world rule *is* the enforcement semantics.
- **Denial mostly dissolves into absence.** Without the *discover* capability (RFC-0002 §3.1), what an Actor cannot reach is architecturally indistinguishable from what does not exist: a projection simply does not contain it, and no error need announce that there was something to hide. The classic boundary dilemma — does refusal itself leak existence? — is answered by the capability lattice, not by convention: *discover* draws exactly the line between "you may know it exists" and "for you, it does not."
- **Administration is participation.** Granting a partner access, delegating to an agent, revoking a contractor: all are Appends of Grant Events, subject to attenuation (I4), attributed, and historically queryable (T2). The audit trail of the boundary is the grant history itself.
- **Public access — the deferred question, answered.** RFC-0002 §8.11 deferred "a grant to anyone" to this document. Resolution: the model admits a distinguished **public Actor** — the indistinguishable everyone — which any unidentified consumer speaks as. What is public is exactly what has been granted to it: *discover* and *view* over deliberately published scopes (a road-facing boundary, a published advisory, an open dataset). One invariant makes the construction safe: **the public Actor cannot hold author.** Authorship requires attributable agency (I1, C5), and the indistinguishable everyone has none to attribute — anonymous contribution is not restricted-by-policy but *meaningless-by-construction*, since a record's provenance is part of what it is. The public may read what the world has chosen to show; only somebody may add to it.

---

## 7. Versioning: content and contract

Two different things version, and the architecture disposes of both without version numbers:

**Content does not version — it accumulates.** Every element is immutable; change is supersession; "versions of" a claim or a boundary are its supersession chain, already first-class (RFC-0004 §5, RFC-0009 §2). The interface therefore needs no content-version machinery at all: *identity + time is the version.* Any reading can be taken as-of any moment in either time axis; any element's revision history is a projection; nothing ever needs an ETag-shaped concept to protect it, because nothing can be overwritten (§3).

**The contract versions by RFC.** What can change is the conceptual interface itself — and its stability is inherited, not promised: the interface speaks the ontology (§0), the ontology is frozen (RFC-0001), and the constructs above it (scopes, grants, readings) are frozen by their own RFCs. Evolution is therefore:

- **Additive by default.** New content kinds, classifications, payload types, and reading forms extend the vocabulary's *usage* without touching its shape — the open-because-closed theorem (RFC-0005 §9) operating at the boundary: consumers built against the primitives are untouched by features they have never heard of, because features arrive as content, not as surface.
- **Breaking only by amendment.** A change to the primitives, the operations, or the invariants is an RFC-supersession event — deliberate, documented, and rare by construction, because the series was built to make the foundations the *last* thing that moves. The interface's version identifier, conceptually, is the RFC series itself.

---

## 8. The frozen interface model

- **No Resources.** Addressable: identities (permanent handles), readings (View-shaped values: scope ∧ filter, as-of, form), submissions (attributed candidate content). The interface is the ontology.
- **Two operations and a clock**: Project and Append, walked along knowledge time. No update, no delete, no permissions API, no feature verbs — each absence by construction.
- **Consistency is monotonic knowledge**: every reading is complete-as-of its watermark; knowledge only grows; staleness is stated, never disguised; no global "now" is promised or needed.
- **Synchronization is reading the log the world already is**: catch-up, backfill, live-following, and scope-bounded feeds are all the same knowledge-time walk at different cadences.
- **Offline is high-latency participation**: honest stale readings; offline authorship as late-arriving knowledge; reconnection = Append + Project; races degrade to preserved disagreement; enforcement lag is bounded and visible.
- **Permissions are absent because access is prior**: every consumer an Actor, every operation sub-world-bounded, denial dissolved into absence via *discover*, administration as Grant-appends, and a public Actor that may read what is published but can never author.
- **Versioning**: content accumulates (identity + time is the version); the contract versions by RFC amendment, additive by default, stable because the ontology is.

---

## 9. Self-review

**Is two-operations-and-a-clock real, or minimalism theater?** The reduction is honest at the conceptual level — every listed capability genuinely decomposes into Project or Append — but consumers do not live at the conceptual level, and mechanism will inevitably grow conveniences: compound readings, common query shapes, submission bundles, subscription sugar. The claim that must survive is not "implementations will have two calls" but "**every convenience is expressible as compositions of the two, and none carries semantics of its own**." The moment a convenience does something the two operations cannot express, the interface has grown a third operation in disguise, and this document has failed silently. That test is stated here so it can be applied to every future surface proposal.

**The watermark assumes more order than distribution may give.** §3 speaks of *the* knowledge-time watermark as if admission were a single well-ordered sequence. Real mechanism — multiple ingestion points, regions, replicas — may admit concurrently, and "the world as known up to K" may be only partially ordered underneath. The contract was worded to survive this (each consumer's *own* walk is monotonic and coherent; no global now is promised), but the single-watermark language leans on an idealization, and the persistence RFC (RFC-0013) inherits the duty of realizing a coherent per-consumer order without a global clock. If it cannot, §3 needs weakening from "complete as of K" toward "complete as of a coherent cut" — a real difference, flagged now rather than discovered later.

**The public Actor is load-bearing and thin.** §6 answers the deferred question in one construction, and the construction carries weight it has not yet been tested under: published scopes will need curation semantics (who may grant to the public Actor? presumably only owners, by ordinary attenuation — but stated nowhere normatively); aggregate publication (REVIEW-001's anonymized benchmarking) is *adjacent* to public access but not solved by it; and the cannot-author invariant, while clean, forecloses pseudonymous contribution (a public tip line for pest sightings) that a real platform might want — which would require identified-but-unverified Actors, a distinction between *attribution* and *authentication* this series has deliberately never drawn. The public Actor is right as far as it goes; how far it goes is genuinely untested.

**Offline enforcement lag will be read as a security hole.** §5 states plainly that a revoked device enforces revocation only at its next walk. This is physics, not negligence — no architecture reaches a radio that is off — but stating it honestly invites the response "then mechanism must add remote attestation, expiring readings, sealed caches," all of which are mechanism's prerogative and none of which change the conceptual bound. The risk worth recording is different: that mechanism, embarrassed by the honest lag, *pretends* otherwise — promising revocation semantics the physics cannot deliver. The contract's honesty is the feature; keeping mechanism honest to it is the ongoing work.

**Does "the interface is the ontology" over-couple the boundary to the vocabulary?** If the ontology ever moves (RFC-0001's §6 named its own most-likely amendments), the interface moves with it, and every external consumer feels a conceptual earthquake. The alternative — an interface decoupled from the ontology through a translation vocabulary — was rejected throughout this series as the drift-generating pattern (two representations, one truth). I stand by the coupling: it makes ontology amendments *appropriately* expensive, surfacing their true cost instead of hiding it in a translation layer that rots. But it does mean the freeze is now bearing commercial weight, not just conceptual weight, and future amendment debates will have external parties in the room. That is a consequence the series chose in RFC-0001 without knowing it; it is named here so it is chosen twice.

**What was not designed.** Rate, quota, and abuse (mechanism, with one conceptual hook: abusive authorship is *attributed* authorship — the record identifies its polluter, per REVIEW-001's threat-model note, which still deserves its own review); the shape of readings for very large payloads (rasters — mechanism); and identified-but-unverified Actors (above). Also deliberately absent: any notion of "session" — the walk's watermark is the only continuity a consumer needs, and statelessness of the boundary follows from readings being values.

**Overall.** Highest confidence: synchronization-as-the-log (§4) — it is the event-driven principle (RFC-0000 §2.5) cashing its largest check, and it dissolves what is ordinarily an entire subsystem into a projection. Lowest confidence: the tension between the two-operation purity and the conveniences real consumers will demand — not because the decomposition is wrong, but because holding the "no semantics in the sugar" line requires vigilance this document can mandate and not enforce. If this RFC is wrong, it is wrong there, or in the watermark's idealized order — both named, both testable, both assigned. Stated plainly, so the first transport built against this contract knows exactly which promises are load-bearing.

---

*This RFC closes the platform's outer boundary: a world offered whole — two operations, one clock, no resources, no permission surface, no lies about freshness or reach. What remains of the roadmap is interior machinery — persistence (RFC-0013), frontend state (RFC-0014), rendering (RFC-0015) — the MVP cut (RFC-0016), and the lifecycle document (RFC-0008) still owed at the heart of the series.*
