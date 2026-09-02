---
id: P-41
title: grant-shape instrument (tripwire)
parent: P-7
status: done
owner: bradley
tags:
  - review-001
---

Predicate vs identity scope distribution, per RFC-0002 §8.5.

Landed: tools/instruments/index.ts — `shapeOf(scope)` classifies predicate / identity / mixed / universal; `grantShape(records)` reads the distribution. The fixture and demo worlds read predicate-shaped with zero identity scopes. Tests: tests/m6-collaboration.test.ts (P-41).
