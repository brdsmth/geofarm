/**
 * S10 vocabulary-membrane lint (RFC-0000 §2.6; REVIEW-002 §7; roadmap P-28 arms it fully).
 *
 * The internal vocabulary must never cross into user-facing language. This
 * lint scans string literals in the client packages for internal terms and
 * fails the build on any hit. In M0 it is a working stub over placeholder
 * packages; M3 (P-28) points it at the real surface package as strings arrive.
 *
 * Deliberately dumb: string literals only, word-boundary matches, no
 * exemptions mechanism yet — an exemption story, if ever needed, is a
 * REVIEW-002 §3 "named deviation," not a lint config.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Internal vocabulary that must not appear in user-facing strings
// (REVIEW-002 §3 projection table, right column is what users see instead).
const BANNED = [
  "entity",
  "assertion",
  "actor",
  "scoped grant",
  "sub-world",
  "subworld",
  "watermark",
  "ontology",
  "primitive",
  "supersession",
  "bitemporal",
  "provenance",
  "digital twin",
  "capability",
  "projection engine",
  "uuid",
];

const CLIENT_ROOT = join(import.meta.dir, "..", "packages", "client");
const STRING_LITERAL = /(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g;

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (name.endsWith(".ts") || name.endsWith(".tsx")) out.push(path);
  }
  return out;
}

const violations: string[] = [];
for (const file of walk(CLIENT_ROOT)) {
  // Tests are developer-facing, not product copy.
  if (file.endsWith(".test.ts") || file.endsWith(".test.tsx")) continue;
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(STRING_LITERAL)) {
    const literal = match[2] ?? "";
    // Package self-identifiers are internal wiring, not user-facing copy.
    if (literal.startsWith("@geofarm/")) continue;
    // Single-token literals are code values (record kinds, classifications,
    // map keys) — the envelope's vocabulary, never sentences shown to
    // anyone. Copy has spaces; enum values do not.
    if (!literal.includes(" ")) continue;
    for (const term of BANNED) {
      const word = new RegExp(`\\b${term.replace(/[-\s]/g, "[-\\s]")}\\b`, "i");
      if (word.test(literal)) {
        violations.push(`${file}: "${literal}" contains internal term "${term}"`);
      }
    }
  }
}

if (violations.length > 0) {
  console.error("Vocabulary membrane violations (RFC-0000 §2.6):");
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}

console.log("lint:vocab — membrane intact (0 violations).");
