---
id: P-55
title: the rescan debt paid
parent: O-2
status: done
owner: bradley
tags:
  - projection
  - rfc-0013
---

REVIEW-003 §2.F's debt: every projection re-scanned the whole store; a feed resolving identities by projection was O(n²) in store reads. Paid with the one sanctioned accelerator (RFC-0013 §2): a watermark-keyed materialization of the log inside the boundary, extended by the delta before each operation, dropped and rebuilt at will, never an authority (RFC-0014 law 2). Readers take a `LogReader` — a Journal or its materialization, indistinguishably. The feeds resolve identities once per batch through one walk.

Under test: a store whose sequence skips (as a database sequence does after a refused insert) walks correctly; dropped and rebuilt, the copy reads the same; a record admitted behind the boundary's back is in its next walk.
