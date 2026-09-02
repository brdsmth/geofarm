/**
 * geofarm — the shell. One map, one View, five verbs (RFC-0006).
 * No router, no pages: destinations = 1 (S1). Everything below wires
 * gestures to Session verbs and paints marks; nothing below holds state
 * of its own beyond the three stores (RFC-0014, S2). Every word a person
 * reads comes from the surface package (RFC-0000 §2.6, Amendment 2).
 */

import "maplibre-gl/dist/maplibre-gl.css";
import "./app.css";
import type { AdmittedRecord, Geometry, Id } from "../../../packages/world/index.ts";
import {
  assistant as assistantCopy,
  claims,
  crops,
  kinds,
  map as mapCopy,
  sharing,
  shell,
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
import { Session } from "../../../packages/client/interaction/index.ts";
import { PendingStore, StoragePersistence } from "../../../packages/client/stores/index.ts";
import { AGRONOMY, NOW, seedWorld } from "./seed.ts";
import {
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
  { name: "office", filter: { classifications: ["invoice", "lien"] } },
];

/** Colour families for marks: what kind of thing a dot is. */
const GROUP: Record<string, string> = {
  planting: "operation",
  harvest: "operation",
  spray: "operation",
  maintenance: "operation",
  note: "observation",
  "soil-sample": "observation",
  "soil-site": "soil",
  diagnosis: "claim",
  reading: "claim",
  anomaly: "claim",
  advisory: "claim",
  invoice: "paper",
  lien: "paper",
  pond: "place",
  building: "place",
  road: "place",
};

const MONTH0 = Date.UTC(2019, 0, 1);
const MONTHS = 90; // Jan 2019 .. Jun 2026, slider max = today
const SEASON_END = "2026-11-01";

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

async function boot(): Promise<void> {
  const world = await seedWorld(localStorage);

  // ------------------------------------------------------------ chrome copy
  el("brand-name").textContent = shell.brand;
  el("viewer-caption").textContent = shell.lookingAs;
  el<HTMLInputElement>("search-input").placeholder = shell.findPlace;
  el("hint").textContent = shell.tapHint;
  el("panel-close").setAttribute("aria-label", shell.close);
  el("today").textContent = mapCopy.backToToday;
  el("season").setAttribute("aria-label", mapCopy.timeSlider);
  el("layers").setAttribute("aria-label", mapCopy.layers);
  el("draw-ask").textContent = mapCopy.drawToAsk;

  // ----------------------------------------------------------- the viewer
  // One Session per viewer (RFC-0006 §1): switching who is looking swaps
  // the Reading and the outbox, never the map. Names are read from the
  // Reading — a signature resolves to a name only if the viewer may see
  // the person (RFC-0002 §2.3).
  let session!: Session;
  let engagement!: AskEngagement;
  const names = new Map<Id, string>();
  const nameOf = (id: Id): string => names.get(id) ?? "";

  const openAs = async (actor: Id): Promise<void> => {
    session = new Session(
      actor,
      world.boundary,
      new PendingStore(new StoragePersistence(`geofarm-pending:${actor}`, localStorage)),
      NOW,
    );
    // Reconnection is Append + Project (RFC-0012 §5): whatever this
    // viewer left unsent goes first, then the walk.
    if (session.pending.submissions.length > 0) await session.send();
    await session.sync();
    names.clear();
    for (const r of session.reading.all()) {
      const n = (r.body as { name?: string } | undefined)?.name;
      if (r.kind === "actor" && n !== undefined) names.set(r.id, n);
    }
    for (const l of LENSES) session.reveal({ name: l.name, filter: l.filter, visible: true });
    // The assistant, engaged inside this viewer's situation (RFC-0010):
    // the engagement reads the live View + Pending + Reading.
    engagement = new AskEngagement(
      world.boundary,
      world.assistant,
      new RuleReasoner(),
      viewerStores(session),
      world.org,
    );
  };
  await openAs(world.people[0] as Id);

  const viewerSelect = el<HTMLSelectElement>("viewer");
  for (const person of world.people) {
    const o = document.createElement("option");
    o.value = person;
    o.textContent = nameOf(person);
    viewerSelect.appendChild(o);
  }

  const map = createMap(el("map"));
  const lensNames = LENSES.map((l) => l.name);

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
    const label = crop !== "" && crop !== "fallow" ? `${name} · ${crops[crop] ?? crop}` : name;
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
    const where = place !== undefined ? ` <span class="who">· ${place}</span>` : "";
    return `<div class="row"><span class="when">${fmtDate(h.occurrence.start)}</span><span class="what">${what}${sure}${where}</span><span class="who">${who}</span></div>`;
  };

  const frameHtml = (): string =>
    session.view.time.start === NOW
      ? ""
      : `<div class="frame">${story.asOf(seasonLabel.textContent ?? "")}</div>`;

  // The farm's own pulse (REVIEW-003 §3): "what happened this season,
  // anywhere?" — a lens presentation in the panel (RFC-0006 §6), not a
  // page. Everything up to the bound time, newest first, with its place.
  const farmStoryOf = (): string => {
    const bound = Date.parse(session.view.time.end ?? session.view.time.start);
    const rows = session.reading
      .all()
      .filter((r) => r.kind !== "entity" && r.kind !== "actor" && r.classification !== "grant")
      .filter((r) => Date.parse(r.occurrence.start) <= bound)
      .sort((a, b) => Date.parse(b.occurrence.start) - Date.parse(a.occurrence.start))
      .slice(0, 14)
      .map((r) => rowHtml(r, nameOf(r.subjects[0] as Id)))
      .join("");
    return rows.length > 0 ? `<h3>${shell.onTheFarm}</h3>${rows}` : `<p class='quiet'>${shell.nothingYet}</p>`;
  };

  const storyOf = (id: Id): string => {
    const r = session.reading.get(id);
    if (r === undefined) return "";
    const name = nameOf(id) || text(r) || shell.thisPlace;
    const kindLabel = kinds[r.classification] ?? shell.place;
    const since =
      r.kind === "entity"
        ? `<div class="since">${shell.hereSince(kindLabel, String(new Date(r.occurrence.start).getFullYear()))}</div>`
        : `<div class="since">${shell.whenWhat(kindLabel, fmtDate(r.occurrence.start))}</div>`;
    if (r.classification === "farm") {
      return `<h2>${name}</h2>${since}${frameHtml()}${farmStoryOf()}${sharesHtml()}`;
    }
    const bundle = session.inspect(id);
    // Two people redrew the same line without hearing each other: both
    // are kept and said so (RFC-0012 §5) — never silently picked between.
    const fork =
      (bundle?.contenders.length ?? 0) > 1 ? `<div class="notice">${shell.twoLinesHere}</div>` : "";
    const crop = r.classification === "field" ? cropOf(id) : "";
    const growing =
      crop !== "" ? `<div class="since growing">${shell.growing(crops[crop] ?? crop)}</div>` : "";
    const rows = (bundle?.timeline ?? []).slice().reverse().map((h) => rowHtml(h)).join("");
    const rowsOrQuiet =
      rows.length > 0 ? `<h3>${shell.whatsHappened}</h3>${rows}` : `<p class='quiet'>${shell.nothingYet}</p>`;
    return `<h2>${name}</h2>${since}${growing}${frameHtml()}${fork}${rowsOrQuiet}`;
  };

  // --------------------------------------------- sharing (M6 at the surface)
  // "Who can see this?" is a reading of grant history; sharing is one
  // decision — who, what kind of thing, until when — authored as a Grant
  // (RFC-0002 §4). Nothing here is a permissions screen.
  const scopeLabel = (scope: { classifications?: string[]; region?: unknown }): string => {
    if (scope.region !== undefined) return sharing.insideTheLine;
    if (scope.classifications === undefined) return sharing.scopeShort.everything as string;
    const agronomic = AGRONOMY.every((c) => scope.classifications?.includes(c));
    return (agronomic ? sharing.scopeShort.agronomy : sharing.scopeShort.some) as string;
  };
  const sharesHtml = (gestureId?: string): string => {
    const shares = session.shares();
    const rows = shares
      .map(
        (s) =>
          `<div class="row"><span class="what">${nameOf(s.grant.grantee) || kinds.grant} ${sharing.sees(scopeLabel(s.grant.scope))}${
            s.grant.until !== undefined ? ` ${sharing.until(fmtDate(s.grant.until))}` : ""
          }</span><span class="who">${sharing.sharedBy(nameOf(s.record.actors.actor))}</span><button class="stop" data-id="${s.record.id}">${sharing.stopSharing(nameOf(s.grant.grantee))}</button></div>`,
      )
      .join("");
    const others = world.people.filter((p) => p !== session.actor && !shares.some((s) => s.grant.grantee === p));
    const options = others.map((p) => `<option value="${p}">${nameOf(p) || p}</option>`).join("");
    return `<div class="shares"><h3>${sharing.whoCanSee}</h3>${
      rows || `<p class="quiet">${sharing.onlyTheFarm}</p>`
    }${rows}
      <div class="compose"><button id="share-open">${sharing.letSomeoneSee}</button>
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
        <p id="share-status" class="quiet" hidden></p>
      </form></div></div>`;
  };

  const wireShares = (rerender: () => void): void => {
    const openBtn = document.getElementById("share-open") as HTMLButtonElement | null;
    const form = document.getElementById("share-form") as HTMLFormElement | null;
    if (openBtn === null || form === null) return;
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
        at: NOW,
      });
      session.commit(draft);
      void session.send().then(async (result) => {
        const status = el<HTMLElement>("share-status");
        if (result.rejected.length > 0) {
          status.textContent = sharing.couldNotShare;
          status.hidden = false;
          return;
        }
        await session.sync();
        rerender();
      });
    });
    for (const b of panelBody.querySelectorAll<HTMLButtonElement>("button.stop")) {
      b.addEventListener("click", () => {
        const draft = session.revoke(b.dataset.id as Id, NOW);
        if (draft === undefined) return;
        session.commit(draft);
        b.disabled = true;
        void session.send().then(async (result) => {
          if (result.rejected.length > 0) {
            b.textContent = sharing.couldNotShare;
            return;
          }
          await session.sync();
          rerender();
        });
      });
    }
  };

  // ------------------------------------------- the author's door (P0 #2)
  const composeHtml = `<div class="compose">
      <button id="add-note">${story.addNote}</button>
      <form id="compose-form" hidden>
        <textarea id="note-text" rows="3" placeholder="${story.notePlaceholder}"></textarea>
        <div class="compose-actions">
          <button type="submit" id="note-save">${story.keepNote}</button>
          <button type="button" id="note-cancel">${story.neverMind}</button>
        </div>
        <p id="compose-status" class="quiet" hidden></p>
      </form>
    </div>`;

  // --------------------------------------------------- the Ask verb (M5)
  const askHtml = `<div class="ask">
      <button id="ask-open">${assistantCopy.askAbout}</button>
      <form id="ask-form" hidden>
        <input id="ask-text" type="text" placeholder="${assistantCopy.askPlaceholder}" autocomplete="off" />
        <button type="submit" id="ask-send">${assistantCopy.ask}</button>
      </form>
      <div id="ask-replies"></div>
    </div>`;

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
        b.disabled = true;
        void engagement.promote(claim).then(async (result) => {
          if (!result.accepted) {
            b.textContent = work.couldNotSend;
            return;
          }
          await session.sync();
          paint();
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
          if (lens !== undefined && state?.visible === false) {
            session.toggle(lens.name);
            lensButtons.get(lens.name)?.classList.add("on");
          }
        }
        paint();
        b.disabled = true;
      });
    }
  };

  const wireAsk = (): void => {
    const openBtn = el<HTMLButtonElement>("ask-open");
    const form = el<HTMLFormElement>("ask-form");
    const input = el<HTMLInputElement>("ask-text");
    openBtn.addEventListener("click", () => {
      openBtn.hidden = true;
      form.hidden = false;
      input.focus();
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = input.value.trim();
      if (q === "") return;
      input.value = "";
      void engagement.ask(q).then(renderReplies);
    });
  };

  const renderPanel = (id: Id): void => {
    panelBody.innerHTML = storyOf(id) + askHtml + composeHtml;
    wireAsk();
    wireShares(() => renderPanel(id));
    const addBtn = el<HTMLButtonElement>("add-note");
    const form = el<HTMLFormElement>("compose-form");
    const input = el<HTMLTextAreaElement>("note-text");
    addBtn.addEventListener("click", () => {
      addBtn.hidden = true;
      form.hidden = false;
      input.focus();
    });
    el("note-cancel").addEventListener("click", () => {
      form.hidden = true;
      addBtn.hidden = false;
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const body = input.value.trim();
      if (body === "") return;
      const draftId = session.annotate("note", { text: body }, NOW);
      session.commit(draftId);
      void session.send().then(async (result) => {
        if (result.rejected.length > 0 || result.deferred > 0) {
          const status = el<HTMLElement>("compose-status");
          status.textContent = result.deferred > 0 ? work.savedHere : work.couldNotSend;
          status.hidden = false;
          return;
        }
        await session.sync();
        paint();
        renderPanel(id); // the new note is part of the story now
      });
    });
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
          `<button data-id="${r.id}"><span class="when">${fmtDate(r.occurrence.start)}</span><span class="what">${text(r)}</span><span></span><span class="who">${nameOf(r.actors.actor)}</span></button>`,
      )
      .join("");
    panelBody.innerHTML = `<h2>${shell.atThisSpot}</h2><div class="since">${shell.severalHere(ids.length)}</div><div class="stack">${rows}</div>`;
    for (const b of panelBody.querySelectorAll<HTMLButtonElement>(".stack > button")) {
      b.addEventListener("click", () => openPanel(b.dataset.id as Id));
    }
    session.select(ids);
    panel.hidden = false;
    el("hint").hidden = true;
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

  const openPanel = (id: Id): void => {
    dropGesture();
    session.select([id]);
    renderPanel(id);
    panel.hidden = false;
    el("hint").hidden = true;
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
        askHtml.replace(assistantCopy.askAbout, assistantCopy.askThisArea) +
        sharesHtml(gestureId) +
        `<div class="compose"><button id="gesture-drop">${mapCopy.letItGo}</button></div>`;
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
    panel.hidden = false;
    el("hint").hidden = true;
  };

  // ----------------------------------------------------------- layer switcher
  const layersBox = el<HTMLElement>("layers");
  const lensButtons = new Map<string, HTMLButtonElement>();
  for (const l of LENSES) {
    const b = document.createElement("button");
    b.textContent = shell.lenses[l.name] ?? l.name;
    b.classList.add("lens", "on");
    b.addEventListener("click", () => {
      session.toggle(l.name);
      b.classList.toggle("on");
      paint();
      remember();
    });
    lensButtons.set(l.name, b);
    layersBox.appendChild(b);
  }
  const syncLensButtons = (): void => {
    for (const l of session.view.lenses) lensButtons.get(l.name)?.classList.toggle("on", l.visible);
  };

  // ---------------------------------------------------------------- timeline
  const seasonInput = el<HTMLInputElement>("season");
  const seasonLabel = el<HTMLElement>("season-label");
  const todayBtn = el<HTMLButtonElement>("today");
  // Year ticks (REVIEW-003 §4.4): the scrubber says what it controls.
  const ticks = el<HTMLElement>("ticks");
  for (let year = 2019; year <= 2026; year++) {
    const idx = (year - 2019) * 12;
    const span = document.createElement("span");
    span.textContent = String(year);
    span.style.left = `${(idx / MONTHS) * 100}%`;
    ticks.appendChild(span);
  }
  const applySeason = (): void => {
    const idx = seasonInput.valueAsNumber;
    if (idx >= MONTHS) {
      session.navigateTime({ start: NOW });
      seasonLabel.textContent = shell.today;
      todayBtn.hidden = true;
    } else {
      session.navigateTime({ start: monthToIso(idx + 1) }); // end of that month
      seasonLabel.textContent = monthLabel(idx);
      todayBtn.hidden = false;
    }
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
    searchResults.innerHTML = hits
      .map((r) => {
        const label = nameOf(r.id) || text(r);
        const where = r.kind === "entity" ? kinds[r.classification] ?? "" : nameOf(r.subjects[0] as Id) || kinds[r.classification] || "";
        return `<button data-id="${r.id}"><span>${label}</span><small>${where}</small></button>`;
      })
      .join("");
    searchResults.hidden = hits.length === 0;
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
    gestureId = session.draw(geometry, NOW);
    openGesturePanel();
  });

  // ------------------------------------------------------------- looking as
  const restoreSaved = (): void => {
    const saved = loadSaved();
    if (saved === undefined) return;
    map.jumpTo({ center: saved.center, zoom: saved.zoom });
    seasonInput.value = String(saved.season);
    for (const [name, visible] of Object.entries(saved.lenses ?? {})) {
      const current = session.view.lenses.find((l) => l.name === name);
      if (current !== undefined && current.visible !== visible) session.toggle(name);
    }
    syncLensButtons();
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
        if (props.count > 1) renderStack(props.ids.split(",") as Id[]);
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

void boot();
