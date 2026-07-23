---
id: P-2
title: M1 - The journal holds
parent: O-1
status: planned
owner: bradley
weight: 3
tags:
  - phase-1
  - substrate
---

Objective: the substrate — world types and the append-only journal with an exact-delta walk, proving the two flagged idealizations that everything rests on.

RFC coverage: RFC-0001 (primitives as types), RFC-0003 (geometry forms), RFC-0004 (bitemporality, supersession), RFC-0012 §3-4 (walk, watermarks), RFC-0013 (store selection under journal constraints).

Acceptance criteria:
- Compiles; property tests green: immutability (no update/delete path exists), supersession linkage, bitemporal round-trips
- Per-consumer watermark monotonicity demonstrated over the chosen store (RFC-0012 §9 risk retired or escalated)
- Walk delivers exact deltas including out-of-order (backfill-shaped) admission
- Reviewable in isolation: world + journal packages only, no consumers
- No rework path: journal API is the boundary later phases build on unchanged

Dependencies: M0.
