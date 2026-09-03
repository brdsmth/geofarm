# RFC-0011 — Integration Architecture

| | |
|---|---|
| **RFC** | 0011 |
| **Title** | Integration Architecture |
| **Status** | Draft |
| **Author** | Bradley |
| **Created** | 2026-07-23 |
| **Revised** | 2026-09-03 — Amendment 1 (per REVIEW-004 §6) |
| **Depends on** | RFC-0000, RFC-0001, RFC-0002, RFC-0003, RFC-0004, RFC-0007, RFC-0009 |
| **Supersedes** | — |
| **Superseded by** | — |

---

## 0. Purpose and method

RFC-0001 §4 rejected Integration as a concept — "a connector to an external system exists only because of implementation" — and left one sentence as its domain residue: *the external Actor it speaks for.* This document is that sentence, fully drawn. It defines how equipment manufacturers, weather providers, satellite constellations, accounting systems, document repositories, and sensor fleets connect to the platform — without APIs, without vendors, and without ever admitting an "integration layer" into the conceptual model.

The thesis is the residue taken seriously:

> **External systems are not connected to the platform. They are admitted to the world.** A foreign system participates the way every participant participates: as an Actor, holding grants, authoring attributed content under the world's admission disciplines, and taking scoped projections out. There is no second door, no import pipeline with its own semantics, no mirror-world of "integrated data" beside the real one. There are only new participants — and the entire integration architecture is the demonstration that the existing participation model absorbs them whole.

Connectors, formats, protocols, transport, scheduling, idempotent delivery — all mechanism, all deferred, exactly as RFC-0001 ruled. What this document designs is the *architecture of admission*: who foreign systems are, what their content becomes, how their names join ours, how their disagreements live, and what they may carry away.

---

## 1. The participant model

A foreign system enters the model by becoming what RFC-0001 already made room for: **an external Actor** — agency originating outside the world, acting on its model from without (the seam traced in RFC-0001 §6, RFC-0003 §1, RFC-0004 §7). Everything else follows from three identifications:

- **Connecting is granting.** An "integration" is, conceptually, nothing but an external Actor holding grants (RFC-0002): *author* over the scope its contributions belong in; *view* over whatever it is entitled to read. Establishing a connection is issuing grants; suspending one is revocation; the connection's entire history — when it began, what it could touch, when it changed — is grant history, auditable like all collaboration (RFC-0002 T2). No connection registry exists; the grant record *is* the registry.
- **Import is authorship.** Foreign data does not "flow into" the platform; the foreign Actor *authors world content* — Events, Entities, Assertions — attributed to it intrinsically, exactly as a scout authors notes. There is no imported-data category: once admitted, a provider's rain reading and a farmhand's rain gauge note are the same kind of thing, distinguishable only by provenance — which is precisely how a viewer filters, trusts, and weighs them (RFC-0005 §5).
- **Export is projection.** Outbound flow is the foreign Actor taking scoped projections — the same act as any viewer's reading, bounded by the same sub-world rule (RFC-0002 §2.3). The platform never conceptually "pushes into" a foreign model; the foreign system reads what its view-grants admit, and what it does beyond the boundary is beyond the model.

Bidirectional synchronization is therefore not a mode: it is an Actor holding both kinds of grant. And the machine-shaped independence RFC-0002 §3.1 preserved on purpose — *author does not imply view* — pays off here: a sensor fleet authors readings into a scope it could never browse; a lender views yield history it can never touch. Integration asymmetries are grant asymmetries, nothing more.

---

## 2. The admission disciplines

The twin's three correspondence disciplines (RFC-0007 §1) become, at the boundary, a contract:

> **Nothing is admitted without a place, a time, and a source.** Placed — in the one shared frame (foreign coordinates reconciled by mechanism; the *requirement* that they land in the shared space is conceptual, per RFC-0003 §2). Dated — bitemporally: when it was true in the world, and when the model received it. Sourced — to the authoring external Actor, with representation chains where the Actor acts for an organization.

And one further discipline that only the boundary makes visible — **epistemic classification at the border.** Foreign content arrives wearing foreign categories; admission assigns it its honest standing in the epistemic ladder (RFC-0009 §5):

