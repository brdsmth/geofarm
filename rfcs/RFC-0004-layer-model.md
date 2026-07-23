# RFC-0004 — Layer Model

| | |
|---|---|
| **RFC** | 0004 |
| **Title** | Layer Model |
| **Status** | Draft |
| **Author** | Bradley |
| **Created** | 2026-07-23 |
| **Depends on** | RFC-0000, RFC-0001, RFC-0002, RFC-0003 |
| **Supersedes** | — |
| **Superseded by** | — |

---

## 0. Purpose and method

RFC-0002 §8 deferred "Layer" to this document, with a verdict already half-written: a layer is *"a named, filtered selection of the world by classification and time, fully derivable from the four primitives."* It was denied primitive status there precisely so it could be given structure here without reopening the ontology.

This document keeps that promise. It defines the layer model and it adds **nothing** to the vocabulary. A layer is not a fifth primitive, not a container, not a place data lives. It is a *derived projection* — a lens — in exactly the sense that spatial relationships were derived in RFC-0002 and timelines were derived in RFC-0003. The pattern that has organized every RFC since RFC-0002 holds a third time:

> The world is single and shared. Everything relational, temporal, or presentational *about* it is a projection, never a possession.

Space is one shared frame; relationships are derived from it. Time is one shared history; timelines are derived from it. And now: the world has no layers at all — **layers are how a viewer looks at a layerless world.**

The task asks what is rendered, so this document discusses *presentation* — what a layer surfaces and makes visible — but it discusses no rendering engine and no implementation. The mechanics of turning a projection into pixels, tiles, or symbols are a rendering concern, deferred. What follows is only the conceptual model of the lens.

---

## 1. What a Layer is

> **A Layer is a named, parameterized projection of the one world: a coherent subset of it, presented under a consistent interpretation, as of a point or span of time.**

It is defined by four parameters, and by nothing else:

- **Scope** — *which* content the layer concerns: a filter over the one world by classification (soil, equipment, recommendation), by attribute, by provenance (which Actor is the source), by confidence, and optionally by a spatial or temporal restriction. Scope selects; it never copies. The content stays in the world.
- **Interpretation** — whether the layer presents world content *directly* (raw Observations, Entities) or presents a *derivation* of it (a computed surface, an inferred region). When it derives, what it surfaces are Assertions (RFC-0001 §3.3) — the ontology already owns "derived meaning," so a computed layer invents no new kind of thing (§7).
- **Temporal binding** — the moment or interval, drawn from the one shared history (RFC-0003), *as of* which the projection is taken. Every layer has one; there is no timeless layer (§6). The binding is usually shared across all active layers by a single time control, so the whole map moves through history together.
- **Presentation intent** — how the projected content should *read*: as discrete marks, a continuous field, symbols, categories. Enough to make the projection presentable — and no more. The engine that realizes it is deferred.

Three things a Layer is emphatically **not**:

- **Not a container.** Content is never "in" a layer. Entities, Events, and Assertions live in the one placed-and-dated world; a layer merely *points a lens* at some of them. Two layers may surface the same Assertion; it is not duplicated, because it was never held by either.
- **Not stored truth.** A layer is a *definition* — a saved query plus an interpretation and a presentation intent. Turning that definition off changes nothing about the world. (Whether a saved layer definition is itself a shareable artifact with identity is a view-specification question, deferred to the interaction RFC that RFC-0002 §8 also foreshadowed.)
- **Not a primitive.** It is a composition of scope, the derived-visibility machinery (RFC-0002 §6), projection-to-time (RFC-0003 §4), and optional derivation. Everything it is made of already exists.

---

## 2. Layers compose without reconciliation

The reason this model matters, and the reason it is not merely GIS layering renamed, is a single property that falls out of everything before it:

**Because every layer is a lens on the *same* world, expressed in the *same* shared space and the *same* shared time, layers compose without reconciliation.** Satellite, NDVI, equipment, recommendations, and notes shown together align by construction — the boundary the satellite layer implies *is* the boundary the recommendation layer assumes, because both resolve to the one world underneath.

This is the direct cure for the disease RFC-0000 §1 named: disconnected tools whose layers each carry a private version of the world and must be reconciled by the operator's head. Conventional layering stacks independent datasets and prays they agree. This model has nothing to reconcile, because there are no independent datasets — there is one world and many lenses. Alignment is not achieved; it is unavoidable.

---

## 3. What is rendered

Discussed as *presentation*, with the engine deferred: **what a layer presents is its projection, intersected with what is currently visible and current in time.** Three restrictions compose:

