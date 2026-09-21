/**
 * @geofarm/client-surface — the vocabulary membrane (RFC-0000 §2.6).
 *
 * Every user-facing string lives here, and only here (PLAN-001 §4, module
 * rule 7). Each entry is the faithful farm-language projection of an
 * internal concept per REVIEW-002 §3's table: no jargon (nothing a farmer
 * cannot say in their own words) and no euphemism (nothing that promises
 * more than the architecture delivers — a claim is not a fact, an
 * estimate is not measured, staleness is said plainly).
 *
 * The S10 lint (tools/lint-vocab.ts) scans this package with the rest of
 * the client; with real strings present, the membrane is now armed.
 */

export const PACKAGE = "@geofarm/client-surface" as const;

/** Freshness: the watermark speaking plain English (RFC-0012 §3). */
export const freshness = {
  upToDateAsOf: (time: string) => `Up to date as of ${time}`,
  lastHeardFrom: (what: string, when: string) => `${what} last reported ${when}`,
  workingOffline: "You're working offline — everything you record is kept and will be sent when you're back in signal",
  /** The served shell cannot reach its farm (Grower Rule 3): said, with
   * how old what is on screen is, never swapped for another farm. */
  cantReach: "Can't reach the farm right now. Trying again.",
  cantReachSince: (when: string) => `Can't reach the farm right now — showing what this device remembers from ${when}. Trying again.`,
  opening: "Opening the farm…",
};

/** Records and corrections (supersession and retraction, said plainly).
 * copy-pending: correction and retraction have no door in the shell yet
 * (RFC-0006 §8 correct() exists in the Session, not on screen). */
export const records = {
  recorded: (what: string, who: string, when: string) => `${what} — ${who}, ${when}`,
  corrected: "Corrected — the earlier version is kept in the history",
  removed: "Removed — the history still remembers it",
  putBack: "Put back the way it was",
  archivedShelf: "Tucked away — find it under History",
};

/** Claims and their basis (assertions, evidence, confidence, grounds). */
export const claims = {
  /** copy-pending: rows carry the signature in a column, not a sentence;
   * the sentence form waits for a spoken or narrated surface. */
  says: (who: string, what: string) => `${who} says: ${what}`,
  howSure: (pct: number) => `${pct}% sure`,
  whatsThatBasedOn: "What's that based on?",
  basedOn: (sources: string) => `Based on: ${sources}`,
  /** copy-pending: the measured/estimated split reaches the shell with the
   * L2 provenance filter (P-31), not before. */
  measuredVsReckoned: {
    measured: "measured",
    reckoned: "best estimate",
    expected: "expected",
  },
  /** copy-pending: two people's claims about one thing are listed today;
   * naming the disagreement waits for the standing-claim view. */
  disagreement: (a: string, b: string) => `${a} and ${b} see this differently — both are kept`,
};

/** Sharing (grants, scopes, capabilities — as a fence and a name). */
export const sharing = {
  /** copy-pending: the one-sentence share summary and the add-records
   * capability wait for the share form to offer more than represent. */
  shareWith: (who: string, what: string) => `Let ${who} see ${what}`,
  shareUntil: (who: string, what: string, when: string) => `Let ${who} see ${what} until ${when}`,
  canAlsoAdd: "They can also add records",
  stopSharing: (who: string) => `Stop sharing with ${who}`,
  /** The short form on the button; the sentence lives in the row. */
  stop: "Stop",
  everyoneSees: "Everyone on the farm can already see this",
  sharing: "Sharing…",
  stopping: "Stopping…",
  sharedBy: (who: string) => `Shared by ${who}`,
  whoCanSee: "Who can see this?",
  /** copy-pending: who a viewer acts for belongs in the farm chip once
   * identity comes from the door (T14), not from a menu. */
  actingFor: (who: string, forWhom: string) => `${who}, for ${forWhom}`,
  /** The sharing panel (M6 at the surface): a decision, not a form of
   * forms — who, what kind of thing, until when. */
  onlyTheFarm: "Only the farm's own people",
  sees: (what: string) => `sees ${what}`,
  until: (when: string) => `until ${when}`,
  insideTheLine: "inside the drawn line",
  letSomeoneSee: "Let someone see the farm",
  whoLabel: "Who",
  whatLabel: "What they can see",
  untilLabel: "Until",
  whatChoices: {
    agronomy: "The agronomy — fields, crops, notes, readings",
    everything: "Everything, including the paperwork",
  },
  /** The same choices, short enough to sit in a sentence. */
  scopeShort: {
    agronomy: "the agronomy",
    everything: "everything",
    some: "some of it",
  } as Record<string, string>,
  share: "Share",
  shared: "Shared — they'll see it on their next visit",
  stopped: "Sharing stopped — what they already saw stays seen",
  couldNotShare: "Couldn't share that",
};

