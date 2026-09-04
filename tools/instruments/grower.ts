/**
 * S11 — the Grower Rules, read mechanically (docs/GROWER-RULES.md).
 *
 * Four readings over the shell's source, each deliberately dumb, in the
 * style of the membrane (membrane.ts): a check that can fail with a file
 * and a line, never a judgment.
 *
 *   copy    — no orphaned copy (Rule 3): every string the surface package
 *             offers is shown somewhere in the client, or carries a
 *             `copy-pending: <reason>` comment naming why not yet.
 *   style   — readable in the cab (Rules 4, 10): no font-size under 12px,
 *             no raw colour outside the :root token block, and
 *             `outline: none` only beside a :focus-visible rule.
 *   attempt — every wait and failure has words (Rule 3): the network
 *             verbs are called only inside attempt(), the one helper that
 *             says "waiting" and "couldn't", or on a line that names its
 *             deviation with `attempt-exempt: <reason>`.
 *   legend  — colour never carries meaning alone (Rule 5): the colour
 *             tables in the map and the legend in the surface package
 *             name the same keys.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export type Source = { path: string; text: string };

export function walk(dir: string, root: string): Source[] {
  const out: Source[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name !== "dist" && name !== "node_modules") out.push(...walk(path, root));
    } else if (/\.(ts|tsx|html|css)$/.test(name)) {
      out.push({ path: relative(root, path), text: readFileSync(path, "utf8") });
    }
  }
  return out;
}

export function clientSources(root: string): Source[] {
  return [...walk(join(root, "packages", "client"), root), ...walk(join(root, "apps"), root)].filter(
    (s) => !/\.test\.tsx?$/.test(s.path),
  );
}

// ------------------------------------------------------------------ copy

export const COPY_PENDING = "copy-pending:";

export type CopyReading = {
  /** Every dotted key the surface package offers. */
  keys: number;
  /** Keys shown nowhere and not named as pending: the violations. */
  orphans: string[];
  /** Keys shown nowhere but named as pending, with the reason. */
  pending: string[];
};

function lineOf(text: string, index: number): string {
  const start = text.lastIndexOf("\n", index) + 1;
  const end = text.indexOf("\n", index);
  return text.slice(start, end === -1 ? text.length : end);
}

/**
 * The surface package's top-level keys, group by group. Dynamic tables
 * (`Record<...>` exports such as `kinds` and `crops`) are looked up by
 * value at run time and cannot be found by name; they are the legend
 * reading's business, not this one's.
 */
