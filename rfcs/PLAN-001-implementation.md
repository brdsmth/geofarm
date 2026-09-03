# PLAN-001 — Implementation Plan

| | |
|---|---|
| **Plan** | 001 |
| **Basis** | RFC-0000 (as amended) through RFC-0016; REVIEW-001; REVIEW-002 |
| **Scope** | The MVP of RFC-0016, built as specified, instrumented as required |
| **Author** | Bradley |
| **Date** | 2026-07-23 |
| **Status** | Draft |

---

## 0. Charter and constraints

This document translates a frozen architecture into an engineering plan. It designs nothing: every subsystem, boundary, and ordering decision below is *derived* from an RFC and cites it. Where the plan must make choices the RFCs deliberately deferred (storage technology, rendering engine, providers), it names the decision, the RFC that owns its constraints, and — where the owning RFC is unwritten — schedules the writing.

Standing constraints inherited whole:

- **Scope is RFC-0016's MVP**, cut by its criterion (capabilities as instruments), gated by its success criteria S1–S9 plus REVIEW-002's recommended S10 (vocabulary leak rate).
- **Two RFCs are owed to this build**: RFC-0013 (Storage & Persistence) and RFC-0008 (Content & Grant Lifecycle) are prerequisites-by-forcing-function (RFC-0016 §3) — written against the build's first real demands, inside this plan's Phase 0–1, each closing with the mandatory User Experience Implications section (RFC-0000 §3, Amendment 1).
- **One documentation debt is scheduled**: the REVIEW-001 §9 revision pass (normative amendments to RFC-0001, 0005, 0006, 0007) — now unblocked, since RFC-0002 is frozen and RFC-0000's items were executed by Amendment 1.
- **The plan fails if the architecture proves unbuildable as specified** — and per RFC-0016 §4, that is a *result to surface*, not to quietly patch: any forced deviation reconvenes review before code routes around an RFC.

---

## 1. Subsystem decomposition

Nine subsystems. Each row is a buildable unit with one owner-RFC set; nothing below invents a concept.

| # | Subsystem | Responsibility | Owning RFCs |
|---|---|---|---|
| 1 | **world** | The vocabulary as types: the four primitives and their classifications; geometry forms; dual timestamps; identity; references (inward/outward); payloads. Pure definitions + invariant checks; no storage, no I/O. | 0001, 0003, 0004, 0009 §3 |
| 2 | **journal** | The one history: append-only admission (placed/dated/sourced validation), immutability, supersession & retraction linkage, knowledge-time watermarks, the walk (change feed). The only subsystem that writes. | 0004, 0011 §2, 0012 §3–4, **0013 (to be written)** |
| 3 | **access** | Grants-as-events; capability evaluation as projection of grant history; representation chains and attenuation; **sub-world computation** — the output consumed by everything downstream. | 0002 |
| 4 | **projection** | All derived readings, computed *within a supplied sub-world*: state-as-of, timelines, visibility, derived spatial/temporal relations, semantic neighborhoods, contradictions, staleness/sparseness, track-record accrual. | 0003 §5–6, 0004 §4/§9, 0007, 0009 |
| 5 | **boundary** | The two-operation contract: Project + Append + the walk; submission intake; the public Actor; the *only* door for every consumer, internal or external. | 0012 |
| 6 | **feeds** | External-Actor adapters (MVP: weather, imagery+backfill). Translation into candidate world content under the admission contract with auditable epistemic classification; **no semantics of their own**. | 0011 |
| 7 | **agent** | The AI participant: four-strata context assembly, three-rings enforcement, conversational candidate-Assertions, one autonomous job (imagery anomaly flags), evidence-linked generation with grounds citation. | 0009 §7, 0010 |
| 8 | **client** | The three stores (Reading/View/Pending, with Pending durable from day one), the five verbs, the promotion gate, offline reconnect; consumes only `boundary`. | 0006, 0014 |
| 9 | **render** | Marks with answerability; per-lens streams; two-axis invalidation; LOD disciplines; watermark-keyed caches; animation (re-projection + smoothing under the pick contract). | 0005, 0015 |

