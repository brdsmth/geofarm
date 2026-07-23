/**
 * M4 — the world learns (P-29..P-31).
 *
 * RFC-0011 §1 (participant model), §2 (epistemic classification at the
 * border), §3 (introduce-then-join, stateless), §4 (backfill and upstream
 * revision), §5 (engaged ownership); RFC-0016 I1/I2/L1/L2 and S3.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { newId, type AdmittedRecord, type Coordinate, type Id } from "../packages/world/index.ts";
import { ownerOf } from "../packages/access/index.ts";
import { Boundary } from "../packages/boundary/index.ts";
import { WeatherFeed } from "../packages/feeds/weather/index.ts";
import { ImageryFeed } from "../packages/feeds/imagery/index.ts";
import { Session } from "../packages/client/interaction/index.ts";
import { MemoryPersistence, PendingStore } from "../packages/client/stores/index.ts";
import { farmWorld, grantRecord, actorIntro } from "../packages/projection/fixtures.ts";

const NOW = "2026-07-01T00:00:00Z";

const farmFootprint: Coordinate[][] = [
  [
    [-93.25, 41.45],
    [-93.0, 41.45],
    [-93.0, 41.6],
    [-93.25, 41.6],
    [-93.25, 41.45],
  ],
];

async function engagedWorld() {
  const fixture = await farmWorld();
  const boundary = new Boundary(fixture.journal);
  const weatherActor = newId();
  const imageryActor = newId();
  await fixture.journal.admit(actorIntro(weatherActor, "service"));
  await fixture.journal.admit(actorIntro(imageryActor, "service"));
  // Engagement is representation over the feed's classifications
  // (RFC-0011 §1: connecting is granting).
  await fixture.journal.admit(
    grantRecord(fixture.org, {
      grantee: weatherActor,
      scope: {
        classifications: ["weather-station", "reading", "forecast", "weather-estimate"],
      },
      capabilities: ["represent"],
    }),
  );
  await fixture.journal.admit(
    grantRecord(fixture.org, {
      grantee: imageryActor,
      scope: { classifications: ["imagery"] },
      capabilities: ["represent"],
    }),
  );
  const weather = new WeatherFeed(boundary, weatherActor, {
    org: fixture.org,
    channels: {
      rainMm: "measurement",
      tempC: "measurement",
      // The provider calls this a reading; it is device-modeled — the
      // border classifies it honestly (RFC-0011 §9's conservative default).
      feelsLikeC: "interpretation",
    },
    ground: "provider-forecast-model-v4",
  });
  const imagery = new ImageryFeed(boundary, imageryActor, fixture.org);
  return { ...fixture, boundary, weatherActor, imageryActor, weather, imagery };
}

describe("P-29 — the weather provider as participant", () => {
  test("stations introduce-then-join: org-owned, feed-sourced, never duplicated", async () => {
    const { weather, weatherActor, org, boundary } = await engagedWorld();
    const st = { foreignId: "KSTN-042", name: "North Station", lon: -93.12, lat: 41.53 };
    const first = await weather.ensureStation(st);
    const second = await weather.ensureStation(st);
    expect(second).toBe(first); // resolved, not re-introduced
    const reading = (await boundary.project(weatherActor, {
      read: { form: "record", id: first },
    })) as { record: AdmittedRecord };
    expect(ownerOf(reading.record)).toBe(org); // engaged: the org owns it
    expect(reading.record.actors.actor).toBe(weatherActor); // provenance stays
    expect((reading.record.body as { foreignId: string }).foreignId).toBe("KSTN-042");
  });

  test("the border classifies: measurements, interpretations, and refusals", async () => {
    const { weather } = await engagedWorld();
    await weather.ensureStation({ foreignId: "S1", name: "S1", lon: -93.12, lat: 41.53 });
    const report = await weather.ingestReadings([
      { foreignStationId: "S1", channel: "rainMm", time: "2026-06-30T06:00:00Z", value: 4 },
      { foreignStationId: "S1", channel: "feelsLikeC", time: "2026-06-30T06:00:00Z", value: 31 },
      { foreignStationId: "S1", channel: "mysteryIndex", time: "2026-06-30T06:00:00Z", value: 9 },
    ]);
    expect(report.admitted).toBe(2);
    expect(report.skipped.length).toBe(1);
    expect(report.skipped[0]?.reason).toContain("unconfigured channel");
  });

  test("forecasts are future-dated claims with confidence and grounds", async () => {
    const { weather, boundary, owner } = await engagedWorld();
    await weather.ensureStation({ foreignId: "S1", name: "S1", lon: -93.12, lat: 41.53 });
    const report = await weather.ingestForecasts([
      {
        foreignStationId: "S1",
        issued: "2026-07-01T00:00:00Z",
        validAt: "2026-07-03T00:00:00Z",
        channel: "rainMm",
        value: 12,
        probability: 0.8,
      },
    ]);
    expect(report.admitted).toBe(1);
    const known = (await boundary.project(owner, { read: { form: "known" } })) as {
      viewable: Id[];
    };
    let forecast: AdmittedRecord | undefined;
    for (const id of known.viewable) {
      const r = (await boundary.project(owner, { read: { form: "record", id } })) as
        | { record?: AdmittedRecord }
        | undefined;
      if (r?.record?.classification === "forecast") forecast = r.record;
    }
    expect(forecast).toBeDefined();
    expect(forecast?.kind).toBe("assertion"); // never admitted as observation
    expect(forecast?.confidence).toBe(0.8);
    expect(forecast?.grounds?.[0]?.source).toBe("provider-forecast-model-v4");
    expect(Date.parse(forecast?.occurrence.start as string)).toBeGreaterThan(Date.parse(NOW));
  });

  test("forged representation is refused at the door (RFC-0002 §1.4)", async () => {
    const { journal, boundary, org, west } = await engagedWorld();
    const impostor = newId();
    await journal.admit(actorIntro(impostor, "service"));
    const attempt = await boundary.append(impostor, {
      id: newId(),
      kind: "event",
      classification: "reading",
      actors: { actor: impostor, onBehalfOf: [org] }, // claimed, never granted
      occurrence: { start: NOW },
      subjects: [west.id],
      body: { channel: "rainMm", value: 99 },
    });
    expect(attempt.accepted).toBe(false);
    if (!attempt.accepted) {
      expect(attempt.reasons[0]).toContain("representation");
    }
  });
});

describe("P-30 — imagery with archive backfill", () => {
  test("the archive rides the ordinary walk: knowledge order, deep occurrence (S3)", async () => {
    const { imagery, boundary, owner } = await engagedWorld();
    // Watermark before backfill: the client is already up to date.
    const before = await boundary.walk(owner, 0);
    // Two years of monthly scenes, admitted today.
    const scenes = Array.from({ length: 24 }, (_, i) => ({
      foreignId: `SCENE-${i}`,
      capturedAt: new Date(Date.UTC(2024, i, 15)).toISOString(),
      footprint: farmFootprint,
      contentHash: `sha256:${i}`,
    }));
    const report = await imagery.backfillArchive(scenes);
    expect(report.admitted).toBe(24);
    // The ordinary walk delivers the whole archive as new knowledge —
    // no sync machinery, no special import path.
    const delta = await boundary.walk(owner, before.watermark);
    const arrived = delta.records.filter((r) => r.classification === "imagery");
    expect(arrived.length).toBe(24);
    const seqs = arrived.map((r) => r.seq);
    expect(seqs).toEqual([...seqs].sort((a, b) => a - b)); // knowledge order
    expect(arrived[0]?.occurrence.start).toContain("2024-01"); // deep past
    // Raster discipline (RFC-0003 §3.1): area geometry + payload pointer.
    expect(arrived[0]?.geometry?.form).toBe("area");
    expect(arrived[0]?.payload?.contentAddress).toBe("sha256:0");
  });

  test("scrubbing the season pages through the archive (true frames)", async () => {
    const { imagery, boundary, owner } = await engagedWorld();
    await imagery.backfillArchive(
      Array.from({ length: 24 }, (_, i) => ({
        foreignId: `SCENE-${i}`,
        capturedAt: new Date(Date.UTC(2024, i, 15)).toISOString(),
        footprint: farmFootprint,
        contentHash: `sha256:${i}`,
      })),
    );
    const s = new Session(owner, boundary, new PendingStore(new MemoryPersistence()), NOW);
    await s.sync();
    s.reveal({ name: "imagery", filter: { classifications: ["imagery"] }, visible: true });
    expect(s.marks().length).toBe(24); // the whole archive had happened by now
    s.navigateTime({ start: "2024-06-30T00:00:00Z" });
    expect(s.marks().length).toBe(6); // mid-2024: six scenes existed
  });

  test("upstream reprocessing is absorbed as supersession (RFC-0011 §4)", async () => {
    const { imagery, boundary, owner } = await engagedWorld();
    await imagery.ingestScene({
      foreignId: "SC-1",
      capturedAt: "2026-05-01T00:00:00Z",
      footprint: farmFootprint,
      contentHash: "sha256:v1",
    });
    const redo = await imagery.ingestScene({
      foreignId: "SC-1-v2",
      capturedAt: "2026-05-01T00:00:00Z",
      footprint: farmFootprint,
      contentHash: "sha256:v2",
      reprocesses: "SC-1",
    });
    expect(redo.admitted).toBe(1);
    const s = new Session(owner, boundary, new PendingStore(new MemoryPersistence()), NOW);
    await s.sync();
    s.reveal({ name: "imagery", filter: { classifications: ["imagery"] }, visible: true });
    const marks = s.marks();
    expect(marks.length).toBe(1); // the standing revision renders
    const standing = s.reading.get(marks[0]?.presents[0] as Id);
    expect(standing?.payload?.contentAddress).toBe("sha256:v2");
    // Their overwrite became our history: v1 remains readable.
    const v1 = s.reading.all().find((r) => (r.body as { foreignId?: string })?.foreignId === "SC-1");
    expect(v1).toBeDefined();
  });
});

describe("P-31 — provenance and confidence filtering (L2)", () => {
  test("lenses filter by source and by stated confidence (RFC-0005 §5)", async () => {
    const { weather, boundary, owner, weatherActor } = await engagedWorld();
    await weather.ensureStation({ foreignId: "S1", name: "S1", lon: -93.12, lat: 41.53 });
    await weather.ingestReadings([
      { foreignStationId: "S1", channel: "rainMm", time: "2026-06-30T06:00:00Z", value: 4 },
    ]);
    await weather.ingestForecasts([
      {
        foreignStationId: "S1",
        issued: NOW,
        validAt: "2026-07-03T00:00:00Z",
        channel: "rainMm",
        value: 12,
        probability: 0.8,
      },
      {
        foreignStationId: "S1",
        issued: NOW,
        validAt: "2026-07-03T00:00:00Z",
        channel: "rainMm",
        value: 30,
        probability: 0.3,
      },
    ]);
    const s = new Session(owner, boundary, new PendingStore(new MemoryPersistence()), NOW);
    await s.sync();
    s.navigateTime({ start: "2026-07-04T00:00:00Z" }); // after the forecasts' moments
    // Provenance: only what the weather provider itself authored.
    s.reveal({ name: "from-provider", filter: { sources: [weatherActor] }, visible: true });
    const provider = s.marks();
    expect(provider.length).toBeGreaterThan(0);
    for (const m of provider) {
      expect(s.reading.get(m.presents[0] as Id)?.actors.actor).toBe(weatherActor);
    }
    // Confidence: hide the low-confidence claim; observations unaffected.
    s.toggle("from-provider");
    s.reveal({
      name: "confident",
      filter: { classifications: ["forecast", "reading"], minConfidence: 0.6 },
      visible: true,
    });
    const confident = s.marks().map((m) => s.reading.get(m.presents[0] as Id));
    expect(confident.some((r) => r?.kind === "assertion" && r.confidence === 0.8)).toBe(true);
    expect(confident.some((r) => r?.kind === "assertion" && r.confidence === 0.3)).toBe(false);
    expect(confident.some((r) => r?.classification === "reading")).toBe(true); // observations pass
  });
});

describe("S3 / module rule 4 — feeds hold no machinery", () => {
  test("feed sources import only the boundary and the vocabulary", () => {
    for (const pkg of ["weather", "imagery"]) {
      const source = readFileSync(
        join(import.meta.dir, "..", "packages", "feeds", pkg, "index.ts"),
        "utf8",
      );
      expect(source).not.toMatch(/from "\.\.\/\.\.\/journal/);
      expect(source).not.toMatch(/from "\.\.\/\.\.\/access/);
      expect(source).not.toMatch(/from "\.\.\/\.\.\/projection/);
      expect(source).not.toMatch(/setInterval|setTimeout|diff|merge/i);
    }
  });
});