- the layer's **scope** (which content),
- the current **visibility window** — the region of interest, a derived spatial query (RFC-0002 §6),
- the current **temporal binding** — as-of a moment or across an interval (RFC-0003).

What survives all three is what appears. It is either **raw** content the layer points at (equipment positions, scouting notes, a captured image) or **derived** content the layer computes and surfaces as Assertions (an NDVI surface, a yield estimate, an AI diagnosis). In both cases what is presented already exists in, or is derived from, the one world; the layer originates no content of its own. *How* that surviving content becomes marks on a surface — symbols, coverage, color — is the rendering engine's concern, named nowhere in this document by design.

---

## 4. What is selectable

Selection was defined in RFC-0002 §7 as a set of references *by identity*. The layer model inherits that and adds one sharp rule:

**You select things in the world, never marks in a layer.** A layer determines *what is presentable and therefore reachable*, but a selection always resolves to identities in the one world — Entities, Events, Assertions — not to the layer's presentation of them. Selecting the same tractor through the equipment layer or through a recommendation that references it yields the same identity; the lens is not the target.

Two kinds of content select differently:

- **Discrete, identified content** — equipment, notes, recommendations — is selectable *as identities*. Picking it returns the world objects directly.
- **Continuous content** — a satellite image, an NDVI or soil surface — has no discrete identities to pick. It is selectable *by location or region*: a spatial query (RFC-0002 §6) that resolves to the underlying Observations, samples, or Assertions at that place. You do not select "a pixel"; you select "here," and the model returns what is here.

Distinct from all of this is **layer control** — turning a layer on or off, adjusting its prominence, ordering it against others. That acts on the *lens*, not on the world, and must not be confused with selecting the content the lens reveals.

---

## 5. What is filterable

Everything the world records is filterable, because filtering is simply a *more specific projection* — and this exposes a unification worth stating plainly:

> **A layer is a named filter. A filter is an anonymous layer.** They are the same operation at different granularities.

A layer's scope (§1) is already a filter over the world; a viewer-applied filter (narrow to one source, one confidence threshold, one classification, one span of time) is that same filter, refined. There is no second mechanism. Filtering is **non-destructive** by nature — it changes the lens, never the world — so no filter can lose data; it can only decline to present some of it, reversibly.

Because provenance is intrinsic to every Event and Assertion (they carry their source Actor, RFC-0001), a first-class axis of filtering is *by source*: show only this agronomist's notes, only this satellite provider's imagery, only the AI's assertions, only human-authored recommendations. Confidence — intrinsic to Assertions — is another: show only high-confidence diagnoses. These are not special features; they are ordinary filters over intrinsic attributes.

One thing is *not* a per-layer filter: the **temporal binding** (§6). Time is shared across the whole map, a single control moving all layers through the one history together, rather than each layer filtering time privately. This is the one place the layer-equals-filter unification has a seam, examined in §11.

---

## 6. What is temporal

The honest answer challenges the question: **all of it.** There is no atemporal layer.

Because the world is dated (RFC-0003) and every layer is a projection *as of* a time, temporality is not a property some layers have and others lack — it is a property of the projection itself, and every layer is a projection. A boundary layer is boundaries *as of* a moment (boundaries move — RFC-0002 §4). An equipment layer is positions *as of* a moment (positions are projections of movement Events — RFC-0003). Even a base-imagery layer is imagery *from* a capture date.

