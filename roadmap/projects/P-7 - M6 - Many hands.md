---
id: P-7
title: M6 - Many hands
parent: O-1
status: done
owner: bradley
weight: 2
tags:
  - phase-6
  - collaboration
---

Objective: real collaboration — membership, one predicate-scoped external agronomist, revocation, and the audit answer with no audit system.

RFC coverage: RFC-0002 (representation, dual attribution, grants, T2), RFC-0016 C1-C3, REVIEW-001 (the tripwire instrumented).

Acceptance criteria:
- Compiles; tests green: dual attribution end-to-end, attenuation on the agronomist chain
- C2: agronomist works under "view+author over agronomic classification, whole farm" — a predicate scope, not an object list
- S5: "what could the agronomist see in June?" answered from grant projection; repo contains no audit feature
- S6 re-run under real two-party collaboration, including the AI honoring the Conversable intersection
- Grant-shape instrument live (predicate vs identity scopes, RFC-0002 §8.5 tripwire)
- Reviewable: the whole milestone is grants + surface sharing flows; no new access machinery

Dependencies: M5 (AI must honor scopes in conversation), M3.
