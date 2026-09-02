---
id: P-46
title: read S9 + S10 instruments
parent: P-9
status: done
owner: bradley
tags:
  - rfc-0016
  - review-002
---

Bitemporal divergence, promotion rate, grant shape; vocabulary leak count (target zero).

Read: `bun tools/instruments/read.ts`. S9 — divergence (demo: an artifact of seeding, said so; the designed sources verified under test), promotion (baseline zero, honestly), grant shape (3 predicate, 2 universal, 0 identity — the tripwire did not fire). S10 — zero vocabulary leaks, zero location leaks, five named deviations. Readings and first thresholds in REVIEW-004 §3.
