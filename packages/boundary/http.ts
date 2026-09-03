/**
 * The door served over HTTP — three routes, because the contract has two
 * operations and a walk (RFC-0012 §2, §4), and nothing else: no resource
 * paths, no verbs, no permission surface (§6). Every request names the
 * Actor it speaks as; the boundary answers within that Actor's sub-world.
 *
 * Who may speak as whom is authentication, which this transport does not
 * yet do beyond one shared token that gates the whole API. Until an
 * identity layer stands in front of it, the server trusts the caller's
 * claim of Actor — fine for a farm on a laptop, not for the internet.
 */

import type { Boundary } from "./index.ts";

export type BoundaryApi = Pick<Boundary, "walk" | "append" | "project">;

export type HttpOptions = {
  /** When set, every request must carry `Authorization: Bearer <token>`. */
  token?: string;
};

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** A handler for the three routes under `prefix`; `undefined` for any
 * other path, so a server can fall through to whatever else it serves. */
export function boundaryHandler(boundary: BoundaryApi, opts: HttpOptions = {}, prefix = "/api") {
  return async (req: Request): Promise<Response | undefined> => {
    const path = new URL(req.url).pathname;
    if (!path.startsWith(`${prefix}/`)) return undefined;
    const route = path.slice(prefix.length);
    if (route !== "/walk" && route !== "/append" && route !== "/project") return undefined;
    if (req.method !== "POST") return json({ error: "method" }, 405);
    if (opts.token !== undefined && req.headers.get("authorization") !== `Bearer ${opts.token}`) {
      return json({ error: "unauthorized" }, 401);
    }
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return json({ error: "body" }, 400);
    }
    const actor = body.actor;
    if (typeof actor !== "string" || actor === "") return json({ error: "actor" }, 400);
    switch (route) {
      case "/walk": {
        const watermark = typeof body.watermark === "number" ? body.watermark : 0;
        const limit = typeof body.limit === "number" ? body.limit : 1000;
        return json(await boundary.walk(actor, watermark, limit));
      }
      case "/append":
        if (typeof body.candidate !== "object" || body.candidate === null) return json({ error: "candidate" }, 400);
        return json(await boundary.append(actor, body.candidate as Parameters<BoundaryApi["append"]>[1]));
      case "/project":
        if (typeof body.request !== "object" || body.request === null) return json({ error: "request" }, 400);
        return json((await boundary.project(actor, body.request as Parameters<BoundaryApi["project"]>[1])) ?? null);
    }
  };
}