**Cross-cutting concerns** (not subsystems; owned rules):
- **surface** — the vocabulary membrane: all user-facing strings live in one place, mapped from internal concepts via the REVIEW-002 §3 projection table; internal terms lint-blocked in client copy (instrument S10). *(RFC-0000 §2.6)*
- **instruments** — the S1–S10 measurement harness, built alongside features, not after (RFC-0016 §4: measurements are the MVP's purpose).
- **shared frame reconciliation** — coordinate-system conversion at the feeds' edge (RFC-0003 §2's deferred mechanism); a library concern inside `feeds`/`world`, never a concept.

## 2. Dependency graph

```
                    world
                      │
                   journal ◄────────────────── (the only writer)
                      │
        ┌─────────────┤
        │             │
     access ────► projection
        │             │
        └──────┬──────┘
            boundary
       ┌───────┼──────────┐
       │       │          │
     feeds   agent      client
                          │
                        render
```

- **One deliberate layering point, managed explicitly** — the access/projection seam: capability evaluation *is* projection (RFC-0002 C4), yet projections are *scoped by* access (sub-world rule §2.3). Resolution, per the RFCs' own structure: `access` performs one privileged internal projection (over grant-kind Events, reading `journal` directly) to *produce* sub-worlds; `projection` then takes `(query, sub-world)` with the sub-world as a **required argument** — the no-laundering rule (RFC-0010 §4) enforced by API shape, not discipline. No cycle exists; the privileged path is one, small, and auditable.
- **`agent` and `client` sit outside the boundary on purpose**: both consume only Project/Append/walk. This is not purity theater — it is success criterion S3's evidence generator (if the platform's own client and own AI can live on two operations, the contract holds) and the AI-as-ordinary-participant claim (RFC-0010 §1) made structural.
- **`feeds` likewise enter through `boundary`** as external Actors under grants (RFC-0011 §1): connecting is granting, and the adapters exercise the same door they would in production.

## 3. Repository layout

Monorepo — one product, one vocabulary, shared types across every subsystem (the alternative, per-service repos, invites exactly the vocabulary drift the series exists to prevent):

```
geofarm/
├── rfcs/                      # the constitution, reviews, this plan
├── packages/
│   ├── world/                 # subsystem 1 — types & invariants
│   ├── journal/               # subsystem 2 — admission, walk, watermarks
│   ├── access/                # subsystem 3 — grants, sub-worlds
│   ├── projection/            # subsystem 4 — every derived reading
│   ├── boundary/              # subsystem 5 — Project/Append/walk
│   ├── feeds/
│   │   ├── weather/           # RFC-0016 I1
│   │   └── imagery/           # RFC-0016 I2 (incl. archive backfill)
│   ├── agent/                 # subsystem 7 — context, modes, evidence
│   └── client/
│       ├── stores/            # Reading / View / Pending (RFC-0014)
│       ├── interaction/       # five verbs, promotion gate (RFC-0006)
│       ├── render/            # subsystem 9 (RFC-0015)
│       └── surface/           # vocabulary membrane — all user-facing language
└── tools/
    └── instruments/           # S1–S10 harness (RFC-0016 §4, REVIEW-002 §9)
```

## 4. Module boundaries

The rules the layout must enforce — each traceable, each mechanically checkable where possible:

1. **Only `journal` writes; nothing mutates.** No module holds update/delete paths anywhere (RFC-0004 §5, RFC-0012 §2). Supersession and retraction are appends with linkage.
2. **`projection` cannot be called without a sub-world.** The argument is non-optional; a "global" projection exists only inside `access`'s one privileged path (RFC-0002 §2.3, RFC-0010 §4).
3. **`boundary` is the only import allowed to `feeds`, `agent`, and `client`.** Internal packages are invisible to consumers — enforced by package visibility (RFC-0012; S3).
4. **`feeds` output candidate content, never conclusions.** Epistemic classification — including the classification *names* an adapter admits records under — is configuration, reviewed and versioned, defaulting conservative (uncertain → Assertion; RFC-0011 §2, Amendment 1). An adapter is config-and-translation only when its vocabulary is config too.
5. **`client` holds exactly three stores**; code review rejects a fourth (RFC-0014, law 1; S2). Pending is durable from its first commit (RFC-0014 §1).
6. **`render` reads projections and resolves picks through the Reading**; caches carry watermark keys; no cache adjudicates (RFC-0015 §6, RFC-0014 law 2).
7. **`surface` owns every user-facing string**; a lint rule blocks internal vocabulary (entity, event, assertion, actor, scope, grant, watermark…) from client copy (RFC-0000 §2.6; S10).
8. **`agent` outputs are Assertion-shaped or nothing** — every claim carries subjects, evidence, confidence, author (RFC-0010 §6; S8).