- A provider's **measurement** — a station reading, a telemetry ping, a captured image — is an **Observation Event**: a faithful record of what that source reported, never wrong *as a record*, with the source's reliability carried by its track record rather than by the record's status.
- A provider's **interpretation or prediction** — a forecast, a computed index, a modeled soil property — is an **Assertion**: authored by the provider-Actor, confidence-bearing, supersedable, and *graded by the arriving record* (RFC-0007 §5). A weather provider does not import forecasts as facts; it stakes claims, and accrues the calibration history those claims earn — "this provider runs wet in the valley" is a derivable judgment the border makes possible.
- A foreign system's **first mention of a thing** — a machine the manufacturer knows and the world does not — is an **Entity introduction** (RFC-0004 §6): a new identity, authored within the Actor's grant, possibly backdated in occurrence time behind today's knowledge time.
- A **document** — an agronomy report, a contract, an invoice image — is an **Event bearing payload** (RFC-0003 §3.1); what the document *says* enters separately, if at all, as extraction: Observations and Assertions authored by whoever read it (a person, or an AI Actor doing attributed extraction) with the payload-bearing Event as evidence. Document remains rejected as a noun (RFC-0009 §5), and the boundary is where that rejection proves its worth: files never become a parallel content system, because their contents are admitted on the same ladder as everything else.

Misclassification at the border — a forecast admitted as observation, an estimate as measurement — is the integration architecture's cardinal error, because it corrupts the ladder everything downstream reasons over. The border's epistemic duty is therefore stated as an invariant: **admission preserves epistemic standing.**

*(Amendment 1, per REVIEW-004 §4.3 and §4 note — normative.)* Two consequences the first build made unavoidable, previously informal: **(a) The conservative default.** Where a source's standing is genuinely uncertain — a "reading" that is device-modeled, a "measurement" that is interpolated, a reanalysis that wears a station's clothes — the border classifies toward Assertion, never toward Observation. Admission must not *knowingly degrade* standing, and optimism is how it would. **(b) Border classification includes vocabulary.** What an adapter *calls* the records it admits — the classifications of the sites it introduces, the measurements it records, the estimates it stakes — is configuration alongside which channels are measurements. An adapter whose names are code is not yet config-and-translation, and the next layer costs it code; the S4 experiment (RFC-0016 §4) found exactly this, and a sampled-source adapter with weather in its name became a soil adapter by config alone once its names were config too.

---

## 3. Identity across worlds

Every foreign system brings its own namespace — machine serials, tile identifiers, invoice numbers, station codes — and the temptation is a mapping table. The architecture refuses the table and uses what it already has:

> **Correspondence is a claim.** That the manufacturer's machine `#8842` *is* the tractor already on the map is an identity-sameness Assertion (RFC-0009 §2): authored (by the integration's operator, a person, or an AI Actor), evidence-bearing, confidence-carrying, and supersedable. There are no silent merges anywhere in the model; every join between a foreign name and a world identity is a visible, owned, revisable act.

The lifecycle this produces is deliberately conservative:

- **Unrecognized things are introduced, not matched.** A foreign Actor authoring content about something it cannot yet name in the world introduces a new Entity under its own grant. Introduction is cheap (RFC-0004 §6) and safe: it never corrupts an existing identity.
- **Joining is a later, deliberate claim.** When the new arrival is recognized as an existing thing, the same-as Assertion joins them — and because it is a claim, it can be wrong, disputed, and superseded without loss. Two machines conflated by an over-eager match are un-conflated by superseding the claim; the histories authored against each identity were never destructively merged, so nothing must be untangled.
- **Foreign identifiers ride as payload, not as identity.** The world's references are by world identity (RFC-0003 §7); the foreign name is content carried by the introduction and correspondence records — queryable, never load-bearing.

This is slower than a mapping table and better than one: the mapping table is exactly the kind of maintained parallel structure the series has refused five times (timelines, layers, access registers, knowledge graphs, and now identity maps), and it fails the same way — silently, by drifting from the world it shadows. Claims cannot drift; they can only be wrong in public.

---

## 4. Synchronization without a synchronizer

