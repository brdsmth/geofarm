---
id: P-58
title: the soil survey as a source
parent: O-2
status: done
owner: bradley
tags:
  - feeds
  - soil
  - rfc-0011
---

RFC-0016 E5 (more layers), taken with the first source that is neither sampled nor captured: a *survey* — ground someone walked, drew a line around, and described. The USDA soil survey (SSURGO), the data behind Web Soil Survey, read through NRCS's open query service, Soil Data Access (keyless, public domain, cited on every claim).

- **A place and a claim about it.** Each map unit under the farm enters as an Entity (`soil-unit`) whose outline is the part of the unit the farm engaged the survey for — one area, or a collection when the unit lies in several pieces. What the survey says of it enters as an Assertion (`soil-survey`), never an Observation: a survey's properties are modeled from pits dug elsewhere (RFC-0011 §2 Amendment 1a). Confidence is the surveyor's own — the share of the unit they say matches the soils it is named for. Grounds cite the survey area, version, and date.
- **Republication is supersession** (RFC-0011 §4). NRCS republishes each autumn. A new version supersedes the description; a moved line supersedes the place. A pull repeated admits nothing.
- **What the provider said is kept**, in three tiers. The journal holds what the farm believes. A `source_cache` table beside it holds every answer the service gave, by request and version — the units, the properties, and an archive of every table the service keeps for those units (thirty-four tables, about 23,600 rows for Miller Farm), so the same version is never asked for twice and a dead service is answered from the held copy. And each touched survey area is kept whole on disk, by version, as NRCS publishes it (43 MB for Jasper County). None of the held copies adjudicate: only admission makes a thing so.
- **On the map**, a "Soil types" switch, off at first, under the farm's own marks. A soil type's story says acres here, corn suitability, productivity, farmland class, drainage, slope, water held, water table, flooding, topsoil, and what it is made of — in inches and acres — and ends by saying what a survey is.

The core stayed closed: nothing in world, journal, access, projection, boundary, render, or interaction changed (tests/m8 still asserts none of them says "soil"). What it cost: one feed package, a cache and a mirror in the server, a lens, a colour with a word, and copy. One shell generalization fell out — a collection of areas is one shape to the map engine.

Evidence: tests/m10-soil-survey.test.ts. Not yet: a farm that straddles two survey areas (handled, never exercised); the agronomist's and assistant's grants on a farm seeded before this landed do not name the survey, so by T3 it does not exist for them until the grower widens those shares.
