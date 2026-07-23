---
id: P-8
title: M7 - The field day
parent: O-1
status: planned
owner: bradley
weight: 2
tags:
  - phase-7
  - offline
---

Objective: a full day of offline scouting in a dead zone, reconnecting as Append + Project — with the build cost of this milestone recorded as the measurement it is.

RFC coverage: RFC-0012 §5 (offline as high-latency participation), RFC-0014 §1/§4 (Pending durability, loss triage), RFC-0004 §1 (occurrence vs knowledge time), RFC-0016 H2.

Acceptance criteria:
- Compiles; tests green: offline record/draft/queue across process death and app upgrade
- Reconnect = Append pending + Project from old watermark; no merge step exists anywhere
- Concurrent-supersession race degrades to preserved, derived disagreement (no corruption, no resolver code)
- Offline capability evaluation at watermark honestly lags; surfaced as "as of" staleness
- The RFC-0012 §5 measurement recorded: hours spent on offline-specific code (near-free confirms; expensive falsifies)

Dependencies: M3 (client), M1 (bitemporal journal).
