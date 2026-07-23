/**
 * M0 scaffold smoke test (roadmap P-13).
 *
 * Verifies every package of PLAN-001 §3 exists, compiles, and is importable.
 * No functionality is tested because none is specified for M0 — this test's
 * only job is to keep the workspace honest until M1 begins.
 */
import { describe, expect, test } from "bun:test";

import { PACKAGE as world } from "../packages/world/index.ts";
import { PACKAGE as journal } from "../packages/journal/index.ts";
import { PACKAGE as access } from "../packages/access/index.ts";
import { PACKAGE as projection } from "../packages/projection/index.ts";
import { PACKAGE as boundary } from "../packages/boundary/index.ts";
import { PACKAGE as feedsWeather } from "../packages/feeds/weather/index.ts";
import { PACKAGE as feedsImagery } from "../packages/feeds/imagery/index.ts";
import { PACKAGE as agent } from "../packages/agent/index.ts";
import { PACKAGE as clientStores } from "../packages/client/stores/index.ts";
import { PACKAGE as clientInteraction } from "../packages/client/interaction/index.ts";
import { PACKAGE as clientRender } from "../packages/client/render/index.ts";
import { PACKAGE as clientSurface } from "../packages/client/surface/index.ts";

const expected = [
  ["@geofarm/world", world],
  ["@geofarm/journal", journal],
  ["@geofarm/access", access],
  ["@geofarm/projection", projection],
  ["@geofarm/boundary", boundary],
  ["@geofarm/feeds-weather", feedsWeather],
  ["@geofarm/feeds-imagery", feedsImagery],
  ["@geofarm/agent", agent],
  ["@geofarm/client-stores", clientStores],
  ["@geofarm/client-interaction", clientInteraction],
  ["@geofarm/client-render", clientRender],
  ["@geofarm/client-surface", clientSurface],
] as const;

describe("PLAN-001 §3 scaffold", () => {
  test("all twelve packages are present and self-identifying", () => {
    for (const [name, actual] of expected) {
      expect(actual).toBe(name);
    }
    expect(expected.length).toBe(12);
  });
});
