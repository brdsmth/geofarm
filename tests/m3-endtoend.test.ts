/**
 * M3 end-to-end (the milestone's acceptance demo, headless):
 * draw → promote → record → scrub on a fixture world, with the
 * structural halves of S1 and S2 asserted along the way.
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdtempSync } from "node:fs";
import { Boundary } from "../packages/boundary/index.ts";
import { Session } from "../packages/client/interaction/index.ts";
import { FilePersistence, PendingStore } from "../packages/client/stores/index.ts";
import { farmWorld, eastGeom } from "../packages/projection/fixtures.ts";
import * as surface from "../packages/client/surface/index.ts";

const NOW = "2026-07-01T00:00:00Z";

describe("M3 — the map is the application", () => {
  test("the whole loop: draw, promote, record, scrub — one surface, no pages", async () => {
    const { journal, owner, west } = await farmWorld();
    const boundary = new Boundary(journal);
    const pendingPath = join(mkdtempSync(join(tmpdir(), "geofarm-")), "pending.json");
    const s = new Session(owner, boundary, new PendingStore(new FilePersistence(pendingPath)), NOW);
    await s.sync();

    // S2 (structural): the session holds exactly the three stores and a View.
    expect(s.reading).toBeDefined();
    expect(s.pending).toBeDefined();
    expect(s.view).toBeDefined();

    // Reveal: boundaries and notes lenses.
    s.reveal({ name: "boundaries", filter: { classifications: ["field", "zone"] }, visible: true });
    s.reveal({ name: "notes", filter: { classifications: ["note"] }, visible: true });

    // Draw a management zone in the east field and promote it (W1).
    const gesture = s.draw(eastGeom, NOW);
    const zoneDraft = s.promote(gesture, { kind: "entity", classification: "zone" });
    s.commit(zoneDraft as string);

    // The device dies before sending; the work survives (RFC-0014 §1).
    const resurrected = new Session(
      owner,
      boundary,
      new PendingStore(new FilePersistence(pendingPath)),
      NOW,
    );
    await resurrected.sync();
    expect(resurrected.pending.submissions.length).toBe(1);
    const sent = await resurrected.send();
    expect(sent.admitted).toBe(1);
    await resurrected.sync();

    // Record a note about the west field — aboutness from the View (H1).
    resurrected.select([west.id]);
    const note = resurrected.annotate("note", { text: "combine ready" }, NOW);
    resurrected.commit(note);
    expect((await resurrected.send()).admitted).toBe(1);
    await resurrected.sync();

    // Scrub the season (H3): the zone and note vanish before their time.
    resurrected.reveal({
      name: "boundaries",
      filter: { classifications: ["field", "zone"] },
      visible: true,
    });
    resurrected.reveal({ name: "notes", filter: { classifications: ["note"] }, visible: true });
    const now = resurrected.marks();
    expect(now.some((m) => m.lens === "boundaries" && resurrected.reading.get(m.presents[0] as string)?.classification === "zone")).toBe(true);
    resurrected.navigateTime({ start: "2019-06-01T00:00:00Z" });
    const then = resurrected.marks();
    expect(then.some((m) => resurrected.reading.get(m.presents[0] as string)?.classification === "zone")).toBe(false);
    expect(then.some((m) => m.lens === "notes")).toBe(false);

    // Every mark on either frame answers for itself (S8's rendering half).
    for (const m of [...now, ...then]) {
      expect(m.presents.length).toBeGreaterThan(0);
      for (const id of m.presents) expect(resurrected.reading.get(id)).toBeDefined();
    }
  });

  test("S10: the surface catalog passes the membrane it armed", () => {
    const banned =
      /\b(entity|assertion|actor|scoped grant|sub[- ]?world|watermark|ontology|primitive|supersession|bitemporal|provenance|digital twin|capability|uuid)\b/i;
    const walk = (value: unknown): string[] => {
      if (typeof value === "string") return [value];
      if (typeof value === "function") {
        try {
          return [
            (value as (...args: unknown[]) => string)("Maria", "the west fields", "harvest"),
          ].filter((s) => typeof s === "string");
        } catch {
          return [];
        }
      }
      if (typeof value === "object" && value !== null) {
        return Object.values(value).flatMap(walk);
      }
      return [];
    };
    const strings = walk({ ...surface });
    expect(strings.length).toBeGreaterThan(15);
    for (const s of strings) {
      expect(s).not.toMatch(banned);
    }
  });
});