/** The sources (RFC-0011): the services that feed the map are engaged
 * participants, listed as sources — never as people the farm shares with.
 * Stopping one says what stops (Grower Rule 8). */
export const sources = {
  heading: "Where the weather, satellite, and soil survey come from",
  stopUsing: "Stop using",
  willStop: (what: string) => `${what} will stop updating on this farm`,
  neverReported: (what: string) => `${what} hasn't reported yet`,
};

/** The map and the season (Views, lenses, temporal navigation). */
export const map = {
  /** copy-pending: named Views and promoted measurements are Session
   * verbs the shell does not yet offer (RFC-0006 §1.3, §5). */
  whereYouAreLooking: "Where you're looking",
  showOnMap: "Show on the map",
  layers: "What's shown",
  timeSlider: "Season",
  dragToLookBack: "drag to look back",
  backToToday: "Back to today",
  drawToAsk: "Circle an area to ask about it",
  keepThis: "Keep this",
  letItGo: "Let it go",
  /** The layer list: the four always-on lenses are not switches. */
  always: "always",
};

/** The story panel (inspection in place, RFC-0006 §5; REVIEW-003 A3 —
 * the panel names its temporal frame instead of silently ignoring it). */
export const story = {
  asOf: (when: string) => `As of ${when}`,
  addNote: "Add a note",
  notePlaceholder: "What's happening here?",
  keepNote: "Add it to the story",
  neverMind: "Never mind",
  andMore: (what: string, n: number) => (n === 1 ? `${what} — and 1 more` : `${what} — and ${n} more`),
};

/** The assistant (RFC-0010 at the surface): asking, answers, their basis,
 * and the deliberate act of keeping one. An answer is never bare — it
 * always arrives with how-sure and what-it's-based-on within reach. */
export const assistant = {
  askAbout: "Ask about this",
  askThisArea: "Ask about this area",
  askPlaceholder: "What do you want to know?",
  ask: "Ask",
  circledArea: "Circled area",
  keepAnswer: "Keep this answer",
  keptAnswer: "Kept — it's part of the story now",
  keeping: "Keeping…",
  showIt: "Show it",
  /** An ask is a wait and can fail (Grower Rule 3): both are said. */
  thinking: "Thinking about it…",
  couldNotAnswer: "Couldn't get an answer — try again",
};

/** What things are called on the map: the classification catalog. A
 * classification is the envelope's word; this is the farm's. */
export const kinds: Record<string, string> = {
  farm: "Farm line",
  field: "Field",
  zone: "Zone",
  pond: "Pond",
  building: "Building",
  road: "Road",
  planting: "Planting",
  harvest: "Harvest",
  spray: "Spray",
  note: "Note",
  maintenance: "Maintenance",
  diagnosis: "Diagnosis",
  reading: "Answer",
  anomaly: "Alert",
  advisory: "Advice",
  invoice: "Invoice",
  lien: "Lien",
  grant: "Sharing",
  retraction: "Removed",
  "soil-site": "Sample site",
  "soil-sample": "Soil sample",
  "soil-estimate": "Soil estimate",
  "soil-unit": "Soil type",
  "soil-survey": "Soil survey",
  "weather-station": "Weather station",
  "weather-reading": "Weather reading",
  "weather-estimate": "Weather estimate",
  forecast: "Forecast",
  imagery: "Satellite pass",
};

/** What is growing: crop names for the state-of-the-farm colouring. */
export const crops: Record<string, string> = {
  corn: "Corn",
  soybeans: "Soybeans",
  wheat: "Wheat",
  fallow: "Nothing planted",
};

/** The legend (Grower Rule 5): every colour on the map has a word beside
 * it. Keys are the colour tables in the shell's map (crops and mark
 * families); the legend lint holds the two key sets equal. */
export const legend: Record<string, string> = {
  corn: "Corn",
  soybeans: "Soybeans",
  wheat: "Wheat",
  fallow: "Nothing planted",
  operation: "Work — planting, spraying, harvest",
  observation: "Notes and samples",
  claim: "Answers, alerts, and advice",
  paper: "Paperwork",
  place: "Ponds, buildings, roads",
  ground: "Soil types — USDA survey",
  soil: "Sample sites",
  weather: "Weather",
  imagery: "Satellite passes",
};

/** The soil survey, said plainly: what the survey says of a piece of
 * ground. A survey is drawn from pits dug across a county, not measured
 * in this field — the last line says so (a claim is not a fact), and the
 * row beneath carries how sure. Inches and acres: the survey's
 * centimetres are the survey's, not the grower's. */