export function surfaceKeys(surface: string): { key: string; pending: string | undefined }[] {
  const keys: { key: string; pending: string | undefined }[] = [];
  // A group's doc comment is the one directly above it: a comment that
  // does not itself contain a closing `*/`, so no match spans two.
  const groups = surface.matchAll(/(\/\*\*(?:(?!\*\/)[\s\S])*\*\/\s*)?export const (\w+)( *: *Record<[^=]*)? = \{\n([\s\S]*?)\n\};/g);
  for (const g of groups) {
    const [, docComment, name, record, body] = g;
    if (record !== undefined || body === undefined) continue;
    const groupPending = docComment?.includes(COPY_PENDING)
      ? docComment.slice(docComment.indexOf(COPY_PENDING) + COPY_PENDING.length).replace(/\s*\*\/\s*$/, "").replace(/\s*\*\s*/g, " ").trim()
      : undefined;
    let pending: string | undefined = groupPending;
    for (const line of body.split("\n")) {
      const comment = line.match(/^\s{2}(?:\/\*\*|\/\/|\*)\s*(.*)$/);
      if (comment !== null) {
        if (line.includes(COPY_PENDING)) {
          pending = line.slice(line.indexOf(COPY_PENDING) + COPY_PENDING.length).replace(/\*\/\s*$/, "").trim();
        } else if (/^\s{2}\/\*\*/.test(line) || /^\s{2}\/\//.test(line)) {
          pending = groupPending;
        }
        continue;
      }
      const key = line.match(/^\s{2}(\w+)\s*[:(]/);
      if (key !== null) keys.push({ key: `${name as string}.${key[1] as string}`, pending });
    }
  }
  return keys;
}

export function readCopy(sources: Source[], surfacePath = "packages/client/surface/index.ts"): CopyReading {
  const surface = sources.find((s) => s.path === surfacePath);
  if (surface === undefined) return { keys: 0, orphans: [`${surfacePath} not found`], pending: [] };
  const keys = surfaceKeys(surface.text);
  const client = sources.filter((s) => s.path !== surfacePath);
  // Imports may alias a group (`map as mapCopy`); every alias counts.
  const aliases = new Map<string, Set<string>>();
  for (const s of client) {
    for (const imp of s.text.matchAll(/import\s*\{([^}]*)\}\s*from\s*"[^"]*surface\/index\.ts"/g)) {
      for (const part of (imp[1] as string).split(",")) {
        const m = part.trim().match(/^(\w+)(?:\s+as\s+(\w+))?$/);
        if (m === null) continue;
        const set = aliases.get(m[1] as string) ?? new Set<string>([m[1] as string]);
        set.add(m[2] ?? (m[1] as string));
        aliases.set(m[1] as string, set);
      }
    }
  }
  const text = client.map((s) => s.text).join("\n");
  const reading: CopyReading = { keys: keys.length, orphans: [], pending: [] };
  for (const { key, pending } of keys) {
    const [group, name] = key.split(".") as [string, string];
    const names = [...(aliases.get(group) ?? new Set([group]))];
    const used = names.some((n) => new RegExp(`\\b${n}\\.${name}\\b`).test(text));
    if (used) continue;
    if (pending !== undefined) reading.pending.push(`${key} — ${pending}`);
    else reading.orphans.push(key);
  }
  return reading;
}

// ----------------------------------------------------------------- style

export const FONT_FLOOR_PX = 12;

export type StyleReading = { violations: string[]; tokens: number };

export function readStyle(sources: Source[], stylesheet = "apps/web/src/app.css"): StyleReading {
  const css = sources.find((s) => s.path === stylesheet);
  if (css === undefined) return { violations: [`${stylesheet} not found`], tokens: 0 };
  const text = css.text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  const violations: string[] = [];
  const at = (index: number): string => `${stylesheet}:${text.slice(0, index).split("\n").length}`;
  for (const m of text.matchAll(/font-size:\s*([\d.]+)px/g)) {
    if (Number(m[1]) < FONT_FLOOR_PX) violations.push(`${at(m.index ?? 0)}: font-size ${m[1]}px is under the ${FONT_FLOOR_PX}px floor`);
  }
  let tokens = 0;
  const tokenBlocks: [number, number][] = [];
  for (const m of text.matchAll(/:root[^{]*\{/g)) {
    const start = (m.index ?? 0) + m[0].length;
    const end = text.indexOf("}", start);
    tokenBlocks.push([start, end]);
    tokens += [...text.slice(start, end).matchAll(/--[\w-]+\s*:/g)].length;
  }
  const inTokens = (i: number): boolean => tokenBlocks.some(([s, e]) => i >= s && i <= e);
  // A hex colour is 3 to 8 hex digits and then not a name character:
  // `#add-note` is an id, `#abc;` is a colour.
  for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}(?![\w-])|\b(?:rgba?|hsla?)\(/g)) {
    const i = m.index ?? 0;
    if (inTokens(i)) continue;
    if (lineOf(text, i).includes("style-exempt:")) continue;
    violations.push(`${at(i)}: raw colour ${m[0]} outside the :root token block`);
  }
  if (/outline:\s*none/.test(text) && !/:focus-visible/.test(text)) {
    violations.push(`${stylesheet}: outline: none without any :focus-visible rule`);
  }
  return { violations, tokens };
}

