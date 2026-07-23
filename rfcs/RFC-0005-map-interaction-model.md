# RFC-0005 — Map Interaction Model

| | |
|---|---|
| **RFC** | 0005 |
| **Title** | Map Interaction Model |
| **Status** | Draft |
| **Author** | Bradley |
| **Created** | 2026-07-23 |
| **Depends on** | RFC-0000, RFC-0001, RFC-0002, RFC-0003, RFC-0004 |
| **Supersedes** | — |
| **Superseded by** | — |

---

## 0. Purpose and method

The world is placed (RFC-0002), dated (RFC-0003), and viewed through lenses (RFC-0004). This document defines how a person **acts** on that arrangement: the interaction architecture of the map.

It also settles debts. RFC-0002 §7 defined Selection and then §10 questioned whether it belonged there at all; RFC-0002 §8 deferred View to "the Map Interaction RFC"; RFC-0004 §1 deferred the question of saved, shareable view definitions and §11 flagged per-layer time. Those deferred concepts land here, and they land under the same discipline as everything before them: **no new primitives.** Interaction is structured entirely out of what already exists — identities, geometries, times, projections, references. The ontology stays closed.

Two constraints from the task govern the shape of the whole document:

- **The map is the operating system.** Not the metaphor of windows and processes — the architectural claim of RFC-0000 §2.2, taken to its conclusion: every capability is invoked *from* the map, acts *through* the map's context, and returns its result *to* the map. There is no "elsewhere" in the platform for a capability to live.
- **No pages.** Page-centric architecture decomposes an application into destinations you navigate between, each holding its own context. That is precisely the fragmentation RFC-0000 §1 diagnosed, rebuilt inside our own product. Here there are no destinations. There is one surface, one context, and a set of verbs.

No UI frameworks, no widgets, no visual design. Only the architecture of interaction — what the verbs *are*, what they act on, and what they change.

---

## 1. The View: the interaction context

The concept everything else in this document consumes, deferred twice and now admitted — not as a primitive, but as the *named composition* interaction is conducted through.

> **The View is the complete description of how the world is currently being looked at: a spatial scope, a temporal binding, a lens stack, and a selection.**

- **Spatial scope** — the region of interest: where the viewer is looking and at what extent. Its contents are the derived visibility of RFC-0002 §6.
- **Temporal binding** — the moment or interval the projection is taken as-of (RFC-0003, RFC-0004 §6): *when* the viewer is looking.
- **Lens stack** — which layers are active, how they are filtered, and their presentation arrangement (RFC-0004).
- **Selection** — the set of identity references currently attended to (RFC-0002 §7, resolved below in §3).

Four properties make the View the load-bearing concept of the platform's interaction:

1. **It is the context of every verb.** Each interaction in this document is defined as a verb *applied within a View*. Nothing is invoked contextlessly; a question, an edit, a search all mean what they mean relative to where, when, and through-what the viewer is looking.
2. **It is what the AI inherits.** RFC-0000 §2.3 promised intelligence that already knows what you are looking at. The View is the fulfillment of that promise made precise: the ambient context an embedded AI receives is *exactly the View* — scope, time, lenses, selection — with no user restatement. (What the AI does with it is RFC-0008's subject; what it receives is defined here.)
3. **It is a value, not a place.** A View describes a way of looking; it is not a location in an application. Two consequences: any View can be **named and shared** — a saved View is a description another person (or the same person later, or an AI) can re-adopt, resolving RFC-0004 §1's deferred question — and shared Views compose with preserved history: because the world is bitemporal (RFC-0003 §1), re-adopting a saved View re-projects the *world as it now is* (or as-of the View's bound time), never a stale snapshot. A View is a lens description, never a copy of content.
4. **It is cheap and disposable.** Views are not managed artifacts by default. Every pan, zoom, or toggle produces, conceptually, a new View. Naming one is the exception, done when a way-of-looking is worth keeping.

There is exactly one View in play per viewer at a time. That is what "no pages" means architecturally: the application has no other state of "where you are" than the View itself.

---

## 2. The five verbs