## 5. Implementation order

Risk-first within dependency order: the series named its riskiest bets (RFC-0016 §6), and each is scheduled as early as its dependencies allow.

- **Phase 0 — Papers before concrete.** Draft RFC-0013 (persistence: store selection under journal/walk/watermark constraints; materialization strategy for projections) and RFC-0008 (lifecycle: creation, transfer, archival-as-visibility, retraction semantics) — both minimal, against Phase 1–2's concrete demands. Execute the REVIEW-001 §9 revision pass. *(Documentation only; unblocks everything.)*
- **Phase 1 — The substrate.** `world` + `journal` + the walk. Proves: append-only admission, bitemporality, supersession linkage, per-consumer monotonic watermarks over the chosen store (RFC-0012 §9's flagged idealization — tested first because everything rests on it).
- **Phase 2 — The scoped world.** `access` + `projection`, with the privileged-path seam built exactly once. **Red-team S6 here, before any UI exists** — the predicate-scoping bet (REVIEW-001 Risk 1) is the architecture's deepest wager and the cheapest to lose early.
- **Phase 3 — The map is the application.** `boundary` + minimal `client` + `render` core: draw-and-promote (W1), record (H1), inspect, the time slider (H3), five verbs complete. Pending durable from first commit. Gates S1, S2 structurally.
- **Phase 4 — The world learns.** `feeds`: weather (Observations + forecast Assertions) and imagery with five-year backfill riding the ordinary walk — zero sync code written or S3 fails.
- **Phase 5 — It answers.** `agent`: circle-and-ask with four-strata assembly (S7), evidence-peelable answers (S8, the hardest mechanism ask — scheduled with the most schedule slack), promotion (A3), then the weekly autonomous anomaly job (A4).
- **Phase 6 — Many hands.** The agronomist's predicate grant (C2), sub-world UX under real collaboration, revocation, and the June audit query answered with no audit feature (S5); dual attribution end-to-end (C1).
- **Phase 7 — The field day.** Full offline round-trip: a day's scouting in a dead zone, reconnect as Append + Project, no merge code (H2). The build cost of this phase is itself measurement: near-free confirms RFC-0012 §5; expensive falsifies it.
- **Phase 8 — First cut.** Hardening; the S4 live experiment (add a sixth layer touching only lens definition + border config); read all instruments (S9 divergence/promotion/grant-shape, S10 leak rate); convene the review RFC-0016 §8 obligates.

## 6. External dependencies

Named as *categories with constraints*, per the RFCs' vendor-agnosticism; final selections belong to RFC-0013 and engineering judgment:

| Dependency | Constraint source | Non-negotiable properties |
|---|---|---|
| Persistent store for the journal | RFC-0013 (to be written), 0012 §3 | append-friendly; supports per-consumer coherent ordering (watermarks); never requires mutation semantics |
| Geometry/geodesy library | 0003 §2–5 | one shared frame internally; robust spatial predicates (derived relationships live on these); handles provider-frame reconciliation at the edge |
| Map rendering engine | 0015 | must not preclude per-mark answerability, watermark-keyed tile caching, or time-scrubbed re-projection |
| Object storage for payloads | 0003 §3.1, 0011 | rasters, photos, documents as Event payloads; content-addressable preferred (immutability) |
| LLM provider for `agent` | 0010 §0 | swappable by design ("reasoning engines will be swapped many times"); must support evidence-constrained generation; provider choice is mechanism, isolated inside `agent` |
| Weather provider; imagery provider | 0011, 0016 I1–I2 | admission-classifiable output (measurements vs forecasts distinguishable); imagery archive access for backfill |
| Client offline storage | 0014 §1 | Pending durability across crashes and upgrades — the one store that must not lose |

## 7. Technical risks

Inherited from RFC-0016 §5 and sharpened by the decomposition:

1. **Projection economics** (Phase 2+): "derived, never stored" meets real query volumes; RFC-0013 must sanction materializations that accelerate without adjudicating (RFC-0014 law 2). *Mitigation: watermark-keyed caching is the one blessed pattern; Phase 2 includes a load rehearsal before UI exists.*
2. **Watermark coherence over the chosen store** (Phase 1): the per-consumer monotonic walk without a global clock — RFC-0012 §9's flagged idealization. *Mitigation: first thing proven; store selection in RFC-0013 is subordinated to this property.*
3. **Sub-world-scoped query performance**: computing derivations *within* scopes may fight indexes built for global queries. *Mitigation: the privileged-path design keeps scoping coarse (sub-world definitions), letting indexes work inside them; S6 red-team doubles as a performance probe.*
4. **Evidence-linked generation** (Phase 5): answers that genuinely peel back, not narrative with citations appended — the hardest single mechanism ask (RFC-0016 §5). *Mitigation: S8 sampled continuously; the Assertion-shape module boundary (rule 8) makes unevidenced output unrepresentable rather than discouraged.*
5. **Answerability at scale** (Phases 3–4): per-mark provenance across five years of imagery and a season of events (RFC-0015 §9's named collision). *Mitigation: MVP volumes are modest by design; measure headroom, don't assume it.*
6. **Border classification of real feeds** (Phase 4): providers blur measurement and estimate. *Mitigation: conservative default in config, classification decisions reviewed like code (RFC-0011 §9).*
7. **Pending durability across app updates** (Phases 3, 7): the one fragile store surviving real devices. *Mitigation: built first, migration-tested every release.*

Architectural risks (the six of RFC-0016 §6) are not repeated here — they are what the instruments exist to measure, and the Phase 8 review is their forum.

## 8. Milestones

Each milestone is a phase exit with named gates; no milestone is feature-complete-but-unmeasured:

| M | Name | Exit criteria |
|---|---|---|
| M0 | **Papers signed** | RFC-0013 & RFC-0008 merged with UX Implications sections; REVIEW-001 §9 pass committed |
| M1 | **The journal holds** | Append/supersede/retract proven immutable; walk delivers exact deltas; watermark monotonicity demonstrated over the chosen store (risk 2 retired or escalated) |
| M2 | **The world is scoped** | Sub-world projections correct and leak-free under red-team (S6); no-laundering enforced by API shape; load rehearsal passed (risk 1 sized) |
| M3 | **The map is the application** | Draw→promote→record→scrub loop live; destinations = 1 (S1); three stores and no more (S2); Pending survives kill-and-restart |
| M4 | **The world learns** | Both feeds admitting under classification config; five-year backfill via the ordinary walk; zero purpose-built sync code (S3) |
| M5 | **It answers** | Circle-and-ask with zero context restatement (S7); 100% of sampled answers peel to evidence (S8); autonomous flags land as scoped, signed Assertions |
| M6 | **Many hands** | Agronomist working under a predicate scope; revocation clean; the June audit query answered from grant history alone (S5); grant-shape instrument live |
| M7 | **The field day** | Full offline scouting round-trip with no merge machinery; the phase's build cost recorded as the RFC-0012 §5 measurement |
| M8 | **First cut** | S4 sixth-layer experiment run; S9 + S10 instruments read; MVP review convened with results — the obligation RFC-0016 closes on |

---

## 9. Traceability

Every RFC lands somewhere; no subsystem exists without a basis:

**0000** → every boundary rule; `surface` + S10 (§2.6) · **0001** → `world` types · **0002** → `access`; module rule 2; M2/M6 · **0003** → `world` geometry; `projection` spatial derivations; geodesy dependency · **0004** → `journal`; dual timestamps; S9 divergence instrument · **0005** → `render` lens streams; S4 · **0006** → `client/interaction`; promotion gate; S1 · **0007** → `projection` staleness/track-records; honest-partiality rendering · **0008\*** → M0; retraction/transfer semantics in `journal` · **0009** → `world` references/grounds; `projection` neighborhoods; module rule 8 · **0010** → `agent` entire; no-laundering API shape · **0011** → `feeds`; admission config; M4 · **0012** → `boundary`; the walk; offline; M1/M7 · **0013\*** → M0; store selection; risks 1–2 · **0014** → `client/stores`; module rules 5–6; Pending durability · **0015** → `client/render`; risks 5 · **0016** → the plan's scope, ordering rationale, instruments, and M8's review obligation · **REVIEW-001** → the access/projection seam; S6 · **REVIEW-002** → `surface`; S10; M0's UX-Implications requirement.

*(\* = to be written, M0.)*

---

*This plan builds what the sixteen documents specify, in the order their own risk registers demand, gated by the instruments they required. Nothing here redesigns; anything that must deviate reconvenes review first. The next artifact is not code — it is RFC-0013, written against M1's first real question: where does the journal live?*
