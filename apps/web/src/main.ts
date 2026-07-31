/**
 * geofarm — the shell. One map, one View, five verbs (RFC-0006).
 * No router, no pages: destinations = 1 (S1). Everything below wires
 * gestures to Session verbs and paints marks; nothing below holds state
 * of its own beyond the three stores (RFC-0014, S2).
 */

import "maplibre-gl/dist/maplibre-gl.css";
import "./app.css";
import type { AdmittedRecord, Geometry, Id } from "../../../packages/world/index.ts";
import { assistant as assistantCopy, claims, map as mapCopy, story, work } from "../../../packages/client/surface/index.ts";
import {
  AskEngagement,
  viewerStores,
  type CandidateAssertion,
  type PeelNode,
  type Reply,
} from "../../../packages/agent/index.ts";
import { RuleReasoner } from "../../../packages/agent/reasoner.ts";
import { seedWorld, NOW } from "./seed.ts";
import {
  boundsOf,
  createMap,
  pickableLayerIds,
  setGestureData,
  setLensData,
  toFeatureCollections,
  type MarkFeatureProps,
} from "./map.ts";

const KIND_LABEL: Record<string, string> = {
  field: "Field",
  farm: "Farm line",
  pond: "Pond",
  building: "Building",
  road: "Road",
  planting: "Planting",
  harvest: "Harvest",
  spray: "Spray",
  note: "Note",
  maintenance: "Maintenance",
  diagnosis: "Diagnosis",
  reading: "Answer",
  anomaly: "Alert",
};

const LENSES = [
  { name: "fields", label: "Fields", filter: { classifications: ["field"] } },
  { name: "boundary", label: "Farm line", filter: { classifications: ["farm"] } },
  { name: "places", label: "Places", filter: { classifications: ["pond", "building", "road"] } },
  {
    name: "work",
    label: "Notes & work",
    filter: {
      classifications: [
        "planting",
        "harvest",
        "spray",
        "note",
        "maintenance",
        "diagnosis",
        "reading",
        "anomaly",
      ],
    },
  },
];

const MONTH0 = Date.UTC(2019, 0, 1);
const MONTHS = 90; // Jan 2019 .. Jun 2026, slider max = today

function monthToIso(idx: number): string {
  const d = new Date(MONTH0);
  d.setUTCMonth(d.getUTCMonth() + idx);
  return d.toISOString();
}

