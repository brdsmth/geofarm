/**
 * Soil Data Access (USDA NRCS) as the soil-survey provider — the open
 * query service behind Web Soil Survey. Free, keyless, public domain;
 * NRCS asks to be cited, and the citation rides on every claim.
 *
 * Three reads, each a query the service answers as JSON:
 *
 *   1. *Versions* — which survey areas touch the engaged region, and when
 *      each was last published. Small, and asked every time: it is how a
 *      held copy learns it has gone stale.
 *   2. *Units* — the survey's map units clipped to the engaged region
 *      (the service clips; we never hold the county), with their names.
 *   3. *Properties* — what the survey says of those units: the map-unit
 *      summaries, every component soil, every horizon, and the national
 *      productivity index.
 *
 * A fourth, the *archive*, takes every table the service will give for
 * those units — interpretations, restrictions, monthly moisture, yields
 * — and keeps it verbatim. It is not translated and admits nothing: it
 * is the provider's own words, held so nothing has to be asked twice.
 *
 * Everything heavy goes through a `SurveyCache` keyed by the request and
 * the survey version. Same version, no network. Service down, the held
 * copy answers. The cache accelerates and outlives the service; it never
 * adjudicates — what the farm believes is still only what was admitted.
 *
 * Translation only (PLAN-001 §4, module rule 4): provider rows become
 * `SurveyUnitInput`s; nothing here knows what a field is.
 */

import type { Area, Coordinate } from "../../world/index.ts";
import type { SurveyUnitInput } from "./index.ts";

export const SDA = "https://sdmdataaccess.sc.egov.usda.gov/Tabular/post.rest";
/** The outward ground every description cites (RFC-0009 §3). */
export const SSURGO_GROUND = "usda-nrcs-ssurgo";
/** Where NRCS publishes each survey area whole, one archive per version. */
export const SSURGO_DOWNLOADS = "https://websoilsurvey.sc.egov.usda.gov/DSD/Download/Cache/SSA";

// ------------------------------------------------------------------ cache

export type CacheEntry = { source: string; version: string; request: string; doc: unknown };

/** A held copy of the provider's answers, keyed by request and version. */
export type SurveyCache = {
  get(key: string, version: string): Promise<unknown | undefined>;
  /** The newest held answer to a request, whatever its version. */
  latest(key: string): Promise<{ version: string; doc: unknown } | undefined>;
  put(key: string, entry: CacheEntry): Promise<void>;
};

export class MemorySurveyCache implements SurveyCache {
  private readonly held = new Map<string, { version: string; doc: unknown }[]>();
  async get(key: string, version: string): Promise<unknown | undefined> {
    return this.held.get(key)?.find((e) => e.version === version)?.doc;
  }
  async latest(key: string): Promise<{ version: string; doc: unknown } | undefined> {
    const all = this.held.get(key);
    return all?.[all.length - 1];
  }
  async put(key: string, entry: CacheEntry): Promise<void> {
    const all = (this.held.get(key) ?? []).filter((e) => e.version !== entry.version);
    all.push({ version: entry.version, doc: entry.doc });
    this.held.set(key, all);
  }
}

async function keyOf(request: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(request));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------------------------------------------------- service

const SDA_TIMEOUT_MS = 3 * 60 * 1000;

export type SdaOptions = { fetchImpl?: typeof fetch; base?: string };
type Cell = string | null;
/** The service's answer: `Table`, `Table1`, … each a header row then rows. */
export type SdaDoc = Record<string, Cell[][]>;
type Row = Record<string, Cell>;

export async function sdaQuery(query: string, opts: SdaOptions = {}): Promise<SdaDoc> {
  const res = await (opts.fetchImpl ?? fetch)(opts.base ?? SDA, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ format: "JSON+COLUMNNAME", query }),
    // The clip can take half a minute; a question that never comes back
    // must not hold up the pulls queued behind it.
    signal: AbortSignal.timeout(SDA_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`soil data access ${res.status}`);
  return ((await res.json()) ?? {}) as SdaDoc;
}

