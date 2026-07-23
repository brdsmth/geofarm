# RFC-0003 — Spatial World Model

| | |
|---|---|
| **RFC** | 0003 |
| **Title** | Spatial World Model |
| **Status** | Draft |
| **Author** | Bradley |
| **Created** | 2026-07-23 |
| **Depends on** | RFC-0000, RFC-0001 |
| **Supersedes** | — |
| **Superseded by** | — |

---

## 0. Purpose and method

The ontology is frozen. Its four primitives — Entity, Event, Assertion, Actor — and its two dimensions — space and time — are fixed and may not be extended here.

RFC-0001 declared space a *dimension*, not a primitive: the *where* every primitive already has, the way a physical object already has a position. It deliberately gave that dimension no structure. This document supplies the structure. It answers a single question:

> **What is the smallest set of spatial concepts with which every physical thing on a farm — and everything that happens to it, and everything anyone concludes about it — can be located, related, and referred to?**

The method is the one RFC-0001 established, applied to space. List the spatial nouns the domain seems to demand — point, line, polygon, raster, collection, coordinate system, boundary, containment, adjacency. Then challenge each. A concept survives only if it is irreducible, carries distinct responsibilities, and exists because *space* exists rather than because a future mechanism will need it. Everything that can be *derived*, *composed*, or *deferred* is not a primitive of this model.

This RFC adds no primitives to the ontology. It gives the spatial dimension its shape. It discusses no rendering, no storage, and no libraries — those consume this model; they are not part of it. The aim is a spatial model that would have been true a century ago and will be true a century from now: **timeless.**

---

## 1. What carries geometry

Before defining space, we must say which primitives live in it.

Three of the four do. **Entity, Event, and Assertion each have a place** — they are *world content*, and RFC-0000 admits no world content without a place. A field is somewhere (Entity). A rainfall happened somewhere (Event). A disease diagnosis is about somewhere (Assertion). Space is not the property of Entities alone; the harvest pass, the storm, the inferred zone all occupy space as intrinsically as the field does.

**Actor is the exception.** Agency may originate outside the modeled world — an external data source, a distant organization, the platform's own reasoning. RFC-0001 §6 named this the seam where Spatial-First and agency meet; this document inherits it rather than resolving it. An Actor *may* be represented by an Entity when it also exists at a place (a machine, a person on the farm), but agency itself carries no geometry.

So the spatial model governs Entity, Event, and Assertion. When this document says "a thing," it means any of those three.

---

## 2. The single assumption: one shared space

The physical world is one continuous space. Any model of it must begin by assuming a **single, shared, earth-fixed reference** in which every geometry is expressed and against which any two geometries are comparable.

This assumption is the entire foundation of Spatial-First. RFC-0000 called geography "the natural join" — the one language every part of the farm already speaks. That claim is only true if there is *one* space. Two things can be compared, contained, or found adjacent only because their positions are quoted in the same frame. The moment geometry is allowed to live in private, unreconciled frames, the universal join dissolves and we are back to disconnected tools translated by hand.

Two consequences, and one deferral:

- **Position is absolute within the model, not relative to a parent.** A field's location is not "inside farm 3"; it is a place on the earth. Its being inside farm 3 is *derived* from both geometries occupying the same shared space (§5). Nothing is positioned relative to another thing; everything is positioned in the one frame.
- **No thing carries its own coordinate system.** Because there is one shared frame, a coordinate system is not an attribute you attach to geometry. A geometry is simply *in* the shared space.
- **The choice and conversion of specific coordinate systems is deferred as mechanism.** The earth is curved, and pinning numbers to it admits many valid projections and datums; converting between the frames external data arrives in and the one shared frame is real work. But it is *reconciliation* work — a mechanism concern — not a concept of the spatial model. The model requires only *that* one shared frame exists. Which frame, and how foreign coordinates are brought into it, belongs to a later RFC. (This is the point where mechanism most wants to leak into the model; §10 examines whether the deferral holds.)

The shared space is to geometry what a single agreed calendar is to time: a precondition for comparison, assumed rather than manipulated.

---

## 3. Geometry: the one spatial primitive

Everything else in this document rests on a single spatial primitive.

> **Geometry** is the region of the shared space that a thing occupies.

That is the whole of it. A thing's geometry is *where it is and what shape that "where" has.* It is not a separate object the thing points at; it is an intrinsic property, the spatial half of the thing's existence.

