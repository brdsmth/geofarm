/**
 * The shell's world (apps/web/src/seed.ts): seeded once, restored from the
 * device thereafter, with the M6 cast and the P0/P1 content the slice
 * needs — checked headlessly, since the map itself needs a GPU.
 */
import { describe, expect, test } from "bun:test";
import { AGRONOMY, NOW, seedWorld } from "../apps/web/src/seed.ts";
import { Session } from "../packages/client/interaction/index.ts";
import { MemoryPersistence, PendingStore } from "../packages/client/stores/index.ts";
import { AskEngagement, viewerStores } from "../packages/agent/index.ts";
import { RuleReasoner } from "../packages/agent/reasoner.ts";

function fakeStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k: string) => m.get(k) ?? null,
    key: (i: number) => [...m.keys()][i] ?? null,
    removeItem: (k: string) => void m.delete(k),
    setItem: (k: string, v: string) => void m.set(k, v),
  } as Storage;
}

describe("the demo world", () => {
  test("seeds once, then restores the same history from the device", async () => {
    const storage = fakeStorage();
    const first = await seedWorld(storage);
    const head = await first.journal.head();
    expect(head).toBeGreaterThan(30);
    // A note added today is remembered tomorrow.
    const you = first.people[0] as string;
    const s = new Session(you, first.boundary, new PendingStore(new MemoryPersistence()), NOW);
    await s.sync();
    const creek = s.reading.all().find((r) => (r.body as { name?: string })?.name === "Creek Field");
    s.select([creek!.id]);
    s.commit(s.annotate("note", { text: "remembered across reloads" }, NOW));
    expect((await s.send()).admitted).toBe(1);

    const second = await seedWorld(storage);
    expect(await second.journal.head()).toBe(head + 1);
    expect(second.people).toEqual(first.people); // stable identities
    const s2 = new Session(you, second.boundary, new PendingStore(new MemoryPersistence()), NOW);
    await s2.sync();
    expect(s2.reading.all().some((r) => (r.body as { text?: string })?.text === "remembered across reloads")).toBe(true);
    // Forgetting reseeds.
    second.reset();
    const third = await seedWorld(storage);
    expect(await third.journal.head()).toBe(head);
  });

  test("the cast: members see the books, the agronomist does not, and the assistant never discusses them", async () => {
    const world = await seedWorld(fakeStorage());
    const [you, sam, maria] = world.people as [string, string, string];
    const open = async (actor: string) => {
      const s = new Session(actor, world.boundary, new PendingStore(new MemoryPersistence()), NOW);
      await s.sync();
      return s;
    };
    const owner = await open(you);
    const operator = await open(sam);
    const agronomist = await open(maria);
    const books = (s: Session) => s.reading.all().filter((r) => r.classification === "invoice" || r.classification === "lien");
    expect(books(owner).length).toBe(2);
    expect(books(operator).length).toBe(2);
    expect(books(agronomist).length).toBe(0);
    expect(agronomist.chain.onBehalfOf).toEqual([world.org]);
    expect(agronomist.reading.all().some((r) => r.classification === "field")).toBe(true);
    // Plantings carry their crop for the state-of-the-farm colouring.
    const plantings = owner.reading.all().filter((r) => r.classification === "planting");
    expect(plantings.every((r) => typeof (r.body as { crop?: string }).crop === "string")).toBe(true);
    // Everyone can put a name to every signature they can see.
    for (const r of agronomist.reading.all()) {
      const who = agronomist.reading.get(r.actors.actor);
      expect(who?.kind).toBe("actor");
    }
    // The owner's shares list the engagement, predicate-shaped.
    const share = owner.shares().find((s) => s.grant.grantee === maria);
    expect(share?.grant.scope.classifications).toEqual(AGRONOMY);
    // The assistant, asked by the agronomist about the bottom field: no lien.
    const bottom = agronomist.reading.all().find((r) => (r.body as { name?: string })?.name === "River Bottom");
    agronomist.select([bottom!.id]);
    const e = new AskEngagement(world.boundary, world.assistant, new RuleReasoner(), viewerStores(agronomist), world.org);
    const replies = await e.ask("anything here?");
    expect(JSON.stringify(replies)).not.toMatch(/First Ag Bank|lien/i);
  });
});
