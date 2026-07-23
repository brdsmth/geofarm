# RFC-0015 — Rendering Pipeline

| | |
|---|---|
| **RFC** | 0015 |
| **Title** | Rendering Pipeline |
| **Status** | Draft |
| **Author** | Bradley |
| **Created** | 2026-07-23 |
| **Depends on** | RFC-0003, RFC-0005, RFC-0006, RFC-0007, RFC-0012, RFC-0014 |
| **Supersedes** | — |
| **Superseded by** | — |

---

## 0. Purpose and method

The map is the application (RFC-0000 §2.2), which makes rendering the platform's most consequential mechanism-adjacent layer: everything the series built is experienced through it. This document designs the **rendering architecture** — how a world of millions of placed, dated, sourced records becomes a fluid visual surface — without naming a graphics API, a library, or a technique. Those change every few years; what must not change is the architecture they implement.

The scale requirement shapes everything. Datasets will contain millions of spatial objects — seasons of imagery, years of telemetry, a decade of events — and no renderer draws millions of anything. The thesis that resolves this is the document's spine:

> **The renderer's work is bounded by attention, not by the world.** What is drawn is a function of the View — its extent, its scale, its time, its lenses — and of the screen's finite resolution, never of the world's size. A screen has room for a bounded number of distinguishable visual elements regardless of how much world stands behind them; the architecture's job is to make the work proportional to that bound. The world may grow without limit; the View cannot, and the renderer serves the View.

Every section below is one consequence of this thesis, built on machinery already frozen: visibility as a derived query (RFC-0003 §6), layers as lenses (RFC-0005), the three stores (RFC-0014), the watermark walk (RFC-0012), and — under the most pressure it will ever face — the claim/presentation line (RFC-0005 §7).

---

## 1. The Mark: what is actually rendered

The renderer does not render world objects. It renders **marks**:

> **A Mark is a visual element derived from world content through a lens's presentation intent: a symbol, a shape, a surface patch, a label, a trace.** Marks are the presentation-side twin of the lens — derived, disposable, re-derivable, and never authoritative (RFC-0014, law 2). The world contains no marks; the screen contains nothing else.

The relation between marks and world content is many-to-many by design, and this is the first half of the scale story:

- **One object may yield several marks** — the same field appears in the boundary lens, the yield lens, and a recommendation's subject outline: three marks, three lenses, one identity beneath.
- **One mark may present thousands of objects** — a cluster symbol standing for four hundred scouting events, a density surface summarizing a season of passes, a simplified boundary standing in for survey-grade geometry. Aggregation is what makes millions drawable: the mark count is screen-bounded even when the content count is not.

One contract makes this safe, and it is the rendering architecture's first law:

> **Every mark is answerable.** A mark carries its derivation — the identities it presents, or the projection that produced it — so that picking any pixel resolves to world content (RFC-0005 §4: you select things, never marks). **Selectability survives aggregation**: the cluster of four hundred resolves to its four hundred; the simplified boundary resolves to the field; the density surface resolves, at any point, to the records beneath that point. Nothing becomes unpickable by being summarized — a mark that cannot answer "what is here?" is malformed, exactly as an Assertion without evidence is malformed (RFC-0009 §5). The map stays an interface to the world only if every visible thing remains a door into it.

And one boundary keeps marks honest: aggregation and simplification are **presentation** — they redraw what is recorded; they assert nothing new (RFC-0005 §7). The moment a derived visual *makes a claim* (an interpolated surface presented as measured, a cluster styled as a diagnosis), it has crossed the line and must be an Assertion, authored and attributed, rendered like any other claim. The renderer is where that line is easiest to smudge and must be brightest.

---

## 2. Layer composition

RFC-0005 §2 proved layers compose without reconciliation because one world lies beneath all of them. The rendering architecture realizes that theorem as independence:

- **Each active lens yields an independent mark stream** — its projection, intersected with visibility and time, presented under its intent. No lens's rendering depends on another's content; the only shared inputs are the View's scope, scale, and temporal binding, which all streams read identically.
- **Composition is arrangement, not reconciliation**: ordering, blending, and prominence per the lens stack's presentation intents (RFC-0005 §1). Because streams are independent, they can be derived in parallel, cached separately (§6), updated at different cadences (equipment marks refresh by the second; terrain marks by the decade — RFC-0005 §6's rates), and toggled without touching each other.
- **Alignment is inherited, not achieved.** All marks derive from geometry in the one shared space, projected through the one View — so the boundary mark, the imagery mark, and the recommendation outline land registered *by construction*. There is no cross-layer registration step anywhere in the pipeline, which is RFC-0005's "nothing to reconcile" made mechanical.