/** Every table in an answer as rows-by-column-name. The service drops
 * empty result sets, so a table is never found by position — each query
 * below names its own rows in a leading `_t` column. */
export function rowsOf(doc: SdaDoc, named?: string): Row[] {
  const out: Row[] = [];
  for (const table of Object.values(doc)) {
    const [header, ...rows] = table;
    if (header === undefined) continue;
    for (const cells of rows) {
      const row: Row = {};
      header.forEach((col, i) => (row[col ?? String(i)] = cells[i] ?? null));
      if (named === undefined || row._t === named) out.push(row);
    }
  }
  return out;
}

// -------------------------------------------------------------- well-known text

const fix = (n: number): number => Math.round(n * 1e6) / 1e6; // ~10 cm

export function toWkt(area: Area): string {
  const rings = area.rings.map((ring) => `(${ring.map(([lon, lat]) => `${lon} ${lat}`).join(",")})`);
  return `POLYGON(${rings.join(",")})`;
}

/** A closed ring of at least four distinct-enough points, or nothing. */
function ringOf(text: string): Coordinate[] | undefined {
  const ring: Coordinate[] = [];
  for (const pair of text.split(",")) {
    const [x, y] = pair.trim().split(/\s+/).map(Number);
    if (x === undefined || y === undefined || !Number.isFinite(x) || !Number.isFinite(y)) return undefined;
    const c: Coordinate = [fix(x), fix(y)];
    const last = ring[ring.length - 1];
    if (last === undefined || last[0] !== c[0] || last[1] !== c[1]) ring.push(c);
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first === undefined || last === undefined) return undefined;
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push([first[0], first[1]]);
  return ring.length >= 4 ? ring : undefined;
}

/** The polygons in a WKT geometry, each a list of rings. Clipping can
 * leave slivers — points and lines where two outlines only touch — and
 * they are dropped: a unit's place is the ground it covers. */
export function polygonsOf(wkt: string): Coordinate[][][] {
  const polygons: Coordinate[][][] = [];
  // A polygon body is "((ring),(ring))"; find each at any nesting depth.
  const body = /\(\s*(\([^()]*\)\s*(?:,\s*\([^()]*\)\s*)*)\)/g;
  for (const m of wkt.matchAll(body)) {
    const rings: Coordinate[][] = [];
    for (const r of (m[1] as string).matchAll(/\(([^()]*)\)/g)) {
      const ring = ringOf(r[1] as string);
      if (ring === undefined) {
        if (rings.length === 0) break; // no outline, no polygon
        continue; // a degenerate hole is no hole
      }
      rings.push(ring);
    }
    if (rings.length > 0) polygons.push(rings);
  }
  return polygons;
}

const M_PER_DEG = 111_320;
const M2_PER_ACRE = 4046.8564224;

/** Acres covered, on a local flat earth — good to a fraction of a
 * percent at farm scale, which is the precision the survey's own lines
 * have earned. */
export function acresOf(parts: Coordinate[][][]): number {
  let m2 = 0;
  for (const rings of parts) {
    rings.forEach((ring, i) => {
      const lat0 = ((ring[0]?.[1] ?? 0) * Math.PI) / 180;
      let twice = 0;
      for (let k = 0; k + 1 < ring.length; k++) {
        const [x1, y1] = ring[k] as Coordinate;
        const [x2, y2] = ring[k + 1] as Coordinate;
        twice += x1 * y2 - x2 * y1;
      }
      const area = (Math.abs(twice) / 2) * M_PER_DEG * M_PER_DEG * Math.cos(lat0);
      m2 += i === 0 ? area : -area;
    });
  }
  return Math.round((m2 / M2_PER_ACRE) * 10) / 10;
}

// ---------------------------------------------------------------- queries

