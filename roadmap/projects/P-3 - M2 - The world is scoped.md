---
id: P-3
title: M2 - The world is scoped
parent: O-1
status: done
owner: bradley
weight: 3
tags:
  - phase-2
  - access
---

Objective: access and projection with the sub-world rule enforced by API shape — the predicate-scoping bet red-teamed before any UI exists, where losing is cheapest.

RFC coverage: RFC-0002 (grants, capabilities, sub-worlds, attenuation), RFC-0003 §5-6 (derived relations, visibility), RFC-0004 §4 (state-as-of), REVIEW-001 Risk 1 (derivation leakage), RFC-0010 §4 (no-laundering, structurally).

Acceptance criteria:
- Compiles; tests green: capability evaluation as projection (C4), attenuation (I4), grant supersession/revocation
- projection package rejects calls without a sub-world argument (module rule 2)
- S6 red-team suite passes: no silhouettes, no derivation leaks, no existence disclosure beyond discover
- Load rehearsal sizes projection economics (PLAN-001 risk 1) before UI commitments
- Reviewable in isolation: access + projection against journal fixtures

Dependencies: M1.