function monthLabel(idx: number): string {
  return new Date(monthToIso(idx)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

async function boot(): Promise<void> {
  const { session, names, boundary, assistant, org } = await seedWorld();

  for (const l of LENSES) session.reveal({ name: l.name, filter: l.filter, visible: true });

  // The assistant, engaged inside this viewer's situation (RFC-0010): the
  // engagement reads the live View + Pending + Reading; nothing is restated.
  const engagement = new AskEngagement(
    boundary,
    assistant,
    new RuleReasoner(),
    viewerStores(session),
    org,
  );

  const map = createMap(el("map"));
  const describe = (id: Id): { name: string; kind: string } => {
    const r = session.reading.get(id);
    return { name: names.get(id) ?? KIND_LABEL[r?.classification ?? ""] ?? "—", kind: r?.kind ?? "" };
  };

  const lensNames = LENSES.map((l) => l.name);
  const paint = (): void => {
    setLensData(map, toFeatureCollections(session.marks(), describe, session.view.selection), lensNames);
  };
  // Dev console handle — not UI, not state (the stores stay the three).
  (window as unknown as Record<string, unknown>).__geofarm = { session, map, paint };

  // ---------------------------------------------------------- remembered View
  type Saved = { center: [number, number]; zoom: number; season: number };
  const saved: Saved | undefined = (() => {
    try {
      const raw = localStorage.getItem("geofarm-view-2");
      return raw === null ? undefined : (JSON.parse(raw) as Saved);
    } catch {
      return undefined;
    }
  })();
  const remember = (): void => {
    const c = map.getCenter();
    localStorage.setItem(
      "geofarm-view-2",
      JSON.stringify({ center: [c.lng, c.lat], zoom: map.getZoom(), season: seasonInput.valueAsNumber }),
    );
  };

  // ------------------------------------------------------------------- panel
  const panel = el<HTMLElement>("panel");
  const panelBody = el<HTMLElement>("panel-body");

  const storyOf = (id: Id): string => {
    const r = session.reading.get(id);
    if (r === undefined) return "";
    const name = names.get(id) ?? KIND_LABEL[r.classification] ?? "This place";
    const kindLabel = KIND_LABEL[r.classification] ?? "Place";
    const bundle = session.inspect(id);
    const rows = (bundle?.timeline ?? [])
      .slice()
      .reverse()
      .map((h: AdmittedRecord) => {
        const who = names.get(h.actors.actor) ?? "";
        const text = (h.body as { text?: string } | undefined)?.text ?? KIND_LABEL[h.classification] ?? "";
        // A claim is not a fact (REVIEW-002): how-sure rides with it.
        const sure =
          h.kind === "assertion" && h.confidence !== undefined
            ? ` <span class="sure">${claims.howSure(Math.round(h.confidence * 100))}</span>`
            : "";
        return `<div class="row"><span class="when">${fmtDate(h.occurrence.start)}</span><span class="what">${text}${sure}</span><span class="who">${who}</span></div>`;
      })
      .join("");
    const since =
      r.kind === "entity"
        ? `<div class="since">${kindLabel} · here since ${new Date(r.occurrence.start).getFullYear()}</div>`
        : `<div class="since">${kindLabel} · ${fmtDate(r.occurrence.start)}</div>`;
    // The panel declares its temporal frame (REVIEW-003 A3): scrubbed
    // means the story below stops where the slider stands.
    const frame =
      session.view.time.start === NOW
        ? ""
        : `<div class="frame">${story.asOf(seasonLabel.textContent ?? "")}</div>`;
    const rowsOrQuiet =
      rows.length > 0 ? `<h3>What's happened here</h3>${rows}` : "<p class='quiet'>Nothing recorded here yet.</p>";
    return `<h2>${name}</h2>${since}${frame}${rowsOrQuiet}`;
  };

  // ------------------------------------------- the author's door (P0 #2)
  // One tap from reading to writing: annotate inherits its aboutness from
  // the selection (RFC-0006 §8), and the whole tested pipeline — draft,
  // commit, send, sync — runs behind one button.
  const composeHtml = `<div class="compose">
      <button id="add-note">${story.addNote}</button>
      <form id="compose-form" hidden>
        <textarea id="note-text" rows="3" placeholder="${story.notePlaceholder}"></textarea>
        <div class="compose-actions">
          <button type="submit" id="note-save">${story.keepNote}</button>
          <button type="button" id="note-cancel">${story.neverMind}</button>
        </div>
        <p id="compose-status" class="quiet" hidden></p>
      </form>
    </div>`;

  // --------------------------------------------------- the Ask verb (M5)
  // Circle-and-ask surfaced: the question is bare text; the situation —
  // place, season, layers, selection, drawn regions — is the context the
  // engagement already reads (RFC-0010 §2). Answers arrive with how-sure
  // and what-it's-based-on attached, and keeping one is a deliberate act.
  const askHtml = `<div class="ask">
      <button id="ask-open">${assistantCopy.askAbout}</button>
      <form id="ask-form" hidden>
        <input id="ask-text" type="text" placeholder="${assistantCopy.askPlaceholder}" autocomplete="off" />
        <button type="submit" id="ask-send">${assistantCopy.ask}</button>
      </form>
      <div id="ask-replies"></div>
    </div>`;

  const peelRows = (nodes: PeelNode[], depth = 0): string =>
    nodes
      .map((n) => {
        const who = names.get(n.record.actors.actor) ?? "";
        const text =
          (n.record.body as { text?: string } | undefined)?.text ??
          KIND_LABEL[n.record.classification] ??
          "";
        const grounds = n.grounds
          .map(
            (g) =>
              `<div class="peel-row" style="margin-left:${(depth + 1) * 14}px">${claims.basedOn(g.source)}</div>`,
          )
          .join("");
        return `<div class="peel-row" style="margin-left:${depth * 14}px"><span class="when">${fmtDate(n.record.occurrence.start)}</span> ${text} <span class="who">${who}</span></div>${grounds}${peelRows(n.evidence, depth + 1)}`;
      })
      .join("");

  const renderReplies = async (replies: Reply[]): Promise<void> => {
    const box = el<HTMLElement>("ask-replies");
    const kept: CandidateAssertion[] = [];
    const parts: string[] = [];
    for (const r of replies) {
      if (r.kind === "claim") {
        const i = kept.push(r.claim) - 1;
        const peel = await engagement.peel(r.claim);
        parts.push(`<div class="reply">
            <p>${r.claim.text}</p>
            <div class="reply-meta">${claims.howSure(Math.round(r.claim.confidence * 100))} · ${names.get(assistant) ?? ""}</div>
            <details class="peel"><summary>${claims.whatsThatBasedOn}</summary>${peelRows(peel)}</details>
            <button class="keep" data-i="${i}">${assistantCopy.keepAnswer}</button>
          </div>`);
      } else if (r.kind === "reveal") {
        parts.push(`<div class="reply">
            <p>${r.text}</p>
            <button class="show-it" data-ids="${r.about.join(",")}">${assistantCopy.showIt}</button>
          </div>`);
      } else {
        parts.push(`<div class="reply"><p class="quiet">${r.text}</p></div>`);
      }
    }
    box.innerHTML = parts.join("");
    for (const b of box.querySelectorAll<HTMLButtonElement>("button.keep")) {
      b.addEventListener("click", () => {
        const claim = kept[Number(b.dataset.i)];
        if (claim === undefined) return;
        b.disabled = true;
        void engagement.promote(claim).then(async (result) => {
          if (!result.accepted) {
            b.textContent = work.couldNotSend;
            return;
          }
          await session.sync();
          paint();
          b.textContent = assistantCopy.keptAnswer;
        });
      });
    }
    for (const b of box.querySelectorAll<HTMLButtonElement>("button.show-it")) {
      b.addEventListener("click", () => {
        // Bringing-into-frame (RFC-0010 §4): reveal the lenses that show
        // what the assistant is pointing at.
        for (const id of (b.dataset.ids ?? "").split(",")) {
          const record = session.reading.get(id as Id);
          if (record === undefined) continue;
          const lens = LENSES.find((l) => l.filter.classifications.includes(record.classification));
          const state = session.view.lenses.find((l) => l.name === lens?.name);
          if (lens !== undefined && state?.visible === false) {
            session.toggle(lens.name);
            lensButtons.get(lens.name)?.classList.add("on");
          }
        }
        paint();
        b.disabled = true;
      });
    }
  };

  const wireAsk = (): void => {
    const openBtn = el<HTMLButtonElement>("ask-open");
    const form = el<HTMLFormElement>("ask-form");
    const text = el<HTMLInputElement>("ask-text");
    openBtn.addEventListener("click", () => {
      openBtn.hidden = true;
      form.hidden = false;
      text.focus();
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = text.value.trim();
      if (q === "") return;
      text.value = "";
      void engagement.ask(q).then(renderReplies);
    });
  };

  const renderPanel = (id: Id): void => {
    panelBody.innerHTML = storyOf(id) + askHtml + composeHtml;
    wireAsk();
    const addBtn = el<HTMLButtonElement>("add-note");
    const form = el<HTMLFormElement>("compose-form");
    const text = el<HTMLTextAreaElement>("note-text");
    addBtn.addEventListener("click", () => {
      addBtn.hidden = true;
      form.hidden = false;
      text.focus();
    });
    el("note-cancel").addEventListener("click", () => {
      form.hidden = true;
      addBtn.hidden = false;
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const body = text.value.trim();
      if (body === "") return;
      const draftId = session.annotate("note", { text: body }, NOW);
      session.commit(draftId);
      void session.send().then(async (result) => {
        if (result.rejected.length > 0) {
          const status = el<HTMLElement>("compose-status");
          status.textContent = work.couldNotSend;
          status.hidden = false;
          return;
        }
        await session.sync();
        paint();
        renderPanel(id); // the new note is part of the story now
      });
    });
  };

  // The one drawn indication at a time; ephemeral (second law).
  let gestureId: string | undefined;
  const dropGesture = (): void => {
    if (gestureId !== undefined) {
      session.pending.dropGesture(gestureId);
      gestureId = undefined;
      setGestureData(map, undefined);
    }
  };

  const openPanel = (id: Id): void => {
    dropGesture();
    session.select([id]);
    renderPanel(id);
    panel.hidden = false;
    el("hint").hidden = true;
    paint(); // attention is shared with the map (RFC-0006 §3)
  };
  const closePanel = (): void => {
    session.select([]);
    dropGesture();
    // The exchange evaporates with the engagement (RFC-0010 §2): what
    // was worth keeping was promoted; the rest leaves no residue.
    engagement.discard();
    panel.hidden = true;
    paint();
  };
  el("panel-close").addEventListener("click", closePanel);

  // The circled corner (RFC-0006 §3): a drawn query region, panel-opened.
  const openGesturePanel = (): void => {
    session.select([]);
    panelBody.innerHTML =
      `<h2>${assistantCopy.circledArea}</h2>` +
      `<div class="since">${mapCopy.drawToAsk}</div>` +
      askHtml.replace(assistantCopy.askAbout, assistantCopy.askThisArea) +
      `<div class="compose"><button id="gesture-drop">${mapCopy.letItGo}</button></div>`;
    wireAsk();
    el("gesture-drop").addEventListener("click", closePanel);
    panel.hidden = false;
    el("hint").hidden = true;
  };

  // ----------------------------------------------------------- layer switcher
  const layersBox = el<HTMLElement>("layers");
  const lensButtons = new Map<string, HTMLButtonElement>();
  for (const l of LENSES) {
    const b = document.createElement("button");
    b.textContent = l.label;
    b.className = "lens on";
    b.addEventListener("click", () => {
      session.toggle(l.name);
      b.classList.toggle("on");
      paint();
    });
    lensButtons.set(l.name, b);
    layersBox.appendChild(b);
  }

  // ---------------------------------------------------------------- timeline
  const seasonInput = el<HTMLInputElement>("season");
  const seasonLabel = el<HTMLElement>("season-label");
  const todayBtn = el<HTMLButtonElement>("today");
  const applySeason = (): void => {
    const idx = seasonInput.valueAsNumber;
    if (idx >= MONTHS) {
      session.navigateTime({ start: NOW });
      seasonLabel.textContent = "Today";
      todayBtn.hidden = true;
    } else {
      session.navigateTime({ start: monthToIso(idx + 1) }); // end of that month
      seasonLabel.textContent = monthLabel(idx);
      todayBtn.hidden = false;
    }
    if (!panel.hidden && session.view.selection[0] !== undefined) {
      renderPanel(session.view.selection[0]);
    }
    paint();
    remember();
  };
  seasonInput.addEventListener("input", applySeason);
  todayBtn.addEventListener("click", () => {
    seasonInput.value = String(MONTHS);
    applySeason();
  });

  // ------------------------------------------------------------------ search
  const searchInput = el<HTMLInputElement>("search-input");
  const searchResults = el<HTMLElement>("search-results");
  const goTo = (id: Id): void => {
    const place = session.reading.placeOf(id);
    if (place !== undefined) map.fitBounds(boundsOf(place), { padding: 90, maxZoom: 15.5 });
    session.navigateToThing(id);
    openPanel(id);
    searchResults.hidden = true;
    searchInput.value = "";
  };
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    if (q.length < 2) {
      searchResults.hidden = true;
      return;
    }
    const hits = session.reading
      .all()
      .filter((r) => {
        const name = (names.get(r.id) ?? "").toLowerCase();
        const text = ((r.body as { text?: string } | undefined)?.text ?? "").toLowerCase();
        return name.includes(q) || text.includes(q);
      })
      .slice(0, 6);
    searchResults.innerHTML = hits
      .map((r) => {
        const label = names.get(r.id) ?? (r.body as { text?: string } | undefined)?.text ?? "—";
        const kind = KIND_LABEL[r.classification] ?? "";
        return `<button data-id="${r.id}"><span>${label}</span><small>${kind}</small></button>`;
      })
      .join("");
    searchResults.hidden = hits.length === 0;
    for (const b of searchResults.querySelectorAll("button")) {
      b.addEventListener("click", () => goTo((b as HTMLElement).dataset.id as Id));
    }
  });

  // ------------------------------------------------------------ draw-to-ask
  // Drawing is indication by default (RFC-0006 §3): one drag, one dashed
  // region, one question. The rectangle is a gesture in Pending — real
  // enough to ask about, ephemeral unless something it produced is kept.
  const drawBtn = el<HTMLButtonElement>("draw-ask");
  drawBtn.textContent = mapCopy.drawToAsk;
  let drawing = false;
  let justDrew = false;
  let drawFrom: [number, number] | undefined;
  const rectFrom = (
    a: [number, number],
    b: [number, number],
  ): Extract<Geometry, { form: "area" }> => {
    const w = Math.min(a[0], b[0]);
    const e = Math.max(a[0], b[0]);
    const s = Math.min(a[1], b[1]);
    const n = Math.max(a[1], b[1]);
    return {
      form: "area",
      rings: [
        [
          [w, s],
          [e, s],
          [e, n],
          [w, n],
          [w, s],
        ],
      ],
    };
  };
  const exitDraw = (): void => {
    drawing = false;
    drawFrom = undefined;
    map.dragPan.enable();
    map.getCanvas().style.cursor = "";
    drawBtn.classList.remove("on");
  };
  drawBtn.addEventListener("click", () => {
    if (drawing) {
      exitDraw();
      return;
    }
    dropGesture();
    drawing = true;
    map.dragPan.disable();
    map.getCanvas().style.cursor = "crosshair";
    drawBtn.classList.add("on");
  });
  map.on("mousedown", (e) => {
    if (!drawing) return;
    drawFrom = [e.lngLat.lng, e.lngLat.lat];
  });
  map.on("mousemove", (e) => {
    if (!drawing || drawFrom === undefined) return;
    setGestureData(map, rectFrom(drawFrom, [e.lngLat.lng, e.lngLat.lat]));
  });
  map.on("mouseup", (e) => {
    if (!drawing || drawFrom === undefined) return;
    const geometry = rectFrom(drawFrom, [e.lngLat.lng, e.lngLat.lat]);
    exitDraw();
    justDrew = true;
    const ring = geometry.rings[0] as [number, number][];
    const tiny =
      Math.abs((ring[0] as [number, number])[0] - (ring[2] as [number, number])[0]) < 1e-5 ||
      Math.abs((ring[0] as [number, number])[1] - (ring[2] as [number, number])[1]) < 1e-5;
    if (tiny) {
      setGestureData(map, undefined); // a click, not a circle
      return;
    }
    setGestureData(map, geometry);
    gestureId = session.draw(geometry, NOW);
    openGesturePanel();
  });

  // --------------------------------------------------------- hover and pick
  const tooltip = el<HTMLElement>("tooltip");
  // Marks depend on the style, not the imagery: paint as soon as the
  // style stands so the farm never waits on the last satellite tile.
  map.on("style.load", () => {
    paint();
    if (saved !== undefined) {
      map.jumpTo({ center: saved.center, zoom: saved.zoom });
      seasonInput.value = String(saved.season);
      applySeason();
    }
    map.on("mousemove", (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: pickableLayerIds(lensNames) });
      const top = features[0];
      if (top !== undefined) {
        const props = top.properties as MarkFeatureProps;
        map.getCanvas().style.cursor = "pointer";
        tooltip.textContent = props.count > 1 ? story.andMore(props.name, props.count - 1) : props.name;
        tooltip.style.left = `${e.point.x + 14}px`;
        tooltip.style.top = `${e.point.y + 14}px`;
        tooltip.hidden = false;
      } else {
        map.getCanvas().style.cursor = "";
        tooltip.hidden = true;
      }
    });
    map.on("click", (e) => {
      if (drawing || justDrew) {
        justDrew = false;
        return; // the drag that drew a region is not a pick
      }
      const features = map.queryRenderedFeatures(e.point, { layers: pickableLayerIds(lensNames) });
      const top = features[0];
      if (top !== undefined) {
        // The engine surfaced a feature; the Reading answers (RFC-0015 §1).
        openPanel((top.properties as MarkFeatureProps).id as Id);
      } else {
        closePanel();
      }
    });
    // The View's spatial scope is where the viewer is looking (RFC-0006
    // §1): the camera and the View move as one, so marks always derive
    // against the region actually on screen.
    map.on("moveend", () => {
      const b = map.getBounds();
      const w = b.getWest();
      const s = b.getSouth();
      const e = b.getEast();
      const n = b.getNorth();
      session.navigateTo({
        form: "area",
        rings: [
          [
            [w, s],
            [e, s],
            [e, n],
            [w, n],
            [w, s],
          ],
        ],
      });
      paint();
      remember();
    });
  });

  window.setTimeout(() => {
    el("hint").hidden = true;
  }, 8000);
}

void boot();