const quoted = (s: string): string => `'${s.replace(/'/g, "''")}'`;
const keyList = (mukeys: readonly string[]): string => mukeys.map((k) => String(Number(k))).join(",");

export function versionsQuery(wkt: string): string {
  return (
    `select 'area' as _t, sc.areasymbol, sc.areaname, sc.saversion, convert(varchar(33), sc.saverest, 126) as saverest ` +
    `from sacatalog sc where sc.areasymbol in ` +
    `(select areasymbol from SDA_Get_Areasymbol_from_intersection_with_WktWgs84(${quoted(wkt)})) order by sc.areasymbol`
  );
}

export function unitsQuery(wkt: string): string {
  return (
    `~DeclareGeometry(@aoi)~ select @aoi = geometry::STGeomFromText(${quoted(wkt)}, 4326) ` +
    `~DeclareIdGeomTable(@out)~ ~GetClippedMapunits(@aoi,polygon,geo,@out)~ ` +
    `select 'unit' as _t, o.id as mukey, mu.musym, mu.muname, mu.mukind, mu.farmlndcl, mu.iacornsr, l.areasymbol, ` +
    `o.geom.STAsText() as wkt from @out o join mapunit mu on mu.mukey = o.id join legend l on l.lkey = mu.lkey order by o.id`
  );
}

export function propertiesQuery(mukeys: readonly string[]): string {
  const keys = keyList(mukeys);
  return [
    `select 'summary' as _t, mukey, slopegradwta, drclassdcd, hydgrpdcd, hydclprs, aws0100wta, aws0150wta, ` +
      `flodfreqdcd, pondfreqprs, wtdepannmin, wtdepaprjunmin, brockdepmin, niccdcd, iccdcd from muaggatt where mukey in (${keys})`,
    `select 'component' as _t, mukey, cokey, compname, compkind, comppct_r, majcompflag, slope_r, drainagecl, hydgrp, ` +
      `hydricrating, runoff, erocl, tfact, nirrcapcl, taxclname, taxorder, geomdesc from component where mukey in (${keys}) ` +
      `order by mukey, comppct_r desc`,
    `select 'horizon' as _t, h.cokey, h.chkey, h.hzname, h.hzdept_r, h.hzdepb_r, h.sandtotal_r, h.silttotal_r, h.claytotal_r, ` +
      `h.om_r, h.ph1to1h2o_r, h.awc_r, h.ksat_r, h.cec7_r, h.dbthirdbar_r, h.kwfact from chorizon h ` +
      `join component c on c.cokey = h.cokey where c.mukey in (${keys}) order by h.cokey, h.hzdept_r`,
    `select 'index' as _t, c.mukey, c.cokey, i.interphr from cointerp i join component c on c.cokey = i.cokey ` +
      `where c.mukey in (${keys}) and c.majcompflag = 'Yes' and i.ruledepth = 0 and i.mrulename like 'NCCPI - National Commodity Crop Productivity Index%'`,
  ].join("; ");
}

