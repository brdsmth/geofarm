# RFC-0000 — Vision and Design Principles

| | |
|---|---|
| **RFC** | 0000 |
| **Title** | Vision and Design Principles |
| **Status** | Draft |
| **Author** | Bradley |
| **Created** | 2026-07-23 |
| **Revised** | 2026-07-23 — Amendment 1 (per REVIEW-002; includes pending REVIEW-001 §9 items) |
| **Supersedes** | — |
| **Superseded by** | — |

---

## 0. Purpose of this document

This is the founding document of geofarm. It does not describe a system. It describes the *shape of thinking* that every subsequent RFC must inherit.

RFC-0000 introduces no primitives, no models, no storage, no interfaces. Those are the work of the RFCs that follow. This document answers a smaller and more important set of questions: **what are we building, why does it take the form it takes, and what must never be compromised.**

Every future RFC is required to open by stating which principles in this document it advances. An RFC that cannot connect itself to a principle here is either premature or out of scope.

---

## 1. The problem

Farms already produce an enormous amount of information. Field boundaries, soil types, weather, satellite passes, scouting notes, equipment telemetry, disease pressure, irrigation state, yield outcomes — all of it exists. Almost none of it is *coherent*.

Today this information lives in disconnected tools. Each tool answers one question, stores its own version of the world, and forgets the moment you look away. The boundary in the mapping app is not the same boundary the agronomy report assumes, which is not the boundary the equipment logged its pass against. There is no shared idea of *the farm* that all of these things agree on.

The consequence is that the person who runs the farm is forced to be the integration layer. They hold the model in their head. They translate between tools. They remember what happened last season because no system reliably does. The intelligence lives in the operator, and it leaves when they do.

**geofarm exists to give a farm one canonical model of itself** — a single, shared, living representation that every observation, every operation, and every decision refers back to. Not a dashboard that summarizes data. A model of the world that the data describes.

The stakes of this framing are the entire product. A summarizing tool competes on features. A canonical model of reality competes on being *true* — and everything true about a farm begins with where it is.

One clarification, added by amendment: the farm is not operated by one person. Owners, managers, operators, agronomists, consultants, contractors, seasonal crews, lenders, adjusters, machines, and AI agents all touch the same operation — and the canonical model is one world read through many bounded views of it, not a private tool multiplied. Every principle below is to be read in the plural. *(Amendment 1, per REVIEW-001.)*

---

## 2. The principles

Six principles follow. The first five are ordered, because they build on each other: Spatial-First is the ground, and everything else stands on it. The sixth stands slightly apart — the first five say what the platform *is*; the sixth says what it must never *cost*.

### 2.1 Spatial First

**Geography is not one attribute of a farm. It is the attribute from which the others hang.**

Consider anything that matters on a farm — a field, a stand of equipment, a rain event, a scouting observation, a disease outbreak, a soil sample, a harvest pass, a broken gate. Every one of them has a location. The location is not metadata attached to the thing; it is frequently the most stable and most queryable fact about the thing. Names change. Ownership changes. Crops rotate. The two acres in the northwest corner that flood every spring do not move.

Because location is universal, it is the only axis on which *everything* on a farm can be related to everything else. Two observations taken by different tools, in different formats, at different times, become comparable the moment they share a coordinate. Geography is the natural join. It is the one language every part of the farm already speaks.

This is why Spatial-First is foundational rather than a feature. A system that treats space as one column among many will forever be reconciling its other columns by hand. A system that treats space as the organizing substrate gets coherence for free: things that are near each other, overlap each other, or contain each other are *relatable* without anyone declaring the relationship in advance.

The commitment this principle demands is uncomfortable and deliberate: **nothing enters the model without a place.** If something matters to the farm, it has a location, even when that feels like extra work. Equipment has a location. A document about a field has a location. A recommendation is about somewhere. The moment we allow "important but placeless" objects, we have reintroduced the disconnected world we are trying to replace.

One boundary, added by amendment: this commitment governs *world content* — what exists, happens, and is claimed on the farm. *Agency* — the people, organizations, services, and intelligences that act upon the world's model — may originate outside the world and carries no location by virtue of acting. The satellite provider is not on the farm; its data is. *(Amendment 1, executing the revision RFC-0001 §6 requested.)*

### 2.2 The map is the application

Most software of this kind treats a map as a feature — one view among several, reached through a menu, showing a subset of the data. We reject that arrangement completely.

**In geofarm, the map is not where you look at the farm. The map is the farm.** It is the primary surface, the home screen, the thing that is always present. Every other capability — history, layers, intelligence, operations — is something you do *to* or *through* the map, not somewhere else you navigate to.

