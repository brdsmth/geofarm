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
 * overwrites become our history. A scene the world already holds is
 * found by its foreign id, never admitted twice (RFC-0011 §3).
 */

import { newId, type CandidateRecord, type Id } from "../../world/index.ts";
import type { AdmittedRecord, Coordinate } from "../../world/index.ts";
import type { Boundary } from "../../boundary/index.ts";

export const PACKAGE = "@geofarm/feeds-imagery" as const;

export const IMAGERY_CLASSIFICATION = "imagery";
export const ALREADY_RECORDED = "already recorded";

export type SceneInput = {
  foreignId: string;
  capturedAt: string;
  footprint: Coordinate[][];
  /** Provider's content address — a hash, or a stable URL of the pixels. */
  contentHash: string;
  mediaType?: string;
  /** Set when this scene is the provider's reprocessing of an earlier one. */
  reprocesses?: string;
  /** Provider facts that ride as payload description, never as geometry
   * or claim: cloud cover, a preview, the bands' own addresses. */
  details?: Record<string, unknown>;
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

  /** Every scene the feed can see, by foreign id — one walk per batch. */
  private async scenesByForeignId(): Promise<Map<string, AdmittedRecord>> {
    const out = new Map<string, AdmittedRecord>();
    for (const r of (await this.boundary.walk(this.actor, 0, Number.MAX_SAFE_INTEGER)).records) {
      const foreign = (r.body as { foreignId?: string } | undefined)?.foreignId;
      if (r.classification === IMAGERY_CLASSIFICATION && foreign !== undefined) out.set(foreign, r);
    }
    return out;
  }

  private async admitScene(
    input: SceneInput,
    known: Map<string, AdmittedRecord>,
    report: SceneReport,
  ): Promise<void> {
    if (known.has(input.foreignId)) {
      report.skipped.push({ input, reason: ALREADY_RECORDED });
      return;
    }
    const candidate: CandidateRecord = {
      id: newId(),
      kind: "event",
      classification: IMAGERY_CLASSIFICATION,
      actors: { actor: this.actor, onBehalfOf: [this.org] },
      occurrence: { start: input.capturedAt },
      geometry: { form: "area", rings: input.footprint },
      subjects: [],
      payload: { contentAddress: input.contentHash, mediaType: input.mediaType ?? "image/tiff" },
      body: { foreignId: input.foreignId, ...(input.details ?? {}) },
    };
    if (input.reprocesses !== undefined) {
      const prior = known.get(input.reprocesses);
      if (prior === undefined) {
        report.skipped.push({ input, reason: `reprocesses unknown scene: ${input.reprocesses}` });
        return;
      }
      candidate.supersedes = prior.id;
    }
    const result = await this.boundary.append(this.actor, candidate);
    if (result.accepted) {
      report.admitted++;
      known.set(input.foreignId, result.record);
    } else report.skipped.push({ input, reason: result.reasons.join("; ") });
  }

  async ingestScene(input: SceneInput): Promise<SceneReport> {
    const report: SceneReport = { admitted: 0, skipped: [] };
    await this.admitScene(input, await this.scenesByForeignId(), report);
    return report;
  }

  /** The archive, admitted as ordinary history (S3: no sync machinery).
   * Scenes are admitted in order, so a reprocessing may follow the scene
   * it reprocesses within the same batch. */
  async backfillArchive(scenes: SceneInput[]): Promise<SceneReport> {
    const report: SceneReport = { admitted: 0, skipped: [] };
    const known = await this.scenesByForeignId();
    for (const scene of scenes) await this.admitScene(scene, known, report);
    return report;
  }
}