/** Every table the service keeps for a map unit, by how it is reached. */
export const ARCHIVE_TABLES: Record<string, string> = {
  mapunit: "select x.* from mapunit x where x.mukey in (KEYS)",
  muaggatt: "select x.* from muaggatt x where x.mukey in (KEYS)",
  mucropyld: "select x.* from mucropyld x where x.mukey in (KEYS)",
  mutext: "select x.* from mutext x where x.mukey in (KEYS)",
  component: "select x.* from component x where x.mukey in (KEYS)",
  ...Object.fromEntries(
    [
      "chorizon",
      "cointerp",
      "comonth",
      "copmgrp",
      "corestrictions",
      "cocropyld",
      "coecoclass",
      "cogeomordesc",
      "cohydriccriteria",
      "cotaxfmmin",
      "cotext",
      "cosurffrags",
      "coforprod",
      "coeplants",
      "cotreestomng",
    ].map((t) => [t, `select x.* from ${t} x join component c on c.cokey = x.cokey where c.mukey in (KEYS)`]),
  ),
  ...Object.fromEntries(
    ["chtexturegrp", "chfrags", "chpores", "chstructgrp", "chconsistence", "chunified", "chaashto"].map((t) => [
      t,
      `select x.* from ${t} x join chorizon h on h.chkey = x.chkey join component c on c.cokey = h.cokey where c.mukey in (KEYS)`,
    ]),
  ),
  ...Object.fromEntries(
    ["cosurfmorphgc", "cosurfmorphhpp", "cosurfmorphss"].map((t) => [
      t,
      `select x.* from ${t} x join cogeomordesc g on g.cogeomdkey = x.cogeomdkey join component c on c.cokey = g.cokey where c.mukey in (KEYS)`,
    ]),
  ),
  chtexture:
    "select x.* from chtexture x join chtexturegrp g on g.chtgkey = x.chtgkey join chorizon h on h.chkey = g.chkey " +
    "join component c on c.cokey = h.cokey where c.mukey in (KEYS)",
  copm:
    "select x.* from copm x join copmgrp g on g.copmgrpkey = x.copmgrpkey join component c on c.cokey = g.cokey where c.mukey in (KEYS)",
  cosoilmoist:
    "select x.* from cosoilmoist x join comonth m on m.comonthkey = x.comonthkey join component c on c.cokey = m.cokey where c.mukey in (KEYS)",
  cosoiltemp:
    "select x.* from cosoiltemp x join comonth m on m.comonthkey = x.comonthkey join component c on c.cokey = m.cokey where c.mukey in (KEYS)",
};

export function archiveQuery(table: string, mukeys: readonly string[]): string {
  const template = ARCHIVE_TABLES[table];
  if (template === undefined) throw new Error(`no such survey table: ${table}`);
  return template.replace("KEYS", keyList(mukeys));
}

// ------------------------------------------------------------ translation

export type SurveyArea = { symbol: string; name: string; version: string; published: string };

export function areasOf(doc: SdaDoc): SurveyArea[] {
  return rowsOf(doc, "area").map((r) => ({
    symbol: r.areasymbol ?? "",
    name: r.areaname ?? "",
    version: r.saversion ?? "",
    published: new Date(`${r.saverest ?? ""}Z`).toISOString(),
  }));
}

/** One string that changes when any touched survey area is republished. */
export function versionOf(areas: readonly SurveyArea[]): string {
  return areas.map((a) => `${a.symbol}@${a.published}`).sort().join(",");
}

const num = (cell: Cell | undefined): number | undefined => {
  if (cell === null || cell === undefined || cell.trim() === "") return undefined;
  const n = Number(cell);
  return Number.isFinite(n) ? n : undefined;
};
const str = (cell: Cell | undefined): string | undefined => {
  const s = cell?.trim();
  return s === undefined || s === "" ? undefined : s;
};
/** Drop what the survey left blank: absence is not a value. */
function stated<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** The units and what the survey says of them → deliveries for the feed.
 * Provider vocabulary is translated to plain property names here, once;
 * the values stay the provider's. */