"Sync" dissolves at this boundary, because the append-only world has nothing for a synchronizer to do. What remains are four ordinary flows:

- **Streams** — sensors, telemetry, station feeds: continuous authorship of Observation Events. Nothing accumulates but history, which is what history is for.
- **Batches** — periodic reconciliation from systems that export on their own rhythm (accounting closes, nightly manufacturer summaries): the same authorship, arriving in bursts, with knowledge time honestly marking the lag behind occurrence time.
- **Backfill** — the years of history a newly-admitted provider brings: bitemporality (RFC-0004 §1) was *built* for this. Five seasons of imagery enter with occurrence times in the past and knowledge time today; every projection thereafter distinguishes what the farm did from what the farm now knows it did. Backfill is not a special import mode; it is late-arriving knowledge, the ordinary case of §2's second discipline.
- **Upstream revision** — the foreign system changes its own past: a satellite archive reprocessed, an invoice corrected, a telemetry series recalled. The revision arrives as supersession — new records, dated now, superseding the provider's own priors — and the world remembers both: what the provider first said, what it says now, and when it changed its mind. Mutable upstreams meet an immutable record, and the record wins by absorbing rather than resisting: *their* overwrites become *our* history.

Outbound, symmetrically, there is no push: a foreign system's picture of the world is the scoped projection it takes, as fresh as its reading. Whether it polls, subscribes, or mirrors is transport — mechanism, invisible here.

---

## 5. Ownership at the boundary

Who owns what a provider authors? RFC-0002 §4.4 answered generally — ownership follows contribution — and the boundary adds one distinction, already expressible in the grant model, that maps exactly onto the commercial reality:

- **Engaged sources author under representation.** The weather service the organization pays, the manufacturer's telemetry feed for the organization's own machines, the sensor fleet it operates: these author *on behalf of* the organization (represent-grants, RFC-0002 §1.4), dually attributed — *by the provider, for the org* — and the content lands **organization-owned** with provider provenance intact. Bought data belongs to the buyer; the seller remains forever its source.
- **Independent participants author in their own right.** A neighboring operation sharing observations, a co-op contributing regional data, a public agency publishing advisories: these author under their own authority, **retain ownership**, and extend access by their own grants. Shared data belongs to the sharer; the recipient holds a scope, not the content.

The difference between data you bought and data you were shown is thus not a licensing flag bolted onto records — it is the difference between representation and independent grant, readable from the grant history like everything else about the relationship, and revocable with the honesty §4.3 of RFC-0002 fixed: ending the engagement ends further projections, never the already-authored past.

---

## 6. Conflict, dissolved into three honest cases

The boundary is where conflict anxieties concentrate, and the architecture's answer is that the dreaded case cannot occur and the real cases are already handled:

1. **Write conflicts cannot exist.** Two sources reporting simultaneously append two records. Nothing contends for a slot, because there are no slots — no current-state row for imports to fight over. The entire class of clobbering, last-write-wins, and merge-on-import failure is absent *by construction* (RFC-0004 §5), not prevented by machinery.
2. **Disagreement between sources is preserved, not resolved.** Two weather providers differ about yesterday's rainfall; the gauge disagrees with both. Three Observations stand, three provenances attached; any interpolation over them is somebody's Assertion; contradiction between claims is derived and legible (RFC-0009 §2). The model holds perspectives — and consumers, human and AI, weigh them by provenance and earned calibration rather than receiving a silently blended number no one authored. Resolution, where wanted, is authorship, attributed like all authorship.
3. **Identity disputes are competing claims.** Two integrations mapping the same foreign name to different world identities — or one mapping two foreign names to one identity wrongly — are contradictory same-as Assertions: visible, disputable, supersedable (§3). The failure mode is public disagreement, never silent corruption.

What remains — duplicate delivery, replayed feeds, out-of-order arrival — is real and belongs to mechanism: the *conceptual* record distinguishes reports by source and dual time, which is everything idempotent delivery needs to build on.

---

## 7. The cast, mapped

The test the series applies to every model (RFC-0005 §9): the required examples must fit with no special cases.

