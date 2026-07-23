# RFC-0016 — Initial MVP Scope

| | |
|---|---|
| **RFC** | 0016 |
| **Title** | Initial MVP Scope |
| **Status** | Draft |
| **Author** | Bradley |
| **Created** | 2026-07-23 |
| **Depends on** | RFC-0000 – RFC-0007, RFC-0009 – RFC-0012, RFC-0014, RFC-0015 |
| **Supersedes** | — |
| **Superseded by** | — |

---

## 0. Purpose and method

Fourteen documents have designed a platform. This one designs the smallest product that can tell us whether they are right.

The framing governs every decision below: **the MVP is an experiment, and its features are instruments.** The series is unusually honest about its own bets — every self-review ends by naming the claims most likely to be wrong — and an MVP that merely shipped features would waste the one chance to test those claims while they are still cheap to amend. The cut criterion is therefore not "what would users want first" but:

> **A capability is included if and only if it exercises an architectural bet that cannot be validated later without rework.** Everything else — however desirable — is excluded, because an excluded feature costs a delay while an unvalidated foundation costs a rebuild.

Two disciplines from the task, honored throughout: **no new architectural concepts** appear in this document (every capability below names the frozen machinery it exercises), and the self-review (§8) verifies coverage — that the MVP exercises every foundational RFC — alongside a complexity audit confirming nothing rode in without a validation job.

---

## 1. The product

**One organization's farm, on one map, with its history, its collaborators, and its intelligence.**

A farm owner opens the product and sees their operation — fields, buildings, roads, ponds — on a map that is the entire application. They drew those boundaries themselves in the first hour. Satellite imagery arrives weekly and reaches back through the archive; weather arrives daily, observations and forecasts distinguished. They and their workers record what happens — plantings, sprays, scouting notes, photos — from the field, including where there is no signal. A time control scrubs the whole surface through the season. They circle a struggling corner and ask why, and the answer comes from an intelligence that already knows where they are looking, what is selected, and what happened there — and shows what every claim is based on. They share the agronomy of the whole farm with an outside agronomist, by drawing nothing more than a decision; the agronomist works in the same world, differently bounded, and everything each party adds is signed. Once a week, unasked, the AI flags what looks anomalous in the imagery, at a stated confidence, as claims that sit on the map like anyone else's.

The cast, minimal but architecturally complete: an **organizational Actor**; an **owner** and a **field worker** (members, via representation); an **external agronomist** (scoped grant — the collaboration experiment); an **AI agent** (both modes); two **external feeds** (weather, imagery — the integration experiment); and the farm itself as world content.

---

## 2. Included capabilities

Each capability is tagged with the machinery it exercises and the bet it instruments.

