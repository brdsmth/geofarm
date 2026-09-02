---
id: P-44
title: offline cost measurement
parent: P-8
status: done
owner: bradley
tags:
  - rfc-0012
---

Hours of offline-specific code recorded: near-free confirms RFC-0012 §5, expensive falsifies it.

Measured (the RFC-0012 §5 instrument), counted from the M6/M7 diffs:

| Offline-specific code | Lines |
|---|---|
| `BoundaryPort` (the door as a shape a dead radio can present) | 6 |
| `Session.send()` deferral when the door throws | 10 |
| `Session.knownAsOf()` (the watermark in plain time) | 5 |
| `Projection.headsOf()` + the `heads` read form (a fork *read*, not a resolver) | 41 |
| Merge, diff, conflict-resolution, or sync-state code | **0** |

Journal: unchanged. Boundary: one `case`. Client: 21 lines. Wall-clock: under an hour, in one sitting, including the tests. **Near-free — RFC-0012 §5 confirmed.** The only offline-shaped work was making the outbox survive (P-43), which RFC-0014 §1 had already obligated for every device.