This follows directly from Spatial-First. If geography is the substrate that makes the farm coherent, then the interface to that coherence must itself be spatial. A menu-driven dashboard forces the user to decompose a fundamentally spatial reality into lists and tables and then reassemble it in their head. The map does the reassembly for them. It is the one representation in which the farm looks like itself.

The mental model we are designing for is **"zoom around my farm,"** not "navigate through menus." The reference points are spatial-exploration tools — the ones people use to fly over terrain, replay flight paths, watch weather move, and drop into a location and understand it instantly. They are not productivity dashboards. A user should be able to sit down, see their whole operation, and move fluidly from the entire farm down to a single sensor without ever leaving the one surface they started on.

This has a strong consequence for how we judge every future decision. A capability is not "added to geofarm" until it has a place on the map. If a feature can only be expressed as a page somewhere else, that is a signal the feature has not yet been understood spatially — and understanding it spatially is our job, not the user's.

### 2.3 AI is embedded, not adjacent

The conventional move is to add an assistant: a chat box, off to the side, that you converse with about your data. This makes the AI a separate feature — a place you go, a mode you enter, a context you must manually describe before the assistant can help you.

We consider that a failure of imagination. **Intelligence in geofarm is not a room you visit. It is a property of the surface you are already on.**

The reason is that the map already knows the context an assistant would otherwise have to be told. Where you are looking, how far you are zoomed, what you have selected, what moment in time you are viewing, what aspects of the farm you have chosen to see — all of this is present, continuously, in the act of using the map. A separate chat throws that context away and asks the user to reconstruct it in words. Embedded intelligence inherits it.

The interaction we are designing for is: **the user gestures at reality and asks a question about it.** Circle a struggling patch of a field and ask why it is underperforming. Point at an area and ask what happened here last season. The user does not describe the situation; the situation is already on screen, and the intelligence is looking at the same thing they are. The question can be short because the context is shared.

This is only possible because of the two principles before it. Because the farm is spatial (2.1) and because the map is the application (2.2), there is always a rich, precise, ambient context available — a place, a time, a selection, a set of visible concerns. Embedding AI is not a stylistic choice about where to put a text box. It is the natural consequence of having built a system where context is always spatially present. Intelligence sits on top of that context because that is where the meaning already is.

### 2.4 History is preserved, never overwritten

A farm is not a current state. It is an accumulation. Which crop grew here three seasons ago, how the wet corner has behaved over five springs, whether this year's disease pressure is unusual or ordinary — none of these questions can be answered by a system that only knows *now*. They require the past to still be there.

Most systems overwrite. When a field's crop changes, the old crop is replaced. When a boundary is redrawn, the old boundary is gone. This is convenient for the software and catastrophic for the intelligence, because it destroys exactly the information that makes the farm understandable: how it got to be the way it is.

**geofarm treats the past as a permanent part of the model, not a thing that decays into the present.** The state of the farm at any point in its recorded life should remain recoverable. Change is recorded as an addition to history, not a mutation of the truth. The farm accumulates; it does not overwrite.

This makes time a first-class dimension of the entire system, coequal with space. If Spatial-First says *everything has a place*, this principle says *everything has a time* — and the two together define the farm as an object that exists across both. The experience we are designing toward is being able to move through the farm's history as fluidly as we move through its geography: drag across seasons and watch rotations, weather, growth, operations, and outcomes evolve. That is only meaningful if the past was never thrown away.

Preserving history is also what makes the intelligence of 2.3 worth anything. An assistant that can only see the present can only describe. An assistant that can see the trajectory can explain — because the answer to "why is this happening" almost always lives in what came before.

### 2.5 The system is event-driven

If history is preserved, then the natural unit of change is the **event** — something that happened, somewhere, at some time. A field was planted. A pass was made. A sensor failed. Rain fell. A recommendation was issued. A boundary was corrected.

We commit to understanding the farm as **the running total of everything that has happened to it.** The present state is not the primary thing that then generates a history log as a side effect. It is the reverse: the sequence of events is the primary thing, and any present state is a reading taken from that sequence. The farm *is* its history; the current view is just where the history has gotten to.

This orientation matters for three reasons, each connecting back to a principle above.

- It is what makes history real rather than aspirational (2.4). If change is modeled as events from the start, preservation is the default and overwriting becomes the thing you have to go out of your way to do — the opposite of the conventional arrangement.
- It is what lets time be navigable (2.4). A world understood as a stream of dated events can be replayed to any moment. A world understood as a mutable current state can only be shown as it is right now.
- It is what keeps the model open to a farm's genuine messiness. Things happen to farms that no one anticipated, out in the world, away from any tidy category. An event-driven world can absorb "something happened here, then" without first being asked to fit it into a predefined structure. This keeps the model honest about reality instead of forcing reality to fit the model.

Event-driven is therefore not a technical style. It is the temporal expression of taking the farm seriously as something that unfolds.

