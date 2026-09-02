/**
 * The map: MapLibre painting the mark streams (RFC-0015 realized).
 *
 * The engine draws; the architecture answers. Marks come from
 * deriveMarks (per-lens streams), features carry the identity they
 * present, and picking resolves through the Reading — the engine is
 * never the authority on what anything is (RFC-0015 §1, module rule 6).
 */

import * as ML from "maplibre-gl";
import type { Geometry, Id } from "../../../packages/world/index.ts";
import type { Mark } from "../../../packages/client/render/index.ts";
import { shell } from "../../../packages/client/surface/index.ts";

// CJS/ESM interop: bundlers may surface the UMD build under .default.
const maplibregl: typeof ML = ((ML as { default?: typeof ML }).default ?? ML) as typeof ML;

/** Per-lens paint. The farm line is a line (REVIEW-003 §4.1): a lens with
 * `fill: false` never washes the ground it outlines. */
export const LENS_STYLE: Record<string, { color: string; fill: boolean }> = {
  fields: { color: "#9fb8a6", fill: true },
  boundary: { color: "#ffd166", fill: false },
  places: { color: "#5bc8f5", fill: true },
  work: { color: "#f2a65a", fill: true },
  soil: { color: "#c9a27e", fill: true },
  office: { color: "#e6e6e6", fill: true },
};

/** What is growing, as colour: projected state made visible
 * (REVIEW-003 §3 — "state of my farm", not "map of my farm"). */
const CROP_COLOR: Record<string, string> = {
  corn: "#f2c14e",
  soybeans: "#7ddf64",
  wheat: "#e8d59a",
  fallow: "#9fb8a6",
};

/** A small, meaningful colour system for marks (REVIEW-003 §4.3):
 * operations, observations, claims, paperwork — never one hue for all. */
const GROUP_COLOR: Record<string, string> = {
  operation: "#f2a65a",
  observation: "#5bc8f5",
  claim: "#c792ea",
  paper: "#e6e6e6",
  place: "#5bc8f5",
  soil: "#c9a27e",
};

function toGeoJSONGeometry(g: Geometry): GeoJSON.Geometry {
  switch (g.form) {
    case "position":
      return { type: "Point", coordinates: g.coordinates };
    case "path":
      return { type: "LineString", coordinates: g.coordinates };
    case "area":
      return { type: "Polygon", coordinates: g.rings };
    case "volume":
      return { type: "Polygon", coordinates: g.base };
    case "collection":
      return { type: "GeometryCollection", geometries: g.members.map(toGeoJSONGeometry) };
  }
}

function centroidOf(g: Geometry): [number, number] {
  const pts: [number, number][] = [];
  const collect = (geom: Geometry): void => {
    if (geom.form === "position") pts.push(geom.coordinates);
    else if (geom.form === "path") pts.push(...geom.coordinates);
    else if (geom.form === "area") pts.push(...(geom.rings[0] ?? []));
    else if (geom.form === "volume") pts.push(...(geom.base[0] ?? []));
    else for (const m of geom.members) collect(m);
  };
  collect(g);
  const lon = pts.reduce((a, p) => a + p[0], 0) / Math.max(pts.length, 1);
  const lat = pts.reduce((a, p) => a + p[1], 0) / Math.max(pts.length, 1);
  return [lon, lat];
}

/** What the shell says about a thing, for the engine to paint. */
export type Described = {
  name: string;
  kind: string;
  /** The colour family of the mark. */
  group: string;
  /** For fields: what is growing as of the View's time, if anything. */
  crop: string;
  /** The label on the map: identity first, state second. */
  label: string;
};

export type MarkFeatureProps = Described & {
  id: string;
  lens: string;
  selected: boolean;
  /** Coincident marks aggregated here (RFC-0015 §4 Amendment 1): count
   * is always visible at N ≥ 2 — invisible stacking is a sparsity-trust
   * violation. `ids` carries every member so the aggregate resolves. */
  count: number;
  ids: string;
};

/** Marks → per-lens FeatureCollections. Events with area-shaped inherited
 * place render as points at the centroid — presentation, not a claim
 * (RFC-0005 §7): the record's true place stays whatever the Reading says.
 * Coincident points aggregate into one feature carrying every id and a
 * visible count; selection rides along so the engine can show attention. */