// --------------------------------------------------------------- attempt

export const ATTEMPT_EXEMPT = "attempt-exempt:";
export const NETWORK_VERBS = /\b(session\.send|session\.sync|engagement\.ask|engagement\.promote|fetch)\(/g;

export type AttemptReading = { calls: number; bare: string[]; exemptions: string[] };

/** Inside `attempt(` means: an `attempt(` opened before this point in the
 * same file and its parentheses have not closed yet. */
function insideAttempt(text: string, index: number): boolean {
  const open = text.lastIndexOf("attempt(", index);
  if (open === -1) return false;
  let depth = 0;
  for (let i = open + "attempt".length; i < index; i++) {
    const c = text[i];
    if (c === "(") depth++;
    else if (c === ")") depth--;
  }
  return depth > 0;
}

export function readAttempt(sources: Source[], dir = "apps/web/src/"): AttemptReading {
  const reading: AttemptReading = { calls: 0, bare: [], exemptions: [] };
  for (const s of sources) {
    if (!s.path.startsWith(dir) || !s.path.endsWith(".ts")) continue;
    const text = s.text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/^([ \t]*)\/\/.*$/gm, (m) => m.replace(/[^\n]/g, " "));
    for (const m of text.matchAll(NETWORK_VERBS)) {
      const i = m.index ?? 0;
      reading.calls++;
      const line = lineOf(s.text, i);
      const where = `${s.path}:${text.slice(0, i).split("\n").length}`;
      if (line.includes(ATTEMPT_EXEMPT)) {
        reading.exemptions.push(`${where}: ${m[1]} — ${line.slice(line.indexOf(ATTEMPT_EXEMPT) + ATTEMPT_EXEMPT.length).trim()}`);
        continue;
      }
      if (!insideAttempt(text, i)) reading.bare.push(`${where}: ${m[1]}() outside attempt()`);
    }
  }
  return reading;
}

// ---------------------------------------------------------------- legend

export type LegendReading = { unnamed: string[]; unused: string[]; keys: number };

function keysOfTable(text: string, name: string): string[] {
  const m = text.match(new RegExp(`const ${name}\\s*:\\s*Record<[^=]*=\\s*\\{([\\s\\S]*?)\\n\\};`));
  if (m === null) return [];
  return [...(m[1] as string).matchAll(/^\s{2}"?([\w-]+)"?\s*:/gm)].map((k) => k[1] as string);
}

export function readLegend(
  sources: Source[],
  mapPath = "apps/web/src/map.ts",
  surfacePath = "packages/client/surface/index.ts",
): LegendReading {
  const map = sources.find((s) => s.path === mapPath)?.text ?? "";
  const surface = sources.find((s) => s.path === surfacePath)?.text ?? "";
  const colours = new Set([...keysOfTable(map, "CROP_COLOR"), ...keysOfTable(map, "GROUP_COLOR")]);
  const legend = new Set(keysOfTable(surface, "legend"));
  return {
    keys: colours.size,
    unnamed: [...colours].filter((k) => !legend.has(k)).map((k) => `${mapPath}: colour "${k}" has no legend entry`),
    unused: [...legend].filter((k) => !colours.has(k)).map((k) => `${surfacePath}: legend "${k}" names no colour`),
  };
}

// ---------------------------------------------------------------- whole

export type GrowerReading = {
  copy: CopyReading;
  style: StyleReading;
  attempt: AttemptReading;
  legend: LegendReading;
  filesScanned: number;
};

export function readGrower(root: string): GrowerReading {
  const sources = clientSources(root);
  return {
    copy: readCopy(sources),
    style: readStyle(sources),
    attempt: readAttempt(sources),
    legend: readLegend(sources),
    filesScanned: sources.length,
  };
}

export function violationsOf(r: GrowerReading): string[] {
  return [...r.copy.orphans, ...r.style.violations, ...r.attempt.bare, ...r.legend.unnamed, ...r.legend.unused];
}