export const ground = {
  acresHere: (acres: string) => `${acres} acres of it on this farm`,
  madeOf: (soils: string) => `What's in it: ${soils}`,
  share: (soil: string, pct: string) => `${soil} ${pct}%`,
  drainage: (how: string) => `Drainage: ${how}`,
  slope: (pct: string) => `Slope: about ${pct}%`,
  holdsWater: (inches: string) => `Holds about ${inches} in. of water a crop can use, in the top 40 in.`,
  waterTable: (inches: string) => `Water table comes within ${inches} in. of the surface`,
  floods: (how: string) => `Flooding: ${how}`,
  cornRating: (rating: string) => `Corn suitability rating (CSR2): ${rating} out of 100`,
  productivity: (index: string) => `National crop productivity index: ${index} out of 100`,
  topsoil: (inches: string, facts: string) => `Top ${inches} in.: ${facts}`,
  clay: (pct: string) => `${pct}% clay`,
  organicMatter: (pct: string) => `${pct}% organic matter`,
  pH: (value: string) => `pH ${value}`,
  fromSurvey: (when: string) =>
    `From the USDA soil survey published ${when}. Surveyors mapped this from pits dug across the county — it is their best description, not a test of this field.`,
};

/** The lens switcher and the shell's own chrome. */
export const shell = {
  brand: "geofarm",
  lenses: {
    fields: "Fields",
    boundary: "Farm line",
    places: "Places",
    work: "Notes & work",
    ground: "Soil types",
    soil: "Soil",
    weather: "Weather",
    imagery: "Satellite",
    office: "Paperwork",
  } as Record<string, string>,
  findPlace: "Find a place…",
  nothingCalled: (q: string) => `Nothing called “${q}” on the farm`,
  tapHint: "Tap a field to see its story",
  close: "Close",
  today: "Today",
  thisPlace: "This place",
  place: "Place",
  hereSince: (what: string, year: string) => `${what} · here since ${year}`,
  whenWhat: (what: string, when: string) => `${what} · ${when}`,
  whatsHappened: "What's happened here",
  nothingYet: "Nothing recorded here yet.",
  onTheFarm: "This season on the farm",
  lookingAs: "Looking as",
  atThisSpot: "At this spot",
  /** A field between crops: said on its own, never as "growing nothing". */
  fallow: "Nothing planted right now",
  /** The map engine could not start: the one failure a shell cannot
   * paint around, so it is said in words (Grower Rule 3). */
  noMapEngine: "This browser can't draw the map — try Chrome or Safari, or update the phone",
  measured: (what: string, value: string) => `${what}: ${value}`,
  channels: {
    pH: "pH",
    organicMatterPct: "organic matter %",
    cec: "CEC",
    rainMm: "rain (mm)",
    tempC: "temperature (°C)",
    tempMaxC: "high (°C)",
    tempMinC: "low (°C)",
    precipMm: "rain (mm)",
    dewpointC: "dew point (°C)",
    humidityPct: "humidity (%)",
    windKph: "wind (km/h)",
    rainChancePct: "chance of rain (%)",
  } as Record<string, string>,
  /** A satellite pass in the story: what the pixels are, plainly. */
  cloudCover: (pct: number) => `${pct}% cloud`,
  seenFrom: (platform: string) => `seen from ${platform}`,
  /** Which intelligence is answering, said once at the bottom of the map. */
  answeredBy: (engine: string) => `Answers from ${engine}`,
  answeredByRules: "Answers from the built-in rules (no model connected)",
  liveWorld: "Live farm — shared with everyone who opens it",
  deviceWorld: "Demo farm — kept on this device only",
  severalHere: (n: number) => `${n} things here`,
  growing: (crop: string) => `growing ${crop}`,
  /** copy-pending: the moved-line notice waits for a boundary-change mark
   * on the map (REVIEW-003 §5, "what changed between frames"). */
  changedHere: "The line moved — scrub the season to see the old one",
  imageryCredit: "Imagery © Esri",
  twoLinesHere: "Two people redrew this line — both are kept until someone settles it",
};

/** The work (drafts, submissions, admission). */
export const work = {
  savedHere: "Saved on this device",
  waitingToSend: (n: number) => (n === 1 ? "1 record waiting to send" : `${n} records waiting to send`),
  sending: "Sending…",
  sent: "Sent",
  couldNotSend: "Couldn't be added — kept here with the reason",
  /** The door's reasons, in the farm's words. The door speaks in RFC
   * citations (developer-facing); a farmer hears why, plainly. Anything
   * unlisted falls to the last line rather than leaking the door's words. */
  because: (reason: string) => `Couldn't be added — ${reason}`,
  reasons: [
    ["unknown subject", "the thing it's about isn't on the farm anymore"],
    ["outside your authoring scope", "you can't add records here"],
    ["the public cannot author", "you need to be on the farm to add records"],
    ["requires representation", "you're not set up to act for this farm"],
    ["already admitted", "it was already added"],
  ] as [string, string][],
  reasonUnknown: "the farm didn't accept it",
};
