/**
 * M8 — first cut (P-45..P-47).
 *
 * S4 (RFC-0016 §4; RFC-0002 T3; RFC-0005 §9): the sixth layer is free —
 * soil samples added touching lens definition and border configuration
 * only. S9/S10: the instruments read (tools/instruments). The review is
 * REVIEW-004; this file is the evidence it cites.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { newId, type Id } from "../packages/world/index.ts";
import { Boundary } from "../packages/boundary/index.ts";
import { WeatherFeed } from "../packages/feeds/weather/index.ts";
import { Session } from "../packages/client/interaction/index.ts";
import { MemoryPersistence, PendingStore } from "../packages/client/stores/index.ts";
import { actorIntro, farmWorld, grantRecord } from "../packages/projection/fixtures.ts";
import { bitemporalDivergence, grantShape, promotionRate, structural } from "../tools/instruments/index.ts";
import { readMembrane } from "../tools/instruments/membrane.ts";

const NOW = "2026-07-01T00:00:00Z";

describe("P-45 — S4: the sixth layer is free", () => {
  test("soil samples arrive as content through the existing door: a grant, a border config, a lens", async () => {
    const world = await farmWorld();
    const boundary = new Boundary(world.journal);

    // 1. Connecting is granting (RFC-0011 §1): a Grant Event — content.
    const lab = newId();
    await world.journal.admit(actorIntro(lab, "service"));
    await world.journal.admit(
      grantRecord(world.org, {
        grantee: lab,
        scope: { classifications: ["soil-site", "soil-sample", "soil-estimate"] },
        capabilities: ["represent"],
      }),
    );

    // 2. Border configuration (RFC-0011 §2): what the channels are, what
    //    the records are called. The same sampled-source adapter the
    //    weather provider uses — no soil code exists.
    const soil = new WeatherFeed(boundary, lab, {
      org: world.org,
      channels: { pH: "measurement", organicMatterPct: "measurement", modeledK: "interpretation" },
      ground: "lab-methods-2025",
      classifications: { site: "soil-site", measurement: "soil-sample", estimate: "soil-estimate" },
    });
    await soil.ensureStation({ foreignId: "W-1", name: "West sample 1", lon: -93.18, lat: 41.52 });
    const report = await soil.ingestReadings([
      { foreignStationId: "W-1", channel: "pH", time: "2025-10-20T00:00:00Z", value: 6.3 },
      { foreignStationId: "W-1", channel: "organicMatterPct", time: "2025-10-20T00:00:00Z", value: 3.4 },
      { foreignStationId: "W-1", channel: "modeledK", time: "2025-10-20T00:00:00Z", value: 180 },
    ]);
    expect(report.admitted).toBe(3);

    // 3. A lens definition (RFC-0005 §1): a named filter, nothing else.
    const s = new Session(world.owner, boundary, new PendingStore(new MemoryPersistence()), NOW);
    await s.sync();
    s.reveal({ name: "soil", filter: { classifications: ["soil-site", "soil-sample"] }, visible: true });
    const marks = s.marks();
    expect(marks.length).toBe(3); // the site and its two measurements
    for (const m of marks) expect(s.reading.get(m.presents[0] as Id)).toBeDefined(); // answerable (S8)

    // Inherited collaboration (T3): the agronomist's predicate grant does
    // not name soil, so soil does not exist for her — with no access code
    // written for soil. Extend the predicate, and it does.
    const maria = new Session(world.agronomist, boundary, new PendingStore(new MemoryPersistence()), NOW);
    await maria.sync();
    expect(maria.reading.all().some((r) => r.classification.startsWith("soil"))).toBe(false);
    await world.journal.admit(
      grantRecord(world.org, {
        grantee: world.agronomist,
        scope: { classifications: ["soil-site", "soil-sample"] },
        capabilities: ["view"],
      }),
    );
    await maria.sync();
    expect(maria.reading.all().filter((r) => r.classification.startsWith("soil")).length).toBe(3);
    // The estimate (an interpretation, admitted as a claim) stays out —
    // the border kept its standing, and the predicate is exact.
    expect(maria.reading.all().some((r) => r.classification === "soil-estimate")).toBe(false);

    // The diff, read structurally: no soil-specific code in any package.
    const root = join(import.meta.dir, "..");
    for (const f of ["packages/world/index.ts", "packages/journal/index.ts", "packages/access/index.ts", "packages/projection/index.ts", "packages/boundary/index.ts", "packages/client/render/index.ts", "packages/client/interaction/index.ts"]) {
      expect(readFileSync(join(root, f), "utf8")).not.toMatch(/soil/i);
    }
  });
});

describe("P-46 — the instruments read", () => {
  test("S9: divergence, promotion, and grant shape over the fixture cast", async () => {
    const world = await farmWorld({ clockFrom: "2026-07-01T18:00:00Z" });
    const all = (await world.journal.walkFrom(0, 10_000)).records;
    const d = bitemporalDivergence(all);
    expect(d.total).toBeGreaterThan(0);
    expect(d.rate).toBeGreaterThanOrEqual(0);
    expect(d.rate).toBeLessThanOrEqual(1);
    const g = grantShape(all);
    expect(g.byShape.predicate).toBe(1);
    expect(g.byShape.universal).toBe(1);
    const p = promotionRate([{ offered: 4, promoted: 1 }], all, []);
    expect(p.rate).toBe(0.25);
  });

  test("S10: the membrane reads zero leaks, with every deviation named", () => {
    const m = readMembrane(join(import.meta.dir, ".."));
    expect(m.vocabulary).toEqual([]);
    expect(m.location).toEqual([]);
    expect(m.exemptions.length).toBeGreaterThan(0);
    for (const e of m.exemptions) expect(e).toContain(" — "); // each carries its reason
  });

  test("S1/S2/S5 read from the tree", () => {
    const root = join(import.meta.dir, "..");
    const files = ["apps/web/src/main.ts", "apps/web/index.html", "packages/client/stores/index.ts", "packages/access/index.ts"].map(
      (p) => ({ path: p, text: readFileSync(join(root, p), "utf8") }),
    );
    const s = structural(files);
    expect(s.destinations).toBe(0);
    expect(s.stores.sort()).toEqual(["PendingStore", "ReadingStore"]);
    expect(s.auditSymbols).toEqual([]);
  });
});