export function toSurveyUnits(units: SdaDoc, properties: SdaDoc, areas: readonly SurveyArea[]): SurveyUnitInput[] {
  const summaries = new Map(rowsOf(properties, "summary").map((r) => [r.mukey ?? "", r]));
  const horizons = new Map<string, Row[]>();
  for (const h of rowsOf(properties, "horizon")) horizons.set(h.cokey ?? "", [...(horizons.get(h.cokey ?? "") ?? []), h]);
  const components = new Map<string, Row[]>();
  for (const c of rowsOf(properties, "component")) components.set(c.mukey ?? "", [...(components.get(c.mukey ?? "") ?? []), c]);
  const indexByComponent = new Map(rowsOf(properties, "index").map((r) => [r.cokey ?? "", num(r.interphr)]));
  const areaBySymbol = new Map(areas.map((a) => [a.symbol, a]));

  // One unit, several pieces: gather every clipped polygon under its key.
  const pieces = new Map<string, { head: Row; parts: Coordinate[][][] }>();
  for (const r of rowsOf(units, "unit")) {
    const key = r.mukey ?? "";
    const held = pieces.get(key) ?? { head: r, parts: [] };
    held.parts.push(...polygonsOf(r.wkt ?? ""));
    pieces.set(key, held);
  }

  const out: SurveyUnitInput[] = [];
  for (const [mukey, { head, parts }] of pieces) {
    const area = areaBySymbol.get(head.areasymbol ?? "");
    if (area === undefined || parts.length === 0) continue;
    const s = summaries.get(mukey);
    const soils = (components.get(mukey) ?? []).map((c) => {
      const major = str(c.majcompflag) === "Yes";
      return stated({
        name: str(c.compname),
        kind: str(c.compkind),
        percent: num(c.comppct_r),
        major,
        slopePct: num(c.slope_r),
        drainage: str(c.drainagecl),
        hydrologicGroup: str(c.hydgrp),
        hydric: str(c.hydricrating),
        runoff: str(c.runoff),
        erosionClass: str(c.erocl),
        capabilityClass: str(c.nirrcapcl),
        taxonomy: str(c.taxclname),
        landform: str(c.geomdesc),
        productivityIndex: indexByComponent.get(c.cokey ?? ""),
        horizons: (horizons.get(c.cokey ?? "") ?? []).map((h) =>
          stated({
            name: str(h.hzname),
            topCm: num(h.hzdept_r),
            bottomCm: num(h.hzdepb_r),
            sandPct: num(h.sandtotal_r),
            siltPct: num(h.silttotal_r),
            clayPct: num(h.claytotal_r),
            organicMatterPct: num(h.om_r),
            pH: num(h.ph1to1h2o_r),
            availableWaterCapacity: num(h.awc_r),
            ksatUmPerSec: num(h.ksat_r),
            cec: num(h.cec7_r),
            bulkDensity: num(h.dbthirdbar_r),
            erodibility: num(h.kwfact),
          }),
        ),
      });
    });
    const majors = soils.filter((c) => c.major === true && typeof c.percent === "number");
    const majorPct = majors.reduce((a, c) => a + (c.percent as number), 0);
    // The unit's index is its major soils', weighted by their share.
    const indexed = majors.filter((c) => typeof c.productivityIndex === "number");
    const indexedPct = indexed.reduce((a, c) => a + (c.percent as number), 0);
    const productivityIndex =
      indexedPct > 0
        ? Math.round((indexed.reduce((a, c) => a + (c.productivityIndex as number) * (c.percent as number), 0) / indexedPct) * 100) / 100
        : undefined;

    out.push({
      foreignId: mukey,
      name: str(head.muname) ?? mukey,
      ...(str(head.musym) !== undefined ? { symbol: str(head.musym) as string } : {}),
      parts,
      version: `${area.symbol}@${area.published}`,
      published: area.published,
      citation: `${area.name} (${area.symbol}), version ${area.version}, ${area.published.slice(0, 10)}`,
      ...(majorPct > 0 ? { purity: Math.min(majorPct, 100) / 100 } : {}),
      extent: { acresHere: acresOf(parts) },
      description: stated({
        surveyArea: area.symbol,
        symbol: str(head.musym),
        unitKind: str(head.mukind),
        farmland: str(head.farmlndcl),
        cornSuitabilityRating: num(head.iacornsr),
        productivityIndex,
        slopePct: num(s?.slopegradwta),
        drainage: str(s?.drclassdcd),
        hydrologicGroup: str(s?.hydgrpdcd),
        hydricPct: num(s?.hydclprs),
        availableWaterTop100Cm: num(s?.aws0100wta),
        availableWaterTop150Cm: num(s?.aws0150wta),
        floodFrequency: str(s?.flodfreqdcd),
        pondingPct: num(s?.pondfreqprs),
        waterTableCm: num(s?.wtdepannmin),
        waterTableSpringCm: num(s?.wtdepaprjunmin),
        bedrockCm: num(s?.brockdepmin),
        capabilityClass: str(s?.niccdcd),
        irrigatedCapabilityClass: str(s?.iccdcd),
        soils,
      }),
    });
  }
  return out;
}

