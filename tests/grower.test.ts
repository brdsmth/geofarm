/**
 * S11 — the Grower Rules, read over the tree and over fixtures: the lint
 * that guards the shell must itself fail on the shapes it exists to catch.
 */
import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { readAttempt, readCopy, readGrower, readLegend, readStyle, surfaceKeys, violationsOf } from "../tools/instruments/grower.ts";

const root = join(import.meta.dir, "..");

describe("the Grower Rules over the tree", () => {
  test("S11: zero violations, every deviation named", () => {
    const r = readGrower(root);
    expect(violationsOf(r)).toEqual([]);
    for (const p of r.copy.pending) expect(p).toContain(" — ");
    for (const e of r.attempt.exemptions) expect(e).toContain(" — ");
    expect(r.copy.keys).toBeGreaterThan(50);
    expect(r.legend.keys).toBeGreaterThan(5);
  });
});

describe("the Grower Rules over fixtures", () => {
  const surface = [
    "/** Greeting. */",
    "export const hello = {",
    "  shown: \"Shown on screen\",",
    "  lost: \"Never shown\",",
    "  /** copy-pending: waits for the door */",
    "  later: \"Shown later\",",
    "};",
    "",
    "export const kinds: Record<string, string> = {",
    "  farm: \"Farm line\",",
    "};",
  ].join("\n");

  test("copy: an orphaned string fails; a pending one is counted", () => {
    const keys = surfaceKeys(surface);
    expect(keys.map((k) => k.key)).toEqual(["hello.shown", "hello.lost", "hello.later"]);
    const r = readCopy(
      [
        { path: "packages/client/surface/index.ts", text: surface },
        { path: "apps/web/src/main.ts", text: 'import { hello as copy } from "../../../packages/client/surface/index.ts";\nel.textContent = copy.shown;' },
      ],
      "packages/client/surface/index.ts",
    );
    expect(r.orphans).toEqual(["hello.lost"]);
    expect(r.pending).toEqual(["hello.later — waits for the door"]);
  });

  test("style: tiny type, raw colour, and a bare outline: none all fail", () => {
    const css = ":root {\n  --ink: #fff;\n}\n.a { font-size: 10px; color: #abc; outline: none; }\n";
    const r = readStyle([{ path: "apps/web/src/app.css", text: css }]);
    expect(r.violations.length).toBe(3);
    expect(r.violations[0]).toContain("10px");
    expect(r.violations[1]).toContain("#abc");
    expect(r.violations[2]).toContain("focus-visible");
    const ok = ":root {\n  --ink: #fff;\n}\n.a { font-size: 12px; color: var(--ink); }\n:focus-visible { outline: 2px solid var(--ink); }\n";
    expect(readStyle([{ path: "apps/web/src/app.css", text: ok }]).violations).toEqual([]);
  });

  test("attempt: a network verb outside attempt() fails; inside or exempt passes", () => {
    const bare = "void session.send().then(paint);";
    const inside = "void attempt(box, btn, async () => {\n  const r = await session.send();\n  return r;\n});";
    const exempt = "const r = await fetch(url); // attempt-exempt: boot, the banner is the failure state";
    const r = readAttempt([{ path: "apps/web/src/main.ts", text: `${bare}\n${inside}\n${exempt}\n` }]);
    expect(r.calls).toBe(3);
    expect(r.bare.length).toBe(1);
    expect(r.bare[0]).toContain("main.ts:1");
    expect(r.exemptions.length).toBe(1);
  });

  test("legend: a colour with no name fails, and a name with no colour fails", () => {
    const map = 'const CROP_COLOR: Record<string, string> = {\n  corn: "#f2c14e",\n  rye: "#000",\n};\nconst GROUP_COLOR: Record<string, string> = {\n  claim: "#c792ea",\n};';
    const surface = 'export const legend: Record<string, string> = {\n  corn: "Corn",\n  claim: "Answers",\n  ghost: "Nothing",\n};';
    const r = readLegend([
      { path: "apps/web/src/map.ts", text: map },
      { path: "packages/client/surface/index.ts", text: surface },
    ]);
    expect(r.unnamed.length).toBe(1);
    expect(r.unnamed[0]).toContain("rye");
    expect(r.unused.length).toBe(1);
    expect(r.unused[0]).toContain("ghost");
  });
});