### 2.6 The system's complexity is never the user's

*(Added by Amendment 1, per REVIEW-002.)*

This platform is built for people who farm — people whose days are spent driving tractors, walking fields, repairing equipment, scouting crops, and coordinating crews. The architecture beneath them may become as sophisticated as the preceding principles demand. The experience above them must not. This is stated as an architectural invariant, not a stylistic hope:

> **The complexity of the architecture MUST NOT determine the complexity of the user experience.**

The ground of this principle is what the other five have already built. The user's mental model is meant to be *the farm itself* — place, time, weather, work, people, machines — which they already hold, expertly. Because the model corresponds to that reality (that was the entire point of principles one through five), presenting the model's content *is* presenting the farm: no metaphor layer, no training course in the system's concepts, no translation burden carried by the person in the field. The architecture is presentable to farmers precisely because it modeled reality instead of mechanism, and this principle exists to keep that achievement from being squandered at the surface.

Three commitments make it enforceable:

- **The vocabulary membrane.** The platform has two vocabularies. The internal one — frozen by the ontology and its successors — names the architecture and never crosses outward. The surface vocabulary is agriculture's own: fields, crops, records, readings, seasons, crews, shares, corrections. Every concept that surfaces must have a **faithful** projection into that language — faithful against both failure modes: no jargon (a concept a farmer cannot say in their own words may not surface as itself), and no euphemism (an approachable word may never promise more than the architecture delivers — a claim is not a "fact," an estimate is not "measured," and honesty about uncertainty, provenance, and staleness is translated into plain speech, never removed by it). A concept that *cannot* be projected faithfully is evidence of a design failure below the surface, and the design — not the vocabulary — is what gets revisited.
- **Wholeness at every scale.** Every partial engagement with the platform is a complete product. A participant using one scope, two layers, and a single verb is not using a reduced or degraded edition; they are using a small, whole projection of the same world — nothing stubbed, nothing locked-looking, nothing that only makes sense once the rest is understood. A capability that is coherent only to someone who understands the entire system fails review. (What a person *may* do is governed by access; what is *foregrounded* for them is experience policy — the two must never be conflated, and this principle licenses no capability-by-caste.)
- **The decoupling test.** At review, every future design answers one question in addition to §3's: *does benefiting from this require the user to understand the system, or only their farm?* A design that requires the system fails, regardless of its internal elegance.

This principle deliberately abstains from everything downstream of it: no layouts, no workflows, no pacing, no interface design. It constrains what a user must *understand*, never what they see — that boundary is what keeps it architecture.

---

## 3. The meta-principle: coherence over convenience

The six principles above are not a menu. The first five are a single stance viewed from five angles: **the farm is a real thing that exists in space and time, and the system's job is to model that reality faithfully and make it explorable.** The sixth is that stance's obligation to its people: the modeling may be as deep as truth requires, and the person in the field pays none of its cost.

This yields the rule that governs every RFC that follows this one:

> **Every architectural decision must reinforce the principles, not merely avoid contradicting them.**

The distinction is the whole point. It will almost always be possible to add a capability in a way that is locally convenient and quietly corrosive — a feature that lives off the map because that was faster, an object without a location because a place was hard to determine, a change that overwrites because keeping history was extra effort, an assistant bolted to the side because embedding it was harder. Each of these is individually defensible and collectively fatal. They are how a spatial, historical, intelligent system decays back into a pile of disconnected tools — one reasonable compromise at a time.

So the burden of proof runs one direction only. A proposal does not earn its place by being possible or popular. It earns its place by making the farm *more* coherent as a spatial, historical, intelligible whole. When a decision is hard, the tiebreaker is not what ships fastest. It is what keeps the model true.

Reviewers of future RFCs are expected to enforce this actively. "This works" is not sufficient. The question is always: **does this reinforce the principles, and if it appears to violate one, is the violation understood, named, and worth it?** Deviation is allowed. Silent deviation is not.

By Amendment 1, the reviewer's questions gain a sibling from §2.6: *does this design require its user to understand the system rather than the farm?* — a failing answer sends the design back regardless of internal merit. And every future RFC, and every future amendment to an existing one, must close with a **User Experience Implications** section discharging the four checks REVIEW-002 §7 defines: the projection (the capability said in farm language), the concealment (what stays hidden), the leak check (what must surface, and through what faithful words), and the wholeness check (that partial engagement is complete).

---

## 4. What this document deliberately does not do

To keep the philosophy uncontaminated by design, RFC-0000 abstains from the following on purpose. Each is the subject of its own RFC.

