/**
 * The soil survey's held copies, server-side: the provider's answers in
 * PostgreSQL beside the journal, and each touched survey area's published
 * archive on disk.
 * surface-exempt-file: operator log lines — developer-facing, not copy.
 *
 * Neither is the journal and neither is believed: what the farm holds to
 * be so is only what was admitted through the door. These are the
 * provider's own words, kept so they never have to be asked for twice —
 * and so the farm still has them the day the service does not answer.
 * Unlike the record log, a held copy may be replaced: re-fetching the
 * same request at the same version overwrites it.
 */

import { mkdir, rename, stat } from "node:fs/promises";
import { join } from "node:path";
import { SQL } from "bun";
import { downloadUrl, type CacheEntry, type SurveyArea, type SurveyCache } from "../../packages/feeds/soil-survey/sda.ts";

type Row = { version: string; doc: unknown };
const parsed = (doc: unknown): unknown => (typeof doc === "string" ? JSON.parse(doc) : doc);

/** `source_cache(key, version) → doc`: every answer, every version. */
export class PostgresSurveyCache implements SurveyCache {
  private constructor(private readonly sql: SQL) {}

  static async open(url: string): Promise<PostgresSurveyCache> {
    const sql = new SQL(url);
    await sql`
      CREATE TABLE IF NOT EXISTS source_cache (
        key        TEXT NOT NULL,
        version    TEXT NOT NULL,
        source     TEXT NOT NULL,
        request    TEXT NOT NULL,
        fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        doc        JSONB NOT NULL,
        PRIMARY KEY (key, version)
      )`;
    return new PostgresSurveyCache(sql);
  }

  async close(): Promise<void> {
    await this.sql.close();
  }

  async get(key: string, version: string): Promise<unknown | undefined> {
    const rows = (await this.sql`
      SELECT version, doc FROM source_cache WHERE key = ${key} AND version = ${version}`) as Row[];
    return rows[0] === undefined ? undefined : parsed(rows[0].doc);
  }

  async latest(key: string): Promise<{ version: string; doc: unknown } | undefined> {
    const rows = (await this.sql`
      SELECT version, doc FROM source_cache WHERE key = ${key} ORDER BY fetched_at DESC LIMIT 1`) as Row[];
    return rows[0] === undefined ? undefined : { version: rows[0].version, doc: parsed(rows[0].doc) };
  }

  async put(key: string, entry: CacheEntry): Promise<void> {
    // The object itself, not a string (see store-postgres.ts on jsonb).
    await this.sql`
      INSERT INTO source_cache (key, version, source, request, doc)
      VALUES (${key}, ${entry.version}, ${entry.source}, ${entry.request}, ${entry.doc as object})
      ON CONFLICT (key, version) DO UPDATE SET doc = EXCLUDED.doc, fetched_at = now()`;
  }
}

const MIRROR_TIMEOUT_MS = 10 * 60 * 1000;

export type MirrorResult = { path: string; bytes: number; fetched: boolean };

/** One survey area, whole, as NRCS publishes it — shapes and every table
 * for the county — kept by area and version. A version already on disk
 * is left alone; a new version lands beside the old one. */
export async function mirrorSurveyArea(
  area: SurveyArea,
  dir: string,
  fetchImpl: typeof fetch = fetch,
): Promise<MirrorResult> {
  await mkdir(dir, { recursive: true });
  const path = join(dir, `${area.symbol}_${area.published.slice(0, 10)}.zip`);
  const held = await stat(path).catch(() => undefined);
  if (held !== undefined && held.size > 0) return { path, bytes: held.size, fetched: false };
  // A county is tens of megabytes; one that stalls must not hold up the
  // pulls queued behind it.
  const res = await fetchImpl(downloadUrl(area), { signal: AbortSignal.timeout(MIRROR_TIMEOUT_MS) });
  if (!res.ok || res.body === null) throw new Error(`survey archive ${area.symbol}: ${res.status}`);
  // Land it under another name first: a half-written archive must never
  // be mistaken for a held one. Streamed chunk by chunk — handing the
  // response itself to Bun.write never finishes (Bun 1.3.13), and a big
  // county should not sit whole in memory either.
  const partial = `${path}.partial`;
  const writer = Bun.file(partial).writer();
  let bytes = 0;
  try {
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      writer.write(chunk);
      bytes += chunk.byteLength;
    }
  } finally {
    await writer.end();
  }
  await rename(partial, path);
  return { path, bytes, fetched: true };
}
