/**
 * Read the instruments over a *lived* log (REVIEW-004 §7–8: "run the
 * first live season with the instruments on"): S9 over the journal a
 * server has been keeping — the numbers the next review is owed.
 *
 *   GEOFARM_PG_URL=postgres://… bun tools/instruments/read-live.ts
 */
import { Journal } from "../../packages/journal/index.ts";
import { PostgresStore } from "../../packages/journal/store-postgres.ts";
import { CAST } from "../../apps/web/src/seed.ts";
import { bitemporalDivergence, grantShape, promotionRate } from "./index.ts";

const url = process.env.GEOFARM_PG_URL;
if (url === undefined) {
  console.error("set GEOFARM_PG_URL to the journal's store");
  process.exit(2);
}
const store = await PostgresStore.open(url);
const journal = new Journal(store);
const all = (await journal.walkFrom(0, Number.MAX_SAFE_INTEGER)).records;
await store.close();

const first = all[0];
const last = all[all.length - 1];
console.log(`log: ${all.length} records, watermark ${last?.seq ?? 0}`);
if (first !== undefined && last !== undefined) console.log(`known from ${first.knowledgeTime} to ${last.knowledgeTime}`);

const byClass = new Map<string, number>();
for (const r of all) byClass.set(r.classification, (byClass.get(r.classification) ?? 0) + 1);
console.log("\nby classification:");
for (const [c, n] of [...byClass.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${c.padEnd(18)} ${n}`);

const d = bitemporalDivergence(all);
console.log(`\nS9(a) bitemporal divergence: ${d.diverging}/${d.total} (${(d.rate * 100).toFixed(1)}%) — ${d.learnedLate} learned late, ${d.knownBeforeOccurring} known before occurring`);
for (const [c, b] of Object.entries(d.byClassification)) console.log(`  ${c.padEnd(18)} ${b.diverging}/${b.total}`);

const p = promotionRate([], all, [CAST.assistant]);
console.log(`\nS9(b) promotion: offered/kept are counted by engagements (per session); recorded AI claims in the log:`);
for (const [c, n] of Object.entries(p.recorded)) console.log(`  ${c.padEnd(18)} ${n}`);
if (Object.keys(p.recorded).length === 0) console.log("  none yet");

const g = grantShape(all);
console.log(`\nS9(c) grant shape: ${g.total} standing — predicate ${g.byShape.predicate}, universal ${g.byShape.universal}, identity ${g.byShape.identity}, mixed ${g.byShape.mixed}; revocations ${g.revocations}`);
