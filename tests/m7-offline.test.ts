/**
 * M7 — the field day (P-42..P-44).
 *
 * RFC-0012 §5: offline is not a mode. A device in a dead zone holds an
 * honestly stale Reading; what it authors is late-arriving knowledge;
 * reconnection is Append + Project; concurrent supersessions degrade to
 * preserved disagreement; capability evaluation lags the walk, visibly.
 * RFC-0014 §1: Pending is the only fragile store and must survive process
 * death and the app being replaced under it. RFC-0016 H2, S3, S9(a).
 *
 * The build cost of this milestone is itself the measurement (P-44):
 * see the roadmap leaf for the count of offline-specific lines.
 */
import { describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { newId, type AdmittedRecord, type Id } from "../packages/world/index.ts";
import { Boundary } from "../packages/boundary/index.ts";
import { Session, type BoundaryPort } from "../packages/client/interaction/index.ts";
import {
  FilePersistence,
  PENDING_FORMAT,
  PendingFormatTooNew,
  PendingStore,
  StoragePersistence,
  migratePending,
} from "../packages/client/stores/index.ts";
import { freshness, work } from "../packages/client/surface/index.ts";
import { actorIntro, farmWorld, grantRecord, westGeom } from "../packages/projection/fixtures.ts";
import { bitemporalDivergence } from "../tools/instruments/index.ts";

const NOW = "2026-07-01T00:00:00Z";

/** The radio: the same door, sometimes unreachable. Not a mode — a gap. */
class Radio implements BoundaryPort {
  signal = true;
  constructor(private readonly inner: Boundary) {}
  private up(): Boundary {
    if (!this.signal) throw new Error("no signal");
    return this.inner;
  }
  walk(...args: Parameters<Boundary["walk"]>) {
    return this.up().walk(...args);
  }
  append(...args: Parameters<Boundary["append"]>) {
    return this.up().append(...args);
  }
  project(...args: Parameters<Boundary["project"]>) {
    return this.up().project(...args);
  }
}

async function fieldDay() {
  // The world's clock runs on the evening of the field day: everything
  // admitted at reconnection is known after it occurred.
  const world = await farmWorld({ clockFrom: "2026-07-01T18:00:00Z" });
  const boundary = new Boundary(world.journal);
  const scout = newId();
  await world.journal.admit(actorIntro(scout));
  await world.journal.admit(
    grantRecord(world.org, { grantee: scout, scope: {}, capabilities: ["represent"] }),
  );
  const radio = new Radio(boundary);
  const pendingPath = join(mkdtempSync(join(tmpdir(), "geofarm-")), "pending.json");
  const open = () => new Session(scout, radio, new PendingStore(new FilePersistence(pendingPath)), NOW);
  return { ...world, boundary, radio, scout, pendingPath, open };
}

describe("P-42 — a full day offline, reconnected as Append + Project (H2)", () => {
  test("record, draft, correct, queue; die; return; nothing merged, everything late-arriving", async () => {
    const { journal, radio, west, org, open } = await fieldDay();

    // 06:14 — in the yard, in signal: the day's last walk.
    const morning = open();
    await morning.sync();
    const K = morning.reading.watermark;
    const knownAt = morning.knownAsOf() as string;
    expect(freshness.upToDateAsOf(knownAt)).toContain(knownAt);

    // The radio dies. The Reading is what it is: true as of K.
    radio.signal = false;
    expect(morning.reading.watermark).toBe(K);
    expect(morning.chain.onBehalfOf).toEqual([org]); // known as of K, honestly

    // 09:10 — a wet corner circled and kept as a zone (W1, offline).
    morning.select([west.id]);
    const corner = morning.draw(
      { form: "area", rings: [[[-93.2, 41.5], [-93.18, 41.5], [-93.18, 41.52], [-93.2, 41.52], [-93.2, 41.5]]] },
      "2026-07-01T09:10:00Z",
    );
    morning.commit(morning.promote(corner, { kind: "entity", classification: "zone", body: { name: "wet corner" } }) as Id);
    // 11:00, 14:30 — two notes with field time (H1, offline).
    morning.commit(morning.annotate("note", { text: "standing water, north end" }, "2026-07-01T11:00:00Z"));
    morning.commit(morning.annotate("note", { text: "aphids on the headland" }, "2026-07-01T14:30:00Z"));
    // 16:00 — the west line redrawn (W2, offline): correction is addition.
    const redraw = morning.draw(
      { form: "area", rings: [[[-93.2, 41.5], [-93.14, 41.5], [-93.14, 41.55], [-93.2, 41.55], [-93.2, 41.5]]] },
      "2026-07-01T16:00:00Z",
    );
    morning.commit(morning.correct(redraw, west.id, "2026-07-01T16:00:00Z") as Id);

    // Sending in a dead zone defers; nothing is lost, nothing pretends.
    const attempt = await morning.send();
    expect(attempt).toEqual({ admitted: 0, rejected: [], deferred: 4 });
    expect(work.waitingToSend(4)).toBe("4 records waiting to send");
    expect(await journal.head()).toBe(K); // the world heard nothing

    // The phone dies in the truck. A new process opens the same store.
    const evening = open();
    expect(evening.pending.submissions.length).toBe(4);
    expect(evening.reading.watermark).toBe(0); // the Reading is disposable; re-project

    // Back in signal: two ordinary acts. Append the outbox...
    radio.signal = true;
    const sent = await evening.send();
    expect(sent).toEqual({ admitted: 4, rejected: [], deferred: 0 });
    // ...and Project from the old watermark: exactly the deltas.
    await evening.sync();
    const delta = evening.reading.all().filter((r) => r.seq > K);
    expect(delta.length).toBe(4);
    // Late-arriving knowledge (RFC-0004 §1): occurrence from the field,
    // knowledge from admission — every record diverges, by design.
    for (const r of delta) {
      expect(Date.parse(r.knowledgeTime)).toBeGreaterThan(Date.parse(r.occurrence.start));
      expect(r.actors).toEqual({ actor: evening.actor, onBehalfOf: [org] });
    }
    const divergence = bitemporalDivergence(delta, 60 * 60 * 1000);
    expect(divergence.learnedLate).toBe(4);

    // The correction stands; the prior line is history, not gone (W2).
    evening.navigateTime({ start: "2026-07-02T00:00:00Z" }); // look at the day's end
    const bundle = evening.inspect(west.id);
    expect(bundle?.standing?.id).not.toBe(west.id);
    expect(bundle?.standing?.supersedes).toBe(west.id);
    expect(bundle?.contenders).toEqual([]);
    expect(evening.reading.get(west.id)).toBeDefined();
  });

  test("the one true race: concurrent corrections degrade to preserved disagreement", async () => {
    const { journal, boundary, radio, owner, west, open } = await fieldDay();
    const scout = open();
    await scout.sync();
    radio.signal = false;

    // Offline, the scout redraws the west line...
    const g = scout.draw(
      { form: "area", rings: [[[-93.2, 41.5], [-93.16, 41.5], [-93.16, 41.55], [-93.2, 41.55], [-93.2, 41.5]]] },
      "2026-07-01T10:00:00Z",
    );
    scout.commit(scout.correct(g, west.id, "2026-07-01T10:00:00Z") as Id);

    // ...while, in signal, the owner corrects it differently.
    const ownerFix = await boundary.append(owner, {
      id: newId(),
      kind: "entity",
      classification: "field",
      actors: { actor: owner, onBehalfOf: [(await journal.get(west.id))!.actors.onBehalfOf[0] as Id] },
      occurrence: { start: "2026-07-01T11:00:00Z" },
      geometry: westGeom,
      subjects: [],
      supersedes: west.id,
      body: { note: "resurveyed" },
    });
    expect(ownerFix.accepted).toBe(true);

    // Reconnection: no merge step exists. Two appends; both stand.
    radio.signal = true;
    expect((await scout.send()).admitted).toBe(1);
    await scout.sync();
    const heads = (await boundary.project(owner, { read: { form: "heads", id: west.id } })) as AdmittedRecord[];
    expect(heads.length).toBe(2);
    // Visible on the scout's own surface, too: two contenders, no winner.
    scout.navigateTime({ start: "2026-07-02T00:00:00Z" });
    const bundle = scout.inspect(west.id);
    expect(bundle?.contenders.length).toBe(2);
    // The map shows both lines — a fork is honest, not corrupt.
    scout.reveal({ name: "fields", filter: { classifications: ["field"] }, visible: true });
    const westMarks = scout.marks().filter((m) => heads.some((h) => h.id === m.presents[0]));
    expect(westMarks.length).toBe(2);

    // Resolution is authorship: whoever next reconciles supersedes one
    // head and retracts the other. Two appends; nothing else exists.
    const scoutHead = heads.find((h) => h.actors.actor === scout.actor) as AdmittedRecord;
    const ownerHead = heads.find((h) => h.actors.actor === owner) as AdmittedRecord;
    const chain = { actor: owner, onBehalfOf: ownerHead.actors.onBehalfOf };
    const reconciled = await boundary.append(owner, {
      id: newId(),
      kind: "entity",
      classification: "field",
      actors: chain,
      occurrence: { start: "2026-07-02T08:00:00Z" },
      geometry: scoutHead.geometry as NonNullable<AdmittedRecord["geometry"]>,
      subjects: [],
      supersedes: ownerHead.id,
      body: { note: "walked it together; the scout's line holds" },
    });
    const retracted = await boundary.append(owner, {
      id: newId(),
      kind: "event",
      classification: "retraction",
      actors: chain,
      occurrence: { start: "2026-07-02T08:00:00Z" },
      subjects: [scoutHead.id],
      retracts: scoutHead.id,
      body: { reason: "folded into the reconciled line" },
    });
    expect(reconciled.accepted && retracted.accepted).toBe(true);
    await scout.sync();
    const after = (await boundary.project(owner, { read: { form: "heads", id: west.id } })) as AdmittedRecord[];
    expect(after.length).toBe(1);
    // At the day's end the fork still stood (a true frame); once the
    // reconciliation has happened, the surface agrees with the door.
    expect(scout.inspect(west.id)?.contenders.length).toBe(2);
    scout.navigateTime({ start: "2026-07-02T12:00:00Z" });
    expect(scout.inspect(west.id)?.contenders).toEqual([]);
    expect(scout.inspect(west.id)?.standing?.id).toBe(reconciled.accepted ? reconciled.record.id : "");
  });

  test("enforcement lags knowledge, bounded and visible (RFC-0012 §5)", async () => {
    const { journal, radio, org, west, open } = await fieldDay();
    const scout = open();
    await scout.sync();
    radio.signal = false;

    // The farm ends the scout's engagement while the radio is off.
    const grant = (await journal.walkFrom(0, 10_000)).records.find(
      (r) => r.classification === "grant" && (r.body as { grantee?: Id }).grantee === scout.actor,
    ) as AdmittedRecord;
    await journal.admit({
      ...grantRecord(org, { grantee: scout.actor, scope: {}, capabilities: [] }),
      supersedes: grant.id,
    });

    // The device cannot hear it: it still believes itself a member — as of
    // its watermark, which it knows and can say.
    expect(scout.chain.onBehalfOf).toEqual([org]);
    const revocation = await journal.walkFrom(await journal.head() - 1);
    expect(scout.knownAsOf() as string < (revocation.records[0] as AdmittedRecord).knowledgeTime).toBe(true);
    scout.select([west.id]);
    scout.commit(scout.annotate("note", { text: "written after the fact" }, "2026-07-01T15:00:00Z"));

    // At the next walk, the door refuses what the device could not know
    // it may no longer do — kept in Pending with the reason, never lost.
    radio.signal = true;
    const sent = await scout.send();
    expect(sent.admitted).toBe(0);
    expect(sent.rejected.length).toBe(1);
    expect(scout.pending.submissions.length).toBe(1);
    await scout.sync();
    expect(scout.chain.onBehalfOf).toEqual([]); // now it knows
  });
});

describe("P-43 — Pending survives the app being replaced under it", () => {
  test("an unversioned M3 store migrates forward; a newer one is refused, not guessed at", () => {
    const dir = mkdtempSync(join(tmpdir(), "geofarm-"));
    const path = join(dir, "pending.json");
    const draft = {
      id: newId(),
      kind: "event" as const,
      classification: "note",
      actors: { actor: "scout", onBehalfOf: [] },
      occurrence: { start: "2026-07-10T09:00:00Z" },
      subjects: [],
      body: { text: "written before the upgrade" },
    };
    // What the M3 build wrote: no format marker.
    writeFileSync(path, JSON.stringify({ gestures: [], drafts: [], submissions: [draft] }));
    const upgraded = new PendingStore(new FilePersistence(path));
    expect(upgraded.format).toBe(PENDING_FORMAT);
    expect(upgraded.submissions[0]?.body).toEqual({ text: "written before the upgrade" });
    // Rewritten in the current format on open, so the next open is plain.
    expect((JSON.parse(readFileSync(path, "utf8")) as { format: number }).format).toBe(PENDING_FORMAT);

    // A store from a future build: refuse rather than misread a day's work.
    writeFileSync(path, JSON.stringify({ format: PENDING_FORMAT + 1, submissions: [draft] }));
    expect(() => new PendingStore(new FilePersistence(path))).toThrow(PendingFormatTooNew);
    expect(() => migratePending({ format: 99 })).toThrow(/newer/);
    // Garbage is an empty store, not a crash: the outbox starts clean.
    expect(migratePending("not json shaped").submissions).toEqual([]);
  });

  test("Web Storage persistence: durable when the browser allows, honest when it does not", () => {
    const backing = new Map<string, string>();
    const storage = { getItem: (k: string) => backing.get(k) ?? null, setItem: (k: string, v: string) => void backing.set(k, v) };
    const a = new PendingStore(new StoragePersistence("pending:scout", storage));
    a.addGesture({ id: "g", geometry: { form: "position", coordinates: [-93.1, 41.5] }, at: NOW });
    const b = new PendingStore(new StoragePersistence("pending:scout", storage));
    expect(b.gestures.length).toBe(1);
    expect(new StoragePersistence("pending:scout", storage).durable).toBe(true);
    // Two people, one phone: outboxes are keyed per Actor.
    expect(new PendingStore(new StoragePersistence("pending:owner", storage)).gestures.length).toBe(0);
    // A browser that refuses storage: still a working store, not durable, and says so.
    const refusing = {
      getItem: (): string | null => { throw new Error("SecurityError"); },
      setItem: (): void => { throw new Error("SecurityError"); },
    };
    const p = new StoragePersistence("pending:x", refusing);
    expect(p.durable).toBe(false);
    const c = new PendingStore(p);
    c.addGesture({ id: "g", geometry: { form: "position", coordinates: [-93.1, 41.5] }, at: NOW });
    expect(c.gestures.length).toBe(1);
  });
});

describe("S3 — the walk is enough: no merge machinery anywhere", () => {
  test("no diff engine, conflict resolver, or merge step exists in client, boundary, or journal", () => {
    const root = join(import.meta.dir, "..", "packages");
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) files.push(p);
      }
    };
    for (const pkg of ["client", "boundary", "journal"]) walk(join(root, pkg));
    for (const f of files) {
      const source = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""); // code, not comments
      expect(source).not.toMatch(/\b(merge|reconcile|resolveConflict|diff)\w*\s*\(/);
      expect(source).not.toMatch(/\b(sync|offline)Mode\b/i);
    }
  });
});
