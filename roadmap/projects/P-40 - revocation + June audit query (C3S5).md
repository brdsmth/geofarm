---
id: P-40
title: revocation + June audit query (C3/S5)
parent: P-7
status: done
owner: bradley
tags:
  - rfc-0002
---

Access ends by supersession; audit answered from grant projection; no audit feature exists.

Landed: `Session.revoke()` supersedes a grant with one conferring nothing; forward flow stops and the revoked party keeps what they truly saw (§4.3). `Session.reachOf(actor, asOf)` answers the June question by projecting grant history over the viewer's own Reading — the ordinary sub-world computation applied to someone else. S5 is asserted structurally: no exported symbol anywhere in packages/ is named for audit. Tests: tests/m6-collaboration.test.ts (P-40).
