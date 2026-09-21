/**
 * geofarm — the shell. One map, one View, five verbs (RFC-0006).
 * No router, no pages: destinations = 1 (S1). Everything below wires
 * gestures to Session verbs and paints marks; nothing below holds state
 * of its own beyond the three stores (RFC-0014, S2). Every word a person
 * reads comes from the surface package (RFC-0000 §2.6, Amendment 2), and
 * every wait and failure has one (docs/GROWER-RULES.md, Rule 3).
 */

import "maplibre-gl/dist/maplibre-gl.css";
import "./app.css";
import type { AdmittedRecord, Geometry, Id } from "../../../packages/world/index.ts";
import {
  assistant as assistantCopy,
  claims,
  crops,
  freshness,
  ground as groundCopy,
  kinds,
  legend,
  map as mapCopy,
  sharing,
  shell,
  sources as sourcesCopy,
  story,
  work,
} from "../../../packages/client/surface/index.ts";
import {
  AskEngagement,
  viewerStores,
  type CandidateAssertion,
  type PeelNode,
  type Reply,
} from "../../../packages/agent/index.ts";
import { RuleReasoner } from "../../../packages/agent/reasoner.ts";
import { RemoteReasoner } from "../../../packages/agent/remote.ts";
import type { Reasoner } from "../../../packages/agent/index.ts";
import { RemoteBoundary } from "../../../packages/boundary/remote.ts";
import { Session, type BoundaryPort, type SendReport } from "../../../packages/client/interaction/index.ts";
import { PendingStore, StoragePersistence } from "../../../packages/client/stores/index.ts";
import { AGRONOMY, FEED_ACTORS, NOW, WEATHER_CLASSIFICATIONS, seedWorld } from "./seed.ts";
import {
  CROP_COLOR,
  GROUP_COLOR,
  LENS_STYLE,
  boundsOf,
  createMap,
  pickableLayerIds,
  setGestureData,
  setLensData,
  toFeatureCollections,
  type Described,
  type MarkFeatureProps,
} from "./map.ts";

/** The lens stack (RFC-0005): named filters over the one world. */
const LENSES = [
  { name: "fields", filter: { classifications: ["field", "zone"] } },
  // The soil survey's mapped units: under the farm's own marks, so a
  // note or a pond is still a tap away while the soil types are showing.
  { name: "ground", filter: { classifications: ["soil-unit"] } },
  { name: "boundary", filter: { classifications: ["farm"] } },
  { name: "places", filter: { classifications: ["pond", "building", "road"] } },
  {
    name: "work",
    filter: {
      classifications: [
        "planting",
        "harvest",
        "spray",
        "note",
        "maintenance",
        "diagnosis",
        "reading",
        "anomaly",
        "advisory",
      ],
    },
  },
  // The sixth layer (S4, RFC-0016 §4): soil, added after launch touching
  // this lens definition and the seed's border config — nothing else.
  { name: "soil", filter: { classifications: ["soil-site", "soil-sample"] } },
  // The live sources (RFC-0016 L1): weather and imagery, each a lens.
  { name: "weather", filter: { classifications: WEATHER_CLASSIFICATIONS } },
  { name: "imagery", filter: { classifications: ["imagery"] } },
  { name: "office", filter: { classifications: ["invoice", "lien"] } },
];

/** The lenses a grower may switch (Grower Rule 2): the farm's own
 * fields, line, places, and work are never something to turn off, so
 * they are not switches. Each optional lens names the legend family
 * its marks belong to. */
const OPTIONAL: Record<string, string> = { ground: "ground", soil: "soil", weather: "weather", imagery: "imagery", office: "paper" };
/** Switches that start off (Grower Rule 2): a county survey's lines over
 * every field are an answer to a question, not the first screen. */
const OFF_AT_FIRST = new Set(["ground"]);
/** The mark families that are always on the map, in legend order. */
const ALWAYS_GROUPS = ["operation", "observation", "claim", "place"];

/** Colour families for marks: what kind of thing a dot is. */
const GROUP: Record<string, string> = {
  planting: "operation",
  harvest: "operation",
  spray: "operation",
  maintenance: "operation",
  note: "observation",
  "soil-sample": "observation",
  "soil-site": "soil",
  "soil-unit": "ground",
  diagnosis: "claim",
  reading: "claim",
  anomaly: "claim",
  advisory: "claim",
  invoice: "paper",
  lien: "paper",
  pond: "place",
  building: "place",
  road: "place",
  "weather-station": "weather",
  "weather-reading": "weather",
  "weather-estimate": "weather",
  forecast: "weather",
  imagery: "imagery",
};

const MONTH0 = Date.UTC(2019, 0, 1);
/** Whole months from Jan 2019 to the month of `iso`: the slider's max is today. */
const monthsUntil = (iso: string): number => {
  const d = new Date(iso);
  return (d.getUTCFullYear() - 2019) * 12 + d.getUTCMonth();
};
let MONTHS = monthsUntil(NOW);
/** "Now" for this shell: the seeded season's, or the live world's. */
let now = NOW;
const SEASON_END = "2026-11-01";
/** What this device remembers of the last good sync, for the notice
 * that says how old the screen is when the farm cannot be reached. */
const KNOWN_KEY = "geofarm-known-as-of";
const RETRY_MS = 15_000;

function monthToIso(idx: number): string {
  const d = new Date(MONTH0);
  d.setUTCMonth(d.getUTCMonth() + idx);
  return d.toISOString();
}

