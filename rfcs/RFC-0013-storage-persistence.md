# RFC-0013 — Storage & Persistence

| | |
|---|---|
| **RFC** | 0013 |
| **Title** | Storage & Persistence |
| **Status** | Draft |
| **Author** | Bradley |
| **Created** | 2026-07-23 |
| **Depends on** | RFC-0001, RFC-0002, RFC-0003, RFC-0004, RFC-0011, RFC-0012, RFC-0014, RFC-0015; PLAN-001 |
| **Supersedes** | — |
| **Superseded by** | — |

---

## 0. Purpose and method

Every prior RFC deferred persistence on principle: the conceptual model had to stabilize before anything was built to serve it (RFC-0000 §4). It has. This document is where the abstention deliberately ends — the first mechanism RFC, chartered by RFC-0016 §3 and PLAN-001 Phase 0, written against milestone M1's first real question: **where does the journal live?**

The method inverts the series': instead of deriving concepts, this document *selects mechanisms*, and every selection is subordinated to constraints already frozen. Nothing here adds, bends, or reinterprets architecture; where a selection cannot satisfy a frozen constraint, the selection loses, not the constraint. The constraint inventory this document serves:

1. **Append-only, immutable records** with supersession/retraction by linkage (RFC-0004 §5).
2. **Bitemporality** — every record carries occurrence time and knowledge time (RFC-0004 §1).
3. **The walk** — exact deltas since a watermark; **per-consumer monotonic** knowledge order (RFC-0012 §3–4), the idealization RFC-0012 §9 flagged for this document to realize.
4. **Admission validation** — placed, dated, sourced, epistemically classified (RFC-0011 §2).
5. **Sub-world-scoped reads** — projections computed within an Actor's accessible sub-world (RFC-0002 §2.3); access evaluation itself a projection of grant history (C4).
6. **Payloads** — rasters, photos, documents as content borne by records (RFC-0003 §3.1).
7. **Caches accelerate, never adjudicate** — any materialization is watermark-keyed, rebuildable, and never authoritative (RFC-0014 law 2, RFC-0015 §6).
8. **Client persistence** — Pending durable locally until admitted; Reading disposable (RFC-0014 §1).

## 1. The journal's realization

> **The journal is a single append-only record log in one relational store, with a monotonic admission sequence as the realization of knowledge time's order.**

- **One record log, not an application schema.** All world content — every Entity introduction, Event, Assertion, and Grant — is admitted as *records in one log*, uniform in envelope, varied in classification and body. Features never add tables; features add classifications (the open-because-closed structure of RFC-0005 §9 carried into storage). The store's schema is the ontology's envelope, frozen with it: identity, kind, classification, actor chain, occurrence interval, knowledge time, geometry, references (inward, with any supersession/retraction linkage), grounds (outward citations), confidence where the kind carries it, payload pointer, body.
- **The admission sequence is the watermark.** A single monotonic sequence, assigned at admission, realizes the knowledge-time order that the walk (RFC-0012 §4) is defined over. "Everything since watermark K, within scope" is an indexed range scan — the change feed *is* the table, exactly as "the world is already a log" promised. Bitemporality is two columns and their discipline: occurrence time is the author's claim, knowledge time is the admission's fact, and the sequence orders the latter totally.
- **The single-sequence decision is the load-bearing simplification, made openly.** RFC-0012 §9 warned that distribution may only offer partial order; this document resolves it for the MVP's scale by *not distributing admission*: one admission point, one sequence, total order, per-consumer monotonicity trivially satisfied. The documented scaling path — multiple journals each with its own sequence, consumers holding a vector of watermarks — preserves the contract's wording ("each consumer's own walk is monotonic and coherent") without a global clock, and is deferred until scale demands it. If that day comes, this section is amended; nothing above RFC-0012's contract changes.

## 2. Selections