---

## 3. Incremental updates: two axes of invalidation

A renderer's continuous question is *what must be redone?* The three-store model (RFC-0014) gives the answer an unusual cleanliness, because exactly two things can change, and they invalidate along different axes:

- **Attention changed** (the View moved): pan, zoom, scrub, toggle, select. The world is untouched; derivation parameters changed. Work: re-evaluate visibility for the new scope, re-derive marks whose presentation is scale- or time-dependent, retire marks that left the frame. Bounded by the screen, always.
- **Knowledge changed** (the Reading advanced): the walk delivered new records (RFC-0012 §4). Here the append-only architecture pays its rendering dividend: **the delta is exact and explicit.** The world is its own change log, so the renderer receives precisely the records admitted since its watermark — never a diff it must compute, never a mutated object graph it must reconcile. New content yields new marks; superseding content retires the marks of what it superseded; nothing else in the scene is touched. Update work is proportional to what was learned, not to what is shown.

The two axes never blur, because View and Reading are separate stores with separate semantics — and the renderer maintains no third source of change of its own (no simulation state, no authoritative scene graph; the scene is a derivation, law 2). Incrementality is not an optimization strategy here; it is the shape the inputs already have.

---

## 4. Visibility and level of detail: scale as meaning

**Visibility** was defined long before rendering existed to consume it: the set of things present within a region of interest (RFC-0003 §6), taken against the scoped Reading. The renderer consumes that query; it never maintains its own visibility state (law 2 — culling structures are caches that accelerate the query, never a second opinion about it). One inherited property deserves emphasis: **the renderer needs no access logic.** The Reading is pre-scoped by the sub-world rule (RFC-0002 §2.3); what an Actor may not see never reaches the pipeline, so there is no redaction pass, no permission check per mark, no way for a rendering bug to leak what was never present. Access enforcement upstream of rendering is not a convenience — it is the only place it can be airtight.

**Level of detail** is where rendering architecture usually turns into data-thinning trickery, and this model gives it a conceptual footing instead:

> **LOD is the scale-dependence of presentation intent.** RFC-0003 §3 established that which geometric form matters is a modeling choice — a road is a path when routing matters, an area when its footprint matters. Scale is the largest input to *what matters*: at continental extent a farm is a position; closer, an area; closer still, its fields, then its equipment, then individual events and samples. Zooming does not "load more data" conceptually — it changes what is worth saying about the same world, and the marks follow.

Three disciplines keep LOD honest:

- **Aggregate, don't omit.** Content beyond the current scale's density budget is presented in summary (clusters, surfaces, counts) rather than silently dropped — the no-silent-caps principle: an empty-looking region must mean *empty*, not *unrendered*. Sparsity on screen must be trustworthy, because the twin's honesty about its own coverage (RFC-0007 §7) is only as good as the surface that displays it.
- **Selectability survives** (§1): every aggregate resolves to its members.
- **Simplification declares itself at the margin.** A generalized boundary is an approximation; at scales where the approximation could mislead (survey-adjacent zooms), true geometry replaces it. Simplification is presentation and must never harden into a claim about where the line is.

---

## 5. Streaming: honest partiality

At this scale nothing arrives whole. Two streams feed the pipeline, both already conceptualized:

