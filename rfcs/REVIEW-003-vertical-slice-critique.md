# REVIEW-003 — Vertical Slice Critique

| | |
|---|---|
| **Review** | 003 |
| **Scope** | The vertical slice (`apps/web/`) against RFC-0000–0016 |
| **Stance** | Product designer, GIS engineer, and architect seeing the app for the first time; prior decisions get no deference |
| **Author** | Bradley |
| **Date** | 2026-07-23 |
| **Outcome** | Continue implementation; four narrow amendment proposals; a P0 list that must land before M5 |

---

## 1. Executive review

The slice proves the architectural thesis and undersells the product. The map is genuinely the whole application — no pages, no menus, one surface — and the architecture visibly did its job: the only real bug found during the build (marks vanishing after search) was the *shell* being dishonest with the View, and the fix was to obey the RFC harder, not to change it. That is the result the slice existed to produce.

But viewed cold, the app is a **viewer, not an operating system**. It shows geometry, not a farm: unlabeled rectangles that contradict the imagery under them, identical pink dots for every kind of event, a story panel that reads well but dead-ends — there is no way to *add* to the story, though the entire authoring pipeline sits tested and idle one import away. The single most damning observation: a farmer's most natural act — standing in a field, wanting to note something — is impossible. The slice validates "this is where I *see* my farm." The vision was "this is where I *understand* my farm," and understanding is a loop, not a view.

Nothing found here indicts the ontology, the temporal model, access, or the boundary. Everything found lands in the shell, in two implementation nonconformances, and in four narrow clarifying amendments. **Recommendation: continue (§10), with conditions.**

## 2. Architectural findings

**A. The architecture was load-bearing when it mattered.** The camera/View desync produced *correct-per-spec, wrong-on-screen* behavior — marks obeyed the View while the camera wandered. The RFCs adjudicated the fix unambiguously (RFC-0006 §1: spatial scope is where the viewer is looking). An architecture that settles arguments during implementation is doing its job. However, the invariant the shell had to discover — **camera and spatial scope are the same value** — is stated nowhere. It should be (Amendment A1).

**B. View-trail semantics are underspecified and now polluted.** Binding camera→View means every pan pushes a trail entry; "undo is navigation" (RFC-0006 §3, RFC-0014 §3) now steps back through camera nudges, and the trail grows without bound. The RFCs say history is free; implementation shows history needs *granularity*: continuous navigation should coalesce, verbs should punctuate. Unspecified today; shells will each invent it differently (A1, second clause).

**C. Aggregation duties bind at density = 2, not density = 10,000.** RFC-0015 framed LOD as a scale problem and RFC-0016 deferred clustering. The slice refutes the framing at n=29: five events on one field render as one centroid dot hiding four others — **invisible stacking**, precisely the "sparsity on screen must be trustworthy" violation RFC-0015 §4 forbids, at trivial scale. Coincident marks must aggregate with a visible count, always (A2).

**D. Nonconformance: inspection ignores the temporal binding.** RFC-0006 §5 defines inspection as a bundle of projections taken within the View — but `Session.inspect` reads the whole Reading regardless of the season slider. Scrub to 2024, tap Creek Field, and the panel cheerfully lists 2026 events. Every frame is true on the map and false in the panel. Defect, not amendment — though the fix wants one sentence of spec support (A3: a panel must either honor the bound time or *declare* that it shows the whole story).

**E. Nonconformance: module rule 7 is violated and the lint can't see it.** "Surface owns every user-facing string" — yet `index.html` and `main.ts` carry a dozen literals ("Find a place…", "Tap a field to see its story", `KIND_LABEL`). The S10 lint checks *what words say*, not *where words live*, so it passed. The membrane held by discipline, not enforcement (A4).

**F. Mechanism debt, honestly logged.** `Boundary.walk`/`Projection.load` re-scan the full log per call, and the feeds' stateless resolution is O(n²)-shaped. Fine at demo scale, sanctioned for later materialization by RFC-0013 — but the first real integration will hit it. Not architecture; scheduled cost.