Every interaction the task enumerates — and, this document claims, every interaction the platform will ever need — reduces to five verbs applied within a View:

| Verb | What it does | What it touches |
|---|---|---|
| **Navigate** | move the View through space and time | the View only |
| **Reveal** | change which lenses are active and how they filter | the View only |
| **Indicate** | establish what is being attended to (select, draw) | the View only |
| **Ask** | pose a question against the current context (inspect, measure, search, query the AI) | nothing — read-only |
| **Author** | record something into the world | **the world — by append only** |

The distribution of consequence across these verbs is the architecture's central safety property, inherited from RFC-0003 and stated here as the interaction model's first law:

> **Four of the five verbs cannot change the world.** Navigation, revelation, indication, and asking manipulate or read a projection; they are consequence-free and infinitely reversible, because they only ever touch the View. Only **Author** touches the world — and it touches the world only by *addition*: recording Events and Assertions into the one append-only history. No gesture, anywhere in the platform, can overwrite or destroy.

A user can therefore explore with total freedom — any wrong turn is a View change, undone by another View change — and the entire weight of care concentrates on the one verb that writes. This is "history is preserved" (RFC-0000 §2.4) expressed as interaction design.

The remainder of the document takes the task's ten interactions through these five verbs.

---

## 3. Indicating: selection, multi-selection, drawing

**Selection** is the act of establishing shared attention — the viewer telling the platform (and the AI watching the same View) *this is what I mean.* Its semantics were fixed in RFC-0002 §7 and RFC-0004 §4 and are inherited unchanged: a selection is a set of references **by identity, to things in the world, never to marks in a lens**. Selecting a tractor through the equipment layer or through a recommendation that mentions it selects the same tractor. Continuous content (imagery, surfaces) is selected *by location*, resolving to the world content present there.

**Multi-selection** is not a second mechanism. A selection was always a *set*; multi-selection is the set having more than one member. What it adds is composition: selections are built by accumulation (add this, add that), by spatial query (everything in this region — visibility, RFC-0002 §6, becoming a selection), or by projection (everything this filter matches becoming a selection — the RFC-0004 §5 layer/filter unification extended one step: *a selection is a materialized filter; a filter is a potential selection*). Heterogeneous membership is legal and ordinary — a field, two Events, and an Assertion can be selected together, because a selection is just references, and references do not care what they point to. What a heterogeneous selection *means* is the asker's problem (§5), not the selection's.

**Drawing** is the act of indicating *a place that has no identity yet* — circling an area, tracing a path, dropping a point. The architecture's key decision is that drawing is, by default, **indication, not authorship**:

