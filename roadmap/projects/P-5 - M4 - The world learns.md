---
id: P-5
title: M4 - The world learns
parent: O-1
status: done
owner: bradley
weight: 3
tags:
  - phase-4
  - feeds
---

Objective: external Actors admitted as participants — weather and imagery feeds authoring under the admission contract, five-year backfill riding the ordinary walk.

RFC coverage: RFC-0011 (participant model, epistemic classification, backfill, upstream revision), RFC-0003 §3.1 (raster as area+payload), RFC-0012 §4 (sync is the log), RFC-0016 I1/I2/L1/L2.

Acceptance criteria:
- Compiles; tests green: admission validation (placed/dated/sourced), classification config (measurements->Observations, forecasts->Assertions, conservative default)
- Feeds enter through boundary as granted external Actors (connecting is granting)
- Imagery archive backfill lands with deep occurrence times via the ordinary walk
- S3 verified: zero purpose-built sync or merge code in the diff
- Provenance and confidence filtering work across feed content (L2)
- Reviewable: each feed adapter is config + translation, no private semantics

Dependencies: M3 (for visible verification); journal/walk from M1.
