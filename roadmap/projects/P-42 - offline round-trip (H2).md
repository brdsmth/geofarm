---
id: P-42
title: offline round-trip (H2)
parent: P-8
status: done
owner: bradley
tags:
  - rfc-0012
  - rfc-0014
---

Full day offline: record, draft, queue; reconnect = Append + Project; no merge step.

Landed: tests/m7-offline.test.ts — a full day in a dead zone (zone kept, two notes, one boundary correction), the phone dying, and reconnection as exactly Append + Project from the old watermark. Every record arrives as late-arriving knowledge (occurrence from the field, knowledge at admission). The one true race — concurrent corrections of the same line — degrades to two standing heads, shown as contenders on the surface and as `heads` through the door, collapsed only by whoever next authors a reconciliation. Enforcement lags the walk, visibly: a revocation issued while the radio is off is refused at the next send, with the reason kept in Pending.
