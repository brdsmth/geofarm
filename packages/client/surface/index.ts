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
};

/** Records and corrections (supersession and retraction, said plainly). */
export const records = {
  recorded: (what: string, who: string, when: string) => `${what} — ${who}, ${when}`,
  corrected: "Corrected — the earlier version is kept in the history",
  removed: "Removed — the history still remembers it",
  putBack: "Put back the way it was",
  archivedShelf: "Tucked away — find it under History",
};

/** Claims and their basis (assertions, evidence, confidence, grounds). */
export const claims = {
  says: (who: string, what: string) => `${who} says: ${what}`,
  howSure: (pct: number) => `${pct}% sure`,
  whatsThatBasedOn: "What's that based on?",
  basedOn: (sources: string) => `Based on: ${sources}`,
  measuredVsReckoned: {
    measured: "measured",
    reckoned: "best estimate",
    expected: "expected",
  },
  disagreement: (a: string, b: string) => `${a} and ${b} see this differently — both are kept`,
};

/** Sharing (grants, scopes, capabilities — as a fence and a name). */
export const sharing = {
  shareWith: (who: string, what: string) => `Let ${who} see ${what}`,
  shareUntil: (who: string, what: string, when: string) => `Let ${who} see ${what} until ${when}`,
  canAlsoAdd: "They can also add records",
  stopSharing: (who: string) => `Stop sharing with ${who}`,
  sharedBy: (who: string) => `Shared by ${who}`,
  whoCanSee: "Who can see this?",
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

/** The map and the season (Views, lenses, temporal navigation). */
export const map = {
  whereYouAreLooking: "Where you're looking",
  showOnMap: "Show on the map",
  layers: "What's shown",
  timeSlider: "Season",
  backToToday: "Back to today",
  drawToAsk: "Circle an area to ask about it",
  keepThis: "Keep this",
  letItGo: "Let it go",
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
  showIt: "Show it",
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
  "weather-station": "Weather station",
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

/** The lens switcher and the shell's own chrome. */
export const shell = {
  brand: "geofarm",
  lenses: {
    fields: "Fields",
    boundary: "Farm line",
    places: "Places",
    work: "Notes & work",
    soil: "Soil",
    office: "Paperwork",
  } as Record<string, string>,
  findPlace: "Find a place…",
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
  measured: (what: string, value: string) => `${what}: ${value}`,
  channels: {
    pH: "pH",
    organicMatterPct: "organic matter %",
    cec: "CEC",
    rainMm: "rain (mm)",
    tempC: "temperature (°C)",
  } as Record<string, string>,
  severalHere: (n: number) => `${n} things here`,
  growing: (crop: string) => `growing ${crop}`,
  changedHere: "The line moved — scrub the season to see the old one",
  imageryCredit: "Imagery © Esri",
  twoLinesHere: "Two people redrew this line — both are kept until someone settles it",
};

/** The work (drafts, submissions, admission). */
export const work = {
  savedHere: "Saved on this device",
  waitingToSend: (n: number) => (n === 1 ? "1 record waiting to send" : `${n} records waiting to send`),
  sent: "Sent",
  couldNotSend: "Couldn't be added — kept here with the reason",
};