| External system | As Actor | Authors | Standing | Notable |
|---|---|---|---|---|
| **Equipment manufacturer** | engaged, represents org | machine Entity introductions; telemetry, position, and operation Events | Observations | machine is also an Actor when it causes Events (RFC-0001 §3.4); manufacturer's serial rides as payload; correspondence joins it to the mapped machine |
| **Weather provider** | engaged or independent | station readings (Observations); forecasts and modeled surfaces (Assertions) | mixed — the border keeps them apart | forecasts graded by arrival (RFC-0007 §5); provider calibration derivable per region |
| **Satellite imagery** | engaged or independent | capture Events — area geometry + raster payload (RFC-0003 §3.1); derived indices as Assertions | Observations + Assertions | archive reprocessing = upstream revision, absorbed as supersession (§4) |
| **Accounting system** | engaged, represents org | transaction and invoice Events; documents as payload | facts of record | place by aboutness — a fuel delivery's Event is placed at delivery; an invoice references the placed Events it bills (see §9 on the strain) |
| **Documents** | (via whichever Actor supplies them) | payload-bearing Events; extractions as attributed Observations/Assertions | ladder-assigned on extraction | Document stays rejected; the boundary is where that holds or breaks (§2) |
| **Sensors** | fleet or per-device Actors, author-without-view | Observation streams | Observations | the RFC-0002 §3.1 independence in action; device identity vs fleet identity is a granularity choice (§9) |

No example required a mechanism the participation model lacked. The table is the theorem T3 of RFC-0002 exercised at the boundary: external systems inherit collaboration — attribution, scoping, audit, revocation — because they enter as participants, and participants were solved once.

---

## 8. The frozen integration model

- **No integration layer exists.** External systems are external Actors holding grants; connecting is granting; the connection's registry is the grant history.
- **Import is authorship; export is scoped projection.** Bidirectionality is holding both grants; asymmetry (author-without-view, view-without-author) is ordinary.
- **The admission contract**: placed, dated (bitemporally), sourced — and *epistemically classified*: measurements as Observations, interpretations and predictions as Assertions, first mentions as Entity introductions, documents as payload with attributed extraction. Admission preserves epistemic standing. Uncertain standing classifies toward Assertion; an adapter's record names are configuration (Amendment 1).
- **Correspondence is a claim.** Foreign namespaces join world identities only by same-as Assertions — introduced-then-joined, never silently merged; foreign identifiers are payload, never identity.
- **Synchronization dissolves** into streams, batches, backfill (native to bitemporality), and upstream revision (absorbed as supersession). Mutable upstreams meet an immutable record, and their overwrites become its history.
- **Ownership at the boundary**: engaged sources author under representation (org-owned, provider-sourced); independent participants author in their own right (sharer-owned, scope-shared).
- **Conflicts**: write conflicts impossible by construction; source disagreement preserved as perspectives; identity disputes are competing, supersedable claims.

---

## 9. Self-review

**Is "no integration layer" honest, or does it just relocate the layer into mechanism?** The document dissolves integration conceptually, but translation — foreign formats into world content, foreign projections into the shared frame, foreign categories onto the epistemic ladder — is real, hard work that some mechanism must do, and that mechanism will be large. The claim defended here is narrower than the slogan: the *conceptual model* needs no integration constructs — no import-data category, no mapping tables, no sync state, no connection registry. The translation machinery exists but holds no semantics of its own; everything it produces is ordinary world content, judged by ordinary rules. If a future mechanism RFC finds it needs integration-*semantics* (not just integration-*work*), this document's central claim fails, and that is the test it should be held to.

**Epistemic classification at the border assumes the border can know.** §2 obligates admission to classify foreign content honestly — but foreign systems do not label their exports "observation" versus "interpretation," and many blur them (a "sensor reading" that is actually a device-modeled estimate; a provider "measurement" that is interpolated). The border must often *judge*, and a judgment about epistemic standing is itself interpretive. The architecture's mitigation is that misclassification is correctable like everything else (supersession) and that classification is attributed (someone configured this admission, and that configuration is an accountable act). But the invariant "admission preserves epistemic standing" is aspirational at the edge where standing is genuinely unknowable, and the honest reading is: *admission must not degrade* standing knowingly, and must classify conservatively (toward Assertion, not toward Observation) when uncertain. That conservative default deserves to be normative; I state it here in the review and flag it for the document's first revision. *(Made normative in §2 by Amendment 1.)*

