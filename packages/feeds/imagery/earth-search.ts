/**
 * Earth Search (Element 84's STAC catalog of Sentinel-2 L2A on AWS) as
 * the imagery provider — the first live provider behind the imagery
 * adapter (REVIEW-004 §7). Free, keyless; the pixels are public
 * cloud-optimized GeoTIFFs, addressed by URL.
 *
 * Translation only: a STAC item becomes a scene whose "where" is the part
 * of the tile the farm engaged — the scene footprint clipped to the
 * engaged region — and whose pixels remain payload addressed by the
 * provider's own URLs (RFC-0003 §3.1). The whole tile is the provider's;
 * the part over the farm is the farm's. Cloud cover, the preview, the
 * band addresses, and the tile name ride as payload description in the
 * body, never as geometry or claim (PLAN-001 §4, module rule 4).
 *
 * Reprocessing: the provider versions an acquisition by a numeric suffix
 * (`…_0_L2A`, `…_1_L2A`). A later version reprocesses the earlier one —
 * absorbed as supersession (RFC-0011 §4) when the earlier one is in the
 * same batch, and admitted as a fresh scene when it is not.
 */

import type { Area, Coordinate } from "../../world/index.ts";
import type { SceneInput } from "./index.ts";

export const EARTH_SEARCH = "https://earth-search.aws.element84.com/v1";
export const SENTINEL_2 = "sentinel-2-l2a";

export type StacAsset = { href: string; type?: string };
export type StacItem = {
  id: string;
  bbox: [number, number, number, number];
  properties: {
    datetime: string;
    "eo:cloud_cover"?: number;
    platform?: string;
    "proj:epsg"?: number;
    "grid:code"?: string;
  };
  assets: Record<string, StacAsset>;
};

type Box = [number, number, number, number];

function boxOf(area: Area): Box {
  const pts = area.rings.flat();
  return [
    Math.min(...pts.map((p) => p[0])),
    Math.min(...pts.map((p) => p[1])),
    Math.max(...pts.map((p) => p[0])),
    Math.max(...pts.map((p) => p[1])),
  ];
}

/** The rectangle two boxes share, or nothing. */
function overlap(a: Box, b: Box): Box | undefined {
  const box: Box = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])];
  return box[0] < box[2] && box[1] < box[3] ? box : undefined;
}

function ringOf([w, s, e, n]: Box): Coordinate[][] {
  return [
    [
      [w, s],
      [e, s],
      [e, n],
      [w, n],
      [w, s],
    ],
  ];
}

const VERSIONED = /^(.*)_(\d+)_L2A$/;

/** The provider's id for the acquisition this one reprocesses, if any. */
export function priorVersionOf(id: string): string | undefined {
  const m = VERSIONED.exec(id);
  if (m === null) return undefined;
  const n = Number(m[2]);
  return n > 0 ? `${m[1]}_${n - 1}_L2A` : undefined;
}

/** One item → one scene over the engaged region; nothing if the tile
 * does not touch it. */
export function itemToScene(item: StacItem, engaged: Area): SceneInput | undefined {
  const box = overlap(item.bbox, boxOf(engaged));
  if (box === undefined) return undefined;
  const visual = item.assets.visual ?? item.assets.thumbnail;
  if (visual === undefined) return undefined;
  const details: Record<string, unknown> = {};
  if (item.properties["eo:cloud_cover"] !== undefined) details.cloudCover = item.properties["eo:cloud_cover"];
  if (item.assets.thumbnail !== undefined) details.thumbnail = item.assets.thumbnail.href;
  if (item.properties.platform !== undefined) details.platform = item.properties.platform;
  if (item.properties["grid:code"] !== undefined) details.tile = item.properties["grid:code"];
  if (item.properties["proj:epsg"] !== undefined) details.epsg = item.properties["proj:epsg"];
  for (const band of ["red", "nir", "scl"]) {
    const a = item.assets[band];
    if (a !== undefined) details[band] = a.href;
  }
  return {
    foreignId: item.id,
    capturedAt: new Date(item.properties.datetime).toISOString(),
    footprint: ringOf(box),
    contentHash: visual.href,
    mediaType: (visual.type ?? "image/tiff").split(";")[0]?.trim() ?? "image/tiff",
    details,
  };
}

/** A batch of items → scenes in capture order, reprocessing linked only
 * where the earlier version is present to be superseded. */
export function itemsToScenes(items: readonly StacItem[], engaged: Area): SceneInput[] {
  const ids = new Set(items.map((i) => i.id));
  const scenes: SceneInput[] = [];
  for (const item of items) {
    const scene = itemToScene(item, engaged);
    if (scene === undefined) continue;
    const prior = priorVersionOf(item.id);
    if (prior !== undefined && ids.has(prior)) scene.reprocesses = prior;
    scenes.push(scene);
  }
  // Capture order, and within one acquisition its versions in order, so
  // a reprocessing is admitted after the scene it supersedes even when
  // the provider re-timestamped it by a few seconds.
  const key = (s: SceneInput): string => {
    const m = VERSIONED.exec(s.foreignId);
    const version = m === null ? "0" : String(Number(m[2])).padStart(3, "0");
    return `${s.capturedAt.slice(0, 16)}|${m?.[1] ?? s.foreignId}|${version}`;
  };
  return scenes.sort((a, b) => key(a).localeCompare(key(b)));
}

// ----------------------------------------------------------------- search

export type SearchOptions = {
  engaged: Area;
  from: string;
  to: string;
  /** Skip scenes cloudier than this percentage. */
  maxCloudCover?: number;
  pageSize?: number;
  maxPages?: number;
  fetchImpl?: typeof fetch;
  base?: string;
};

type Link = { rel: string; href: string; method?: string; body?: Record<string, unknown> };

/** Every Sentinel-2 item over the engaged region in the window, paged. */
export async function searchItems(opts: SearchOptions): Promise<StacItem[]> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const base = opts.base ?? EARTH_SEARCH;
  const [w, s, e, n] = boxOf(opts.engaged);
  let body: Record<string, unknown> = {
    collections: [SENTINEL_2],
    bbox: [w, s, e, n],
    datetime: `${opts.from}/${opts.to}`,
    limit: opts.pageSize ?? 100,
    sortby: [{ field: "properties.datetime", direction: "asc" }],
    ...(opts.maxCloudCover !== undefined ? { query: { "eo:cloud_cover": { lt: opts.maxCloudCover } } } : {}),
  };
  let url = `${base}/search`;
  const items: StacItem[] = [];
  for (let page = 0; page < (opts.maxPages ?? 50); page++) {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`earth-search ${res.status}`);
    const doc = (await res.json()) as { features: StacItem[]; links?: Link[] };
    items.push(...doc.features);
    const next = doc.links?.find((l) => l.rel === "next");
    if (next === undefined || doc.features.length === 0) break;
    url = next.href;
    body = next.body !== undefined ? { ...body, ...next.body } : body;
  }
  return items;
}

/** Scenes over the engaged region in the window: search + translate. */
export async function searchScenes(opts: SearchOptions): Promise<SceneInput[]> {
  return itemsToScenes(await searchItems(opts), opts.engaged);
}
