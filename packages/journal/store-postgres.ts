/**
 * PostgreSQL JournalStore — the chosen store (RFC-0013 §2).
 *
 * One record log: `records(seq BIGSERIAL, id TEXT UNIQUE, doc JSONB)`.
 * The BIGSERIAL realizes the admission sequence (RFC-0013 §1); this adapter
 * issues only INSERT and SELECT — the no-UPDATE/no-DELETE prohibition
 * (RFC-0013 §3) is honored in code here and by privilege in deployment.
 *
 * Uses Bun's built-in Postgres client; connection via a URL supplied by the
 * caller (tests use a scratch cluster; deployment is operational concern).
 */

import { SQL } from "bun";
import type { AdmittedRecord, CandidateRecord, Id } from "../world/index.ts";
import type { JournalStore } from "./index.ts";

type Row = { seq: number | bigint; doc: unknown };

function toAdmitted(row: Row): AdmittedRecord {
  const doc = (typeof row.doc === "string" ? JSON.parse(row.doc) : row.doc) as Omit<
    AdmittedRecord,
    "seq"
  >;
  return { ...doc, seq: Number(row.seq) };
}

export class PostgresStore implements JournalStore {
  private readonly sql: SQL;

  private constructor(sql: SQL) {
    this.sql = sql;
  }

  /** Connect and ensure the record log exists (idempotent). */
  static async open(url: string): Promise<PostgresStore> {
    const sql = new SQL(url);
    await sql`
      CREATE TABLE IF NOT EXISTS records (
        seq BIGSERIAL PRIMARY KEY,
        id  TEXT NOT NULL UNIQUE,
        doc JSONB NOT NULL
      )`;
    await sql`
      CREATE INDEX IF NOT EXISTS records_supersedes
        ON records ((doc->>'supersedes'))`;
    await sql`
      CREATE INDEX IF NOT EXISTS records_retracts
        ON records ((doc->>'retracts'))`;
    return new PostgresStore(sql);
  }

  async close(): Promise<void> {
    await this.sql.close();
  }

  async append(candidate: CandidateRecord, knowledgeTime: string): Promise<AdmittedRecord> {
    // Pass the object itself: Bun's client encodes it as a jsonb object
    // (a stringified param would double-encode into a jsonb string scalar).
    const doc = { ...candidate, knowledgeTime };
    const rows = (await this.sql`
      INSERT INTO records (id, doc)
      VALUES (${candidate.id}, ${doc})
      RETURNING seq, doc`) as Row[];
    const row = rows[0];
    if (row === undefined) throw new Error("append returned no row");
    return toAdmitted(row);
  }

  async get(id: Id): Promise<AdmittedRecord | undefined> {
    const rows = (await this.sql`
      SELECT seq, doc FROM records WHERE id = ${id}`) as Row[];
    const row = rows[0];
    return row === undefined ? undefined : toAdmitted(row);
  }

  async scanFrom(after: number, limit: number): Promise<AdmittedRecord[]> {
    const rows = (await this.sql`
      SELECT seq, doc FROM records
      WHERE seq > ${after}
      ORDER BY seq ASC
      LIMIT ${limit}`) as Row[];
    return rows.map(toAdmitted);
  }

  async head(): Promise<number> {
    const rows = (await this.sql`
      SELECT COALESCE(MAX(seq), 0) AS seq FROM records`) as { seq: number | bigint }[];
    return Number(rows[0]?.seq ?? 0);
  }

  async findSuperseder(id: Id): Promise<AdmittedRecord | undefined> {
    const rows = (await this.sql`
      SELECT seq, doc FROM records
      WHERE doc->>'supersedes' = ${id}
      ORDER BY seq ASC
      LIMIT 1`) as Row[];
    const row = rows[0];
    return row === undefined ? undefined : toAdmitted(row);
  }

  async findRetraction(id: Id): Promise<AdmittedRecord | undefined> {
    const rows = (await this.sql`
      SELECT seq, doc FROM records
      WHERE doc->>'retracts' = ${id}
      ORDER BY seq ASC
      LIMIT 1`) as Row[];
    const row = rows[0];
    return row === undefined ? undefined : toAdmitted(row);
  }
}
