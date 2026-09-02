/**
 * S10 lint (RFC-0000 §2.6; REVIEW-002 §7; REVIEW-003 A4): the membrane,
 * enforced — vocabulary and location. The reading lives in
 * tools/instruments/membrane.ts so the M8 instrument run and this lint
 * report the same number.
 */
import { join } from "node:path";
import { readMembrane } from "./instruments/membrane.ts";

const reading = readMembrane(join(import.meta.dir, ".."));
const violations = [...reading.vocabulary, ...reading.location];

if (violations.length > 0) {
  console.error("Vocabulary membrane violations (RFC-0000 §2.6):");
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}

const deviations = reading.exemptions.length === 0 ? "" : `; ${reading.exemptions.length} named deviation(s)`;
console.log(`lint:vocab — membrane intact (0 violations across ${reading.filesScanned} files${deviations}).`);