export function toFeatureCollections(
  marks: Mark[],
  describe: (id: Id) => Described,
  selection: readonly Id[] = [],
): Map<string, GeoJSON.FeatureCollection> {
  const byLens = new Map<string, GeoJSON.Feature[]>();
  const stacks = new Map<string, GeoJSON.Feature>();
  for (const m of marks) {
    const id = m.presents[0] as Id;
    const described = describe(id);
    // Events and claims with area-shaped inherited place render as dots;
    // only entities own their outline on the map.
    const pointy = described.kind !== "entity" && m.geometry.form !== "position";
    const geometry = pointy
      ? ({ type: "Point", coordinates: centroidOf(m.geometry) } as GeoJSON.Geometry)
      : toGeoJSONGeometry(m.geometry);
    const props: MarkFeatureProps = {
      ...described,
      id,
      lens: m.lens,
      selected: selection.includes(id),
      count: 1,
      ids: id,
    };
    if (geometry.type === "Point") {
      const key = `${m.lens}:${geometry.coordinates.map((c) => c.toFixed(5)).join(",")}`;
      const stacked = stacks.get(key);
      if (stacked !== undefined) {
        const sp = stacked.properties as MarkFeatureProps;
        sp.count += 1;
        sp.ids = `${sp.ids},${id}`;
        sp.selected = sp.selected || props.selected;
        continue;
      }
      const feature: GeoJSON.Feature = { type: "Feature", geometry, properties: props };
      stacks.set(key, feature);
      const list = byLens.get(m.lens) ?? [];
      list.push(feature);
      byLens.set(m.lens, list);
      continue;
    }
    const list = byLens.get(m.lens) ?? [];
    list.push({ type: "Feature", geometry, properties: props });
    byLens.set(m.lens, list);
  }
  return new Map(
    [...byLens.entries()].map(([lens, features]) => [lens, { type: "FeatureCollection", features }]),
  );
}

export function createMap(container: HTMLElement): ML.Map {
  const map = new maplibregl.Map({
    container,
    style: {
      version: 8,
      glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
      sources: {
        satellite: {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: shell.imageryCredit,
        },
      },
      layers: [
        { id: "satellite", type: "raster", source: "satellite" },
        {
          id: "shade",
          type: "background",
          paint: { "background-color": "#0b1a10", "background-opacity": 0.18 },
        },
      ],
    },
    center: [-93.1927, 41.5153],
    zoom: 13.6,
    attributionControl: { compact: true },
  });
  // Zoom buttons and a scale bar (REVIEW-003 §4.8): pinch-only excludes
  // a real demographic, and a map without a scale is not a map.
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
  map.addControl(new maplibregl.ScaleControl({ unit: "imperial" }), "bottom-right");
  return map;
}

export const PICKABLE = ["fill", "line", "point"] as const;

const SELECTED = ["to-boolean", ["get", "selected"]] as unknown as ML.ExpressionSpecification;
const STACKED = [">=", ["get", "count"], 2] as unknown as ML.ExpressionSpecification;
const FONT = ["Open Sans Semibold"]; // surface-exempt: a glyph set name, not copy

function matchExpr(prop: string, table: Record<string, string>, fallback: string): ML.ExpressionSpecification {
  const pairs = Object.entries(table).flat();
  return ["match", ["get", prop], ...pairs, fallback] as unknown as ML.ExpressionSpecification;
}

export function ensureLensLayers(map: ML.Map, lens: string): void {
  if (map.getSource(lens) !== undefined) return;
  const style = LENS_STYLE[lens] ?? { color: "#ffffff", fill: true };
  const color = style.color;
  const fillColor = lens === "fields" ? matchExpr("crop", CROP_COLOR, color) : color;
  const pointColor = matchExpr("group", GROUP_COLOR, color);
  map.addSource(lens, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  if (style.fill) {
    // Selection is shared attention (RFC-0006 §3): the attended polygon
    // brightens so the map shows what the panel is talking about.
    map.addLayer({
      id: `${lens}-fill`,
      type: "fill",
      source: lens,
      filter: ["==", ["geometry-type"], "Polygon"],
      paint: { "fill-color": fillColor, "fill-opacity": ["case", SELECTED, 0.38, 0.16] },
    });
  }
  map.addLayer({
    id: `${lens}-line`,
    type: "line",
    source: lens,
    filter: ["in", ["geometry-type"], ["literal", ["Polygon", "LineString"]]],
    paint: {
      "line-color": ["case", SELECTED, "#ffffff", lens === "fields" ? fillColor : color],
      "line-width": ["case", SELECTED, 4, lens === "boundary" ? 2.5 : 2],
      ...(lens === "boundary" ? { "line-dasharray": [2, 2] } : {}),
    },
  });
  map.addLayer({
    id: `${lens}-point`,
    type: "circle",
    source: lens,
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-color": pointColor,
      // Glove-scale targets (REVIEW-003 §4.7): nothing smaller than 8px.
      "circle-radius": ["case", STACKED, 11, ["case", SELECTED, 10, 8]],
      "circle-stroke-color": ["case", SELECTED, "#ffffff", "#0b1a10"],
      "circle-stroke-width": 2,
    },
  });
  // The count badge (RFC-0015 §4 Amendment 1): coincident marks may share
  // a dot, but never invisibly — sparsity on screen must be trustworthy.
  map.addLayer({
    id: `${lens}-count`,
    type: "symbol",
    source: lens,
    filter: ["all", ["==", ["geometry-type"], "Point"], STACKED],
    layout: {
      "text-field": ["to-string", ["get", "count"]],
      "text-font": FONT,
      "text-size": 11,
      "text-allow-overlap": true,
    },
    paint: {
      "text-color": "#0b1a10",
    },
  });
}

