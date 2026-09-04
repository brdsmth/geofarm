/**
 * S11 lint (docs/GROWER-RULES.md): the Grower Rules that a grep can hold
 * — orphaned copy, tiny type and raw colour, bare network calls, and
 * colours with no legend. The reading lives in tools/instruments/grower.ts
 * so the instrument run and this lint report the same numbers.
 */
import { join } from "node:path";
import { readGrower, violationsOf } from "./instruments/grower.ts";

const reading = readGrower(join(import.meta.dir, ".."));
const violations = violationsOf(reading);

if (violations.length > 0) {
  console.error("Grower Rule violations (docs/GROWER-RULES.md):");
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}

const named = reading.copy.pending.length + reading.attempt.exemptions.length;
console.log(
  `lint:grower — rules hold (0 violations across ${reading.filesScanned} files: ` +
    `${reading.copy.keys} strings on screen, ${reading.style.tokens} colour tokens, ` +
    `${reading.attempt.calls} network calls, ${reading.legend.keys} colours named` +
    (named === 0 ? "" : `; ${named} named deviation(s)`) +
    ").",
);