**Accounting strains Spatial-First harder than the table admits.** §7 places financial content "by aboutness" — the invoice inherits place from the delivery it bills. But real accounting content includes items whose aboutness is diffuse (overhead, insurance premiums, a loan against the whole operation), and "placed at the farm's extent" begins to feel like the fake geography REVIEW-001 warned about. The strain is real and I have not fully resolved it; the honest options are (a) coarse aboutness-place is legitimate (a loan genuinely concerns the whole operation's extent), which I lean toward, or (b) some financial abstractions belong on the agency side of the seam, like grounds — recorded in relation to Actors rather than placed in the world. If accounting integration is ever deeply built, this question reopens, and it is the likeliest place for this document to need amending.

**Actor granularity is waved at.** Is "the weather provider" one Actor, or one per station? Is a sensor fleet one Actor or ten thousand? The model permits any granularity (Actors are cheap; representation chains compose), and §7 calls it "a granularity choice" — but the choice has consequences the document does not explore: calibration accrues per Actor (RFC-0009 §6), so a provider-as-one-Actor blurs its good stations with its bad, while per-device Actors fragment the track record the other way. The right granularity is probably per-independently-calibratable-source, but that is a judgment this document should have made normatively and instead leaves open. Named as the gap it is.

**The conservative identity lifecycle has a cost.** Introduce-then-join (§3) guarantees safety and litters the world with provisional Entities awaiting correspondence — a fleet onboarding could introduce hundreds of near-duplicate identities before the joining claims catch up. The append-only model means this is messy rather than harmful (nothing is lost, everything is joinable later), and the mess is exactly the kind an AI Actor is suited to reduce (proposing correspondences as confidence-bearing claims). But the document should not pretend the mess is not real: correspondence-by-claim trades silent corruption for visible clutter, and visible clutter is a real experiential price. The trade is right; the price is named.

**What was not designed.** Public and open feeds (a grant to "anyone" — deferred by RFC-0002 §8.11 to the API document, and still deferred); anonymized cross-organization aggregation (REVIEW-001's deferral stands — benchmarking touches this boundary but needs its own treatment); and the outbound question of *format* — what a scoped projection looks like to a consumer — which is the API document's entire subject. This RFC ends where the world's semantics end and representation-for-transport begins.

**Overall.** Highest confidence: the participant model (§1) — it is RFC-0002's theorem T3 doing exactly what it was proven to do, and every example in §7 landed without new machinery, which is the series' standard of evidence. Lowest confidence: the epistemic-classification duty (§2) as stated — right in direction, but resting on a border that must judge what it sometimes cannot know, with the conservative default (uncertain → Assertion) still informal. If this document is wrong, it is wrong there or at accounting's diffuse aboutness — both flagged, both amendable in the open. Stated plainly, so the first real integration built against this model knows which two seams to instrument.

## 10. Amendment log

| Amendment | Date | Authority | Changes |
|---|---|---|---|
| 1 | 2026-09-03 | REVIEW-004 §4.3, §4 note, §6 (adopted after milestone M8) | §2: the conservative default (uncertain → Assertion) moved from the self-review into the admission disciplines as normative; border classification declared to include an adapter's record vocabulary, so that adding a source of a new kind is configuration. §8 restated accordingly; PLAN-001 module rule 4 amended in step. |

**User Experience Implications (Amendment 1).** *Projection:* a modeled number is shown as a best estimate and a station's number as measured, and the border is what keeps that honest. *Concealment:* which channel was configured as what is invisible; the farmer sees "measured" or "best estimate." *Leak check:* no internal term surfaces. *Wholeness:* a farm with one weather feed never meets the vocabulary clause; it is what makes the second kind of source free.

---

*This RFC admits the outside world: external systems as participants, their data as attributed content, their names as claims, their revisions as history, their disagreements as perspectives. The world now has many hands and many feeds and remains one. What remains is representation and machinery — the API and synchronization surface (RFC-0012), persistence (RFC-0013), and the lifecycle document (RFC-0008) still owed to everything all of these carry.*