The temptation — and the entire content of most spatial vocabularies — is to admit *point, line, polygon, raster,* and *collection* as separate primitives. We do not. They are not five concepts. They are **forms of the one concept**, distinguished by intrinsic dimension and by composition, exactly as an observation and an action were two classifications of the one Event in RFC-0001.

**Forms by dimension.** A geometry occupies zero, one, two, or three dimensions of the shared space:

- **A position** (0-dimensional) — a gate, a sensor, a soil sample, a pivot's center, a machine's location at an instant.
- **A path** (1-dimensional) — a fence, a road centerline, a harvest pass, a drone flight, a surveyed property line.
- **An area** (2-dimensional) — a field, a pond, a building footprint, an irrigated circle, an inferred disease region, a management zone.
- **A volume** (3-dimensional) — a grain bin's capacity, soil horizons, the airspace a drone is cleared to fly. Rarely needed, but the model must not forbid it, or it forecloses parts of the physical world it claims to cover. (§10 asks whether admitting it is foresight or speculation.)

Which form a thing takes is a modeling choice about *what matters* — a road may be a path when routing matters and an area when its footprint matters — not a fact about the road. The same real thing may warrant different forms for different purposes; the model permits this and lets identity (§4), not geometry, decide sameness.

**Composition.** A geometry may be *simple* or a *collection* of geometries. A farm is often several disjoint parcels; a field may be multipart; a management zone may be scattered patches. "Collection" is therefore not a fifth form and not a separate primitive — it is the statement that **geometry composes**, that one thing's occupied region may be several regions taken together. Composition of geometry is intrinsic, the way an area's perimeter is intrinsic.

### 3.1 The raster question

A raster — a satellite tile, an elevation grid, an NDVI surface — is the concept most often mistaken for a geometry form. It is not one, and refusing it is one of this document's load-bearing reductions.

A raster is **a field of sampled values over an extent.** Decompose it and two different things fall out:

1. **The extent** — the area the raster covers. This *is* geometry: a 2-dimensional area, nothing new.
2. **The grid of values** — reflectance, elevation, index — sampled across that extent. This is not shape. It is *content* — precisely the payload RFC-0001 assigned to Event (a captured image, a measured surface) or Assertion (a computed NDVI, an interpreted soil map).

So a raster is an *area geometry* bearing *sampled payload*, and the payload belongs to the Event or Assertion, not to the spatial model. "Coverage" — a value defined continuously over a region — is the same reduction: an extent (geometry) plus a field of values (payload). The spatial model needs to represent *the where* of a raster, and the where is an area. The values are somebody else's concern by design.

This keeps Geometry pure: it describes *occupied space and its shape*, never *what is true within that space*. The instant geometry starts carrying values, it has absorbed Event and Assertion, and the ontology's most important boundary — fact and inference kept separate from mere location — begins to erode.

### 3.2 Everything fits

The test of a spatial model is whether the physical world fits without a residue of special cases, and without privileging fields. It does. Fields, ponds, footprints, zones, and inferred regions are areas; roads, fences, passes, and flights are paths; gates, sensors, and samples are positions; bins and soil profiles are volumes; multi-parcel farms are collections; imagery and elevation are areas bearing payload. Nothing in the physical world of a farm asks for a spatial form outside *position, path, area, volume,* and *composition thereof.* A vocabulary that needs only these, and privileges none of them, is the smallest one that still holds everything.

---

## 4. Identity is not geometry

A thing is not its shape. This is the most important thing the spatial model borrows from the ontology and the easiest to forget once everything has coordinates.

RFC-0001 gave Entity a *persistent identity* — a continuous subject that stays "the same thing" while its attributes change. Geometry is one of those attributes, and it is among the most changeable. Three consequences follow, and they discipline the entire model:

- **Geometry changes; identity does not.** A field whose boundary is redrawn is the same field. The correction is an Event (RFC-0001 §3.2); the field's identity survives it untouched. "The geometry of a thing" is therefore always *its geometry as of a time* — geometry is time-varying, and the temporal mechanism that versions it belongs to RFC-0004. This document only insists that geometry be understood as a property that moves, never as the thing itself.
- **Sameness of geometry is not sameness of thing.** A field and a management zone may occupy the identical area and remain two distinct things with two identities. Coincident geometry is common and carries no implication of identity. The map may show one outline; the model knows two subjects.
- **A thing may hold different geometric forms for different concerns** (§3) without becoming several things, because identity, not shape, decides what is one.

