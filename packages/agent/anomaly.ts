/**
 * @geofarm/agent — the autonomous mode: the weekly anomaly job (A4).
 *
 * Under its own granted agency (RFC-0010 §1), the agent monitors imagery
 * within its Reach and authors what it finds as ordinary attributed
 * Assertions — scoped (admission checks its grants at the door), signed
 * (the acting Actor is the AI; ownership lands with its principal),
 * confidence-stated, and self-superseding: a standing flag that events
 * have undermined is the agent's to revise without being asked (§6 —
 * stale advice with a live signature is a failure of participation).
 *
 * Reading pixels is mechanism: the vegetation index is extracted by an
 * injected port, so the payload pipeline (like the reasoning engine) is
 * replaceable without touching what the job's output must be.
 */

import type { AdmittedRecord, Geometry, Id } from "../world/index.ts";
import { newId } from "../world/index.ts";
import { geometryIntersectsArea } from "../world/spatial.ts";
import type { Boundary } from "../boundary/index.ts";

/** The mechanism port: a scene's vegetation index, or nothing readable. */
export type SceneIndex = (scene: AdmittedRecord) => number | undefined;

export const ANOMALY_CLASSIFICATION = "anomaly";

export type AnomalyRun = {
  /** Newly authored flags and revisions, as admitted. */
  authored: AdmittedRecord[];
  /** Fields whose standing flag (or standing quiet) still holds. */
  unchanged: number;
  /** Appends the boundary refused — scoping is the door's, not ours. */
  rejected: { reasons: readonly string[] }[];
};

export class AnomalyJob {
  constructor(
    private readonly boundary: Boundary,
    private readonly agentActor: Id,
    private readonly index: SceneIndex,
    private readonly opts: {
      /** The principal the agent acts for (dual attribution). */
      principal?: Id;
      /** Fractional index drop against baseline that flags (default 0.15). */
      dropThreshold?: number;
      /** Material change in drop that warrants a revision (default 0.05). */
      revisionDelta?: number;
    } = {},
  ) {}

  /**
   * One run over the agent's Reach: everything its grants admit, read
   * through the one door (module rule 3). For each field, the latest
   * scene's index is judged against the field's own history; transitions
   * — quiet→anomalous, anomalous→materially different, anomalous→quiet —
   * are authored; steady states are left standing.
   */
  async run(): Promise<AnomalyRun> {
    const reach = (await this.boundary.walk(this.agentActor, 0)).records;
    const run: AnomalyRun = { authored: [], unchanged: 0, rejected: [] };

    const fields = reach.filter((r) => r.kind === "entity" && r.classification === "field");
    const scenes = reach
      .filter((r) => r.classification === "imagery")
      .sort((a, b) => Date.parse(a.occurrence.start) - Date.parse(b.occurrence.start));

    // The agent's own standing flags, per field (self-supersession duty).
    const superseded = new Set<Id>();
    for (const r of reach) {
      if (r.supersedes !== undefined) superseded.add(r.supersedes);
      if (r.retracts !== undefined) superseded.add(r.retracts);
    }
    const standingFlagOf = new Map<Id, AdmittedRecord>();
    for (const r of reach) {
      if (
        r.classification === ANOMALY_CLASSIFICATION &&
        r.actors.actor === this.agentActor &&
        !superseded.has(r.id)
      ) {
        const field = r.subjects[0];
        if (field !== undefined) standingFlagOf.set(field, r);
      }
    }

    const threshold = this.opts.dropThreshold ?? 0.15;
    const delta = this.opts.revisionDelta ?? 0.05;

    for (const field of fields) {
      const footprintOver = fieldScenes(field, scenes, this.index);
      if (footprintOver.length < 2) continue; // no history to judge against

      const latest = footprintOver[footprintOver.length - 1] as {
        scene: AdmittedRecord;
        value: number;
      };
      const baseline =
        footprintOver.slice(0, -1).reduce((sum, s) => sum + s.value, 0) /
        (footprintOver.length - 1);
      const drop = baseline - latest.value;
      const anomalous = drop >= threshold;
      const standing = standingFlagOf.get(field.id);
      const standingDrop = (standing?.body as { drop?: number } | undefined)?.drop;

      if (anomalous && standing === undefined) {
        // Quiet → anomalous: a new flag.
        await this.author(run, field, latest.scene, footprintOver, drop, baseline, undefined);
      } else if (anomalous && standing !== undefined) {
        if (standingDrop === undefined || Math.abs(drop - standingDrop) >= delta) {
          // Still anomalous, materially different: revise our own claim.
          await this.author(run, field, latest.scene, footprintOver, drop, baseline, standing.id);
        } else {
          run.unchanged++;
        }
      } else if (!anomalous && standing !== undefined) {
        // Anomalous → quiet: the flag is undermined; revise it away.
        await this.author(run, field, latest.scene, footprintOver, drop, baseline, standing.id);
      } else {
        run.unchanged++;
      }
    }
    return run;
  }

  private async author(
    run: AnomalyRun,
    field: AdmittedRecord,
    latest: AdmittedRecord,
    over: { scene: AdmittedRecord; value: number }[],
    drop: number,
    baseline: number,
    supersedes: Id | undefined,
  ): Promise<void> {
    const anomalous = drop >= (this.opts.dropThreshold ?? 0.15);
    // Confidence grows with the drop's size relative to the baseline's
    // scale — stated, never implied (RFC-0010 §6).
    const confidence = anomalous
      ? Math.min(0.95, 0.5 + drop)
      : Math.min(0.95, 0.5 + (baseline - drop));
    const result = await this.boundary.append(this.agentActor, {
      id: newId(),
      kind: "assertion",
      classification: ANOMALY_CLASSIFICATION,
      actors: {
        actor: this.agentActor,
        onBehalfOf: this.opts.principal !== undefined ? [this.opts.principal] : [],
      },
      occurrence: { start: latest.occurrence.start },
      ...(field.geometry !== undefined ? { geometry: field.geometry } : {}),
      subjects: [field.id],
      evidence: over.map((s) => s.scene.id),
      confidence: Number(confidence.toFixed(2)),
      ...(supersedes !== undefined ? { supersedes } : {}),
      body: anomalous
        ? { finding: "vegetation index below this field's own record", drop: round(drop) }
        : { finding: "back in line with this field's own record", drop: round(drop) },
    });
    if (result.accepted) run.authored.push(result.record);
    else run.rejected.push({ reasons: result.reasons });
  }
}

function round(n: number): number {
  return Number(n.toFixed(3));
}

/** Scenes whose footprint covers the field and whose index is readable. */
function fieldScenes(
  field: AdmittedRecord,
  scenes: AdmittedRecord[],
  index: SceneIndex,
): { scene: AdmittedRecord; value: number }[] {
  const g = field.geometry;
  if (g === undefined || g.form !== "area") return [];
  const out: { scene: AdmittedRecord; value: number }[] = [];
  for (const scene of scenes) {
    if (scene.geometry === undefined) continue;
    if (!geometryIntersectsArea(scene.geometry, g)) continue;
    const value = index(scene);
    if (value !== undefined) out.push({ scene, value });
  }
  return out;
}