- **The knowledge stream** — the walk itself (RFC-0012 §4): world content arriving as the Reading advances, integrated incrementally (§3).
- **The detail stream** — content and derived presentation arriving *as attention demands it*: the portion of the sub-world resident in the client follows the View (RFC-0014 §8's partial Readings), and higher-fidelity geometry, imagery payloads, and finer aggregations arrive as scale and scope call for them.

The architectural rule for both is the same, and it extends RFC-0014's law 3 (never lie about authority) to the surface:

> **The renderer never pretends completeness.** A partially arrived world is rendered as what it is: present content shown, absent content honestly absent-or-pending, with incompleteness itself a first-class visual state — not a spinner hiding the map, but a map that is candid about its own edges. The Reading is honest about its watermark and its bounds; the surface inherits that honesty rather than papering over it with pretend-finished frames.

This is not a UX nicety; it is the twin's epistemics reaching the screen. A surface that renders half-arrived data as if final manufactures false confidence — the visual equivalent of a forecast admitted as a measurement (RFC-0011 §2). The pipeline's obligation is that *what the screen implies, the record supports.*

---

## 6. Caching: immortality by immutability

Cache invalidation is famously one of the two hard problems, and this architecture quietly dissolves most of it:

> **Every rendering cache is keyed by its derivation inputs — content-up-to-watermark, View parameters, presentation intent — and because content is immutable and append-only, a cached derivation is correct forever *for those inputs*.** Nothing it derived from can ever change; it can only be superseded by *more* content. Staleness is therefore not discovered by inspection or TTL guesswork — it is *announced*: the walk states exactly which new records arrived, and a cached derivation is stale precisely when new records intersect its scope, extent, and time window. Invalidation is a spatial-temporal intersection test against the delta, not a search.

Consequences worth naming: derived tiles, simplified geometries, aggregations, and composited stills are all *immortal-per-watermark* — reusable across sessions, shareable across viewers with identical scopes (same inputs, same value), and evictable purely by economy, never by doubt. Historical renderings never invalidate at all (the past only grows at its knowledge edges); only derivations touching the advancing frontier churn. And over it all stands RFC-0014's law, unweakened: **caches accelerate, never adjudicate** — a cached mark that could disagree with a fresh derivation and win has become a shadow scene graph, and the no-shadow rule is broken. The pick contract (§1) in particular must always answer from the Reading's truth, however the pixels were accelerated.

---

## 7. Animation: motion without invention

Two kinds of motion exist, and they inherit opposite disciplines:

- **Attention animation** — flying to a place, easing a zoom, gliding between saved Views: interpolation *between View values* (RFC-0014 §3). Pure presentation, consequence-free (first law of interaction), semantically empty: no frame of a camera flight says anything about the world. Unlimited license.
- **World animation** — the platform's signature promise (RFC-0000 §2.4): scrub the time control and watch seasons turn, boundaries move, equipment trace its passes, imagery flicker through a decade. Architecturally this is **a sequence of temporal re-projections** — the same projection machinery, sampled along the time axis (RFC-0006 §4's temporal panning, rendered). Every frame of world animation is a *true frame*: the world as-of that moment, drawn under the same rules as any still.

Between the true frames lies the delicate part: **smoothing.** Motion interpolated between records — equipment gliding between two telemetry pings, a boundary morphing between two surveys — is invented continuity: presentation, legitimate for visual coherence, but *asserting nothing*, and the pick contract keeps it honest: inspect the moving mark at any instant and it resolves to the actual records bracketing it, not to a fabricated in-between state. The line of RFC-0005 §7 in motion: smoothing that stays presentation is craft; smoothing that implies an unrecorded trajectory as fact is a claim without an author, and the pipeline must never mint one. Where an inferred trajectory is genuinely wanted — *where was the sprayer between pings?* — that is an Assertion for an Actor (likely an AI) to author, with confidence and evidence, rendered thereafter as the claim it is.

Animation, in both kinds, holds no store: frames are derivations in flight, and the three-store inventory (RFC-0014 §1) is undisturbed.

---

## 8. The frozen rendering model

- **Work is bounded by attention, not by the world** — the View's extent, scale, time, and lenses, against a finite screen, determine the mark budget; the world's size never does.
- **The Mark** — the derived visual element; many-to-many with content; disposable, never authoritative. First law: **every mark is answerable** — picking resolves to world content, and selectability survives aggregation.
- **Layer composition is arrangement** — independent mark streams per lens, aligned by construction, reconciled never.
- **Two invalidation axes** — attention (View changed; screen-bounded rework) and knowledge (Reading advanced; delta-bounded rework, with the delta exact because the world is its own log). No third source of change exists.
- **Visibility is consumed, not owned**; the pipeline is access-free because Readings arrive pre-scoped. **LOD is scale-dependent presentation intent**: aggregate rather than omit, resolve rather than orphan, declare simplification at the margin.
- **Streaming renders honest partiality** — incompleteness is a first-class visual state; what the screen implies, the record supports.
- **Caches are immortal per watermark** — invalidation is intersection with the announced delta; acceleration never adjudicates.
- **Animation**: attention animation is free; world animation is re-projection through time; smoothing is presentation under the pick contract and never mints an unauthored claim.