The rule that falls out of this governs §7: **you refer to a thing by its identity, never by its geometry.** Geometry is looked up through identity and may have changed since you last looked; a reference that froze a shape would silently rot as the world moved. Identity is the stable handle; geometry is the moving attribute it resolves to.

---

## 5. Relationships are derived, not declared

Here is the payoff of the single shared space, and the deepest idea in this document.

Because every geometry lives in one comparable frame, the spatial relationships between things are **computable from their geometries.** They are facts *about* geometry, not facts *stored alongside* it. The model does not record that one thing contains another; it can *see* that it does, because both occupy the same space.

- **Containment (spatial).** A thing is spatially within another when its geometry lies inside the other's. That field is *in* that farm because its area falls within the farm's area — a derived fact, recomputed from the two geometries, never asserted and never maintained by hand. When either geometry changes, the relationship changes with it, automatically, because it was never a stored claim in the first place.
- **Adjacency.** Two things are adjacent when their geometries touch — sharing a frontier without overlapping. Two fields separated by a fence are adjacent; the fence itself is adjacent to both. Adjacency is derived identically to containment, from the geometries alone.
- **Overlap, proximity, direction, distance.** Two zones overlap where their areas intersect; a sensor is *near* a field within some distance; a building is *north of* a pond. All are the same kind of derived spatial fact, read from geometry on demand.

This is why RFC-0000 could call geography "the natural join" and promise that relationships come "for free." They come for free *because they are derived.* A model that stored spatial relationships as declared facts would have to maintain them against every geometric change and would drift out of truth the moment it missed one. A model that derives them cannot drift, because there is nothing to maintain — the geometry *is* the relationship.

**One essential distinction.** Not every relationship people call "containment" is spatial. That a field *belongs to* a particular farm or owner is a **structural or semantic relationship** — a composition (Entity ⟷ Entity, from RFC-0001) or an ownership fact (Actor ⟷ Entity) — that is *asserted*, not computed. It usually coincides with spatial containment but need not: a parcel may sit geographically within one operation's footprint while belonging, by decision or by deed, to another. The spatial model derives only the *geometric* relationships. Membership, ownership, and part-of-by-decision live in the ontology and may agree or disagree with geometry. Keeping these two kinds of containment distinct — the one space computes and the one people declare — is what stops the model from mistaking "is near" for "belongs to."

**Boundaries, dismissed.** With relationships derived, "boundary" evaporates as a primitive. A boundary is one of three things already accounted for: the *frontier of an area* (intrinsic to 2-dimensional geometry, not a separate object), a *path in its own right* (a fence or surveyed line — a 1-dimensional geometry with its own identity), or the *adjacency* between two areas (a derived relationship). There is nothing left for a "Boundary" primitive to be. Treating the boundary as the fundamental spatial object is a field-centric habit — it imagines the world as parcels and their edges — and the world is roads, machines, storms, and volumes as much as it is parcels. The model refuses the habit.

---

## 6. Visibility

Visibility is discussed here without a single mention of rendering, because — stripped of pixels — visibility is a purely spatial idea:

> **Visibility is the set of things present within a region of interest.**

Given any region of the shared space — a window someone is attending to — visibility is the derived answer to *"what is here?"*: every thing whose geometry intersects that region. It is another derived spatial relationship (§5), the intersection of the world's geometries with a query extent, and (once time enters, in RFC-0004) with a moment or interval as well: *what is here, and when.*

This is the concept a rendering surface would later consume to decide what to draw, and the concept an AI would consume to know what it is looking at (RFC-0000 §2.3). But the concept itself is not drawing and not a viewport. It is spatial presence within a bounded region — computed, never stored, belonging to no single thing but arising from all of them against a query. Naming it here, free of any surface, is what lets later RFCs build surfaces on top of it without smuggling rendering into the model. (§10 asks whether "visibility" is truly distinct from the general spatial query of §5, or merely a name for one.)

---

## 7. References and selection

Two connective concepts remain — how things point at things, and how a set of things is held.