- A drawn geometry is an **ephemeral query region** — a way of pointing at "here" when no existing thing captures it. Circle a struggling corner of a field and the circle itself is nothing; it is an instrument for the Ask verb (RFC-0000 §2.3's founding gesture: *circle an area and ask why*). It lives in the View and evaporates with it.
- A drawn geometry **becomes world content only by explicit promotion** — an act of Author. The circle that proves worth keeping is promoted: it becomes the geometry of a new Entity (a management zone), or the extent of a new Event (a scouting note *about* this area), or the subject region of an Assertion. Promotion is the one-way gate between the consequence-free verbs and the consequential one, and it is always explicit, never inferred.

This ephemeral-until-promoted rule is the interaction model's second law, and it recurs in measuring (§5) and search (§6): **gestures produce View-resident, disposable things; the world grows only when the viewer deliberately promotes one.**

---

## 4. Navigating: space, time, and identity

Navigation is movement of the View — and because the world is embedded in two dimensions (RFC-0001 §2), navigation is **symmetric across them**:

- **Spatial navigation** — pan, zoom, reorient: moving the View's scope through the one shared space. "Zoom around my farm" (RFC-0000 §2.2).
- **Temporal navigation** — scrub, step, span: moving the View's binding through the one shared history. The time control is not a feature attached to the map; it is *the same verb as panning, applied to the other dimension.* Dragging across seasons and watching every active lens move together (RFC-0004 §6) is temporal panning, no more exotic than spatial panning.

The symmetry is the point: a viewer navigates a two-dimensional-in-kind world (place, time) with one verb, and the platform's promised experience — fly around the farm, then fly through its history — is one motion in two directions.

A third form completes the verb: **semantic navigation** — *go to* a thing by identity rather than by coordinates. "Take me to the north field" resolves an identity to its geometry (as-of the View's time — RFC-0002 §4) and moves the View there. Semantic navigation is what makes search (§6) actionable: names resolve to identities, identities resolve to places, and the View flies.

Navigation never changes the world. Where you look is never what you did.

---

## 5. Asking: inspection and measuring

The Ask verb poses questions against the current View. Its two structured forms:

**Inspection** answers *"what is this?"* — and its answer is assembled entirely from projections already defined:

- the thing's **identity and current state** — state as projected from its Events to the View's bound time (RFC-0003 §4);
- its **timeline** — the derived per-object filter of the one history (RFC-0003 §9);
- the **Assertions about it** — standing (un-superseded) claims, with provenance and confidence (RFC-0001 §3.3);
- its **derived spatial relationships** — what contains it, neighbors it, overlaps it (RFC-0002 §5).

Nothing in that list is stored inspection-content; inspection is a *bundle of projections taken at ask-time*. And architecturally: **inspection happens in place.** It is anchored to the thing in the View — a deepening of attention, not a navigation away. The page-centric alternative (a "detail page" elsewhere) would make inspection destroy the very context (scope, time, lenses, co-selected things) that gives the inspected thing its meaning. No pages: the answer comes to the map.

**Measuring** answers *"how far, how large, how long?"* — and the architecture's decision is that measurement is **pure Ask**: a derived spatial fact (distance, area, length — RFC-0002 §5) computed on demand between indicated things or drawn geometry, living in the View, evaporating with it. Measuring creates nothing. A measurement worth keeping is *promoted* (§3) — recorded as an Observation Event ("this bin gap measured 40 feet, surveyed today, by this Actor") — at which point it is authorship like any other. The measuring *gesture* and the surveyed *record* are different acts on different sides of the promotion gate; conflating them is how tools end up littering the world with accidental permanent scribbles.

Inspection and measuring are also the simplest cases of the general Ask: **a question posed to the embedded AI is the same verb.** It consumes the same View, the same selection, the same drawn regions; it differs only in that its answers may be Assertions (authored by an AI Actor — RFC-0004 §9) rather than bundles of projections. The full treatment is RFC-0008's; the architectural point here is that AI questioning is not a separate interaction system — it is Ask, the verb already defined.

---

## 6. Asking at large: search

Search is Ask aimed at the whole world instead of at an indicated thing: *"where is / what matches?"*

- **A search query is a filter** — over names, classifications, attributes, provenance, time (RFC-0004 §5: a filter is an anonymous layer). "Diesel deliveries last spring," "everything João noted in the west parcels," "fields planted to rye in 2023."
- **A search result is therefore an ephemeral lens plus a potential selection**: the matching identities, presentable *on the map* as a transient layer (they are located things — where else would results go?), adoptable as a selection (§3), and navigable to (§4: semantic navigation). A list of results is a legitimate *presentation* of that ephemeral lens — subordinate to, and in constant correspondence with, the map, never a separate page that replaces it.
- **Search results follow the second law**: View-resident, disposable, promotable. A search worth keeping is a named filter — which is, by RFC-0004 §5's unification, a **layer definition**. The pipeline is continuous: *query → transient results-lens → named filter → saved layer* — one concept hardening by degrees, no new machinery at any step.

Search is thus not a subsystem. It is the Ask verb composed with the filter/layer unification and semantic navigation — three existing pieces, zero new ones.

---

## 7. Revealing: filtering and layer control

The Reveal verb is the interaction face of RFC-0004, and it is thin by design because that document already did the work:

- **Filtering** is refining the View's lens stack — non-destructive, reversible, touching nothing but the View (RFC-0004 §5). Filtering by source-Actor and by confidence are ordinary cases with outsized importance: *show me only what the agronomist said; hide the AI's low-confidence claims* is a Reveal gesture, and it is how a viewer tunes their trust.
- **Layer control** — activating lenses, ordering them, adjusting prominence — is arrangement of the View's lens stack, explicitly *not* selection of world content (RFC-0004 §4), and explicitly consequence-free.

One addition is architectural rather than inherited: **Reveal is how the viewer and the AI stay honest with each other.** Because the View is the AI's context (§1), what the viewer has revealed *is what the AI sees them seeing*. A filtered-out hazard is filtered out of the shared context too — which makes the state of the lens stack part of the conversation, not cosmetic. RFC-0008 must handle the case where the AI knows something the current View hides; this document only establishes that the View defines the *shared* frame, not the AI's *total* knowledge.

---

## 8. Authoring: editing and creating

The fifth verb, the only consequential one, and the one the append-only world (RFC-0003) disciplines completely.

**Editing is never mutation.** To "edit" a boundary, correct a note, reassign an attribute, or re-draw a zone is to **record an Event** that supersedes what came before (RFC-0003 §5: correction is addition). The interaction may *feel* like dragging a vertex — the architecture beneath it is the appending of a dated, sourced, geometry-bearing Event to the one history, with the previous geometry retained forever and the new state arising by projection. Nothing a user can do through the map deletes or overwrites; "delete" itself is an Event recording that a thing ended or a record was retracted — visible thereafter as history, recoverable always, per the first law (§2).

**Creating is introduction plus first history.** Bringing a new thing into the world composes acts already defined: draw its geometry (§3), promote the drawing (§3), which posits a new identity (cheap and primitive — RFC-0003 §6) and records the introducing Event, with occurrence time possibly backdated behind knowledge time (RFC-0003 §1 — the fifty-year-old field entering the model today).

**Annotating is authoring content about an indicated context.** A note, a photo, a scouting report: an Observation Event whose references are the current selection and whose geometry is inherited from it or drawn for it (RFC-0003 §7). The View supplies the *aboutness* — what you were looking at, when, through what lenses — so authored content lands already placed, dated, and attributed without a single form field asking "which field is this about?" The context the viewer already established *is* the metadata. This — not chat, not dashboards — is where the map-as-operating-system claim pays daily rent: the system state (the View) is rich enough that recording reality requires only the reality, not its re-description.

Every authored thing carries its Actor (RFC-0001 §3.4) — the person, machine, or AI that wrote it — so provenance filtering (§7) works on everything authorship produces, from day one, for free.

---

## 9. The frozen interaction model

- **One View per viewer** — spatial scope + temporal binding + lens stack + selection. The context of every verb; the AI's inherited context; a value (nameable, shareable, re-projectable), not a place. There are no pages, no destinations, no "elsewhere."
- **Five verbs** — Navigate, Reveal, Indicate, Ask, Author. The task's ten interactions decompose onto them: selection and multi-selection and drawing → Indicate; navigation and time navigation → Navigate (one verb, two dimensions, plus semantic go-to); inspection and measuring and search → Ask; filtering and layer control → Reveal; editing and creating and annotating → Author.
- **First law: only Author touches the world, and only by addition.** Four verbs are consequence-free and reversible; no gesture can overwrite or destroy.
- **Second law: gestures are ephemeral until promoted.** Drawn regions, measurements, and search results live in the View and evaporate with it; the world grows only by explicit promotion across the authorship gate.
- **Symmetry of navigation**: space and time are navigated by the same verb; the time control is temporal panning.
- **Ask is one verb**: inspection, measurement, search, and AI questioning are the same act at different targets — all consuming the View, all read-only, all answered in place.

---

## 10. Self-review

**Did I just admit View as a primitive after two RFCs of refusing?** The closest call in the document. RFC-0001 rejected View as "a frame, not vocabulary"; RFC-0002 deferred Selection; this document names View and builds everything on it. My defense: View remains a *composition* — every component (scope, binding, lens stack, selection) is defined elsewhere from frozen parts, and View adds no capability to the ontology, only a name for the tuple interaction needs. The world would be complete without Views; interaction would not. That is exactly the difference between ontology and interaction architecture, and I believe the line holds. But a skeptic could say "a named composition that everything depends on and that can be saved and shared *is* a primitive in practice," and the honest answer is that View is the fifth concept the platform will *behave* as if it has, whatever the ontology says. The discipline is real but the distinction is finer here than anywhere else.

**Are five verbs a real reduction or a rhetorical one?** The task listed ten interactions; I claim they decompose onto five verbs. The risk is that the verbs are so broad ("Ask" absorbs inspection, measurement, search, *and* all AI questioning) that the reduction is unfalsifiable — anything can be filed somewhere. The test I would apply: the reduction earns its keep only if it *forbids* something. It does: it forbids any interaction that mutates the world outside Author (no drag-to-move-boundary that silently rewrites), forbids destinations (no verb takes you to a page), and forbids implicit promotion (no gesture becomes permanent without the explicit gate). Those are real architectural teeth. But if a future interaction genuinely fits no verb — collaborative co-editing presence, notification acknowledgment — the pentad will be revised, and it should be revised here, in the open, not stretched silently.

**Is "drawing is indication by default" right, or does it add friction to the most common authoring path?** A farmhand who draws a zone almost always wants to *keep* it; making promotion explicit puts a step between intent and record. I chose the default for safety-of-exploration (the circle-and-ask gesture must be zero-commitment, or no one will explore) and for the integrity of the first law. But the opposite default — drawing authors, with easy retraction — is defensible precisely *because* retraction is safe in an append-only world. I kept indication-by-default because retraction still litters history with noise, and a history full of accidental zones is a worse archive than a View full of evaporated circles. This is a judgment call, and usage evidence could reverse it.

**Does the View-as-AI-context claim smuggle RFC-0008's design in early?** §1 and §7 commit the AI to receiving the View and flag the View-hides-what-AI-knows problem. I have tried to define only the *interface* (what the AI receives) and leave the *behavior* (what it does, when it interrupts, how it handles hidden hazards) to RFC-0008. But interface commitments constrain behavior, and RFC-0008's author inherits a decision made here — notably that AI context is *the* View rather than something richer or differently scoped. If AI reasoning needs context the View cannot carry (cross-View history of attention, the viewer's past questions), this document's tidy "the context is exactly the View" will need loosening.

**Is subordinating lists and tables to the map honest, or ideology?** §6 permits lists only as presentations of a lens, in correspondence with the map. Real agricultural work is sometimes genuinely tabular — comparing input costs across twenty fields is a spreadsheet-shaped task, and forcing it through map-subordination may serve the principle and disserve the user. I hold the line here because RFC-0000 §2.2 demands it ("a capability not on the map is a signal it isn't understood spatially yet") — but I flag that "spatially understood" must not harden into "spatially *presented* at all costs." The subordination is of *architecture* (lists are lens-presentations, not separate contexts with separate state), not necessarily of *screen area*. If that distinction is ever lost, this section will have been the start of the loss.

**One viewer, one View — what about collaboration?** §1 declares one View per viewer and §1.3 makes Views shareable, but nothing here models two people (or a person and an AI agent) attending to the *same* View simultaneously, diverging, or merging attention. Shared Views as *values* support handoff, not co-presence. Collaboration is deliberately unaddressed — it needs its own treatment and probably strains Selection (whose attention is it?) more than any other concept. Named as missing rather than quietly absorbed.

**Overall.** The claims I am most confident in are the two laws — only-Author-writes-and-only-by-addition, and ephemeral-until-promoted — because both fall directly out of frozen commitments (append-only history; lenses touch nothing) and both do daily work in every gesture. The claim I am least confident in is the pentad of verbs: it is the document's organizing idea and its most stylized one, and if interaction reality refuses the taxonomy, the five verbs will be remembered as tidy rather than true. If this model is wrong, it is probably wrong there — or in the fineness of the View-is-not-a-primitive line. Both stated plainly, so the next author knows which stones to turn first.

---

*This RFC defines how the world is acted on: one View, five verbs, two laws. The world can now be seen, layered, navigated, questioned, and grown. What remains is the intelligence that shares the View — RFC-0008 — and the models that assemble the whole into a living twin of the farm.*
