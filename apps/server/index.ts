/**
 * geofarm server — the door (RFC-0012), the intelligence's engine
 * (RFC-0010 §0), and the live sources (RFC-0011), on one port, in front
 * of the chosen store (RFC-0013 §2: PostgreSQL) — with the shell served
 * beside them so one URL is the farm.
 * surface-exempt-file: operator log lines and HTTP bodies — developer-
 * facing, not product copy.
 *
 * Configuration is the environment:
 *   GEOFARM_PG_URL      the journal's store (unset: in memory, for a look)
 *   PORT                default 4790
 *   GEOFARM_ENGINE      ollama | anthropic | rules (unset: whichever is up)
 *   OLLAMA_HOST, OLLAMA_MODEL, GEOFARM_MODEL, ANTHROPIC_API_KEY
 *   GEOFARM_SOURCES     off to leave the live sources alone
 *   GEOFARM_API_TOKEN   a shared bearer token gating the whole API
 *   NWS_USER_AGENT      who to say we are to the weather service
 *
 * What is not here: authentication. The server trusts the Actor a caller
 * names (packages/boundary/http.ts says why that is fine on a laptop and
 * not on the internet).
 */

import { join } from "node:path";
import { Journal } from "../../packages/journal/index.ts";
import { MemoryStore } from "../../packages/journal/store-memory.ts";
import { PostgresStore } from "../../packages/journal/store-postgres.ts";
import { Boundary } from "../../packages/boundary/index.ts";
import { boundaryHandler } from "../../packages/boundary/http.ts";
import { ModelReasoner, type Engine } from "../../packages/agent/engine.ts";
import { RuleReasoner } from "../../packages/agent/reasoner.ts";
import type { Reasoner } from "../../packages/agent/index.ts";
import { ollamaAvailable, ollamaEngine } from "../../packages/agent/engines/ollama.ts";
import { anthropicEngine } from "../../packages/agent/engines/anthropic.ts";
import { concludeFromWire } from "../../packages/agent/remote.ts";
import { CAST, FARM_CENTER, FARM_RING, FEED_ACTORS, WEATHER_NAMES, seedFarm } from "../web/src/seed.ts";
import { schedule } from "./sources.ts";

const env = process.env;
const port = Number(env.PORT ?? 4790);
const log = (line: string): void => console.log(`${new Date().toISOString()} ${line}`);

// ------------------------------------------------------------------ store
const pgUrl = env.GEOFARM_PG_URL;
const store = pgUrl !== undefined ? await PostgresStore.open(pgUrl) : new MemoryStore();
log(pgUrl !== undefined ? "store: postgres" : "store: memory (nothing will be kept)");
const journal = new Journal(store);
if ((await journal.head()) === 0) {
  await seedFarm(journal);
  log(`seeded: ${await journal.head()} records`);
}
const boundary = new Boundary(journal);

// ----------------------------------------------------------------- engine
async function chooseEngine(): Promise<Engine | undefined> {
  const wanted = env.GEOFARM_ENGINE;
  const ollama = { host: env.OLLAMA_HOST, model: env.OLLAMA_MODEL };
  if (wanted === "rules") return undefined;
  if (wanted === "anthropic") return anthropicEngine({ model: env.GEOFARM_MODEL });
  if (wanted === "ollama") return ollamaEngine(ollama);
  if (await ollamaAvailable(ollama)) return ollamaEngine(ollama);
  if (env.ANTHROPIC_API_KEY !== undefined) return anthropicEngine({ model: env.GEOFARM_MODEL });
  return undefined;
}
const engine = await chooseEngine();
const reasoner: Reasoner =
  engine === undefined
    ? new RuleReasoner()
    : new ModelReasoner(engine, { onError: (e) => log(`engine: ${e instanceof Error ? e.message : String(e)}`) });
const engineName = engine?.name ?? "rules";
log(`engine: ${engineName}`);

// ---------------------------------------------------------------- sources
const sourcesOn = env.GEOFARM_SOURCES !== "off";
if (sourcesOn) {
  schedule({
    boundary,
    org: CAST.org,
    actors: { ...FEED_ACTORS, assistant: CAST.assistant },
    names: WEATHER_NAMES,
    engaged: { form: "area", rings: [[...FARM_RING, FARM_RING[0] as [number, number]]] },
    center: FARM_CENTER,
    userAgent: env.NWS_USER_AGENT ?? "geofarm (development)",
    log,
  });
}

// ------------------------------------------------------------------- http
const token = env.GEOFARM_API_TOKEN;
const door = boundaryHandler(boundary, token !== undefined ? { token } : {});
const dist = join(import.meta.dir, "..", "web", "dist");
const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const authorized = (req: Request): boolean => token === undefined || req.headers.get("authorization") === `Bearer ${token}`;

Bun.serve({
  port,
  async fetch(req) {
    const path = new URL(req.url).pathname;
    if (path === "/api/health") return json({ ok: true, watermark: await journal.head() });
    if (path === "/api/world") {
      if (!authorized(req)) return json({ error: "unauthorized" }, 401);
      return json({
        org: CAST.org,
        people: [CAST.you, CAST.sam, CAST.maria],
        assistant: CAST.assistant,
        feeds: FEED_ACTORS,
        now: new Date().toISOString(),
        engine: engineName,
        sources: sourcesOn,
        watermark: await journal.head(),
      });
    }
    if (path === "/api/engine") {
      if (req.method !== "POST") return json({ error: "method" }, 405);
      if (!authorized(req)) return json({ error: "unauthorized" }, 401);
      return json(await concludeFromWire(reasoner, await req.json()));
    }
    const answered = await door(req);
    if (answered !== undefined) return answered;
    const file = Bun.file(join(dist, path === "/" ? "index.html" : path.slice(1)));
    if (!(await file.exists())) return new Response("not found", { status: 404 });
    if (path === "/" || path === "/index.html") {
      // A shell served beside a server knows it (Grower Rule 3): when the
      // door cannot be reached it says so, and never seeds the demo farm
      // in place of this one.
      const html = (await file.text()).replace("<head>", '<head><meta name="geofarm-served" content="true">');
      return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    return new Response(file);
  },
});

log(`geofarm → http://localhost:${port}`);