---

## 9. Self-review

**Is the Mark architecture or mechanism that leaked upward?** The Mark is this document's one new concept, and the challenge is fair: is a "visual element" not inherently implementation? The defense is that the Mark is defined entirely by *semantic* obligations — derivation provenance, answerability, the presentation/claim boundary — and not by any visual or technical property; it is the minimal named thing about which the pick contract and the aggregation rules can be stated at all. It is the lens's output made addressable, as the lens was the projection made nameable. But the concept sits closer to mechanism than anything else the series has admitted, and if a future implementation finds real renderers cannot maintain per-mark provenance at scale (answerability has a cost at millions-aggregated-to-thousands), the contract will be renegotiated under pressure — most likely weakening from *every mark resolves* to *every mark resolves within interactive latency*, which is a materially weaker honesty. Named as the first place performance will argue with principle.

**The screen-bounded thesis assumes aggregation is always meaningful.** "Work bounded by attention" holds only if content beyond the density budget can be *summarized* rather than dropped — and some content resists summary honestly: ten thousand overlapping paths have no aggregate that is not itself a new artifact; dense contradictory Assertions in one region cannot be clustered without editorializing about which claims cluster together. The aggregate-don't-omit discipline (§4) may, for some lenses, force a choice between an aggregation that quietly editorializes (drifting across the claim line) and an omission that quietly lies (breaking sparsity-trust). The document mandates the disciplines but has not proven they are always jointly satisfiable; the first lens that cannot satisfy both is the test case, and the honest fallback — *declared* omission, a visible "more than can be shown here" state — should probably have been specified normatively rather than left implicit.

**Smoothing's line is drawn finer than users will read it.** §7 distinguishes presentation-smoothing from implied claims by the pick contract — but users do not pick every gliding tractor; they *watch* it, and watched motion carries conviction regardless of what inspection would reveal. The architecture's answer (the record supports what the screen implies) is right and may still be insufficient against the psychology of animation, which implies more than any still frame does. This is the claim/presentation line's hardest terrain — RFC-0005 §11 predicted presentation would be where claims are smuggled, and animated presentation is its sharpest instrument. Visual design (out of scope here) inherits a real duty: motion styling must encode uncertainty (inter-record motion reading as *inferred*, not observed), and that duty is architectural in origin even though its discharge is aesthetic.

**Volumes remain unrendered.** RFC-0003 admitted volumetric geometry; RFC-0005 §11 conceded the layer metaphor creaks in three dimensions; this document quietly renders a planar world and never addresses volumetric marks, occlusion among stacked soil horizons, or what LOD means vertically. Deliberate — the platform's near-term world is effectively 2.5-dimensional — but the omission is now three documents deep, and if volumes ever matter, the composition model (§2, ordering and blending) is the section that will not survive contact, since ordering is exactly what three dimensions refuse to keep simple.

**What was deliberately not designed.** Graphics pipelines, tiling schemes, symbology, typography, and color are mechanism or design. Co-presence rendering (other viewers' cursors and Views) remains deferred with its state-model crack (RFC-0014 §8). And the density budget itself — how many marks a screen can carry before it stops communicating — is a perceptual question this document treats as a bound without naming its value; cartography has literature, and the first implementation should consult it rather than discover it.

**Overall.** Highest confidence: the two-axis invalidation model and watermark-keyed caching — both are the append-only architecture cashing checks it wrote nine documents ago, and both turn traditionally hard rendering problems into bookkeeping. Lowest confidence: the universal satisfiability of the LOD disciplines, and the Mark's answerability contract under real scale — the two places where this document's principles will first meet a profiler, and where the series' habit of letting architecture win arguments will face its most tempting counterexamples. If this RFC is wrong, it is wrong there — and the amendment, when it comes, must weaken the contract openly rather than let the pipeline drift into beautiful, unanswerable pictures. Stated plainly, so the first renderer knows which promises are the architecture and which are the paint.

---

*This RFC gives the platform its surface: marks that answer for themselves, layers that compose without meeting, updates shaped like the knowledge that caused them, caches that never doubt, and motion that never invents. The series now runs from philosophy to pixels with two interior documents still owed — persistence (RFC-0013) and the lifecycle (RFC-0008) — and one decision left: the first cut (RFC-0016).*
