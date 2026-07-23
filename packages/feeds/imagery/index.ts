/**
 * @geofarm/feeds-imagery — the imagery provider as participant (RFC-0011,
 * RFC-0016 I2).
 *
 * A scene is a raster: area geometry plus content-addressed payload
 * (RFC-0003 §3.1, RFC-0013 §2) — its "where" is an area, its pixels are
 * payload, never geometry. Archive backfill is ordinary late-arriving
 * knowledge (RFC-0004 §1): deep occurrence times, current knowledge times,
 * riding the ordinary walk with no sync machinery (RFC-0012 §4, S3).
 * Upstream reprocessing is absorbed as supersession (RFC-0011 §4): their
 * overwrites become our history.
 */

import { newId, type CandidateRecord, type Id } from "../../world/index.ts";
import type { AdmittedRecord, Coordinate } from "../../world/index.ts";
import type { Boundary } from "../../boundary/index.ts";

export const PACKAGE = "@geofarm/feeds-imagery" as const;

export type SceneInput = {
  foreignId: string;
  capturedAt: string;
  footprint: Coordinate[][];
  /** Provider's content hash — the payload's address (content-addressed). */
  contentHash: string;
  /** Set when this scene is the provider's reprocessing of an earlier one. */
  reprocesses?: string;
};

export type SceneReport = {
  admitted: number;
  skipped: { input: SceneInput; reason: string }[];
};

export class ImageryFeed {
  constructor(
    private readonly boundary: Boundary,
    private readonly actor: Id,
    private readonly org: Id,
  ) {}

  /** Resolve a prior scene by foreign id — stateless, by projection. */
  private async findScene(foreignId: string): Promise<AdmittedRecord | undefined> {
    const known = (await this.boundary.project(this.actor, { read: { form: "known" } })) as {
      viewable: Id[];
    };
    for (const id of known.viewable) {
      const reading = (await this.boundary.project(this.actor, {
        read: { form: "record", id },
      })) as { level: string; record?: AdmittedRecord } | undefined;
      const r = reading?.record;
      if (
        r !== undefined &&
        r.classification === "imagery" &&
        (r.body as { foreignId?: string } | undefined)?.foreignId === foreignId
      ) {
        return r;
      }
    }
    return undefined;
  }

  async ingestScene(input: SceneInput): Promise<SceneReport> {
    const report: SceneReport = { admitted: 0, skipped: [] };
    const candidate: CandidateRecord = {
      id: newId(),
      kind: "event",
      classification: "imagery",
      actors: { actor: this.actor, onBehalfOf: [this.org] },
      occurrence: { start: input.capturedAt },
      geometry: { form: "area", rings: input.footprint },
      subjects: [],
      payload: { contentAddress: input.contentHash, mediaType: "image/tiff" },
      body: { foreignId: input.foreignId },
    };
    if (input.reprocesses !== undefined) {
      const prior = await this.findScene(input.reprocesses);
      if (prior === undefined) {
        report.skipped.push({ input, reason: `reprocesses unknown scene: ${input.reprocesses}` });
        return report;
      }
      candidate.supersedes = prior.id;
    }
    const result = await this.boundary.append(this.actor, candidate);
    if (result.accepted) report.admitted++;
    else report.skipped.push({ input, reason: result.reasons.join("; ") });
    return report;
  }

  /** The archive, admitted as ordinary history (S3: no sync machinery). */
  async backfillArchive(scenes: SceneInput[]): Promise<SceneReport> {
    const report: SceneReport = { admitted: 0, skipped: [] };
    for (const scene of scenes) {
      const one = await this.ingestScene(scene);
      report.admitted += one.admitted;
      report.skipped.push(...one.skipped);
    }
    return report;
  }
}
