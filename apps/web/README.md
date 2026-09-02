# geofarm — the vertical slice

One full-screen map. The farm, its history, its people — nothing else.

## Run it

```sh
bun run app        # builds and serves at http://localhost:4790
```

## What this is

An architectural validation, not an MVP: a thin shell over the tested
platform packages, seeded with a demo farm (Miller Farm, central Iowa) in an
in-process world. The journal, boundary, stores, verbs, and mark derivation
are the real implementations — the shell adds pixels, not semantics.

| Shell element | Architecture it exercises |
|---|---|
| Full-screen map, no pages | RFC-0000 §2.2; RFC-0006 §1 (one View; S1) |
| Field polygons, farm line, places, work markers | RFC-0005 lenses; RFC-0015 mark streams |
| Hover + tap → story panel | RFC-0015 §1 answerability; RFC-0006 §5 inspection in place; RFC-0004 §9 timelines |
| Layer pills | RFC-0005 layer control (Reveal) |
| Season slider | RFC-0006 §4 temporal panning; RFC-0004 true-frame re-projection (West 40's 2026 survey correction disappears when you scrub before May 2026) |
| Search → fly to a place | RFC-0006 §6 (query → results → semantic navigation) |
| Resume where you left off | RFC-0006 §1.3 / RFC-0014 §3 remembered Views — the whole View, per viewer |
| Camera ↔ View binding | RFC-0006 §1 Amendment 2 — the View's spatial scope *is* where you're looking; pans coalesce on the trail |
| All copy in farm language | RFC-0000 §2.6 membrane; S10 lint covers `apps/` for vocabulary *and* location |
| Field colour = what's growing; names on the map | RFC-0004 §4 projected state as presentation (REVIEW-003 §3) |
| Count badges; tap a stack to list it | RFC-0015 §4 Amendment 1 — density-triggered aggregation that resolves |
| Ask about this / circle an area and ask; What's that based on?; Keep this answer | RFC-0010 — the four strata, peel-back (S8), promotion (A3) |
| Looking as … | RFC-0002 §2.3 — one world, one map, a different sub-world per viewer |
| Who can see this? · Let someone see the farm · Stop sharing | RFC-0002 §4 — sharing is authoring a Grant; revocation is supersession (M6) |
| This season on the farm (in the farm line's story) | RFC-0006 §6 — a lens presentation in the panel, not a page |
| Notes kept on the device until sent; the world remembered across reloads | RFC-0014 §1 Pending durability (M7); RFC-0013 §2 store port behind a Web Storage adapter |

The in-browser world uses the same `Boundary` contract a remote server will
(RFC-0012): swapping in the PostgreSQL-backed journal changes no shell code.

## Notes

- Basemap: Esri World Imagery (keyless raster tiles); farm content renders
  above it and works offline.
- The demo world lives in your browser's storage. To start over:
  `__geofarm.reset()` in the console, then reload.
- MapLibre parses GeoJSON in a Web Worker; the build step copies
  `maplibre-gl-worker.mjs` / `maplibre-gl-shared.mjs` next to the bundle.