// ------------------------------------------------------------------- read

export type ReadOptions = SdaOptions & {
  engaged: Area;
  cache: SurveyCache;
  log?: (line: string) => void;
};

export type SurveyRead = {
  areas: SurveyArea[];
  version: string;
  units: SurveyUnitInput[];
  /** True when the service could not be reached and a held copy answered. */
  held: boolean;
};

async function through(
  request: string,
  version: string,
  opts: ReadOptions,
): Promise<{ doc: SdaDoc; fetched: boolean }> {
  const key = await keyOf(request);
  const hit = await opts.cache.get(key, version);
  if (hit !== undefined) return { doc: hit as SdaDoc, fetched: false };
  const doc = await sdaQuery(request, opts);
  await opts.cache.put(key, { source: SSURGO_GROUND, version, request, doc });
  return { doc, fetched: true };
}

/** The survey over the engaged region: ask what version stands, then
 * answer from the held copy when it is that version, the service when
 * it is not — and the held copy again when the service is down. */
export async function readSurvey(opts: ReadOptions): Promise<SurveyRead> {
  const wkt = toWkt(opts.engaged);
  const versions = versionsQuery(wkt);
  const versionsKey = await keyOf(versions);
  let areas: SurveyArea[];
  let held = false;
  try {
    const doc = await sdaQuery(versions, opts);
    areas = areasOf(doc);
    await opts.cache.put(versionsKey, { source: SSURGO_GROUND, version: versionOf(areas), request: versions, doc });
  } catch (e) {
    const last = await opts.cache.latest(versionsKey);
    if (last === undefined) throw e;
    areas = areasOf(last.doc as SdaDoc);
    held = true;
  }
  const version = versionOf(areas);
  if (areas.length === 0) return { areas, version, units: [], held };

  const units = await through(unitsQuery(wkt), version, opts);
  const mukeys = [...new Set(rowsOf(units.doc, "unit").map((r) => r.mukey ?? ""))].filter((k) => k !== "").sort();
  if (mukeys.length === 0) return { areas, version, units: [], held };
  const properties = await through(propertiesQuery(mukeys), version, opts);
  return { areas, version, units: toSurveyUnits(units.doc, properties.doc, areas), held };
}

const CHUNK = 10;

/** Keep everything the service holds for these units, verbatim. Admits
 * nothing; a table the service refuses is reported and skipped, never
 * fatal — a gap in the archive is a gap, not a failure of the farm. */
export async function archiveSurvey(
  mukeys: readonly string[],
  version: string,
  opts: ReadOptions,
): Promise<{ fetched: number; held: number; rows: number; refused: string[] }> {
  const report = { fetched: 0, held: 0, rows: 0, refused: [] as string[] };
  const sorted = [...mukeys].sort();
  for (const table of Object.keys(ARCHIVE_TABLES)) {
    for (let i = 0; i < sorted.length; i += CHUNK) {
      try {
        const { doc, fetched } = await through(archiveQuery(table, sorted.slice(i, i + CHUNK)), version, opts);
        if (fetched) report.fetched++;
        else report.held++;
        report.rows += rowsOf(doc).length;
      } catch (e) {
        report.refused.push(`${table}: ${e instanceof Error ? e.message : String(e)}`);
        break;
      }
    }
  }
  return report;
}

/** Where NRCS publishes a survey area whole (shapes and every table). */
export function downloadUrl(area: SurveyArea): string {
  return `${SSURGO_DOWNLOADS}/wss_SSA_${area.symbol}_[${area.published.slice(0, 10)}].zip`;
}
