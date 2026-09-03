/**
 * Reading the pixels: a scene's mean vegetation index over the engaged
 * region — the mechanism behind the anomaly job's `SceneIndex` port.
 * surface-exempt-file: developer-facing errors only.
 *
 * Sentinel-2 L2A on AWS is cloud-optimized GeoTIFF, so the red and
 * near-infrared bands can be read at a coarse overview with two range
 * requests each, without downloading the tile. Where the bands are not
 * addressable (a fixture scene, a provider without them) the index is
 * simply unreadable, and the job treats the scene as silent.
 *
 * Coordinates: the tiles are in a UTM zone (EPSG:326xx); the region is in
 * lon/lat. The forward projection is done here in a few lines rather than
 * with a dependency, for the northern-hemisphere zones the farm sits in.
 */

import type { AdmittedRecord, Area } from "../../packages/world/index.ts";

const A = 6378137;
const F = 1 / 298.257223563;
const K0 = 0.9996;
const E2 = F * (2 - F);
const EP2 = E2 / (1 - E2);

/** Lon/lat → UTM easting/northing in the given zone (north). */
export function toUtm(lon: number, lat: number, zone: number): [number, number] {
  const phi = (lat * Math.PI) / 180;
  const lam = ((lon - (zone * 6 - 183)) * Math.PI) / 180;
  const sin = Math.sin(phi);
  const cos = Math.cos(phi);
  const tan = Math.tan(phi);
  const n = A / Math.sqrt(1 - E2 * sin * sin);
  const t = tan * tan;
  const c = EP2 * cos * cos;
  const a = cos * lam;
  const e4 = E2 * E2;
  const e6 = e4 * E2;
  const m =
    A *
    ((1 - E2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * phi -
      ((3 * E2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * phi) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * phi) -
      ((35 * e6) / 3072) * Math.sin(6 * phi));
  const x =
    K0 * n * (a + ((1 - t + c) * a ** 3) / 6 + ((5 - 18 * t + t * t + 72 * c - 58 * EP2) * a ** 5) / 120) + 500000;
  const y =
    K0 *
    (m +
      n * tan * (a ** 2 / 2 + ((5 - t + 9 * c + 4 * c * c) * a ** 4) / 24 + ((61 - 58 * t + t * t + 600 * c - 330 * EP2) * a ** 6) / 720));
  return [x, y];
}

/** Mean of (nir − red) / (nir + red) over pixels inside the window. */
export function ndviMean(red: ArrayLike<number>, nir: ArrayLike<number>): number | undefined {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < red.length; i++) {
    const r = red[i] as number;
    const v = nir[i] as number;
    if (r + v === 0) continue;
    sum += (v - r) / (v + r);
    n++;
  }
  return n === 0 ? undefined : sum / n;
}

type Geo = {
  getImageCount(): Promise<number>;
  getImage(i: number): Promise<{
    getWidth(): number;
    getHeight(): number;
    readRasters(o: { window: number[] }): Promise<ArrayLike<number>[]>;
  }>;
  getImage(): Promise<{ getOrigin(): number[]; getResolution(): number[]; getWidth(): number; getHeight(): number }>;
};

async function openTiff(url: string): Promise<Geo> {
  const geotiff = (await import("geotiff")) as { fromUrl: (u: string) => Promise<Geo> };
  return geotiff.fromUrl(url);
}

/** A band's pixels over the region, read from the overview closest to
 * about 160 m — coarse, cheap, and enough for a field's mean. */
async function bandWindow(url: string, box: [number, number, number, number]): Promise<ArrayLike<number>> {
  const tiff = await openTiff(url);
  const full = await tiff.getImage();
  const [ox, oy] = full.getOrigin() as [number, number];
  const [rx, ry] = full.getResolution() as [number, number];
  const count = await tiff.getImageCount();
  const target = 160; // metres per pixel
  const level = Math.min(count - 1, Math.max(0, Math.round(Math.log2(target / Math.abs(rx)))));
  const image = await tiff.getImage(level);
  const scale = full.getWidth() / image.getWidth();
  const px = (x: number): number => (x - ox) / (rx * scale);
  const py = (y: number): number => (y - oy) / (ry * scale);
  const x0 = Math.max(0, Math.floor(Math.min(px(box[0]), px(box[2]))));
  const x1 = Math.min(image.getWidth(), Math.ceil(Math.max(px(box[0]), px(box[2]))));
  const y0 = Math.max(0, Math.floor(Math.min(py(box[1]), py(box[3]))));
  const y1 = Math.min(image.getHeight(), Math.ceil(Math.max(py(box[1]), py(box[3]))));
  if (x1 <= x0 || y1 <= y0) return [];
  const [raster] = await image.readRasters({ window: [x0, y0, x1, y1] });
  return raster ?? [];
}

/** The scene's mean vegetation index over the engaged region, or nothing
 * readable. Needs the provider's band addresses and projection in the
 * scene's payload description (the Earth Search adapter puts them there). */
export async function vegetationIndexOf(scene: AdmittedRecord, engaged: Area): Promise<number | undefined> {
  const body = scene.body as { red?: string; nir?: string; epsg?: number } | undefined;
  if (body?.red === undefined || body.nir === undefined || body.epsg === undefined) return undefined;
  const zone = body.epsg - 32600;
  if (zone < 1 || zone > 60) return undefined;
  const pts = engaged.rings.flat();
  const lons = pts.map((p) => p[0]);
  const lats = pts.map((p) => p[1]);
  const [x0, y0] = toUtm(Math.min(...lons), Math.min(...lats), zone);
  const [x1, y1] = toUtm(Math.max(...lons), Math.max(...lats), zone);
  const box: [number, number, number, number] = [x0, y0, x1, y1];
  const [red, nir] = await Promise.all([bandWindow(body.red, box), bandWindow(body.nir, box)]);
  if (red.length === 0 || red.length !== nir.length) return undefined;
  const mean = ndviMean(red, nir);
  return mean === undefined ? undefined : Number(mean.toFixed(3));
}