**Reference.** A reference is a link to a thing *by its identity.* Events reference the things they occurred to; Assertions reference the subjects they are about and the evidence they derive from; a composite thing references its parts; a selection references its members. The rule from §4 is absolute: **references are by identity, resolved to geometry on demand, never by frozen geometry.** A reference names *which thing*; the thing's shape and place are looked up when needed and may have moved since. This is what lets history accumulate and geometry evolve without invalidating everything that ever pointed at a thing. A reference is not itself spatial — it carries no geometry — but it is the mechanism by which the spatial world is woven together, so it is defined here.

**Selection.** A selection is a set of references — a chosen collection of things the model, or an Actor, is currently attending to. It is not derived from geometry, because it is a *choice*; but a choice is frequently *produced* by a spatial query. Draw a region, take its visibility (§6), and the intersecting things become a selection. So selection is where the derived (a spatial query) and the deliberate (an explicit pick) meet: a set of identity references, however arrived at. It composes entirely from references and adds no spatial primitive of its own — which raises the fair question, examined in §10, of whether selection belongs to this model at all or to the interaction RFC that will consume it.

---

## 8. Challenge log: merged and rejected spatial nouns

The audit trail of the reduction, in the manner of RFC-0001 §4.

| Spatial noun | Disposition | Reasoning |
|---|---|---|
| **Point** | → form of Geometry | 0-dimensional geometry. A classification by dimension, not a primitive. |
| **Line / Path** | → form of Geometry | 1-dimensional geometry. |
| **Polygon / Area** | → form of Geometry | 2-dimensional geometry. |
| **Volume** | → form of Geometry | 3-dimensional geometry. Rare, but the world has volumes; the model must not forbid them. |
| **Raster** | → area geometry + payload | Its *where* is a 2D area (geometry); its grid of values is Event/Assertion payload, not shape (§3.1). |
| **Coverage / Field-of-values** | → area geometry + payload | Same reduction as raster. Continuous values over a region are payload, not geometry. |
| **Collection / Multipart** | → composition of Geometry | Geometry composes; a collection is one thing's several regions, not a new primitive. |
| **Coordinate system / Projection / Datum** | → deferred (mechanism) | The model assumes *one shared frame*; the enumeration and conversion of specific frames is reconciliation mechanism (§2). |
| **Boundary** | → frontier / path / adjacency | The edge of an area (intrinsic), or a 1D geometry with its own identity, or a derived adjacency. Nothing left to be a primitive (§5). |
| **Containment (spatial)** | → derived relationship | Computed from two geometries in the shared frame; never stored (§5). |
| **Adjacency / Overlap / Proximity / Direction / Distance** | → derived relationships | All read from geometry on demand; not primitives. |
| **Containment (structural) / Membership / Ownership** | → ontology, not geometry | Asserted relationships (Entity⟷Entity, Actor⟷Entity), which may or may not align with spatial containment (§5). |
| **Geometry** | **admitted — the one spatial primitive** | Irreducible: the region of shared space a thing occupies (§3). |
| **Identity** | → inherited from ontology | Not new here; reaffirmed as distinct from and more stable than geometry (§4). |
| **Visibility** | → derived spatial query | The things present within a region of interest; computed, not stored (§6). |
| **Reference** | → connective, by identity | A link to a thing by identity, resolved to geometry on demand (§7). Not spatial itself. |
| **Selection** | → set of references | A chosen set, often produced by a spatial query; composes from references (§7). Possibly belongs to interaction (§10). |

---

## 9. The frozen spatial model

One primitive. One assumption. Everything else derived or composed.

- **Assumption — one shared space.** A single, earth-fixed reference in which all geometry is expressed and comparable. Specific coordinate systems are deferred mechanism.
- **Primitive — Geometry.** The region of shared space a thing occupies. Forms by dimension: *position, path, area, volume.* Composes into collections. Carried by Entity, Event, and Assertion; not by Actor. Distinct from, and more changeable than, the identity that owns it.
- **Derived — spatial relationships and visibility.** Containment, adjacency, overlap, proximity, direction, distance, and presence-within-a-region are all computed from geometry, never declared.
- **Connective — reference and selection.** Things are pointed at by identity and gathered into sets of such pointers; geometry is resolved on demand, never frozen into the pointer.

Structural containment, ownership, and membership are *asserted* in the ontology and are not part of the spatial model, though they often coincide with derived spatial facts.

---

## 10. Self-review

A reduction should distrust its own tidiness. The pressure points, honestly.