function monthLabel(idx: number): string {
  return new Date(monthToIso(idx)).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** A moment, as a person would say it: the time if today, else the day. */
function fmtWhen(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    : `${fmtDate(iso)} ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

/** A source's places enter dated "before our records" (the epoch): that
 * is a way of saying no date, and is never shown as one. */
const undated = (iso: string): boolean => Date.parse(iso) <= Date.UTC(1970, 0, 2);

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const text = (r: AdmittedRecord | undefined): string => {
  const body = r?.body as { text?: string; name?: string; channel?: string; value?: number } | undefined;
  if (body?.text !== undefined) return body.text;
  if (body?.name !== undefined) return body.name;
  if (body?.channel !== undefined && body.value !== undefined) {
    return shell.measured(shell.channels[body.channel] ?? body.channel, String(body.value));
  }
  return kinds[r?.classification ?? ""] ?? "";
};

const remembered = (): string | undefined => {
  try {
    return localStorage.getItem(KNOWN_KEY) ?? undefined;
  } catch {
    return undefined;
  }
};
const rememberKnown = (iso: string | undefined): void => {
  if (iso === undefined) return;
  try {
    localStorage.setItem(KNOWN_KEY, iso);
  } catch {
    // a browser that will not remember still shows the farm
  }
};

/** The one place the shell says what it cannot do (Grower Rule 3). */
const notice = (words: string | undefined): void => {
  const box = el<HTMLElement>("notice");
  box.textContent = words ?? "";
  box.hidden = words === undefined;
};

/**
 * Every wait and every failure has words (Grower Rule 3): the one helper
 * through which the shell speaks to the door and the engine. It says
 * "waiting" where the person is looking, disables the control they
 * pressed, and on a thrown fetch says "couldn't" in the same place. The
 * S11 lint holds every network verb inside this call.
 */
const attempt = async <T>(
  status: HTMLElement | undefined,
  control: HTMLButtonElement | undefined,
  words: { waiting: string; failed: string },
  run: () => Promise<T>,
): Promise<T | undefined> => {
  if (status !== undefined) {
    status.textContent = words.waiting;
    status.classList.remove("failed");
    status.hidden = false;
  }
  if (control !== undefined) control.disabled = true;
  try {
    return await run();
  } catch {
    if (status !== undefined) {
      status.textContent = words.failed;
      status.classList.add("failed");
      status.hidden = false;
    }
    return undefined;
  } finally {
    if (control !== undefined) control.disabled = false;
  }
};

/** The door's reasons in the farm's words (work.reasons); never the
 * door's own, which cite RFCs. */
const because = (report: SendReport): string => {
  const raw = report.rejected[0]?.reasons[0] ?? "";
  const known = work.reasons.find(([prefix]) => raw.includes(prefix));
  return work.because(known?.[1] ?? work.reasonUnknown);
};

/** What a shell needs of a world, wherever it is. */
type World = {
  org: Id;
  people: Id[];
  assistant: Id;
  /** The engaged sources (RFC-0011): listed as sources, never as people. */
  feeds: Id[];
  boundary: BoundaryPort;
  reasoner: Reasoner;
  /** Served beside a server (shared, live) or seeded on this device. */
  live: boolean;
  engine: string;
  reset: () => void;
};

type Served = {
  org: Id;
  people: Id[];
  assistant: Id;
  feeds?: Record<string, Id>;
  now: string;
  engine: string;
};

/** A shell that was served beside a server says so in its head; one
 * served alone (bun run app) is the demo on this device. */
const served = (): boolean => document.querySelector('meta[name="geofarm-served"]') !== null;

/**
 * One door, two worlds (RFC-0012 §0 — transport is mechanism). Served
 * beside a server, the shell speaks to its door and its engine; served
 * alone, it seeds the demo farm on this device and reasons by rule. A
 * served shell that cannot reach its door is exactly that — unreachable —
 * and is said so (Grower Rule 3); it never swaps in the demo farm.
 */
async function openWorld(): Promise<World | undefined> {
  let world: Served | undefined;
  try {
    const res = await fetch("/api/world"); // attempt-exempt: boot — an unreachable farm is said by the notice, never swapped for the demo
    if (res.ok) world = (await res.json()) as Served;
  } catch {
    world = undefined;
  }
  if (world !== undefined) {
    now = world.now;
    return {
      org: world.org,
      people: world.people,
      assistant: world.assistant,
      feeds: Object.values(world.feeds ?? {}),
      boundary: new RemoteBoundary("/api"),
      reasoner: new RemoteReasoner("/api/engine"),
      live: true,
      engine: world.engine,
      reset: () => {},
    };
  }
  if (served()) return undefined;
  const seeded = await seedWorld(localStorage);
  return {
    org: seeded.org,
    people: seeded.people,
    assistant: seeded.assistant,
    feeds: Object.values(FEED_ACTORS),
    boundary: seeded.boundary,
    reasoner: new RuleReasoner(),
    live: false,
    engine: "rules",
    reset: seeded.reset,
  };
}

/** The served farm cannot be reached: say it, say how old the device's
 * memory is, and try again quietly until the door answers. */
function unreachable(): void {
  const known = remembered();
  el("farm-name").textContent = shell.brand;
  el("farm-status").textContent = "";
  // No farm, no controls over it: the notice is the whole screen's truth.
  for (const id of ["timeline", "hint", "draw-ask", "shown"]) el(id).hidden = true;
  notice(known === undefined ? freshness.cantReach : freshness.cantReachSince(fmtWhen(known)));
  const retry = window.setInterval(() => {
    void fetch("/api/world") // attempt-exempt: the notice above is this loop's failure state; success reloads the farm
      .then((r) => {
        if (r.ok) {
          window.clearInterval(retry);
          location.reload();
        }
      })
      .catch(() => {});
  }, RETRY_MS);
}

async function boot(): Promise<void> {
  // ------------------------------------------------------------ chrome copy
  // Said before anything is fetched, so a slow door is never a blank chip.
  el("farm-name").textContent = shell.brand;
  el("farm-status").textContent = freshness.opening;
  el("viewer-caption").textContent = shell.lookingAs;
  el<HTMLInputElement>("search-input").placeholder = shell.findPlace;
  el("hint").textContent = shell.tapHint;
  el("panel-close").setAttribute("aria-label", shell.close);
  el("today").textContent = mapCopy.backToToday;
  el("season").setAttribute("aria-label", mapCopy.timeSlider);
  el("shown-toggle").textContent = mapCopy.layers;
  el("shown-list").setAttribute("aria-label", mapCopy.layers);
  el("draw-ask").textContent = mapCopy.drawToAsk;

  const world = await openWorld();
  if (world === undefined) {
    unreachable();
    return;
  }
  MONTHS = monthsUntil(now);

  // ----------------------------------------------------------- the viewer
  // One Session per viewer (RFC-0006 §1): switching who is looking swaps
  // the Reading and the outbox, never the map. Names are read from the
  // Reading — a signature resolves to a name only if the viewer may see
  // the person (RFC-0002 §2.3). Places carry their own names beside them.
  let session!: Session;
  let engagement!: AskEngagement;
  const names = new Map<Id, string>();
  const nameOf = (id: Id): string => names.get(id) ?? "";
  const placeNameOf = (id: Id): string => nameOf(id) || text(session.reading.get(id));

  // Whose farm this is (Grower Rule 1): the farm line's name, else the
  // organization's; the product's name stays small beside it.
  const farmName = (): string => {
    const line = session.reading.all().find((r) => r.classification === "farm");
    const org = session.reading.get(world.org);
    return text(line) || text(org) || shell.brand;
  };

  // How old what is on screen is, who is answering, and what is waiting
  // to be sent (Grower Rules 1 and 3): one chip, always readable.
  const refreshStatus = (): void => {
    const known = session.knownAsOf();
    rememberKnown(known);
    const which = world.live
      ? known === undefined
        ? shell.liveWorld
        : freshness.upToDateAsOf(fmtWhen(known))
      : shell.deviceWorld;
    const who = world.engine === "rules" ? shell.answeredByRules : shell.answeredBy(world.engine);
    const waiting = session.pending.submissions.length;
    const status = el("farm-status");
    status.textContent = `${which} · ${who}`;
    if (waiting > 0) {
      const span = document.createElement("span");
      span.className = "waiting";
      span.textContent = work.waitingToSend(waiting);
      status.appendChild(span);
    }
  };

  const openAs = async (actor: Id): Promise<void> => {
    session = new Session(
      actor,
      world.boundary,
      new PendingStore(new StoragePersistence(`geofarm-pending:${actor}`, localStorage)),
      now,
    );
    // Reconnection is Append + Project (RFC-0012 §5): whatever this
    // viewer left unsent goes first, then the walk. Both wait with words.
    await attempt(el("farm-status"), undefined, { waiting: freshness.opening, failed: freshness.cantReach }, async () => {
      if (session.pending.submissions.length > 0) await session.send();
      await session.sync();
    });
    names.clear();
    for (const r of session.reading.all()) {
      const n = (r.body as { name?: string } | undefined)?.name;
      if (r.kind === "actor" && n !== undefined) names.set(r.id, n);
    }
    for (const l of LENSES) session.reveal({ name: l.name, filter: l.filter, visible: !OFF_AT_FIRST.has(l.name) });
    // The assistant, engaged inside this viewer's situation (RFC-0010):
    // the engagement reads the live View + Pending + Reading.
    engagement = new AskEngagement(
      world.boundary,
      world.assistant,
      world.reasoner,
      viewerStores(session),
      world.org,
    );
    const name = el("farm-name");
    name.textContent = farmName();
    const product = document.createElement("small");
    product.textContent = shell.brand;
    name.appendChild(product);
    refreshStatus();
  };
  await openAs(world.people[0] as Id);

  // Who is looking is a development affordance on the demo farm; on a
  // served farm, identity is the door's business (RFC-0002), not a menu.
  const viewerSelect = el<HTMLSelectElement>("viewer");
  if (!world.live) {
    for (const person of world.people) {
      const o = document.createElement("option");
      o.value = person;
      o.textContent = nameOf(person);
      viewerSelect.appendChild(o);
    }
    el("viewer-label").hidden = false;
  }

  // The map engine is the one failure the shell cannot paint around: it
  // is said in words (Grower Rule 3) instead of a dark screen.
  let map: ReturnType<typeof createMap>;
  try {
    map = createMap(el("map"));
  } catch {
    notice(shell.noMapEngine);
    return;
  }
  const lensNames = LENSES.map((l) => l.name);

  // Offline is a state with a sentence, not a silence (Grower Rule 3).
  window.addEventListener("offline", () => notice(freshness.workingOffline));
  window.addEventListener("online", () => {
    notice(undefined);
    if (session.pending.submissions.length === 0) return;
    void attempt(el("farm-status"), undefined, { waiting: work.sending, failed: freshness.cantReach }, async () => {
      await session.send();
      await session.sync();
    }).then(() => {
      refreshStatus();
      paint();
    });
  });

  // What is growing, as of the View's time: projected state (RFC-0004 §4)
  // read off the field's timeline — the last planting stands until a
  // harvest ends it. Presentation of state, never a new claim.
  const cropOf = (id: Id): string => {
    const bundle = session.inspect(id);
    let crop = "";
    for (const r of bundle?.timeline ?? []) {
      if (r.classification === "planting") crop = (r.body as { crop?: string }).crop ?? "";
      else if (r.classification === "harvest") crop = "fallow";
    }
    return crop;
  };

  const describe = (id: Id): Described => {
    const r = session.reading.get(id);
    const cls = r?.classification ?? "";
    const name = nameOf(id) || text(r) || kinds[cls] || shell.thisPlace;
    const crop = cls === "field" ? cropOf(id) : "";
    // A soil type's map label is its survey symbol and its short name:
    // the slope and erosion phrases are in its story, not on the map.
    const symbol = (r?.body as { symbol?: string } | undefined)?.symbol;
    const label =
      cls === "soil-unit"
        ? [symbol, name.split(",")[0]].filter((w) => w !== undefined && w !== "").join(" · ")
        : crop !== "" && crop !== "fallow"
          ? `${name} · ${crops[crop] ?? crop}`
          : name;
    return { name, kind: r?.kind ?? "", group: GROUP[cls] ?? "", crop, label };
  };

  const paint = (): void => {
    setLensData(map, toFeatureCollections(session.marks(), describe, session.view.selection), lensNames);
  };
  // Dev console handle — not UI, not state (the stores stay the three).
  (window as unknown as Record<string, unknown>).__geofarm = {
    get session() {
      return session;
    },
    map,
    paint,
    reset: world.reset,
  };

  // ---------------------------------------------------------- remembered View
  // The whole View is one value (RFC-0014 §3): camera, season, lenses,
  // selection — remembered together, per viewer (REVIEW-003 §2.G).
  type Saved = {
    center: [number, number];
    zoom: number;
    season: number;
    lenses: Record<string, boolean>;
    selection: Id[];
  };
  const savedKey = (): string => `geofarm-view-3:${session.actor}`;
  const loadSaved = (): Saved | undefined => {
    try {
      const raw = localStorage.getItem(savedKey());
      return raw === null ? undefined : (JSON.parse(raw) as Saved);
    } catch {
      return undefined;
    }
  };
  const remember = (): void => {
    const c = map.getCenter();
    const lenses: Record<string, boolean> = {};
    for (const l of session.view.lenses) lenses[l.name] = l.visible;
    try {
      localStorage.setItem(
        savedKey(),
        JSON.stringify({
          center: [c.lng, c.lat],
          zoom: map.getZoom(),
          season: seasonInput.valueAsNumber,
          lenses,
          selection: session.view.selection,
        } satisfies Saved),
      );
    } catch {
      // a browser that will not remember is still a map
    }
  };

  // ------------------------------------------------------------------- panel
  const panel = el<HTMLElement>("panel");
  const panelBody = el<HTMLElement>("panel-body");

  const rowHtml = (h: AdmittedRecord, place?: string): string => {
    const who = nameOf(h.actors.actor);
    const what = text(h);
    // A claim is not a fact (REVIEW-002): how-sure rides with it.
    const sure =
      h.kind === "assertion" && h.confidence !== undefined
        ? ` <span class="sure">${claims.howSure(Math.round(h.confidence * 100))}</span>`
        : "";
    const where = place !== undefined && place !== "" ? ` <span class="who">· ${place}</span>` : "";
    return `<div class="row"><span class="when">${fmtDate(h.occurrence.start)}</span><span class="what">${what}${sure}${where}</span><span class="who">${who}</span></div>`;
  };

  const frameHtml = (): string =>
    session.view.time.start === now
      ? ""
      : `<div class="frame">${story.asOf(seasonLabel.textContent ?? "")}</div>`;

  // The farm's own pulse (REVIEW-003 §3): "what happened this season,
  // anywhere?" — a lens presentation in the panel (RFC-0006 §6), not a
  // page. Everything up to the bound time, newest first, with its place.
  const farmStoryOf = (): string => {
    const bound = Date.parse(session.view.time.end ?? session.view.time.start);
    // The sources' streams have their own lenses; the pulse is people's work.
    const streamed = new Set([...WEATHER_CLASSIFICATIONS, "imagery", "soil-survey"]);
    const rows = session.reading
      .all()
      .filter((r) => r.kind !== "entity" && r.kind !== "actor" && r.classification !== "grant")
      .filter((r) => !streamed.has(r.classification))
      .filter((r) => Date.parse(r.occurrence.start) <= bound)
      .sort((a, b) => Date.parse(b.occurrence.start) - Date.parse(a.occurrence.start))
      .slice(0, 14)
      .map((r) => rowHtml(r, placeNameOf(r.subjects[0] as Id)))
      .join("");
    return rows.length > 0 ? `<h3>${shell.onTheFarm}</h3>${rows}` : `<p class='quiet'>${shell.nothingYet}</p>`;
  };

  /** A thing's story: the head (name, what it is, what grows), then the
   * rest (frame, notices, rows). The two verbs sit between them. */
  const storyOf = (id: Id): { head: string; rest: string } => {
    const r = session.reading.get(id);
    if (r === undefined) return { head: "", rest: "" };
    const name = nameOf(id) || text(r) || shell.thisPlace;
    const kindLabel = kinds[r.classification] ?? shell.place;
    const since =
      r.kind === "entity" && undated(r.occurrence.start)
        ? `<div class="since">${kindLabel}</div>`
        : r.kind === "entity"
        ? `<div class="since">${shell.hereSince(kindLabel, String(new Date(r.occurrence.start).getFullYear()))}</div>`
        : `<div class="since">${shell.whenWhat(kindLabel, fmtDate(r.occurrence.start))}</div>`;
    if (r.classification === "farm") {
      return { head: `<h2>${name}</h2>${since}`, rest: `${frameHtml()}${farmStoryOf()}` };
    }
    const bundle = session.inspect(id);
    // Two people redrew the same line without hearing each other: both
    // are kept and said so (RFC-0012 §5) — never silently picked between.
    const fork =
      (bundle?.contenders.length ?? 0) > 1 ? `<div class="notice">${shell.twoLinesHere}</div>` : "";
    const crop = r.classification === "field" ? cropOf(id) : "";
    const growing =
      crop === "" ? "" : `<div class="since growing">${crop === "fallow" ? shell.fallow : shell.growing(crops[crop] ?? crop)}</div>`;
    // A satellite pass shows its preview: the pixels are payload, shown
    // as what they are (RFC-0003 §3.1), with the provider's own facts.
    const scene = r.classification === "imagery" ? sceneHtml(r) : "";
    const soil = r.classification === "soil-unit" ? groundHtml(r, bundle?.timeline ?? []) : "";
    const rows = (bundle?.timeline ?? []).slice().reverse().map((h) => rowHtml(h)).join("");
    const rowsOrQuiet =
      rows.length > 0 ? `<h3>${shell.whatsHappened}</h3>${rows}` : `<p class='quiet'>${shell.nothingYet}</p>`;
    return { head: `<h2>${name}</h2>${since}${growing}`, rest: `${scene}${soil}${frameHtml()}${fork}${rowsOrQuiet}` };
  };

  /** A soil type's facts: what the survey standing at the View's time
   * says of it, in the grower's units, ending with what a survey is. */
  const groundHtml = (unit: AdmittedRecord, timeline: readonly AdmittedRecord[]): string => {
    const acres = (unit.body as { acresHere?: number } | undefined)?.acresHere;
    const said = timeline.filter((h) => h.classification === "soil-survey").at(-1);
    type Horizon = { topCm?: number; bottomCm?: number; clayPct?: number; organicMatterPct?: number; pH?: number };
    type Soil = { name?: string; percent?: number; major?: boolean; horizons?: Horizon[] };
    const b = (said?.body ?? {}) as {
      soils?: Soil[];
      drainage?: string;
      slopePct?: number;
      availableWaterTop100Cm?: number;
      waterTableCm?: number;
      floodFrequency?: string;
      cornSuitabilityRating?: number;
      productivityIndex?: number;
      farmland?: string;
    };
    const inches = (cm: number): string => String(Math.round(cm / 2.54));
    const soils = (b.soils ?? []).filter((c) => c.name !== undefined && c.percent !== undefined);
    const top = soils.find((c) => c.major === true)?.horizons?.[0];
    const topFacts = [
      top?.clayPct !== undefined ? groundCopy.clay(String(Math.round(top.clayPct))) : "",
      top?.organicMatterPct !== undefined ? groundCopy.organicMatter(String(top.organicMatterPct)) : "",
      top?.pH !== undefined ? groundCopy.pH(String(top.pH)) : "",
    ].filter((f) => f !== "");
    const lines = [
      acres !== undefined ? groundCopy.acresHere(String(acres)) : "",
      b.cornSuitabilityRating !== undefined ? groundCopy.cornRating(String(b.cornSuitabilityRating)) : "",
      b.productivityIndex !== undefined ? groundCopy.productivity(String(Math.round(b.productivityIndex * 100))) : "",
      b.farmland ?? "",
      b.drainage !== undefined ? groundCopy.drainage(b.drainage.toLowerCase()) : "",
      b.slopePct !== undefined ? groundCopy.slope(String(Math.round(b.slopePct))) : "",
      b.availableWaterTop100Cm !== undefined ? groundCopy.holdsWater(String(Math.round((b.availableWaterTop100Cm / 2.54) * 10) / 10)) : "",
      b.waterTableCm !== undefined ? groundCopy.waterTable(inches(b.waterTableCm)) : "",
      b.floodFrequency !== undefined && b.floodFrequency !== "None" ? groundCopy.floods(b.floodFrequency.toLowerCase()) : "",
      top?.bottomCm !== undefined && topFacts.length > 0 ? groundCopy.topsoil(inches(top.bottomCm), topFacts.join(", ")) : "",
      soils.length > 0 ? groundCopy.madeOf(soils.map((c) => groundCopy.share(c.name as string, String(c.percent))).join(", ")) : "",
    ].filter((l) => l !== "");
    const basis = said === undefined ? "" : `<p class="quiet">${groundCopy.fromSurvey(fmtDate(said.occurrence.start))}</p>`;
    return `${lines.map((l) => `<div class="since">${l}</div>`).join("")}${basis}`;
  };

  const sceneHtml = (r: AdmittedRecord): string => {
    const b = r.body as { thumbnail?: string; cloudCover?: number; platform?: string } | undefined;
    const facts = [
      b?.cloudCover !== undefined ? shell.cloudCover(Math.round(b.cloudCover)) : "",
      b?.platform !== undefined ? shell.seenFrom(b.platform) : "",
    ]
      .filter((f) => f !== "")
      .join(" · ");
    const img = b?.thumbnail !== undefined ? `<img class="scene" src="${b.thumbnail}" alt="" />` : "";
    return `${img}${facts !== "" ? `<div class="since">${facts}</div>` : ""}`;
  };

  // --------------------------------------------- sharing (M6 at the surface)
  // "Who can see this?" is a reading of grant history; sharing is one
  // decision — who, what kind of thing, until when — authored as a Grant
  // (RFC-0002 §4). Nothing here is a permissions screen. The engaged
  // sources hold grants too (RFC-0011) and are listed apart, as sources
  // (Grower Rule 8): a feed is not a person the farm shares with.
  const feeds = new Set<Id>(world.feeds);
  const scopeLabel = (scope: { classifications?: string[]; region?: unknown }): string => {
    if (scope.region !== undefined) return sharing.insideTheLine;
    if (scope.classifications === undefined) return sharing.scopeShort.everything as string;
    const agronomic = AGRONOMY.every((c) => scope.classifications?.includes(c));
    return (agronomic ? sharing.scopeShort.agronomy : sharing.scopeShort.some) as string;
  };
  const lastReportOf = (actor: Id): string | undefined => {
    let latest: string | undefined;
    for (const r of session.reading.all()) {
      if (r.actors.actor !== actor || r.kind === "actor" || r.classification === "grant") continue;
      if (latest === undefined || r.knowledgeTime > latest) latest = r.knowledgeTime;
    }
    return latest;
  };
  const sharesHtml = (gestureId?: string): string => {
    const all = session.shares();
    const people = all.filter((s) => !feeds.has(s.grant.grantee));
    const engaged = all.filter((s) => feeds.has(s.grant.grantee));
    const rows = people
      .map(
        (s) =>
          `<div class="row"><span class="what">${nameOf(s.grant.grantee) || kinds.grant} ${sharing.sees(scopeLabel(s.grant.scope))}${
            s.grant.until !== undefined ? ` ${sharing.until(fmtDate(s.grant.until))}` : ""
          }</span><span class="who">${sharing.sharedBy(nameOf(s.record.actors.actor))}</span><button class="stop" data-id="${s.record.id}" aria-label="${sharing.stopSharing(nameOf(s.grant.grantee))}">${sharing.stop}</button></div>`,
      )
      .join("");
    const others = world.people.filter((p) => p !== session.actor && !people.some((s) => s.grant.grantee === p));
    const options = others.map((p) => `<option value="${p}">${nameOf(p) || p}</option>`).join("");
    const compose =
      others.length === 0
        ? `<p class="quiet">${sharing.everyoneSees}</p>`
        : `<div class="compose"><button id="share-open">${sharing.letSomeoneSee}</button>
      <form id="share-form" class="share-form" hidden data-gesture="${gestureId ?? ""}">
        <label>${sharing.whoLabel}<select id="share-who">${options}</select></label>
        <label>${sharing.whatLabel}<select id="share-what">
          <option value="agronomy">${sharing.whatChoices.agronomy}</option>
          <option value="everything">${sharing.whatChoices.everything}</option>
        </select></label>
        <label>${sharing.untilLabel}<input id="share-until" type="date" value="${SEASON_END}" /></label>
        <div class="compose-actions">
          <button type="submit" id="share-save">${sharing.share}</button>
          <button type="button" id="share-cancel">${story.neverMind}</button>
        </div>
      </form></div>`;
    const sourceRows = engaged
      .map((s) => {
        const name = nameOf(s.grant.grantee) || kinds.grant || shell.place;
        const last = lastReportOf(s.grant.grantee);
        const when = last === undefined ? sourcesCopy.neverReported(name) : freshness.lastHeardFrom(name, fmtDate(last));
        return `<div class="row"><span class="what">${when}</span><span class="consequence">${sourcesCopy.willStop(name)}</span><button class="stop" data-id="${s.record.id}" aria-label="${sourcesCopy.stopUsing} ${name}">${sourcesCopy.stopUsing}</button></div>`;
      })
      .join("");
    const sourcesBlock = sourceRows === "" ? "" : `<div class="sources"><h3>${sourcesCopy.heading}</h3>${sourceRows}</div>`;
    return `<div class="shares"><h3>${sharing.whoCanSee}</h3>${
      rows || `<p class="quiet">${sharing.onlyTheFarm}</p>`
    }${compose}<p id="share-status" class="status" hidden></p></div>${sourcesBlock}`;
  };

  const wireShares = (rerender: () => void): void => {
    const openBtn = document.getElementById("share-open") as HTMLButtonElement | null;
    const form = document.getElementById("share-form") as HTMLFormElement | null;
    const status = document.getElementById("share-status") as HTMLElement | null;
    if (openBtn !== null && form !== null) {
      openBtn.addEventListener("click", () => {
        openBtn.hidden = true;
        form.hidden = false;
      });
      el("share-cancel").addEventListener("click", () => {
        form.hidden = true;
        openBtn.hidden = false;
      });
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const who = el<HTMLSelectElement>("share-who").value as Id;
        const what = el<HTMLSelectElement>("share-what").value;
        const until = el<HTMLInputElement>("share-until").value;
        const gestureId = form.dataset.gesture || undefined;
        if (who === "") return;
        const draft = session.share({
          grantee: who,
          scope: what === "agronomy" ? { classifications: AGRONOMY } : {},
          capabilities: ["represent"],
          ...(until !== "" ? { until: new Date(until).toISOString() } : {}),
          ...(gestureId !== undefined ? { gestureId } : {}),
          at: now,
        });
        session.commit(draft);
        void attempt(status ?? undefined, el<HTMLButtonElement>("share-save"), { waiting: sharing.sharing, failed: sharing.couldNotShare }, async () => {
          const result = await session.send();
          if (result.rejected.length > 0) throw new Error(because(result));
          await session.sync();
          return result;
        }).then((result) => {
          refreshStatus();
          if (result === undefined) return;
          if (status !== null) status.textContent = sharing.shared;
          rerender();
        });
      });
    }
    for (const b of panelBody.querySelectorAll<HTMLButtonElement>(".shares .stop, .sources .stop")) {
      b.addEventListener("click", () => {
        const draft = session.revoke(b.dataset.id as Id, now);
        if (draft === undefined) return;
        session.commit(draft);
        const failed = sharing.couldNotShare;
        void attempt(status ?? undefined, b, { waiting: sharing.stopping, failed }, async () => {
          const result = await session.send();
          if (result.rejected.length > 0) throw new Error(because(result));
          await session.sync();
          return result;
        }).then((result) => {
          refreshStatus();
          if (result === undefined) return;
          if (status !== null) status.textContent = sharing.stopped;
          rerender();
        });
      });
    }
  };

  // ------------------------------------------- the author's door (P0 #2)
  const composeHtml = `<div class="compose">
      <form id="compose-form" hidden>
        <textarea id="note-text" rows="3" placeholder="${story.notePlaceholder}"></textarea>
        <div class="compose-actions">
          <button type="submit" id="note-save">${story.keepNote}</button>
          <button type="button" id="note-cancel">${story.neverMind}</button>
        </div>
        <p id="compose-status" class="status" hidden></p>
      </form>
    </div>`;

  // --------------------------------------------------- the Ask verb (M5)
  const askHtml = `<div class="ask">
      <form id="ask-form" hidden>
        <input id="ask-text" type="text" placeholder="${assistantCopy.askPlaceholder}" autocomplete="off" />
        <button type="submit" id="ask-send">${assistantCopy.ask}</button>
      </form>
      <p id="ask-status" class="status" hidden></p>
      <div id="ask-replies"></div>
    </div>`;

  /** The two verbs a person came for (Grower Rule 2): under the name,
   * before the story, on every thing. */
  const actsHtml = (askLabel: string): string =>
    `<div class="acts"><button id="ask-open">${askLabel}</button><button id="add-note">${story.addNote}</button></div>`;

  const peelRows = (nodes: PeelNode[], depth = 0): string =>
    nodes
      .map((n) => {
        const who = nameOf(n.record.actors.actor);
        const grounds = n.grounds
          .map(
            (g) =>
              `<div class="peel-row" style="margin-left:${(depth + 1) * 14}px">${claims.basedOn(g.source)}</div>`,
          )
          .join("");
        return `<div class="peel-row" style="margin-left:${depth * 14}px"><span class="when">${fmtDate(n.record.occurrence.start)}</span> ${text(n.record)} <span class="who">${who}</span></div>${grounds}${peelRows(n.evidence, depth + 1)}`;
      })
      .join("");

  const renderReplies = async (replies: Reply[]): Promise<void> => {
    const box = el<HTMLElement>("ask-replies");
    const kept: CandidateAssertion[] = [];
    const parts: string[] = [];
    for (const r of replies) {
      if (r.kind === "claim") {
        const i = kept.push(r.claim) - 1;
        const peel = await engagement.peel(r.claim);
        parts.push(`<div class="reply">
            <p>${r.claim.text}</p>
            <div class="reply-meta">${claims.howSure(Math.round(r.claim.confidence * 100))} · ${nameOf(world.assistant)}</div>
            <details class="peel"><summary>${claims.whatsThatBasedOn}</summary>${peelRows(peel)}</details>
            <button class="keep" data-i="${i}">${assistantCopy.keepAnswer}</button>
          </div>`);
      } else if (r.kind === "reveal") {
        parts.push(`<div class="reply">
            <p>${r.text}</p>
            <button class="show-it" data-ids="${r.about.join(",")}">${assistantCopy.showIt}</button>
          </div>`);
      } else {
        parts.push(`<div class="reply"><p class="quiet">${r.text}</p></div>`);
      }
    }
    box.innerHTML = parts.join("");
    for (const b of box.querySelectorAll<HTMLButtonElement>("button.keep")) {
      b.addEventListener("click", () => {
        const claim = kept[Number(b.dataset.i)];
        if (claim === undefined) return;
        const status = el<HTMLElement>("ask-status");
        void attempt(status, b, { waiting: assistantCopy.keeping, failed: work.couldNotSend }, async () => {
          const result = await engagement.promote(claim);
          if (!result.accepted) throw new Error(result.reasons.join());
          await session.sync();
          return result;
        }).then((result) => {
          if (result === undefined) return;
          status.hidden = true;
          paint();
          b.disabled = true;
          b.textContent = assistantCopy.keptAnswer;
        });
      });
    }
    for (const b of box.querySelectorAll<HTMLButtonElement>("button.show-it")) {
      b.addEventListener("click", () => {
        // Bringing-into-frame (RFC-0010 §4): reveal the lenses that show
        // what the assistant is pointing at.
        for (const id of (b.dataset.ids ?? "").split(",")) {
          const record = session.reading.get(id as Id);
          if (record === undefined) continue;
          const lens = LENSES.find((l) => l.filter.classifications.includes(record.classification));
          const state = session.view.lenses.find((l) => l.name === lens?.name);
          if (lens !== undefined && state?.visible === false) session.toggle(lens.name);
        }
        syncSwitches();
        paint();
        b.disabled = true;
      });
    }
  };

  const wireAsk = (): void => {
    const openBtn = el<HTMLButtonElement>("ask-open");
    const form = el<HTMLFormElement>("ask-form");
    const input = el<HTMLInputElement>("ask-text");
    const status = el<HTMLElement>("ask-status");
    openBtn.addEventListener("click", () => {
      form.hidden = false;
      input.focus();
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (q === "") return;
      input.value = "";
      // An ask is a wait (Grower Rule 3): said where the answer will land.
      void attempt(status, el<HTMLButtonElement>("ask-send"), { waiting: assistantCopy.thinking, failed: assistantCopy.couldNotAnswer }, () =>
        engagement.ask(q),
      ).then(async (replies) => {
        if (replies === undefined) return;
        status.hidden = true;
        await renderReplies(replies);
      });
    });
  };

  const wireNote = (rerender: () => void): void => {
    const addBtn = el<HTMLButtonElement>("add-note");
    const form = el<HTMLFormElement>("compose-form");
    const input = el<HTMLTextAreaElement>("note-text");
    const status = el<HTMLElement>("compose-status");
    addBtn.addEventListener("click", () => {
      form.hidden = false;
      input.focus();
    });
    el("note-cancel").addEventListener("click", () => {
      form.hidden = true;
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const body = input.value.trim();
      if (body === "") return;
      const draftId = session.annotate("note", { text: body }, now);
      session.commit(draftId);
      void attempt(status, el<HTMLButtonElement>("note-save"), { waiting: work.sending, failed: work.savedHere }, async () => {
        const result = await session.send();
        if (result.rejected.length > 0) throw new Error(because(result));
        if (result.deferred > 0) throw new Error(work.savedHere);
        await session.sync();
        return result;
      }).then((result) => {
        refreshStatus();
        if (result === undefined) {
          // The note is kept on this device (RFC-0014 §1); the door's
          // reason, if it gave one, is said in the farm's words.
          const last = session.pending.submissions.length > 0 ? work.savedHere : undefined;
          if (last !== undefined) status.textContent = last;
          return;
        }
        status.textContent = work.sent;
        paint();
        rerender(); // the new note is part of the story now
      });
    });
  };

  const renderPanel = (id: Id): void => {
    const s = storyOf(id);
    panelBody.innerHTML = s.head + actsHtml(assistantCopy.askAbout) + askHtml + composeHtml + s.rest + sharesHtml();
    wireAsk();
    wireNote(() => renderPanel(id));
    wireShares(() => renderPanel(id));
  };

  // Several things at one spot (RFC-0015 §4 Amendment 1): the aggregate
  // resolves to its members — listed, each a tap from its own story.
  const renderStack = (ids: Id[]): void => {
    const rows = ids
      .map((id) => session.reading.get(id))
      .filter((r): r is AdmittedRecord => r !== undefined)
      .sort((a, b) => Date.parse(b.occurrence.start) - Date.parse(a.occurrence.start))
      .map(
        (r) =>
          `<button data-id="${r.id}"><span class="when">${undated(r.occurrence.start) ? (kinds[r.classification] ?? "") : fmtDate(r.occurrence.start)}</span><span class="what">${text(r)}</span><span class="who">${nameOf(r.actors.actor)}</span></button>`,
      )
      .join("");
    panelBody.innerHTML = `<h2>${shell.atThisSpot}</h2><div class="since">${shell.severalHere(ids.length)}</div><div class="stack">${rows}</div>`;
    for (const b of panelBody.querySelectorAll<HTMLButtonElement>(".stack > button")) {
      b.addEventListener("click", () => openPanel(b.dataset.id as Id));
    }
    session.select(ids);
    showPanel();
    paint();
  };

  // The one drawn indication at a time; ephemeral (second law).
  let gestureId: string | undefined;
  const dropGesture = (): void => {
    if (gestureId !== undefined) {
      session.pending.dropGesture(gestureId);
      gestureId = undefined;
      setGestureData(map, undefined);
    }
  };

  const showPanel = (): void => {
    panel.hidden = false;
    document.body.classList.add("panel-open");
    el("hint").hidden = true;
  };
  const openPanel = (id: Id): void => {
    dropGesture();
    session.select([id]);
    renderPanel(id);
    showPanel();
    paint(); // attention is shared with the map (RFC-0006 §3)
    remember();
  };
  const closePanel = (): void => {
    session.select([]);
    dropGesture();
    // The exchange evaporates with the engagement (RFC-0010 §2): what
    // was worth keeping was promoted; the rest leaves no residue.
    engagement.discard();
    panel.hidden = true;
    document.body.classList.remove("panel-open");
    paint();
    remember();
  };
  el("panel-close").addEventListener("click", closePanel);

  // The circled corner (RFC-0006 §3): a drawn query region, panel-opened.
  // Ask about it — or share what is inside it (a fence for access).
  const openGesturePanel = (): void => {
    session.select([]);
    const render = (): void => {
      panelBody.innerHTML =
        `<h2>${assistantCopy.circledArea}</h2>` +
        `<div class="since">${mapCopy.drawToAsk}</div>` +
        `<div class="acts"><button id="ask-open">${assistantCopy.askThisArea}</button><button id="gesture-drop">${mapCopy.letItGo}</button></div>` +
        askHtml +
        sharesHtml(gestureId);
      wireAsk();
      wireShares(() => {
        // The gesture was promoted into the grant; the panel closes.
        gestureId = undefined;
        setGestureData(map, undefined);
        closePanel();
      });
      el("gesture-drop").addEventListener("click", closePanel);
    };
    render();
    showPanel();
  };

  // ------------------------------------------------------------ what's shown
  // One quiet control (Grower Rule 2) opening the legend (Rule 5) and the
  // four switches. The farm's own layers are not switches: a grower never
  // wants their fields off.
  const shownToggle = el<HTMLButtonElement>("shown-toggle");
  const shownList = el<HTMLElement>("shown-list");
  const switches = new Map<string, HTMLButtonElement>();
  const keyRow = (swatch: string, fill: boolean, words: string, trailing: string): HTMLElement => {
    const row = document.createElement("div");
    row.className = "key";
    const sw = document.createElement("span");
    sw.className = "sw";
    if (fill) sw.classList.add("fill");
    sw.style.background = swatch;
    const label = document.createElement("span");
    label.textContent = words;
    const tail = document.createElement("span");
    tail.className = "always";
    tail.textContent = trailing;
    row.append(sw, label, tail);
    return row;
  };
  for (const [crop, colour] of Object.entries(CROP_COLOR)) {
    shownList.appendChild(keyRow(colour, true, legend[crop] ?? crop, ""));
  }
  for (const group of ALWAYS_GROUPS) {
    shownList.appendChild(keyRow(GROUP_COLOR[group] ?? "", false, legend[group] ?? group, mapCopy.always));
  }
  for (const [name, family] of Object.entries(OPTIONAL)) {
    const b = document.createElement("button");
    b.className = "switch";
    b.setAttribute("aria-pressed", "true");
    const sw = document.createElement("span");
    sw.className = "sw";
    sw.style.background = GROUP_COLOR[family] ?? LENS_STYLE[name]?.color ?? "";
    const label = document.createElement("span");
    label.textContent = legend[family] ?? shell.lenses[name] ?? name;
    const track = document.createElement("span");
    track.className = "track";
    b.append(sw, label, track);
    b.addEventListener("click", () => {
      session.toggle(name);
      syncSwitches();
      paint();
      remember();
    });
    switches.set(name, b);
    shownList.appendChild(b);
  }
  const syncSwitches = (): void => {
    for (const l of session.view.lenses) {
      switches.get(l.name)?.setAttribute("aria-pressed", String(l.visible));
    }
  };
  syncSwitches(); // a switch that starts off says so from the first paint
  const showList = (open: boolean): void => {
    shownList.hidden = !open;
    shownToggle.setAttribute("aria-expanded", String(open));
  };
  shownToggle.addEventListener("click", () => showList(shownList.hidden));
  document.addEventListener("click", (e) => {
    if (!shownList.hidden && !el("shown").contains(e.target as Node)) showList(false);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !shownList.hidden) showList(false);
  });

  // ---------------------------------------------------------------- timeline
  const seasonInput = el<HTMLInputElement>("season");
  const seasonLabel = el<HTMLElement>("season-label");
  const todayBtn = el<HTMLButtonElement>("today");
  // The scrubber says what it controls (REVIEW-003 §4.4; Grower Rule 2):
  // a caption, a label, and year ticks.
  const caption = el<HTMLElement>("season-caption");
  caption.textContent = mapCopy.timeSlider;
  const drag = document.createElement("small");
  drag.textContent = mapCopy.dragToLookBack;
  caption.appendChild(drag);
  const ticks = el<HTMLElement>("ticks");
  seasonInput.max = String(MONTHS);
  seasonInput.value = String(MONTHS);
  for (let year = 2019; year <= new Date(now).getUTCFullYear(); year++) {
    const idx = (year - 2019) * 12;
    const span = document.createElement("span");
    span.textContent = String(year);
    span.style.left = `${(idx / MONTHS) * 100}%`;
    ticks.appendChild(span);
  }
  const applySeason = (): void => {
    const idx = seasonInput.valueAsNumber;
    if (idx >= MONTHS) {
      session.navigateTime({ start: now });
      seasonLabel.textContent = shell.today;
      todayBtn.hidden = true;
    } else {
      session.navigateTime({ start: monthToIso(idx + 1) }); // end of that month
      seasonLabel.textContent = monthLabel(idx);
      todayBtn.hidden = false;
    }
    seasonInput.setAttribute("aria-valuetext", seasonLabel.textContent ?? "");
    if (!panel.hidden && session.view.selection.length === 1) {
      renderPanel(session.view.selection[0] as Id);
    }
    paint();
    remember();
  };
  seasonInput.addEventListener("input", applySeason);
  todayBtn.addEventListener("click", () => {
    seasonInput.value = String(MONTHS);
    applySeason();
  });

  // ------------------------------------------------------------------ search
  // Results say where they are (REVIEW-003 §5) and take the keyboard.
  const searchInput = el<HTMLInputElement>("search-input");
  const searchResults = el<HTMLElement>("search-results");
  const goTo = (id: Id): void => {
    const place = session.reading.placeOf(id);
    if (place !== undefined) map.fitBounds(boundsOf(place), { padding: 90, maxZoom: 15.5 });
    session.navigateToThing(id);
    openPanel(id);
    searchResults.hidden = true;
    searchInput.value = "";
  };
  let cursor = -1;
  const highlight = (): void => {
    const buttons = [...searchResults.querySelectorAll("button")];
    buttons.forEach((b, i) => b.classList.toggle("active", i === cursor));
  };
  searchInput.addEventListener("input", () => {
    const q = searchInput.value.trim().toLowerCase();
    cursor = -1;
    if (q.length < 2) {
      searchResults.hidden = true;
      return;
    }
    const hits = session.reading
      .all()
      .filter((r) => r.kind !== "actor" && r.classification !== "grant")
      .filter((r) => {
        const name = nameOf(r.id).toLowerCase();
        const body = text(r).toLowerCase();
        return name.includes(q) || body.includes(q);
      })
      .slice(0, 6);
    if (hits.length === 0) {
      // Nothing found is said, not hidden (Grower Rule 3).
      searchResults.innerHTML = `<div class="quiet">${shell.nothingCalled(searchInput.value.trim())}</div>`;
      searchResults.hidden = false;
      return;
    }
    searchResults.innerHTML = hits
      .map((r) => {
        const label = nameOf(r.id) || text(r);
        const where =
          r.kind === "entity"
            ? kinds[r.classification] ?? ""
            : [placeNameOf(r.subjects[0] as Id) || kinds[r.classification] || "", fmtDate(r.occurrence.start)].filter((w) => w !== "").join(" · ");
        return `<button data-id="${r.id}"><span>${label}</span><small>${where}</small></button>`;
      })
      .join("");
    searchResults.hidden = false;
    for (const b of searchResults.querySelectorAll("button")) {
      b.addEventListener("click", () => goTo((b as HTMLElement).dataset.id as Id));
    }
  });
  searchInput.addEventListener("keydown", (e) => {
    const buttons = [...searchResults.querySelectorAll("button")];
    if (buttons.length === 0) return;
    if (e.key === "ArrowDown") {
      cursor = Math.min(cursor + 1, buttons.length - 1);
      highlight();
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      cursor = Math.max(cursor - 1, 0);
      highlight();
      e.preventDefault();
    } else if (e.key === "Enter") {
      const target = buttons[cursor < 0 ? 0 : cursor] as HTMLElement;
      goTo(target.dataset.id as Id);
      e.preventDefault();
    } else if (e.key === "Escape") {
      searchResults.hidden = true;
    }
  });

  // ------------------------------------------------------------ draw-to-ask
  const drawBtn = el<HTMLButtonElement>("draw-ask");
  let drawing = false;
  let justDrew = false;
  let drawFrom: [number, number] | undefined;
  const rectFrom = (
    a: [number, number],
    b: [number, number],
  ): Extract<Geometry, { form: "area" }> => {
    const w = Math.min(a[0], b[0]);
    const e = Math.max(a[0], b[0]);
    const s = Math.min(a[1], b[1]);
    const n = Math.max(a[1], b[1]);
    return {
      form: "area",
      rings: [
        [
          [w, s],
          [e, s],
          [e, n],
          [w, n],
          [w, s],
        ],
      ],
    };
  };
  const exitDraw = (): void => {
    drawing = false;
    drawFrom = undefined;
    map.dragPan.enable();
    map.getCanvas().style.cursor = "";
    drawBtn.classList.remove("on");
  };
  drawBtn.addEventListener("click", () => {
    if (drawing) {
      exitDraw();
      return;
    }
    dropGesture();
    drawing = true;
    map.dragPan.disable();
    map.getCanvas().style.cursor = "crosshair";
    drawBtn.classList.add("on");
  });
  map.on("mousedown", (e) => {
    if (!drawing) return;
    drawFrom = [e.lngLat.lng, e.lngLat.lat];
  });
  map.on("mousemove", (e) => {
    if (!drawing || drawFrom === undefined) return;
    setGestureData(map, rectFrom(drawFrom, [e.lngLat.lng, e.lngLat.lat]));
  });
  map.on("mouseup", (e) => {
    if (!drawing || drawFrom === undefined) return;
    const geometry = rectFrom(drawFrom, [e.lngLat.lng, e.lngLat.lat]);
    exitDraw();
    justDrew = true;
    const ring = geometry.rings[0] as [number, number][];
    const tiny =
      Math.abs((ring[0] as [number, number])[0] - (ring[2] as [number, number])[0]) < 1e-5 ||
      Math.abs((ring[0] as [number, number])[1] - (ring[2] as [number, number])[1]) < 1e-5;
    if (tiny) {
      setGestureData(map, undefined); // a click, not a circle
      return;
    }
    setGestureData(map, geometry);
    gestureId = session.draw(geometry, now);
    openGesturePanel();
  });

  // ------------------------------------------------------------- looking as
  const restoreSaved = (): void => {
    const saved = loadSaved();
    if (saved === undefined) {
      syncSwitches();
      applySeason();
      return;
    }
    map.jumpTo({ center: saved.center, zoom: saved.zoom });
    seasonInput.value = String(saved.season);
    // Only the switches are remembered; the farm's own layers never hide.
    for (const [name, visible] of Object.entries(saved.lenses ?? {})) {
      if (!(name in OPTIONAL)) continue;
      const current = session.view.lenses.find((l) => l.name === name);
      if (current !== undefined && current.visible !== visible) session.toggle(name);
    }
    syncSwitches();
    applySeason();
    const selected = saved.selection?.[0];
    if (selected !== undefined && session.reading.get(selected) !== undefined) openPanel(selected);
  };
  viewerSelect.addEventListener("change", () => {
    void (async () => {
      closePanel();
      await openAs(viewerSelect.value as Id);
      paint();
      restoreSaved();
    })();
  });

  // --------------------------------------------------------- hover and pick
  const tooltip = el<HTMLElement>("tooltip");
  // Marks depend on the style, not the imagery: paint as soon as the
  // style stands so the farm never waits on the last satellite tile.
  map.on("style.load", () => {
    paint();
    restoreSaved();
    map.on("mousemove", (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: pickableLayerIds(lensNames) });
      const top = features[0];
      if (top !== undefined) {
        const props = top.properties as MarkFeatureProps;
        map.getCanvas().style.cursor = "pointer";
        tooltip.textContent = props.count > 1 ? story.andMore(props.name, props.count - 1) : props.label;
        tooltip.style.left = `${e.point.x + 14}px`;
        tooltip.style.top = `${e.point.y + 14}px`;
        tooltip.hidden = false;
      } else {
        map.getCanvas().style.cursor = "";
        tooltip.hidden = true;
      }
    });
    map.on("click", (e) => {
      if (drawing || justDrew) {
        justDrew = false;
        return; // the drag that drew a region is not a pick
      }
      const features = map.queryRenderedFeatures(e.point, { layers: pickableLayerIds(lensNames) });
      const top = features[0];
      if (top !== undefined) {
        // The engine surfaced a feature; the Reading answers (RFC-0015 §1).
        const props = top.properties as MarkFeatureProps;
        // A soil type lies over a field, never instead of it: a tap that
        // lands on both offers both.
        const under = [...new Set(features.map((f) => (f.properties as MarkFeatureProps).id))] as Id[];
        if (props.count > 1) renderStack(props.ids.split(",") as Id[]);
        else if (props.lens === "ground" && under.length > 1) renderStack(under);
        else openPanel(props.id as Id);
      } else {
        closePanel();
      }
    });
    // The View's spatial scope is where the viewer is looking (RFC-0006
    // §1, Amendment 2): the camera and the View move as one, so marks
    // always derive against the region actually on screen.
    map.on("moveend", () => {
      const b = map.getBounds();
      const w = b.getWest();
      const s = b.getSouth();
      const e = b.getEast();
      const n = b.getNorth();
      session.navigateTo({
        form: "area",
        rings: [
          [
            [w, s],
            [e, s],
            [e, n],
            [w, n],
            [w, s],
          ],
        ],
      });
      paint();
      remember();
    });
  });

  window.setTimeout(() => {
    el("hint").hidden = true;
  }, 8000);
}

// A shell that throws while opening is a dark screen with no words; the
// notice says the one thing that is true (Grower Rule 3).
boot().catch(() => notice(freshness.cantReach));
