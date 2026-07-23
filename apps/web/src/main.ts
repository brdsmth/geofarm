/**
 * geofarm — the shell. One map, one View, five verbs (RFC-0006).
 * No router, no pages: destinations = 1 (S1). Everything below wires
 * gestures to Session verbs and paints marks; nothing below holds state
 * of its own beyond the three stores (RFC-0014, S2).
 */

import "maplibre-gl/dist/maplibre-gl.css";
import "./app.css";
import type { AdmittedRecord, Id } from "../../../packages/world/index.ts";
import { seedWorld, NOW } from "./seed.ts";
import {
  boundsOf,
  createMap,
  pickableLayerIds,
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
};

const LENSES = [
  { name: "fields", label: "Fields", filter: { classifications: ["field"] } },
  { name: "boundary", label: "Farm line", filter: { classifications: ["farm"] } },
  { name: "places", label: "Places", filter: { classifications: ["pond", "building", "road"] } },
  {
    name: "work",
    label: "Notes & work",
    filter: { classifications: ["planting", "harvest", "spray", "note", "maintenance"] },
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
  const { session, names } = await seedWorld();

  for (const l of LENSES) session.reveal({ name: l.name, filter: l.filter, visible: true });

  const map = createMap(el("map"));
  const describe = (id: Id): { name: string; kind: string } => {
    const r = session.reading.get(id);
    return { name: names.get(id) ?? KIND_LABEL[r?.classification ?? ""] ?? "—", kind: r?.kind ?? "" };
  };

  const lensNames = LENSES.map((l) => l.name);
  const paint = (): void => {
    setLensData(map, toFeatureCollections(session.marks(), describe), lensNames);
  };
  // Dev console handle — not UI, not state (the stores stay the three).
  (window as unknown as Record<string, unknown>).__geofarm = { session, map, paint };

  // ---------------------------------------------------------- remembered View
  type Saved = { center: [number, number]; zoom: number; season: number };
  const saved: Saved | undefined = (() => {
    try {
      const raw = localStorage.getItem("geofarm-view");
      return raw === null ? undefined : (JSON.parse(raw) as Saved);
    } catch {
      return undefined;
    }
  })();
  const remember = (): void => {
    const c = map.getCenter();
    localStorage.setItem(
      "geofarm-view",
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
        return `<div class="row"><span class="when">${fmtDate(h.occurrence.start)}</span><span class="what">${text}</span><span class="who">${who}</span></div>`;
      })
      .join("");
    const since =
      r.kind === "entity"
        ? `<div class="since">${kindLabel} · here since ${new Date(r.occurrence.start).getFullYear()}</div>`
        : `<div class="since">${kindLabel} · ${fmtDate(r.occurrence.start)}</div>`;
    const story = rows.length > 0 ? `<h3>What's happened here</h3>${rows}` : "<p class='quiet'>Nothing recorded here yet.</p>";
    return `<h2>${name}</h2>${since}${story}`;
  };

  const openPanel = (id: Id): void => {
    session.select([id]);
    panelBody.innerHTML = storyOf(id);
    panel.hidden = false;
    el("hint").hidden = true;
  };
  const closePanel = (): void => {
    session.select([]);
    panel.hidden = true;
  };
  el("panel-close").addEventListener("click", closePanel);

  // ----------------------------------------------------------- layer switcher
  const layersBox = el<HTMLElement>("layers");
  for (const l of LENSES) {
    const b = document.createElement("button");
    b.textContent = l.label;
    b.className = "lens on";
    b.addEventListener("click", () => {
      session.toggle(l.name);
      b.classList.toggle("on");
      paint();
    });
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
      panelBody.innerHTML = storyOf(session.view.selection[0]);
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

  // --------------------------------------------------------- hover and pick
  const tooltip = el<HTMLElement>("tooltip");
  map.on("load", () => {
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
        tooltip.textContent = props.name;
        tooltip.style.left = `${e.point.x + 14}px`;
        tooltip.style.top = `${e.point.y + 14}px`;
        tooltip.hidden = false;
      } else {
        map.getCanvas().style.cursor = "";
        tooltip.hidden = true;
      }
    });
    map.on("click", (e) => {
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