**G. Partial View persistence.** The remembered View saves camera + season but not lenses or selection. RFC-0014 says the View is one value; the shell remembered half of one. Minor, real.

## 3. Product findings

**The map shows features, not a farm.** The demo polygons are rectangles floating over imagery whose *actual* field boundaries are clearly visible — and disagree. For a product whose thesis is correspondence with reality, the very first pixel a farmer studies contradicts it. Demo data must trace the imagery it sits on; this is not cosmetics, it is the thesis.

**Identity is hidden behind interaction.** No field names on the map. Every reference product (Google Maps, OnX) labels features directly; here you must hover — which doesn't exist on phones — or tap. A farmer knows their fields by name before anything else; the map should too.

**The story has no author's door.** Reading without writing makes this a report, not an OS. One-tap "add a note here" — selection → annotate → send, all of which exist tested in `Session` — is the smallest change with the largest identity shift: from brochure to tool.

**What's growing is invisible.** The panel knows Creek Field was planted to corn in May; the map paints it the same green as everything else. Crop-at-a-glance (color or label by current crop, projected state — RFC-0004 §4 makes this a one-liner) is the difference between "map of my farm" and "state of my farm."

**Missing: the farm's own pulse.** "What happened this week, anywhere?" requires tapping five fields. A whole-farm recent-activity reading (a lens presentation, per RFC-0006 §6 — not a page) is the farm-manager's first question and currently unanswerable.

## 4. UX findings (visual design, redesigned for clarity only)

1. **The double-tint wash** — every lens gets a 14% fill, including the farm *line*, so the entire farm sits under two stacked green-yellow washes. The farm line should be a line. Concrete, one-line fix; large clarity gain.
2. **Hierarchy is flat and inverted**: four equal pills, equal-weight outlines, no labels — geometry outranks identity. Names first, boundaries second, chrome last.
3. **Pink reads as alarm.** Work/notes markers use a hue that means "problem" in every mapping product; and one hue for five event kinds says nothing. Color needs a small, meaningful system (operations vs observations at minimum).
4. **The timeline is mystery meat**: 90 unlabeled ticks, no years, no hint of what will change when dragged. Windy's scrubber tells you what it controls; this one is a green ruler. Year ticks + a label while dragging.
5. **Layer pills are premature enterprise chrome.** With one farm and four always-relevant lenses, toggles solve nobody's problem yet — "Farm line" off is a state no farmer wants. Hide the switcher until a lens exists that is genuinely optional (imagery). The RFC justifies layers; it never mandates a switcher at n=4.
6. **Selection is invisible on the map.** Tap a field: the panel opens, the polygon doesn't change. RFC-0006 calls selection *shared attention*; the map must show what is attended.
7. **Mobile**: pills wrap over the map, the bottom sheet has no drag affordance, hover-only tooltips are dead weight, tap targets (6px dots) fail glove-scale. And the glass-dark theme, handsome at a desk, is questionable at noon in a cab — daylight legibility is an ag-specific requirement no reference product forced on us.
8. **No zoom controls, no scale bar.** Pinch/scroll-only excludes a real demographic; a GIS engineer also notes there is no scale reference at all.

## 5. Interaction findings