What differs across layers is not *whether* they are temporal but their **rate of change** — equipment shifts by the second, soil by the season, terrain by the decade. Rate is a description, not a category. The single shared time control (RFC-0003's one history) drives every layer at once: drag it, and satellite, crop, equipment, weather, and recommendations all move to the same moment together — the historical-imagery experience RFC-0000 promised, now general to every lens rather than special to imagery.

---

## 7. What is computed

Every layer is computed in one sense and only some in another; keeping the two senses apart matters.

- **Every layer is projection-computed.** Even a "raw" layer computes its scope, its visibility intersection, and its temporal projection on demand. Presentation is always a computation; nothing is simply retrieved.
- **Some layers are content-computed.** Their content does not exist raw in the world; it is *derived* — NDVI from imagery, a yield surface interpolated from harvest Events, a soil map from point samples, a diagnosis or prediction from an AI Actor. What these surface are **Assertions** (RFC-0001 §3.3): located, dated, confidence-bearing, provenance-carrying claims. A computed layer therefore adds no primitive; it points a lens at derived Assertions the same way a raw layer points at recorded Observations.

A bright line runs through "computed," and it is the ontology's central boundary reappearing: a derivation that makes a **claim about the world** (NDVI, a yield estimate, a diagnosis) is an Assertion, first-class and preserved. A derivation that merely **re-presents existing content** (a density heatmap of notes, a clustering of markers, a symbol aggregation) makes no new claim and is *presentation*, belonging to the rendering concern this document defers. The test is whether the computation asserts something new about reality or only redraws what is already recorded. This distinction is the sharpest seam in the model and is stress-tested in §11.

---

## 8. What is static

Nothing — and "static" should be retired as an architectural category, the way RFC-0002 retired "boundary" and RFC-0003 retired object-owned timelines.

In a world that is event-driven (RFC-0000 §2.5) and wholly dated (RFC-0003), no content is static. What the question reaches for is real but is one of three other things, none of them a category of layer:

- **A pinned temporal binding.** The viewer has frozen the time control; the layer looks static because *they* stopped moving, not because the content cannot change.
- **A low rate of change** (§6). Terrain and parcel boundaries change slowly enough to *feel* fixed, but they are projections as-of-a-time like everything else.
- **A base-reference backdrop.** Imagery or terrain used chiefly for orientation, which a viewer treats as a stable ground for the lenses stacked over it — yet it too carries a capture date and can be moved through history.

So "static" names a *viewing choice* or a *rate observation*, never a property of the world. The only things that genuinely never change are the invariants RFC-0003 already fixed — identity and the recorded past — and neither of those is a layer.

---

## 9. The layers, mapped — and why the architecture is open

The test of the model is that the required examples fit with no special cases, and that fitting them reveals *why* arbitrary future layers are supported.

| Layer | Content | Kind | Temporal character | Selectable as |
|---|---|---|---|---|
| **Satellite imagery** | raster Observation Events (area + payload, RFC-0002 §3.1) | raw | per capture-date; scrub through passes | location → the capture |
| **Weather** | station Observation Events; interpolated/forecast Assertions | raw + computed | fast; forecasts are future-dated Assertions | station identities; location for fields |
| **Recommendations** | prescriptive Assertions (RFC-0001 §3.3) | computed | issued at a time, may be superseded; as-of shows the standing set | each recommendation's identity |
| **Equipment** | Entity positions, projected from movement Events (RFC-0003) | raw (projected) | near-real-time | each machine's identity |
| **Notes** | descriptive Observation Events with payload | raw | slow; filter by author (Actor) and time | each note's identity |
| **Soil** | sample Observation Events; interpolated soil-map Assertion | raw + computed | very slow | sample identities; location for the surface |
| **Yield** | harvest Observation Events (measured, path geometry); yield-surface Assertion | raw + computed | per season; drag across years | pass identities; location for the surface |
| **AI overlays** | Assertions authored by an AI Actor — diagnoses, anomalies, predictions | computed | as issued; superseded as understanding improves | each assertion's identity |

Two things this table proves. First, **no layer required a mechanism the ontology did not already have.** Every layer is a lens over Entities, Events, or Assertions, placed and dated, sourced to an Actor. Satellite is raw Observations; recommendations and AI overlays are Assertions; equipment is projected Entity state. The AI layer in particular is not a special feature — it is the direct realization of RFC-0000 §2.3: the AI is a *source* (an Actor), its output is *Assertions*, and it surfaces as a *layer* like anything else. "AI is another layer" is not a slogan here; it is a consequence.

Second, and decisively:

> **The layer system is open precisely because the ontology is closed.**

A new kind of data — a pest model, a market-price surface, a carbon estimate, a sensor never imagined — arrives by entering the one world as an Entity, Event, or Assertion, placed and dated and sourced. The moment it is in the world, *any coherent lens over it is a layer*, with no new machinery, because the machinery is general and the vocabulary it operates on is small and fixed. A small closed set of primitives plus one general projection mechanism yields an unbounded space of lenses. This is why arbitrary future layers are supported: not because the layer system anticipates them, but because it never needed to.

---

## 10. The frozen layer model

- **A Layer is a lens, not a container** — a named projection of the one world by scope, interpretation, temporal binding, and presentation intent. It adds no primitive.
- **Layers compose without reconciliation** — one world, one space, one time underneath; alignment is unavoidable, not achieved.
- **Presented** is the projection ∩ the visibility window ∩ the temporal binding; the rendering engine is deferred.
- **Selectable** is always world identities (discrete content) or locations resolving to world content (continuous content) — never the lens itself.
- **Filterable** is everything; a filter is an anonymous layer and a layer a named filter, non-destructive in both directions. Time is the one shared, cross-cutting exception.
- **Temporal** is all of it; layers differ in rate of change, not in whether they are dated. One shared time control moves every layer together.
- **Computed** is every layer as a projection, and some layers additionally in content — surfacing Assertions when a derivation makes a claim, and deferring to presentation when it merely redraws existing content.
- **Static** is not a category — only a pinned time, a slow rate, or a chosen backdrop. Only identity and the recorded past never change, and neither is a layer.
- **Open because closed** — arbitrary future layers are supported because the ontology is frozen and the projection mechanism is general.

---

## 11. Self-review

**Did I dissolve "Layer" so far that the document says nothing?** By reducing a layer to "a named filter plus an interpretation plus a time binding," I risk having explained the concept away. The residue that keeps it a real subject is presentation and composition: stacking order, prominence, blend, base-versus-overlay — the arrangement of multiple lenses over one world. I have gathered these under "presentation intent" and "layer control" and pushed their mechanics to rendering, but the line between *presentation intent* (mine to define) and *rendering* (deferred) is genuinely thin, and a reviewer could fairly say blend and opacity are presentation I have half-admitted while claiming to defer. I have kept only enough to make a projection *presentable*; whether that line holds is the model's softest boundary.

**Is "a filter is an anonymous layer" too cute, and does its exception undermine it?** The unification (§5) is clean except for the temporal binding, which is shared across all layers rather than filtered per-layer — an exception large enough to question the whole equivalence. My defense is that time is a *dimension the world is embedded in* (RFC-0003), not an attribute of content, so binding time is categorically unlike filtering an attribute; the unification holds for content-filters and correctly excludes the dimensional bindings. But if a real need arises for per-layer time (comparing this field in 2021 against that field in 2024 on one map), the shared-time assumption breaks and §5's tidy equivalence with it. I think that need is real and coming, and this is the seam most likely to move.

**Is the computed-Assertion versus computed-presentation line (§7) actually holdable?** I drew a bright line — derivations that *claim* something new are Assertions; derivations that merely *redraw* existing content are presentation. It is the sharpest and most important distinction in the document, and it is also the most contestable, because "a density heatmap of notes" can be argued either way: it asserts nothing new, yet a viewer may read a real claim ("infestation is concentrated here") into it. If presentation can manufacture the *impression* of a claim without an Assertion behind it, the fact/inference boundary the whole ontology protects can be evaded through rendering. I believe the test (does the computation assert something new about reality?) is correct, but enforcing it is not this document's to guarantee, and a later RFC on AI reasoning or rendering must hold the line I have only drawn.

**Was challenging the "static" question (§8) the right call or an evasion?** The task asked what is static and I answered "nothing," reframing the question rather than answering it on its terms. This is consistent with how RFC-0002 and RFC-0003 handled "boundary" and object-timelines, and I believe honesty outranks accommodation. But I concede base-reference backdrops are a genuinely useful notion that I have reframed rather than honored, and a reader who wanted a first-class "base layer" concept will find §8 dismissive. The reframing is correct; its tone may undersell a real need.

**Does "layer" carry a 2D-cartographic metaphor that strains against the world model?** Stacking lenses is a planar image, and RFC-0002 admitted volumes. Layering volumetric content — soil horizons, airspace — strains the stacking intuition even though the projection framing survives intact. The concept is sound; the *word* imports a flatness the world does not have. I have kept "layer" for its familiarity, but flag that the metaphor, not the model, is what will creak in three dimensions.

**Do forecast layers violate RFC-0003's one history?** Weather and prediction layers present *future-dated* Assertions — claims about moments that have not occurred and are not in the recorded past. RFC-0003 §11 already flagged that the future is where time stops resembling space; this document inherits that strain rather than resolving it. A layer presenting the future is projecting claims about the unoccurred, which the "one shared history" framing accommodates only by treating forecasts as present-tense Assertions *about* future moments. That works, but it is the point where the layer model leans on a tension RFC-0003 left open.

**Overall.** The claims I am most confident in are "layers are lenses, not containers" and "open because closed" — both fall directly out of frozen commitments and both do real architectural work. The claim I am least confident in is the computed-Assertion versus computed-presentation boundary (§7): it is essential, it is correct, and it is the hardest of all to enforce, because presentation is exactly where a claim can be smuggled in without an Assertion to carry it. If this layer model is wrong, it is probably wrong there — not in what it permits, but in what it cannot by itself prevent. Stated plainly, so the next author knows which stone to turn first.

---

*This RFC defines the lens without adding to the vocabulary. Layers are how the one world is looked at; the RFCs that follow turn to how it is **interacted with** and **reasoned over** — the map's gestures and the AI's context, both of which consume the lens defined here.*
