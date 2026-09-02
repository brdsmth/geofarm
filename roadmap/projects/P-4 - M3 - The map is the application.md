---
id: P-4
title: M3 - The map is the application
parent: O-1
status: done
owner: bradley
weight: 5
tags:
  - phase-3
  - client
---

Objective: the first visible product — boundary, client, and render core; the draw-promote-record-scrub loop live on one surface with no pages.

RFC coverage: RFC-0012 (Project/Append/walk as the only client contract), RFC-0014 (three stores; Pending durable from first commit), RFC-0006 (five verbs, promotion gate), RFC-0015 (marks, answerability, two-axis invalidation), RFC-0005 (boundary + notes lenses), RFC-0016 W1/W2/H1/H3/A5.

Acceptance criteria:
- Compiles; tests green including Pending kill-and-restart survival
- S1 structural: navigational destinations = 1
- S2 structural: exactly Reading/View/Pending; review confirms no fourth store, no adjudicating cache
- Client imports boundary package only (module rule 3)
- Every rendered mark resolves to world content (S8 rendering half)
- Surface strings live in surface package; internal-vocabulary lint active (S10 instrument armed)
- Reviewable: end-to-end demo of draw -> promote -> record -> scrub on fixture world

Dependencies: M2.
