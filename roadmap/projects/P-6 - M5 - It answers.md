---
id: P-6
title: M5 - It answers
parent: O-1
status: done
owner: bradley
weight: 5
tags:
  - phase-5
  - agent
---

Objective: the intelligence as participant — circle-and-ask with inherited context, evidence-peelable answers, promotion, and one autonomous job.

RFC coverage: RFC-0010 (four strata, three rings, two modes, candidate-Assertions), RFC-0009 §5/§7 (well-formedness, neighborhoods, grounds), RFC-0016 A1-A4, RFC-0002 §5.3 (agent scope intersection).

Acceptance criteria:
- Compiles; tests green: context assembly from View+Pending+Reading, no-laundering (conclusions derivable within the Conversable), Assertion-shape enforcement (module rule 8: unevidenced output unrepresentable)
- S7: sampled ask sessions require zero context restatement
- S8: 100% of sampled answers peel to evidence (records inward, grounds outward)
- A3: promotion records a real Assertion attributed to the AI Actor; unpromoted answers leave no residue
- A4: weekly anomaly job authors scoped, signed, self-superseding Assertions
- Agent consumes boundary only; LLM provider isolated inside agent package

Dependencies: M4 (imagery to reason over), M2 (scopes to honor).