- **It defines no primitives.** How the world is decomposed into its fundamental concepts is the work of the ontology and world-model RFCs. This document establishes only *that* the world is spatial and temporal, not *what its building blocks are.*
- **It describes no interface.** That the map is the application is a principle; how the map behaves, how layers and time are exposed, how selection and interaction work — those are later RFCs.
- **It specifies no persistence, no storage, no interface contracts.** How history is kept, how events are recorded, how anything is stored or exchanged — none of that belongs here. Naming those mechanisms now would smuggle implementation into philosophy and let today's convenience constrain tomorrow's model.

This abstention is itself a principle. **The conceptual model must be allowed to stabilize before anything is built to serve it.** Committing to mechanisms early is how the mechanism ends up dictating the model instead of the other way around. We refuse that ordering.

---

## 5. Self-review

A founding document should be willing to critique itself. The following are the honest weaknesses and open tensions in what is written above.

**On staying at altitude.** The stated constraint was to introduce no primitives and discuss no implementation. The document holds to this, but it does so by leaning on words — *place, time, event, history, model* — that will later become load-bearing technical terms. There is a risk that readers import concrete meaning into these words prematurely. This is judged acceptable: these are the plain-English concepts the philosophy is *about*, and refusing to name them at all would make the document say nothing. But every later RFC that formalizes one of these words must be careful to note that it is doing so, and not assume RFC-0000 already pinned the definition down. It did not, on purpose.

**On the "everything has a place" commitment.** Principle 2.1 demands that nothing enters the model without a location. This is intentionally strict, and it will be tested by hard cases — information whose location is genuinely ambiguous, approximate, or absent. This document does not resolve those cases and should not; it only asserts that "placeless but important" must not become an easy escape hatch. The world-model RFC will have to decide how location behaves when it is uncertain, without abandoning the principle. If that later RFC finds the principle genuinely unworkable at the edges, that is a signal to revise *this* document explicitly — not to quietly route around it.

**On whether this is falsifiable.** A philosophy document risks being unfalsifiable — agreeable, aspirational, and useless as a constraint. The strongest defense against that here is Section 3's rule and Section 4's list of abstentions, both of which are specific enough to actually reject proposals. The document is doing its job only if some future, reasonable-sounding RFC gets sent back because it fails Section 3. If nothing is ever rejected on these grounds, this document was decoration, not a constitution.

**On the ordering of principles.** The five principles are presented as a dependency chain resting on Spatial-First. This is a genuine claim, not just a rhetorical arrangement, and it is a claim that could be wrong. One could argue history and events are equally foundational and that space is one of two grounds rather than the single ground. The document takes the stronger position that space comes first because it is the universal join, and time is layered onto spatial objects. This is a bet. It is stated plainly so that if it proves wrong, we will know exactly which sentence to revisit.

**On tone versus utility.** The document is written with conviction, and conviction can harden into dogma. The mitigation is built into Section 3: deviation is permitted when it is named and justified. This document is meant to be a strong prior, not a locked door. If a future RFC makes a compelling case that a principle is wrong for a real reason, the correct response is to amend RFC-0000 in the open — with a superseding revision — rather than to erode it silently. A constitution that cannot be amended is not respected; it is worked around.

**What would make this document better.** It would be strengthened by a small number of concrete "smell tests" — recognizable anti-patterns that indicate a principle is being violated — so that reviewers have sharper instruments than judgment alone. Those are deliberately omitted here to avoid drifting toward design, but a future revision, once the ontology exists, could add them without breaking the abstention in Section 4.

**On §2.6 (addendum, Amendment 1).** The sixth principle is this document's second experiential claim (after 2.2), and the risk that the constitution drifts product-ward is real. Its containment is its own abstention clause — it constrains what users must *understand*, never what they see — and the tripwire is explicit: the first RFC that cites §2.6 to argue about a screen has taken the principle beyond its cage, and REVIEW-002 is the reference for pushing it back. The principle's own gravest failure mode is also named there: euphemism drift, in which approachable words quietly overpromise. The membrane translates the platform's honesty; any use of §2.6 to *hide* uncertainty, provenance, or staleness is a violation of it, not an application.

---

## 6. Amendment log

| Amendment | Date | Authority | Changes |
|---|---|---|---|
| 1 | 2026-07-23 | REVIEW-002 (and pending items from REVIEW-001 §9) | Added §2.6 (the system's complexity is never the user's: vocabulary membrane, wholeness at every scale, decoupling invariant). Extended §3 with the decoupling review question and the mandatory **User Experience Implications** section for future RFCs. Added the plural-operation paragraph to §1 and the world-content/agency boundary to §2.1 (executing REVIEW-001 §9's pending RFC-0000 revisions, the latter first requested by RFC-0001 §6). Added the §5 addendum on §2.6's containment. |

---

*This RFC establishes the philosophy. It establishes nothing else. The next document, RFC-0001, begins the work of defining the world.*
