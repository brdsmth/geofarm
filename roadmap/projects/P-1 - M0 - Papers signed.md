---
id: P-1
title: M0 - Papers signed
parent: O-1
status: planned
owner: bradley
weight: 1
tags:
  - phase-0
  - docs
---

Objective: close the two owed specification gaps and the pending revision pass before any code exists, so no milestone builds on an unwritten contract.

RFC coverage: RFC-0013 (drafted), RFC-0008 (drafted), REVIEW-001 §9 (executed against RFC-0001, 0005, 0006, 0007), RFC-0000 §3 (UX Implications sections mandatory).

Acceptance criteria:
- RFC-0013 and RFC-0008 merged, each closing with a User Experience Implications section
- REVIEW-001 §9 amendments committed to all four RFCs
- Monorepo scaffold per PLAN-001 §3 with CI: empty packages compile, test harness green
- Independently reviewable: docs diffs + scaffold, no feature code

Dependencies: none. Everything else depends on this.
