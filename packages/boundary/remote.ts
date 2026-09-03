/**
 * The door across a wire (RFC-0012 §0: transports are mechanism, the
 * contract is not). A remote Boundary presents exactly the in-process
 * shape — walk, append, project — over HTTP; the Session cannot tell
 * them apart, and a dead radio is a thrown fetch, which the Session
 * already treats as a long gap between walks (RFC-0012 §5).
 */

import type { CandidateRecord, Id } from "../world/index.ts";
import type { AppendResult, Boundary, BoundaryWalkPage, ProjectRequest } from "./index.ts";

export type RemoteOptions = { fetchImpl?: typeof fetch; token?: string };

export class RemoteBoundary implements Pick<Boundary, "walk" | "append" | "project"> {
  constructor(
    private readonly base: string,
    private readonly opts: RemoteOptions = {},
  ) {}

  private async post<T>(path: string, body: unknown): Promise<T> {
    const res = await (this.opts.fetchImpl ?? fetch)(`${this.base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.opts.token !== undefined ? { Authorization: `Bearer ${this.opts.token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`boundary ${res.status}`);
    return (await res.json()) as T;
  }

  walk(actor: Id, watermark: number, limit = 1000): Promise<BoundaryWalkPage> {
    return this.post("/walk", { actor, watermark, limit });
  }

  append(actor: Id, candidate: CandidateRecord): Promise<AppendResult> {
    return this.post("/append", { actor, candidate });
  }

  project(actor: Id, request: ProjectRequest): ReturnType<Boundary["project"]> {
    return this.post("/project", { actor, request });
  }
}