| Concern | Selection | Why it satisfies the constraints |
|---|---|---|
| Journal store | **PostgreSQL** | mature transactional append path; sequences realize the watermark; indexes serve the walk (sequence range), identity lookups, and supersession chains; row immutability is enforced by grant discipline (no UPDATE/DELETE privileges on the record log) plus review |
| Spatial indexing & predicates | **PostGIS** | geometry columns and spatial indexes serve visibility and derived-relationship queries (RFC-0003 §5–6) inside sub-world bounds; the *conceptual* shared frame (RFC-0003 §2) is realized as one canonical SRS in-store, with all reconciliation at the feeds' edge |
| Payload storage | **S3-compatible object storage** (local filesystem in development), **content-addressed** | payloads are immutable like their records; content addressing makes duplication meaningless and integrity checkable; the journal holds pointers, never blobs |
| Materializations | **watermark-keyed derived tables/caches, rebuildable from the log** | current-state projections, grant/sub-world snapshots, and render tiles may be materialized for speed; each carries the watermark it was built at, is invalidated by delta intersection (RFC-0015 §6), and can be dropped and rebuilt at any time — the log is the only authority |
| Access evaluation | **materialized grant projection** (an instance of the row above) | sub-world computation reads a grant snapshot rebuilt from grant-kind records; the privileged path of PLAN-001 §2, and nothing else, may consult it unscoped |
| Client Pending store | **embedded durable store on-device** (SQLite-class on native platforms; IndexedDB in browsers) | survives process death and upgrades; holds drafts, queued submissions, and the Engagement; the only client state engineered for durability (RFC-0014 §1) |
| Client Reading cache | **memory, optionally spilled to disk, freely evictable** | a Reading is a value reproducible from `(scope, filter, time, watermark)`; loss costs a re-projection, never data |

Swappability note: each selection is named for the MVP and isolated behind its subsystem's boundary (PLAN-001 §4); replacing any of them is a mechanism change requiring no RFC above this one to move.

## 3. What this document forbids

The constraints restated as storage prohibitions, because storage is where they will be tested daily:

- **No UPDATE, no DELETE on the record log.** Not "avoided" — *unprivileged*. Correction is a superseding record; removal is a retraction record (semantics: RFC-0008).
- **No feature tables.** A feature that "needs a table" is a feature routing around the ontology; it gets a classification and, if truly novel, an RFC conversation — never DDL.
- **No authoritative caches.** Any derived structure that could disagree with a log rebuild *and win* is a shadow store (RFC-0014 law 2); every materialization must declare its watermark and its rebuild procedure.
- **No unscoped read path** outside `access`'s single privileged projection. Query convenience never justifies a second one.
- **No payload in the log, no record in the object store.** Envelope and content stay separated; each store does the one thing it is shaped for.

## 4. User Experience Implications

*Projection:* none of this exists for a user — they see their farm, their records, and "up to date as of 6:14," which is the watermark speaking plain English. *Concealment:* the log, sequences, materializations, object storage, and rebuild machinery are entirely invisible; even total cache loss surfaces only as a moment's re-loading, never as lost work. *Leak check:* no internal term surfaces — "watermark," "journal," and "materialization" never appear in the product; their only face is honest freshness and the fact that nothing is ever lost. *Wholeness:* the offline scout's device holds their whole small world (Reading) and their whole day's work (Pending) with no visible machinery; reconnecting is not a feature they operate but a thing that happens.

## 5. Self-review

**The single admission sequence is this document's whole bet.** It buys total order, trivial watermarks, and an honest walk at the price of a serialization point. At MVP scale (one organization, two feeds, a handful of Actors) the price is negligible; at fleet-telemetry scale it is not, and the vector-watermark path in §1 is sketched, not designed. If admission throughput becomes the constraint before the MVP review convenes, this RFC gets the series' first *mechanism* amendment — openly, per the standing rule. Flagged as the stone to watch.

**Immutability by privilege is discipline, not physics.** Revoking UPDATE/DELETE makes mutation an administrative act rather than an impossibility; a privileged operator could still rewrite history. The architecture's answer is layered (provenance, review, and eventually replication make tampering evident), but this document does not claim tamper-*proof*, only tamper-*evident-by-construction*, and the distinction should never be oversold.

**One log for everything will be pressured.** Grants beside rainfall, telemetry beside contracts — operationally, hot and cold content in one table invites partitioning, and partitioning invites semantic drift ("the grants table"). Partitioning by *storage economics* (time-based, for instance) is fine; partitioning by *kind into differently-behaved stores* is the first step toward the parallel structures the series spent sixteen documents refusing. The line is drawn here so the first DBA conversation has a reference.

**What was not decided:** replication and backup topology (operational, not architectural — constrained only by the walk's contract); encryption at rest and in transit (operational security, orthogonal to the model); retention economics for payloads (nothing is ever *deleted*, but cold payloads may move tiers — invisible above the pointer). Named as out of scope, not overlooked.

---

*The journal lives in one log, in one store, under one sequence — everything else is a rebuildable reading of it. M1 can now be built; the first real write will test every sentence above.*
