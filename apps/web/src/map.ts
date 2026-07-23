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

// CJS/ESM interop: bundlers may surface the UMD build under .default.
const maplibregl: typeof ML = ((ML as { default?: typeof ML }).default ?? ML) as typeof ML;

export const LENS_STYLE: Record<string, { color: string }> = {
  fields: { color: "#7ddf64" },
  boundary: { color: "#ffd166" },
  places: { color: "#5bc8f5" },
  work: { color: "#f79ad3" },
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

export type MarkFeatureProps = { id: string; lens: string; name: string; kind: string };

/** Marks → per-lens FeatureCollections. Events with area-shaped inherited
 * place render as points at the centroid — presentation, not a claim
 * (RFC-0005 §7): the record's true place stays whatever the Reading says. */
export function toFeatureCollections(
  marks: Mark[],
  describe: (id: Id) => { name: string; kind: string },
): Map<string, GeoJSON.FeatureCollection> {
  const byLens = new Map<string, GeoJSON.Feature[]>();
  for (const m of marks) {
    const id = m.presents[0] as Id;
    const { name, kind } = describe(id);
    const pointy = kind === "event" && m.geometry.form !== "position";
    const geometry = pointy
      ? ({ type: "Point", coordinates: centroidOf(m.geometry) } as GeoJSON.Geometry)
      : toGeoJSONGeometry(m.geometry);
    const props: MarkFeatureProps = { id, lens: m.lens, name, kind };
    const list = byLens.get(m.lens) ?? [];
    list.push({ type: "Feature", geometry, properties: props });
    byLens.set(m.lens, list);
  }
  return new Map(
    [...byLens.entries()].map(([lens, features]) => [lens, { type: "FeatureCollection", features }]),
  );
}

export function createMap(container: HTMLElement): ML.Map {
  return new maplibregl.Map({
    container,
    style: {
      version: 8,
      sources: {
        satellite: {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "Imagery © Esri",
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
    center: [-93.182, 41.514],
    zoom: 13.1,
    attributionControl: { compact: true },
  });
}

export const PICKABLE = ["fill", "line", "point"] as const;

export function ensureLensLayers(map: ML.Map, lens: string): void {
  if (map.getSource(lens) !== undefined) return;
  const color = LENS_STYLE[lens]?.color ?? "#ffffff";
  map.addSource(lens, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer({
    id: `${lens}-fill`,
    type: "fill",
    source: lens,
    filter: ["==", ["geometry-type"], "Polygon"],
    paint: { "fill-color": color, "fill-opacity": 0.14 },
  });
  map.addLayer({
    id: `${lens}-line`,
    type: "line",
    source: lens,
    filter: ["in", ["geometry-type"], ["literal", ["Polygon", "LineString"]]],
    paint: {
      "line-color": color,
      "line-width": lens === "boundary" ? 2.5 : 2,
      ...(lens === "boundary" ? { "line-dasharray": [2, 2] } : {}),
    },
  });
  map.addLayer({
    id: `${lens}-point`,
    type: "circle",
    source: lens,
    filter: ["==", ["geometry-type"], "Point"],
    paint: {
      "circle-color": color,
      "circle-radius": 6,
      "circle-stroke-color": "#0b1a10",
      "circle-stroke-width": 2,
    },
  });
}

export function setLensData(
  map: ML.Map,
  collections: Map<string, GeoJSON.FeatureCollection>,
  allLenses: string[],
): void {
  for (const lens of allLenses) {
    ensureLensLayers(map, lens);
    const source = map.getSource(lens) as ML.GeoJSONSource;
    source.setData(collections.get(lens) ?? { type: "FeatureCollection", features: [] });
  }
}

export function pickableLayerIds(allLenses: string[]): string[] {
  return allLenses.flatMap((l) => PICKABLE.map((k) => `${l}-${k}`));
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
