# RFC-0014 — Frontend State Architecture

| | |
|---|---|
| **RFC** | 0014 |
| **Title** | Frontend State Architecture |
| **Status** | Draft |
| **Author** | Bradley |
| **Created** | 2026-07-23 |
| **Depends on** | RFC-0002, RFC-0004, RFC-0006, RFC-0010, RFC-0012 |
| **Supersedes** | — |
| **Superseded by** | — |

---

## 0. Purpose and method

The platform's semantics are complete and its outer boundary is contracted (RFC-0012). This document designs the last conceptual layer before pixels: **the state model of the application itself** — what the running client *holds*, categorically, and why it can hold nothing else.

The design is independent of any framework, and not merely as a hygiene rule: frameworks are mechanism, and state-shaped mistakes outlive every framework migration. What this document freezes is the answer any framework must implement: which state exists, who owns it, what may be derived, and what may never be stored.

The thesis is an inventory with a closed bottom:

> **The application holds exactly three things: a Reading of the world, a View onto it, and Pending work not yet given to it.** Everything the interface will ever display, and everything the task's list names — selection, layers, time, editing, AI context, user context — lives in one of the three or is derived from them on demand. There is no fourth store.

This is the series' drift-refusing pattern in its final appearance: every prior RFC refused a maintained parallel structure (timelines, layers, access registers, knowledge graphs, identity maps, sync state), and the application is where all of those refusals either pay off or quietly die. A client that grows its own shadow copies of the world — its own field list, its own permission cache with private semantics, its own "current state" it mutates — rebuilds inside the product every disease the architecture spent thirteen documents curing. The three-store model is the discipline that prevents it.

---

## 1. The three stores

| Store | What it is | Authority | On loss |
|---|---|---|---|
| **Reading** | the world as known: a scoped projection at a knowledge-time watermark (RFC-0012 §3) | none — the world is authoritative; the Reading is derivative | re-project; nothing is lost |
| **View** | the way of looking: spatial scope, temporal binding, lens stack, selection (RFC-0006 §1) | the viewer's — it is *their* attention | minor; restore a remembered View or start fresh |
| **Pending** | work not yet given to the world: gestures, drafts, unadmitted submissions, the Engagement | the client's — nothing else holds it | **real loss** — the only fragile state in the application |

The loss column is the model's sharpest teaching, because it inverts the traditional client's anxieties. A conventional application fears losing its server sync and treats local UI state as disposable. Here the Reading is *disposable by construction* (it is a value, reproducible from its parameters — RFC-0012 §1) and the View is nearly so (a cheap value, RFC-0006 §1.4); the only state whose loss destroys anything is Pending — the note half-written in a dead zone, the boundary half-drawn, the submissions queued for readmission. One conceptual duty follows and is stated normatively: **Pending is durable locally until admitted.** Everything else may evaporate freely, because everything else can be re-derived — and *knowing* what can evaporate is most of what a state architecture is for.

---

## 2. The Reading: the world held, never owned

The Reading is the client's copy of its accessible sub-world — some portion of it, projected at watermark K — and three rules govern it entirely:

- **It is never authoritative.** The client holds knowledge-as-of-K, honestly stale (RFC-0012 §3), with the staleness displayable and reasoning-relevant. There is no client-side "truth" to reconcile with the platform's; there is a reading of the truth, and a walk that advances it monotonically. Refresh is not reconciliation; it is *learning more*.
- **It is append-only in the client too.** The walk delivers new records — including supersessions and retractions — and the Reading grows the way the world grows. The client never edits its Reading; it receives history and re-derives. This makes client-side consistency trivial in the exact way it is usually hard: nothing in the Reading is ever wrong-then-corrected-in-place; it is only ever superseded-by-more.
- **Everything shown is derived from it, and nothing derived is stored.** Visibility within the current scope, projected state as-of the bound time, timelines, spatial relations, inspection bundles, staleness badges, layer contents — all are projections of Reading-through-View, computed on demand and discarded. The normative rule, the client-side twin of every "derived, never declared" in the series: **no shadow structures.** The client maintains no second representation with its own lifecycle — no mutable object graph, no denormalized "current state" store, no cached permission verdicts with private semantics. (Whether a framework *memoizes* derivations is mechanism; memoization holds no semantics and may be dropped at will. The moment a cached derivation can disagree with a fresh one and win, it has become a shadow structure, and the rule is broken.)

Even *who the user is here* lives in the Reading: the session's Actor, its representation chain, and its sub-world are projections of grant history (RFC-0002 §5, C4) — knowledge-at-K like everything else, which is precisely why offline capability evaluation lags honestly (RFC-0012 §5).

---

## 3. The View: attention as a value

The View is inherited whole from RFC-0006 §1 — spatial scope, temporal binding, lens stack, selection; one per viewer per surface; a value, not a place — and this document adds only its *state semantics*:

- **View state, selection state, layer state, and time state are one state.** The task lists them separately; the architecture long ago made them components of a single value. This is not a technicality — it is the guarantee that they can never desynchronize: there is no way for "the selected thing" to belong to a different moment or a different lens stack than "the visible world," because selection, time, and lenses are fields of the same value, changed together or not at all.
- **History is free, and undo is navigation.** Because every change of attention produces (conceptually) a new View value, the trail of recent Views is a trivial history, and *undo* — for the four consequence-free verbs — is stepping back along it. Nothing needs unwinding, because Navigate, Reveal, Indicate, and Ask never changed anything but the View (RFC-0006 §2, first law). Undo for authorship is categorically different and does not exist as undo: the world is append-only, and reversal is retraction or supersession — an act, not a rewind (§4).
- **Views persist by being values.** "Resume where I left off" is a remembered View; "share what I'm seeing" is a transmitted View; "my default way of looking" is a kept View — and a View worth keeping *by name* crosses the promotion gate and becomes world content (RFC-0002 §8.6), shareable by ordinary grant. The client needs no separate mechanism for workspace persistence, bookmarks, or presets; all are Views at different degrees of ceremony.
- **Multiple surfaces are multiple Views** over one Reading — two windows, a phone and a desktop, a map and a subordinate list (RFC-0006 §6) are Views diverging in attention while sharing knowledge. Nothing synchronizes them *as state*; they are simply two ways of looking at the same held world.

---

## 4. The Pending: the only state that is anyone's work

Everything in flight between a gesture and the world, in four kinds:

- **Gestures** — drawn regions, measurements, transient search lenses: View-resident, ephemeral-until-promoted (RFC-0006 §3, second law). They are attention-shaped, cost nothing to lose in principle, and graduate to drafts the moment intent to keep them appears.
- **Drafts** — *editing state*, resolved: to "edit" is to compose a **candidate record** — the boundary correction being dragged, the note being written, the zone being outlined — which is a draft Event or Assertion that does not exist in any world sense yet. The world has no draft state (nothing enters it except whole, admitted, attributed records), so drafting lives entirely in Pending, and "edit mode" is simply the client holding an open draft. Abandoning a draft deletes nothing from the world, because it never touched the world — which is what makes editing safe to begin, everywhere, always.
- **Submissions** — drafts committed by their author but not yet admitted: the offline queue of RFC-0012 §5, carrying occurrence time from the field and awaiting knowledge time at readmission. Between commitment and admission they are displayed *as what they are* — and this resolves the optimistic-update problem conceptually rather than mechanically: **the client never pretends its submission is the world.** It renders Reading *plus* Pending, distinguishably: here is what is known, and here is what I have said that the world has not yet heard. When the walk delivers the admitted record, the submission retires and the content appears as world — no rollback machinery, because no lie was told that would need retracting.
- **The Engagement** — the AI exchange (RFC-0010 §2, stratum 4): asks, answers, circled regions, the conversation's thread. Apparatus, private, evaporating unless promoted — and held in Pending because that is exactly what Pending is: work-with-the-world that the world does not yet (and may never) contain.

The unifying property: Pending is the *authorship pipeline* — gesture → draft → submission → admitted — with the promotion gate (RFC-0006 §3) as its first threshold and admission (RFC-0011 §2) as its last. The client's most important duty (§1) is to carry this pipeline safely across crashes, closures, and dead zones, because it is the one store that is genuinely *somebody's work*.

---

## 5. The task's list, mapped

The exhaustiveness test, in the series' manner — every named state finds its store, with no additions required:

| Named state | Where it lives | Notes |
|---|---|---|
| **View state** | the View | the value itself |
| **Selection state** | the View (selection field) | identities, never marks (RFC-0006 §3); co-moves with time and lenses by construction |
| **Layer state** | the View (lens stack) | activation, filters, arrangement — attention, not content |
| **Time state** | the View (temporal binding) | scrubbing is Navigate; the whole Reading re-projects as-of |
| **Editing state** | Pending (drafts) | candidate records; the world holds no drafts |
| **AI context** | **derived** — no store | Frame = View; Gesture = View + Pending gestures; Neighborhood = projected from Reading; Engagement = Pending (RFC-0010 §2). Context assembly is reading, not construction — the client keeps no separate AI-context state |
| **User context** | Reading (actor binding, sub-world — projected from grants) + remembered Views | *who I am here* is knowledge; *how I like to look* is Views; no client-side dossier exists, matching RFC-0010's refusal of a durable user-model |

Two rows deserve their emphasis. **AI context** has no store: the four strata are the other stores seen from the intelligence's side, which is RFC-0010's "situated, not briefed" made literal in state architecture — there is nothing to keep synchronized between "the app's state" and "what the AI sees," because they are the same state. **User context** dissolves into knowledge plus preference-as-Views: the application knows who is acting from the same Reading that tells it everything else, and it remembers *ways of looking* rather than accumulating a private model of the person.

---

## 6. The state laws

Gathered from the sections, the four laws any implementation must honor:

1. **Three stores, no fourth.** Reading (derivative, disposable), View (a value, cheap), Pending (fragile, durable-locally). Any proposed new store must reduce to one of these or amend this document openly.
2. **Derive, don't shadow.** Everything displayed is a projection of Reading-through-View plus Pending; no derived thing is stored with a lifecycle of its own; caches may accelerate but never adjudicate.
3. **The client never lies about authority.** Reading is rendered as knowledge-at-a-watermark; Pending is rendered as not-yet-world; the two are never blended into a false present. Optimism is honesty about what you have said, not pretense about what is true.
4. **Loss is triaged by store.** Reading and View may evaporate (re-derive, restore); Pending must survive until admitted. Engineering effort follows fragility, and only Pending is fragile.

---

## 7. The frozen state model

- **Reading** — the accessible sub-world at a watermark: derivative, append-only in the client, monotonically advancing, source of every derived display including the actor binding itself.
- **View** — attention as a value: scope, time, lenses, selection as one undesynchronizable state; history as free undo for the consequence-free verbs; persistence, sharing, and presets as Views at increasing ceremony.
- **Pending** — the authorship pipeline: gestures, drafts (the whole of editing state), submissions (displayed as not-yet-world), and the Engagement; the only fragile store, durable locally until admitted.
- **AI context and user context are not stores** — the first is derived (the strata map onto the three stores), the second dissolves into Reading-knowledge and remembered Views.
- **Four laws**: three stores only; derive-don't-shadow; never lie about authority; triage loss by store.

---

## 8. Self-review

**Is "no fourth store" true, or true-until-Tuesday?** The exhaustiveness claim is the document's spine and its exposure. Candidates that tested it during drafting: notifications (a delivered alert is Reading content — an authored Assertion arriving on the walk — plus View-side acknowledgment state, which is attention; it decomposed); in-progress payload uploads (Pending submissions with large payloads; mechanism-heavy but store-shaped like any submission); co-presence (another viewer's live cursor and View — genuinely *not* mine to hold as Reading, View, or Pending, and the honest answer is that co-presence was deferred by RFC-0006 §10 and remains deferred: when it is designed, it will need either a fourth category — *others' ephemeral attention* — or an extension of Reading to carry ephemeral non-world knowledge. That is the known crack in the exhaustiveness claim, named rather than papered over.)

**Does Pending conflate four things that deserve separation?** Gestures, drafts, submissions, and the Engagement share ephemerality and locality but differ in fragility (gestures are cheap, submissions are precious) and in ownership (the Engagement is a *dialogue*, half of which the client's user did not author). I kept them unified because they share the property that architecture cares about — not-yet-world, therefore client-held — and split the fragility difference with the loss-triage law instead of with stores. A reviewer could reasonably prefer Pending split into *ephemera* and *outbox*; I judge that an implementation layering, not a conceptual boundary, but it is the model's most compressible seam.

**Is the memoization escape hatch a hole in law 2?** "Caches may accelerate but never adjudicate" draws a line that every real client will walk up against daily: memoized derivations, spatial indexes over the Reading, prepared layer contents — all fine until one of them survives a Reading advance and answers stale. The law's test (can the cache disagree with a fresh derivation *and win*?) is crisp conceptually and demands discipline mechanically; this document can state the law but not enforce it, which is the same enforcement gap the sub-world rule carries (RFC-0002 §10) — real, known, and delegated to review culture rather than to architecture.

**Did this document need to exist?** Like RFC-0007, it is a consolidation risk: the View is RFC-0006's, the Reading is RFC-0012's watermark made resident, Pending generalizes RFC-0006's second law, and the AI rows restate RFC-0010. The novel contributions are the exhaustiveness claim itself, the loss-inversion (Pending as the only fragile state — nowhere previously stated and easy to get fatally wrong), the resolution of editing state as drafts-outside-the-world, and the optimism-as-honesty rule. I judge those sufficient — a state model is precisely the place where consolidation *is* the work — but this is the second document in the series whose contribution is arrangement rather than invention, and the self-awareness is kept on record.

**What was deliberately not designed.** Partial Readings (a client cannot hold a decade of imagery; which *portion* of the sub-world is resident is mechanism's economy, with one conceptual anchor: a partial Reading is still a Reading — scoped, watermarked, honest about its bounds); co-presence (above); and the rendering boundary itself — how derived projections become pixels is RFC-0015's subject, and this document ends exactly where drawing begins.

**Overall.** Highest confidence: the loss-triage inversion and drafts-outside-the-world — both are direct consequences of frozen commitments (values re-derive; the world admits no drafts), and both contradict default client-engineering instinct sharply enough to be worth a document. Lowest confidence: the exhaustiveness of three stores, which carries a named crack (co-presence) and will be tested by every feature the platform ever grows. If this RFC is wrong, it is wrong there — and the amendment path is the one the series always uses: openly, here, never as a quiet fourth store that shadows the world. Stated plainly, so the first client built on this model knows which law will be hardest to keep.

---

*This RFC closes the application's interior: three stores, four laws, nothing shadowed, nothing lied about, and only one thing fragile enough to guard. What remains is the machinery beneath (persistence, RFC-0013), the surface above (rendering, RFC-0015), the first cut (RFC-0016) — and the lifecycle document (RFC-0008) still owed at the heart of the series.*
