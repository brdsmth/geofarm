/**
 * S10 — the vocabulary membrane, read mechanically (RFC-0000 §2.6,
 * Amendments 1 and 2; REVIEW-002 §7, §9; REVIEW-003 §6 A4).
 *
 * Two rules, both over string literals in the client packages and the
 * shell:
 *
 *   vocabulary — no internal term (entity, assertion, actor, …) may
 *   appear in user-facing copy, anywhere;
 *   location   — user-facing copy may live only in the surface package.
 *                A literal of two or more words outside it is a leak,
 *                unless its line carries a named deviation
 *                (`surface-exempt: <reason>`), which is counted, not hidden.
 *
 * Deliberately dumb: literals only, word-boundary matches, one marker.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// Internal vocabulary that must not appear in user-facing strings
// (REVIEW-002 §3 projection table, right column is what users see instead).
export const BANNED = [
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

export const EXEMPT_MARKER = "surface-exempt:";
/** A whole file of world *content* (demo records, fixtures) rather than
 * system copy: one named deviation for the file, in its header. */
export const EXEMPT_FILE_MARKER = "surface-exempt-file:";

/** Quoted literals stay on one line; template literals may span many. */
const STRING_LITERAL = /"((?:\\.|[^"\\\n])*)"|'((?:\\.|[^'\\\n])*)'|`((?:\\.|[^`\\])*)`/g;
/** Two or more words of letters in a row: copy, not a code value. */
const COPY = /[A-Za-z][A-Za-z'’]+[ \t]+[A-Za-z][A-Za-z'’]+/;

export type MembraneReading = {
  vocabulary: string[];
  location: string[];
  /** Named deviations found (each is a REVIEW-002 §3 decision, on record). */
  exemptions: string[];
  filesScanned: number;
};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== "dist" && name !== "node_modules") out.push(...walk(path));
    } else if (/\.(ts|tsx|html)$/.test(name)) out.push(path);
  }
  return out;
}

/** The text a person would read: interpolations and markup removed. */
function copyText(literal: string): string {
  return literal.replace(/\$\{[^}]*\}/g, " ").replace(/<[^>]*>/g, " ");
}

/** Comments are not copy: blank them out, keeping every index in place
 * so lines and markers still resolve. Trailing `//` comments stay —
 * that is where a named deviation lives. */
function blankComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/^([ \t]*)\/\/.*$/gm, (m) => m.replace(/[^\n]/g, " "));
}

function lineOf(source: string, index: number): string {
  const start = source.lastIndexOf("\n", index) + 1;
  const end = source.indexOf("\n", index);
  return source.slice(start, end === -1 ? source.length : end);
}

export function readMembrane(root: string): MembraneReading {
  const roots = [join(root, "packages", "client"), join(root, "apps")];
  const surfaceDir = join(root, "packages", "client", "surface");
  const reading: MembraneReading = { vocabulary: [], location: [], exemptions: [], filesScanned: 0 };

  for (const file of roots.flatMap((r) => walk(r))) {
    // Tests are developer-facing, not product copy.
    if (/\.test\.tsx?$/.test(file)) continue;
    reading.filesScanned++;
    const rel = relative(root, file);
    const source = readFileSync(file, "utf8");
    const inSurface = file.startsWith(surfaceDir);

    if (file.endsWith(".html")) {
      // Markup carries no copy: text nodes and copy-bearing attributes
      // must be empty, filled from the surface package by the shell.
      const body = source.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<title>[^<]*<\/title>/g, "");
      for (const m of body.matchAll(/>([^<]+)</g)) {
        if (COPY.test(m[1] ?? "")) reading.location.push(`${rel}: text "${(m[1] ?? "").trim()}"`);
      }
      for (const m of body.matchAll(/\b(placeholder|aria-label|title|alt)="([^"]*)"/g)) {
        if (COPY.test(m[2] ?? "")) reading.location.push(`${rel}: ${m[1]}="${m[2]}"`);
      }
      continue;
    }

    const head = source.split("\n").slice(0, 12).join("\n");
    const fileExempt = head.includes(EXEMPT_FILE_MARKER);
    if (fileExempt) {
      reading.exemptions.push(
        `${rel}: whole file — ${head.slice(head.indexOf(EXEMPT_FILE_MARKER) + EXEMPT_FILE_MARKER.length).split("\n")[0]?.trim()}`,
      );
    }
    const code = blankComments(source);
    for (const match of code.matchAll(STRING_LITERAL)) {
      const literal = match[1] ?? match[2] ?? match[3] ?? "";
      // Package self-identifiers are internal wiring, not user-facing copy.
      if (literal.startsWith("@geofarm/")) continue;
      const line = lineOf(source, match.index ?? 0);
      const text = copyText(literal);

      // Vocabulary: everywhere, including the surface package itself.
      if (text.includes(" ")) {
        for (const term of BANNED) {
          const word = new RegExp(`\\b${term.replace(/[-\s]/g, "[-\\s]")}\\b`, "i");
          if (word.test(text)) reading.vocabulary.push(`${rel}: "${literal}" contains internal term "${term}"`);
        }
      }

      // Location: copy outside the surface package.
      if (inSurface || fileExempt || !COPY.test(text)) continue;
      if (line.includes(EXEMPT_MARKER)) {
        reading.exemptions.push(`${rel}: "${literal.slice(0, 40)}" — ${line.slice(line.indexOf(EXEMPT_MARKER) + EXEMPT_MARKER.length).trim()}`);
        continue;
      }
      reading.location.push(`${rel}: "${literal.slice(0, 60)}" is copy outside the surface package`);
    }
  }
  return reading;
}