**W — World-making.**
- **W1. Introduce the farm by drawing**: fields, buildings, roads, ponds, zones — draw, then promote to Entities with geometry. *Exercises*: geometry forms (RFC-0003 §3), identity (RFC-0004 §6), the promotion gate (RFC-0006 §3). *Instruments*: whether drawing-as-indication-by-default helps or frustrates (RFC-0006 §10's reversible judgment call).
- **W2. Boundary correction**: redraw a boundary; prior geometry preserved; state re-projects. *Exercises*: correction-is-addition (RFC-0004 §5), geometry-as-of-time (RFC-0003 §4).

**H — History-making.**
- **H1. Record operations and observations**: plantings, sprays, notes, photos — authored from the current View, with aboutness inherited from selection (RFC-0006 §8). *Exercises*: Events, dual attribution, payload.
- **H2. Offline scouting**: full recording in dead zones; occurrence time from the field, knowledge time at readmission. *Exercises*: bitemporality (RFC-0004 §1), Pending durability (RFC-0014 §1), reconnection as Append + Project (RFC-0012 §5). *Instruments*: the architecture claims offline is nearly free — **its build cost is itself a measurement**; if offline requires merge machinery, RFC-0012 §5 is falsified.
- **H3. The time control**: scrub the season; every layer moves together; boundary history animates. *Exercises*: one shared history (RFC-0004 §9), temporal panning (RFC-0006 §4), world animation as re-projection (RFC-0015 §7).

**L — Lenses.**
- **L1. Five layers, structurally diverse by design**: boundaries (Entities), operations/notes (Events), satellite imagery (raster Observation Events with archive **backfill**), weather (external Observations *and* forecast Assertions), AI flags (computed Assertions). *Exercises*: the layer model end-to-end (RFC-0005), epistemic classification at the border (RFC-0011 §2), backfill as ordinary late knowledge (RFC-0012 §4). Five is deliberate: few enough to build, diverse enough that each row of RFC-0005 §9's table is touched.
- **L2. Filtering by source and confidence**: show only the agronomist's notes; hide low-confidence AI flags. *Exercises*: provenance filtering (RFC-0005 §5), trust-tuning (RFC-0006 §7).

**A — Asking.**
- **A1. Circle-and-ask**: the founding gesture (RFC-0000 §2.3) — draw a region, ask a question, get an answer with zero context re-description. *Exercises*: the four context strata (RFC-0010 §2), ephemeral query regions (RFC-0006 §3).
- **A2. Evidence-visible answers**: every AI claim peels to its evidence — records inward, grounds outward. *Exercises*: well-formedness (RFC-0009 §5), explainability-as-structure (RFC-0010 §7).
- **A3. Promotion of answers**: keep a conversational answer as a recorded Assertion. *Exercises*: candidate-Assertions (RFC-0010 §6). *Instruments*: promotion friction — RFC-0010 §9's invisible-advice worry, measured (§4, S9).
- **A4. One autonomous behavior**: weekly imagery-anomaly flags, authored at stated confidence, self-superseded when conditions change. *Exercises*: the two modes (RFC-0010 §1), AI-as-participant rather than AI-as-chat — the product thesis itself.
- **A5. Inspection and measurement**: what-is-this bundles in place; ephemeral measuring. *Exercises*: Ask verb completeness (RFC-0006 §5).

**C — Collaboration.**
- **C1. Membership**: owner and worker act for the organization; every record dually attributed. *Exercises*: representation (RFC-0002 §1.4).
- **C2. One real scoped grant**: the agronomist receives *view + author over the agronomic classification of the whole farm* — deliberately a **predicate scope, not an object list**, so the central bet is tested, not dodged. *Exercises*: Scope, Capability, Grant-as-Event, the sub-world rule (RFC-0002). *Instruments*: the tripwire of RFC-0002 §8.5 — measure whether real grants stay predicate-shaped or collapse to identity-scopes.
- **C3. Revocation and the audit query**: end the engagement; then answer "what could the agronomist see in June?" from grant history alone. *Exercises*: T2 (RFC-0002 §7) — with the success criterion that **no audit feature is built** (§4, S5).

**I — Integration.**
- **I1. Weather feed**: an external Actor authoring station Observations and forecast Assertions under representation. *Exercises*: the participant model, engaged-source ownership (RFC-0011 §1, §5), and — as forecasts meet arriving observations — the raw material of track records (RFC-0007 §5), accruing by design even though calibration *surfacing* is excluded (§3).
- **I2. Imagery feed with archive backfill**: five years of scenes entering with deep occurrence times and current knowledge times. *Exercises*: raster-as-area-plus-payload (RFC-0003 §3.1), backfill (RFC-0011 §4), and the honest-staleness rendering of a world learned out of order.

**P — Platform substrate (invisible capabilities, included because the MVP cannot exist without exercising them).** The two-operation boundary and the walk (RFC-0012 §2–4) as the client's only contract; the three stores and four laws (RFC-0014); marks with answerability, screen-bounded rendering, watermark caching (RFC-0015). These are not features; they are the MVP's skeleton, and their validation is §4's S1–S3.

---

## 3. Excluded capabilities

Each exclusion names its reason and what the deferral costs. Categories: **[bet-later]** — validates an already-flagged seam, deferrable without rework; **[scale]** — same machinery at more volume, nothing new to learn; **[unproven-need]** — no validation job at all yet.

| Excluded | Category | Reason and cost |
|---|---|---|
| **Equipment telemetry & manufacturer integration** | bet-later | Heavy integration; but excluding it leaves **correspondence-as-claim (RFC-0011 §3) unexercised** — the MVP's largest coverage gap, confessed in §8. First expansion (§7, E1). |
| **Multi-organization collaboration** (landlord/tenant) | bet-later | Contribution-based ownership (RFC-0002 §4.4) is designed but untested; needs two real orgs. E2. |
| **Public Actor / published scopes** | bet-later | RFC-0012 §6's construction, flagged thin there; no MVP user needs it. |
| **Track-record calibration surfacing** | bet-later | The *data* accrues from I1 by design; the *surfacing* (RFC-0009 §6) needs seasons of accrual first. Deferral costs nothing — the record waits. |
| **Deeper delegation chains** (agronomist's own AI) | bet-later | One representation link suffices to test attribution; chains add depth, not kind. |
| **Named-View promotion & View sharing** | unproven-need | RFC-0002 §8.6's settlement, small to add later; remembered Views (RFC-0014 §3) suffice for MVP continuity. |
| **Co-presence** | bet-later | Deferred by three RFCs with a known state-model crack (RFC-0014 §8); not re-litigated here. |
| **Yield, soil, accounting, documents-with-extraction** | scale / bet-later | Each is another row of tables already exercised once (RFC-0005 §9, RFC-0011 §7) — except accounting, whose Spatial-First strain (RFC-0011 §9) *deserves* deliberate testing, later, as its own experiment. |
| **Volumes, 3D** | unproven-need | Unaddressed three documents running (RFC-0015 §9); the MVP world is 2.5-D. |
| **Reports, exports, notifications, dashboards** | unproven-need | Dashboard-shaped features are the anti-goal (RFC-0000 §2.2); if the map cannot carry the MVP alone, that failure must be *visible*, not compensated. |

One exclusion of a different kind: **the two reserved documents.** RFC-0008 (Content & Grant Lifecycle) and RFC-0013 (Storage & Persistence) remain unwritten, and the MVP build is their forcing function: construction will surface exactly the lifecycle and persistence questions those documents must freeze, and **they should be written against the MVP's first real demands rather than speculatively** — the series' own method (mechanism last) applied to its own remaining work.

---

## 4. Success criteria

Feature completion is not success. The MVP succeeds if the architecture's falsifiable claims survive contact — each criterion below names its verdict condition:

- **S1 — No pages.** The entire product operates as one View surface; count of navigational destinations = 1. *Falsified by*: any capability that could only ship as a page elsewhere (RFC-0000 §2.2's own test).
- **S2 — No shadow stores.** The client ships with exactly Reading, View, Pending; code review finds no fourth store, no adjudicating cache. *Falsified by*: engineers building parallel state to cope — which would indict RFC-0014, not the engineers.
- **S3 — The walk is enough.** Live updates, catch-up, backfill, and offline reconnection all ride the knowledge-time walk with **zero purpose-built sync or merge code**. *Falsified by*: any diff engine or conflict resolver appearing anywhere.
- **S4 — The sixth layer is free.** After launch, add one more layer (e.g., soil samples) as a live test of T3 (RFC-0002 §7): touching lens definition and border classification only — no schema change, no access code, no feature-specific anything. *This criterion is the inheritance theorem, executed.*
- **S5 — Audit without an audit system.** "What could the agronomist see in June?" answered by grant projection; **no audit feature exists in the codebase**.
- **S6 — The sub-world holds.** Red-team the agronomist's scoped experience: no silhouettes, no derivation leaks, no existence disclosures beyond *discover* (REVIEW-001 Risk 1, instrumented). *Falsified by*: any query whose answer shape reveals excluded content.
- **S7 — Context is inherited, never restated.** Circle-and-ask sessions require zero utterances describing what is on screen. *Measured by*: transcript review — every "the field in the northwest" a user is forced to type is a failure of RFC-0010 §2.
- **S8 — Every claim answers.** 100% of AI outputs peel to evidence; every mark on screen resolves to world content (RFC-0015 §1). Sampled continuously.
- **S9 — The instrumented worries.** Three measurements the series explicitly requested: **bitemporal divergence rate** (how often occurrence and knowledge time meaningfully differ — RFC-0004 §11's "most important or most over-built" question; the MVP includes three divergence sources by design: offline, backfill, forecasts); **promotion rate of consequential answers** (RFC-0010 §9's invisible-advice gap); **grant shape distribution** (predicate vs identity scopes — RFC-0002 §8.5's tripwire).

Success is: S1–S8 hold, and S9's measurements exist — whatever they show. An MVP that ships all features while quietly failing S2, S3, or S6 has *failed*, because it will have proven the architecture unbuildable as specified — the most valuable possible result, obtained early, if we are honest enough to read it.

---

## 5. Technical risks

1. **Projection cost.** State, access, visibility, and neighborhoods are all conceptually computed-on-demand; RFC-0013 must make that economical, and the MVP is where "derived, never stored" meets a profiler for the first time. Mitigation: watermark-keyed caching (RFC-0015 §6) is the sanctioned accelerator; the risk is needing adjudicating caches, which would breach law 2.
2. **Mark answerability at scale** (RFC-0015 §9's named collision): five years of imagery and a season of events must render with every pixel answerable. The MVP's volumes are modest by design — if answerability strains *here*, the contract needs renegotiating before real scale.
3. **Coherent watermarks over real infrastructure** (RFC-0012 §9): the per-consumer monotonic walk must be realized without a global clock; RFC-0013 inherits the duty, the MVP tests it.
4. **The border's judgment** (RFC-0011 §9): classifying real weather-feed content into Observations vs Assertions requires the conservative default (uncertain → Assertion) to be exercised by actual admission decisions.
5. **Evidence-linked AI answers**: producing genuinely peel-able answers — not narrative with citations bolted on — is the hardest mechanism ask in the MVP; A2 is the criterion that keeps it honest.
6. **Pending durability on real devices**: the one fragile store (RFC-0014 §1) surviving crashes, upgrades, and weeks-long dead zones.

## 6. Architectural risks

The seams the series itself flagged, now carried by a real product — the MVP's deeper purpose is to convert these from arguments into observations:

1. **The predicate-scoping bet** (REVIEW-001's central wager): if S6 fails or C2's scope proves unadministrable, Resource returns as mechanism and the collaboration architecture re-opens.
2. **Bitemporality's weight** (RFC-0004 §11): if S9 shows the two times rarely diverging *even with three designed divergence sources*, the model is carrying unused generality — amendable, but the finding must be faced.
3. **Authored-only confidence sprawl** (RFC-0009 §9): every uncertainty judgment is somebody's Assertion; the MVP shows whether that discipline produces a legible record or a haystack.
4. **Promotion friction** (RFC-0010 §9): if consequential advice goes unpromoted (S9), the audit story has a hole that interaction design must close — or the candidate-Assertion model needs amending.
5. **The claim/presentation line under real UI pressure** (RFC-0005 §11, RFC-0015 §9): the anomaly layer, aggregated marks, and smoothed animation are where the MVP could first mint an unauthored claim without anyone deciding to.
6. **Engagement evaporation** (RFC-0010 §9): users may experience principled forgetfulness as brokenness; the pre-committed amendment path exists, and the MVP measures whether it must be taken.

## 7. Future expansion points

Ordered by what each *validates next*, per the experiment framing:

- **E1. Equipment integration** → correspondence-as-claim, introduce-then-join, machine Actors (the confessed coverage gap).
- **E2. Second organization** → contribution-based ownership, cross-org grants, one unpartitioned world (RFC-0002 §5.4).
- **E3. Calibration surfacing** → track records made visible; forecast-vs-outcome from I1's accrued record (RFC-0009 §6).
- **E4. Documents with AI extraction** → attributed extraction, payload-to-ladder (RFC-0011 §2).
- **E5. More layers** (soil, yield, hydrology…) → each a repetition of S4's freeness, compounding the inheritance evidence.
- **E6. Named Views, public scopes, co-presence, deeper chains** → the deferred settlements, each with its RFC already holding its open questions.
- **E7. Accounting** → the deliberate stress test of aboutness-place (RFC-0011 §9), run when someone can attend to the result.

Every expansion point lands as *content and lenses on the existing substrate* — the open-because-closed structure means the roadmap ahead is additive, which is itself the property the MVP exists to demonstrate.

---

## 8. Self-review

**Coverage: does the MVP exercise every foundational RFC?** The verification the task requires, row by row:

| RFC | Exercised by | Depth |
|---|---|---|
| 0000 Vision | the product *is* the thesis: map-only (S1), embedded AI (A1), history (H3), event-driven (S3) | full |
| 0001 Ontology | every capability speaks the four primitives; no fifth appears | full |
| 0002 Actors & Access | C1–C3, S5, S6, S9's tripwire | full but narrow — one grant, one chain link |
| 0003 Spatial | W1–W2, derived relations in inspection (A5), raster (I2) | full except volumes (confessed) |
| 0004 Temporal | H1–H3, W2, S9's divergence measure | full |
| 0005 Layers | L1's five structurally diverse lenses, L2, S4 | full |
| 0006 Interaction | all five verbs (W1, L2, A1/A5, H1); both laws load-bearing (S1, A3) | full |
| 0007 Twin | honest staleness in rendering (P), ignorance visible (S6's flip side), forecasts-vs-arrivals (I1) | substantial; calibration surfacing deferred |
| 0009 Semantic | A2's peel-back, grounds in AI evidence, contradiction preserved when notes disagree with feeds | substantial; claimed-connection vocabulary barely touched |
| 0010 AI Context | A1–A4: all four strata, both modes, three rings (C2 gives the AI a real scope boundary to honor) | full |
| 0011 Integration | I1–I2, border classification, backfill | full **except correspondence (§3)** — the confessed gap, E1 |
| 0012 API & Sync | P, H2, S3 — the client is consumer №1 of the two-operation contract | full |
| 0014 State | P, S2, H2's Pending durability | full |
| 0015 Rendering | P, S8, H3's animation, I2's volumes of imagery | full |

Coverage verdict: **every written RFC is exercised; two gaps are confessed rather than papered over** — correspondence-as-claim (E1) and volumes (unproven need). The two unwritten RFCs (0008, 0013) are prerequisites-by-forcing-function, not gaps.

**Complexity audit: did anything ride in without a validation job?** Reviewing §2 against the cut criterion: A5's measurement is the closest call (it validates ephemeral-until-promoted, already tested by A1's regions — but its cost is near zero and it completes the Ask verb, so it stays, flagged as the scope's softest inclusion). The second imagery *provider*, equipment, and all reporting were cut precisely by this audit. Five layers rather than three is defended by structural diversity (each layer type appears once); a sixth at launch would be redundancy, which is why the sixth is instead S4's *post-launch experiment*. Verdict: no unnecessary complexity found — and one deliberate near-redundancy (A5) kept and named.

**Is the experiment framing honest, or a rationalization for a thin product?** The risk of "features are instruments" is shipping an instrument panel no farmer wants. The §1 narrative is the defense: the included set is *also* a coherent daily tool — see the farm, record the work, watch the season, ask why, bring in the agronomist — which is RFC-0000 §1's problem statement served directly. If the MVP is useful *only* as an experiment, the vision was wrong in a way no architecture can fix; the MVP tests that too, unavoidably, and should.

**The gravest scope risk runs the other way.** Cut lists usually bloat; this one may have over-cut in one place: **excluding equipment leaves the platform's single most identity-stressing integration pattern (correspondence) untested until E1**, and if introduce-then-join proves unworkable there, rework will touch RFC-0011 §3 after real data exists under it. The exclusion stands — equipment integration is genuinely heavy, and the MVP would double in mechanism scope — but it is the decision in this document most likely to be regretted, and it is named as such.

**What this document could not do.** It defines validation criteria but not thresholds (what promotion rate is "healthy"? what divergence rate justifies bitemporality?); those need baselines no one has yet, and pretending otherwise would be false precision. S9 therefore ships as *measurement obligations*, with judgment deferred to the review this MVP's results must convene — the series' standing method: instrument first, amend openly, never drift.

**Overall.** Highest confidence: the cut criterion itself and the coverage it produced — the MVP touches every load-bearing claim with the smallest cast and content set that can do so, and its success criteria are falsifiable enough to be worth failing. Lowest confidence: the equipment exclusion, and the unstated thresholds behind S9. This document is the series' first that can be *proven wrong by a calendar* — the build will read it back with interest. Stated plainly, so that when reality and the architecture disagree, everyone knows which fourteen documents to reconvene, and in what order their seams were declared.

---

*This RFC cuts fourteen documents into one product: a farm, its history, its collaborators, its intelligence — every capability an instrument, every seam under measurement. The series is now complete from philosophy to first cut, with two documents owed to the build (RFC-0008, RFC-0013) and one obligation owed to the results: reconvene, read the instruments, and amend in the open.*