**Should coverage / raster be a second spatial primitive?** This is the hardest call in the document, and the one most likely to be revisited. I have insisted a raster is an area plus payload, keeping Geometry about shape alone. But a continuous field of values — elevation, an index surface — genuinely *feels* geometric: its meaning is inseparable from where each value sits, and "an area with a grid stapled on" may undersell that a coverage is a first-class spatial object with its own sampling structure. My defense is the ontology's central boundary: the moment geometry carries values, it has swallowed Event and Assertion, and fact-versus-inference-versus-location stops being separable. I would rather keep Geometry pure and let coverage be payload-over-an-extent. But if a later RFC finds that continuous fields need spatial behavior that discrete geometry cannot express, "coverage" is the second spatial primitive most likely to earn admission. Flagged as the primary open question.

**Is Volume foresight or speculation?** I admitted a 3-dimensional form on the argument that the physical world has volumes and the model must not forbid them. But a farm-intelligence platform may never once need a true volume — bin *capacity* is a number, soil horizons may be modeled as stacked areas, drone airspace may be a permissions concern. If nothing ever instantiates a volume, I have admitted a form to satisfy a symmetry, which is exactly the implementation-driven padding §0 forbids, only inverted. I have kept it because forbidding a whole dimension of space is a heavier mistake than carrying an unused form, and because the cost of an unused form is nearly zero. But this is a judgment call, not a certainty, and a reasonable reviewer could strike Volume until a real case appears.

**Does the single-shared-space assumption survive contact with the earth?** §2 waves at "one shared, earth-fixed reference" and defers all projections and datums as mechanism. This is where the model is thinnest. The earth is curved; there is no single flat frame that is true everywhere; distance and area computations depend on the projection chosen; foreign data arrives in a dozen frames. I have called all of this "reconciliation mechanism," but the line between *the assumption of one comparable space* and *the machinery that makes comparison actually correct* is not as clean as §2 implies. The model is honest that it assumes what it does not build. If the deferral proves untenable — if the choice of frame turns out to change *conceptual* answers and not merely computed ones — §2 is where this document will need amending.

**Is "Visibility" a real concept or a renamed spatial query?** §6 defines visibility as the things present within a region of interest, and §5 already defines intersection-with-a-region as a derived spatial relationship. Visibility may therefore be nothing more than one spatial query with a friendlier name, admitted only because the task asked me to discuss it. I have kept it separate because "what is present in the window I am attending to" is a distinguished, recurring query that later surfaces (rendering, AI context) will lean on by name — but I concede it adds no spatial *primitive* and could fairly be folded into §5 as an example rather than a section.

**Does Selection belong in the spatial model at all?** §7 admits selection as a set of references, but selection is arguably an *interaction* concept — what a user or agent has picked out — and RFC-0000's interaction and viewport machinery is explicitly deferred to a later RFC. I included it because the task named it and because it is where a spatial query becomes a held set, but it carries no geometry and adds no spatial primitive. It may rightly belong to the Map Interaction RFC, with only "reference" retained here. I lean toward keeping reference and moving selection out; I have left it in pending that RFC.

**Did I merely restate the ontology on Identity?** §4 leans hard on Entity's persistent identity from RFC-0001 and could be accused of adding nothing. My defense is that the *spatial* consequences of identity — geometry is time-varying, coincident geometry is not sameness, references resolve by identity not shape — are not stated anywhere in RFC-0001 and are essential discipline for a spatial model. The concept is inherited; its spatial consequences are new and load-bearing.

**Is "relationships are derived" too absolute?** §5 claims spatial relationships are always computed, never stored. This is conceptually right and is the whole payoff of Spatial-First, but a wholly derived stance says nothing about the cost of deriving, and a reader could mistake the principle for a promise that derivation is free. It is not; it is merely *always possible and always true*, which is the property that matters at this altitude. The cost of computing relationships is a mechanism concern, correctly absent here — but I note the omission so no later RFC reads "derived" as "cheap."

**Overall.** The parts I am most confident in are the single primitive (Geometry with forms) and the derivation of relationships — both are clean, total, and field-agnostic. The part I am least confident in is the raster/coverage reduction, which I have made deliberately and would defend, but which is the seam most likely to move. If this spatial model is wrong, it is probably wrong about whether a continuous field of values is payload or geometry. That is stated plainly so the next author knows which stone to turn over first.

---

*This RFC gives the spatial dimension its shape without adding to the vocabulary. RFC-0004 gives the temporal dimension the same treatment — how geometry, and everything else, changes through time while history is preserved.*
