/**
 * Read every instrument (P-46; RFC-0016 §4, §8): S1–S10 over the demo
 * world, the fixture worlds, and the source tree. Prints the readings the
 * MVP review consumes. Thresholds are the review's, not this script's.
 *
 *   bun tools/instruments/read.ts
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { seedWorld, NOW } from "../../apps/web/src/seed.ts";
import { Session } from "../../packages/client/interaction/index.ts";
import { MemoryPersistence, PendingStore } from "../../packages/client/stores/index.ts";
import { AskEngagement, viewerStores } from "../../packages/agent/index.ts";
import { RuleReasoner } from "../../packages/agent/reasoner.ts";
import { bitemporalDivergence, grantShape, promotionRate, structural } from "./index.ts";
import { readMembrane } from "./membrane.ts";
import { readGrower, violationsOf } from "./grower.ts";

const root = join(import.meta.dir, "..", "..");

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

function sources(): { path: string; text: string }[] {
  const files: { path: string; text: string }[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|html)$/.test(name)) files.push({ path: relative(root, p), text: readFileSync(p, "utf8") });
    }
  };
  walk(join(root, "packages"));
  walk(join(root, "apps"));
  return files;
}

const world = await seedWorld(fakeStorage());
const all = (await world.journal.walkFrom(0, 100_000)).records;
const [you, , maria] = world.people as [string, string, string];

// S9(b): every field asked about once, by the owner and by the agronomist;
// nothing promoted — the demo baseline for the rate, read honestly as zero.
const engagements: { offered: number; promoted: number }[] = [];
for (const viewer of [you, maria]) {
  const s = new Session(viewer, world.boundary, new PendingStore(new MemoryPersistence()), NOW);
  await s.sync();
  const e = new AskEngagement(world.boundary, world.assistant, new RuleReasoner(), viewerStores(s), world.org);
  for (const field of s.reading.all().filter((r) => r.classification === "field")) {
    s.select([field.id]);
    await e.ask("what's the standing read here?");
  }
  engagements.push({ offered: e.offered, promoted: e.promoted });
}

const s = structural(sources());
const membrane = readMembrane(root);
const grower = readGrower(root);
const divergence = bitemporalDivergence(all);
const shape = grantShape(all);
const promotion = promotionRate(engagements, all, [world.assistant]);

const out = {
  world: { records: all.length, asOf: NOW },
  S1_destinations: s.destinations,
  S2_stores: s.stores,
  S5_auditSymbols: s.auditSymbols,
  S9_bitemporalDivergence: {
    total: divergence.total,
    diverging: divergence.diverging,
    rate: Number(divergence.rate.toFixed(3)),
    learnedLate: divergence.learnedLate,
    knownBeforeOccurring: divergence.knownBeforeOccurring,
    byClassification: divergence.byClassification,
  },
  S9_promotion: promotion,
  S9_grantShape: shape,
  S10_membrane: {
    vocabularyLeaks: membrane.vocabulary.length,
    locationLeaks: membrane.location.length,
    namedDeviations: membrane.exemptions,
    filesScanned: membrane.filesScanned,
  },
  // S11 (docs/GROWER-RULES.md): states without words, and the rest a
  // grep can hold. Target zero; named deviations counted, not hidden.
  S11_growerRules: {
    violations: violationsOf(grower),
    copy: { strings: grower.copy.keys, orphans: grower.copy.orphans.length, pending: grower.copy.pending },
    style: { tokens: grower.style.tokens, violations: grower.style.violations.length },
    attempt: { calls: grower.attempt.calls, bare: grower.attempt.bare.length, exemptions: grower.attempt.exemptions },
    legend: { colours: grower.legend.keys, unnamed: grower.legend.unnamed.length },
    filesScanned: grower.filesScanned,
  },
};
console.log(JSON.stringify(out, null, 2));
