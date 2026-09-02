---
id: P-43
title: Pending durability across upgrades
parent: P-8
status: done
owner: bradley
tags:
  - rfc-0014
---

The one fragile store survives process death and app updates; migration-tested.

Landed: the on-device format is versioned (`PENDING_FORMAT`), migrated forward on open, rewritten in the current format, and refused (never guessed at) when it comes from a newer build. An unversioned M3 store migrates cleanly. `StoragePersistence` carries the guarantee into the browser, keyed per Actor, and says honestly whether the browser let it be durable. Tests: tests/m7-offline.test.ts (P-43).