The five-verb decomposition survives contact — pan/scrub/tap/search all map cleanly and the consequence-free feel is real (nothing you can break by exploring; that is RFC-0006's first law, felt). Gaps: **discoverability rests on one 8-second toast** (if missed, hover is the only teacher and phones have no hover); **search** has no keyboard navigation and results don't say *where* they are ("Planted corn — which field?"); **multi-event picks** silently open the first record; **the season slider and the panel disagree** (D above) — the single worst interaction incoherence; **Back to today** appears only while scrubbed, which is good, but nothing communicates *what changed* between frames — the West 40 boundary shift, the slice's best demo, is discoverable only by staring.

## 6. Proposed RFC amendments (proposals only — nothing modified)

- **A1 — RFC-0006 §1 (normative):** *In any shell, the rendered viewport and the View's spatial scope are one value; divergence is a defect.* Plus trail granularity: *continuous navigation coalesces into a single trail entry; discrete verbs punctuate.* Basis: §2.B.
- **A2 — RFC-0015 §4 (clarifying):** *Aggregation duties are density-triggered, not scale-triggered: coincident or indistinguishably-near marks must aggregate with a visible count at any N ≥ 2. Invisible stacking is the sparsity-trust violation this section already forbids.* Basis: §2.C.
- **A3 — RFC-0006 §5 (one sentence):** *An inspection surface either takes its bundle as-of the View's temporal binding or explicitly declares a wider temporal frame in surface language ("the whole story").* Basis: §2.D.
- **A4 — REVIEW-002 §7 / RFC-0000 §2.6 (tooling):** *S10 enforces location as well as vocabulary: user-facing string literals outside the surface package fail the lint.* Basis: §2.E.

No amendment touches the ontology, temporal model, access model, or boundary. That is the review's strongest architectural signal.

## 7. Proposed UI improvements

Field-name labels on the map · selection highlight (bold outline + brightened fill) · farm line as line-only · crop-at-a-glance styling from projected state · one-tap add-note (annotate from selection) · differentiated + count-badged event markers · timeline year ticks with drag label · layer switcher hidden until an optional lens exists · zoom controls + scale bar · demo geometry traced to the underlying imagery · panel time-frame label · search results with place context and keyboard nav · mobile: drag-handle sheet, larger touch targets, no hover dependence · daylight/high-contrast mode.

## 8. Prioritized product backlog

**P0 — before M5 (the agent needs these to land credibly):**
1. Selection visible on the map (the AI's "shared attention" — RFC-0010's Frame — must be *seen* to be believed)
2. One-tap add-note (Author loop; the agent's promote-answer flow reuses it)
3. Panel honors/declares temporal frame (fix D)
4. Field labels on map; farm-line fill removed; traced demo geometry
5. Coincident-mark count badges (A2 minimum form)

**P1:** crop-at-a-glance styling · timeline ticks + drag label · strings relocated to surface + location-lint (A4) · search context + keyboard · zoom controls · full-View persistence
**P2:** whole-farm activity reading · imagery lens in shell (content already flows from M4) · daylight theme · pick disambiguation list · pills auto-hide · trail coalescing (A1)

## 9. Risks

1. **Polish now vs. agent now.** M5 on top of an unlabeled, selection-invisible map risks demoing intelligence nobody can see the context of; P0 exists to de-risk exactly this. Conversely, unbounded polish defers the platform's actual differentiator. The P0 list is deliberately five items.
2. **Demo-data credibility debt**: every screenshot with imagery-contradicting rectangles trains viewers to see a toy.
3. **Persona narrowing**: the slice implicitly serves the owner at a desk; workers (offline, gloves, sunlight) and operators (paths, machines) are architecturally provided-for but experientially absent — drift toward desk software is the ambient failure mode of map apps.
4. **Mechanism debt (F)** will surface abruptly with the first live feed.
5. **The membrane held by luck** (E) — until A4, nothing stops the next contributor's `"sub-world error"` toast.

## 10. Recommendation

**Continue implementation. Do not revise the architecture.** Sixteen documents were stress-tested by a real build and the findings are: zero ontology changes, zero model changes, two shell nonconformances, four clarifying amendments, and a fix that was *dictated by* the spec rather than fought against it. Architecture that behaves this way under contact has earned continuation.

Conditions: adopt A1–A4 as amendments through the normal open process; land the five P0 items before M5 begins, because the agent's core gestures (shared attention, promotion into the world, temporal honesty) depend on them being visible and true on the surface. The slice proved the map can be the application. The P0 list is what makes it feel like the *farm's* application — and then M5 makes it think.

---

*The brutal summary: the architecture passed its first contact with reality; the product is still a beautiful window. Open the door — labels, selection, a pen — before inviting the intelligence in.*