/** Identity outranks geometry (REVIEW-003 §4.2): entities carry their
 * names on the map itself, not behind a hover, with what is growing
 * beside them. Label layers are added after every mark layer so names
 * win the collision pass, and anchors are variable so a name slides off
 * a dot rather than vanishing. */
export function ensureLensLabels(map: ML.Map, lens: string): void {
  if (map.getLayer(`${lens}-label`) !== undefined) return;
  map.addLayer({
    id: `${lens}-label`,
    type: "symbol",
    source: lens,
    filter: [
      "all",
      ["==", ["get", "kind"], "entity"],
      ["in", ["geometry-type"], ["literal", ["Polygon", "Point"]]],
    ],
    layout: {
      "text-field": ["get", "label"],
      "text-font": FONT,
      "text-size": lens === "fields" ? 14 : 12,
      "text-padding": 6,
      "text-variable-anchor":
        lens === "fields" ? ["center", "top", "bottom", "left", "right"] : ["top", "bottom", "left", "right"],
      "text-radial-offset": lens === "fields" ? 1.2 : 0.8,
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "#0b1a10",
      "text-halo-width": 1.4,
    },
  });
}

export function setLensData(
  map: ML.Map,
  collections: Map<string, GeoJSON.FeatureCollection>,
  allLenses: string[],
): void {
  for (const lens of allLenses) ensureLensLayers(map, lens);
  for (const lens of allLenses) ensureLensLabels(map, lens);
  for (const lens of allLenses) {
    const source = map.getSource(lens) as ML.GeoJSONSource;
    source.setData(collections.get(lens) ?? { type: "FeatureCollection", features: [] });
  }
}

/** The drawn indication (RFC-0006 §3): an ephemeral query region, painted
 * as apparatus — dashed, white, unmistakably not content. */
export function setGestureData(map: ML.Map, geometry: Geometry | undefined): void {
  if (map.getSource("gesture") === undefined) {
    map.addSource("gesture", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: "gesture-fill",
      type: "fill",
      source: "gesture",
      paint: { "fill-color": "#ffffff", "fill-opacity": 0.08 },
    });
    map.addLayer({
      id: "gesture-line",
      type: "line",
      source: "gesture",
      paint: { "line-color": "#ffffff", "line-width": 2, "line-dasharray": [1.5, 1.5] },
    });
  }
  const source = map.getSource("gesture") as ML.GeoJSONSource;
  source.setData(
    geometry === undefined
      ? { type: "FeatureCollection", features: [] }
      : { type: "Feature", geometry: toGeoJSONGeometry(geometry), properties: {} },
  );
}

export function pickableLayerIds(allLenses: string[]): string[] {
  return allLenses.flatMap((l) =>
    PICKABLE.filter((k) => k !== "fill" || (LENS_STYLE[l]?.fill ?? true)).map((k) => `${l}-${k}`),
  );
}

export function boundsOf(g: Geometry): [[number, number], [number, number]] {
  const pts: [number, number][] = [];
  const collect = (geom: Geometry): void => {
    if (geom.form === "position") pts.push(geom.coordinates);
    else if (geom.form === "path") pts.push(...geom.coordinates);
    else if (geom.form === "area") for (const r of geom.rings) pts.push(...r);
    else if (geom.form === "volume") for (const r of geom.base) pts.push(...r);
    else for (const m of geom.members) collect(m);
  };
  collect(g);
  const lons = pts.map((p) => p[0]);
  const lats = pts.map((p) => p[1]);
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ];
}
