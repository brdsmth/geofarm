# REVIEW-004 — The MVP Review

| | |
|---|---|
| **Review** | 004 |
| **Scope** | The first cut (M0–M8) against RFC-0016 §4's success criteria S1–S9 and REVIEW-002 §9's S10; the obligation RFC-0016 §8 closes on |
| **Stance** | The instruments are read as they are; thresholds are set here for the first time, and said to be first guesses |
| **Author** | Bradley |
| **Date** | 2026-09-02 |
| **Outcome** | S1–S8 hold; S9 read, with one artifact named; S10 zero. Four claims strained, each routed to its owning RFC. Continue; no architecture re-opens. |

---

## 1. Executive review

RFC-0016 said the MVP was an experiment and its features were instruments, and that success was "S1–S8 hold, and S9's measurements exist — whatever they show." That is the verdict: **they hold, and the measurements exist.** Eight milestones landed as specified; the two places the build could not follow the specification as written (a walk that did not grow, and a sampled-source adapter with weather in its name) were both *fixed toward* the RFCs, not around them, which was the result PLAN-001 §0 asked the build to surface.

The sharpest single finding is the same one REVIEW-003 made at the slice: the architecture settles arguments. Four times the build met a design question it had not been asked — who may see the grant that bounds them; what a fork in a supersession chain looks like on screen; what happens to existing content when a grant lands after the watermark; whether a soil lab is a weather station — and four times a frozen RFC already had the answer (RFC-0002 §2.3, RFC-0012 §5, RFC-0012 §4, RFC-0011 §2). Nothing in the ontology, the temporal model, access, or the boundary was amended by this build. The amendments that did land (RFC-0006 A2, RFC-0015 A1, RFC-0000 A2) were REVIEW-003's four, adopted as it asked.

The product is now what RFC-0016 §1 described, in one browser: a farm on one map, its history scrubbable, its collaborators sharing by decision, its intelligence answering with its basis showing, and its sixth layer added without touching a package. What it is not yet is *used*: every instrument below was read against a seeded season and a fixture cast. The thresholds (§3) are therefore first guesses, written down so that a real season can prove them wrong.

## 2. The success criteria, read

| Criterion | Verdict | Evidence |
|---|---|---|
| **S1 — No pages** | **Holds** | One `index.html`, no router, no second destination; the sharing surface, the audit answer, the farm's pulse, and the sixth layer all landed in the panel or the map. Structural read: `destinations = 0` (tools/instruments; tests/m6, tests/m8). |
| **S2 — No shadow stores** | **Holds** | Exactly `ReadingStore`, `PendingStore`, and the View value. The shell's viewer switch swaps Sessions rather than caching a second Reading; name lookup is a memo over the Reading, dropped on every switch. Structural read: `stores = [Reading, Pending]`. |
| **S3 — The walk is enough** | **Holds, after one fix** | Live updates, backfill (M4), offline reconnection (M7), and the newly-granted world (M8) all ride the knowledge-time walk. No merge, diff, or resolver code exists in client, boundary, or journal (tests/m7 grep). The one fix: the walk did not deliver *existing* content a new grant admitted — RFC-0012 §4 said it must; the door now does, statelessly, and the Reading dedups by identity. |
| **S4 — The sixth layer is free** | **Holds, with one generalization** | Soil samples landed as a Grant Event, a border configuration (channels → measurement / interpretation; what the records are called), and a lens definition. Zero soil-specific code in any package (tests/m8 asserts it). The generalization: the sampled-source adapter's record names became config — 12 lines in `feeds/weather`, none anywhere else. T3 held: the agronomist's predicate did not name soil, so soil did not exist for her, with no access code written. |
| **S5 — Audit without an audit system** | **Holds** | "What could the agronomist see in June?" is `Session.reachOf(actor, asOf)`: the grant projection applied over the asker's own Reading. No exported symbol in `packages/` is named for audit (structural read, asserted in tests/m6). |
| **S6 — The sub-world holds** | **Holds** | The M2 red-team suite still passes; M6 re-ran it under real two-party collaboration with the AI between the parties: a represent-scoped agronomist's Reading holds no lien, her session's assistant names no hazard, and her post-revocation append dissolves into "unknown subject" rather than "forbidden." |
| **S7 — Context is inherited, never restated** | **Holds** | Every ask in tests/m5, tests/m6, and the instrument run is bare text; place, time, lenses, selection, and drawn regions come from the three stores. The shell's ask box and circle-and-ask send nothing but the question. |
| **S8 — Every claim answers** | **Holds** | Claims are shape-gated (private constructor, one mint); every mark on every frame resolves through the Reading (tests/m3, m4, m8). Peel-back reaches records inward and grounds outward in the shell's "What's that based on?". |
| **S9 — The instrumented worries** | **Read** | §3. |
| **S10 — Vocabulary leak rate** | **Zero** | 0 vocabulary leaks, 0 location leaks across 10 files, 5 named deviations each carrying its reason (§3). Location is now enforced, not trusted (RFC-0000 Amendment 2). |

## 3. The instruments

Read on 2026-09-02 with `bun tools/instruments/read.ts` against the seeded demo world (60 records) and the fixture worlds under test.

**S9(a) — bitemporal divergence.** Demo world: 49 of 49 content records diverge by more than a day (44 learned late, 5 known before occurring). **This reading is an artifact and is reported as one**: a seeded history is admitted all at once, which is pure backfill, and the seed's knowledge clock runs a month ahead of some occurrences. The meaningful readings are the designed sources under test — the M7 field day (4 of 4 records late by hours, tests/m7), the M4 archive (24 scenes with deep occurrence and current knowledge), and forecasts (known before occurring, tests/m4). *Verdict:* the three designed divergence sources exist and behave; how often they arise in a *lived* season is unmeasured until there is one. First threshold: if fewer than 5% of a real season's records diverge by more than a day, RFC-0004 §11's "over-built" reading is on the table.

**S9(b) — promotion rate of consequential answers.** Demo baseline: 10 claims offered (every field asked once by the owner and once by the agronomist), 0 promoted, 0 recorded — honestly zero, because nobody was there to keep one. Under test, promotion works end to end (tests/m5, m6). *Verdict:* the instrument exists; the rate needs people. First threshold: fewer than 1 in 5 acted-on answers promoted means RFC-0010 §9's invisible-advice gap is real and interaction design owes a fix.

**S9(c) — grant shape (RFC-0002 §8.5's tripwire).** Demo world: 5 standing grants — 3 predicate, 2 universal (the owner's and the operator's membership), **0 identity, 0 mixed**. Fixture worlds and every share authored through the Session in tests are predicate-shaped; the drawn share adds a region to a predicate rather than enumerating things. *Verdict:* the tripwire has not fired. First threshold: identity-scopes above a third of shares issued means Resources were rebuilt with extra steps and RFC-0002 §8.5 reconvenes.

**S10 — the membrane.** 0 vocabulary leaks; 0 location leaks; 5 named deviations: two developer-facing error messages, one HTTP status body, one glyph-set name, and the seed file as a whole (world content, not system copy).

**P-44 — the cost of offline (RFC-0012 §5's own instrument).** 21 client lines and one boundary `case`; zero lines of merge, sync, or conflict code; under an hour including tests. *Near-free — confirmed.*

## 4. Claims strained, routed

None falsified. Four strained, each sent to the RFC that owns it:

1. **RFC-0012 §4 — "a grant newly issued admits its scope's existing content into the next walk."** True in the text, false in the first implementation: the walk scanned only above the watermark. The fix re-delivers the now-viewable past when a grant lands in the delta, and the Reading keeps each record once. The strain is the sentence's silence on *how* a stateless door knows the world grew; the implementation's answer (any grant in the delta re-delivers; identity dedups) is one of several, and the section should name the obligation explicitly. *Proposed: one clarifying sentence in §4; no semantic change.*
2. **RFC-0002 §2.3 — "an Actor should know the bounds of their own access."** Stated as a requirement, not modeled: nothing in §4's grant model made a grant readable by its grantee, and RFC-0014 §2's "who I am here is knowledge" cannot be true without it. The build added the horizon holding — grants naming an Actor are viewable by that Actor — in `access`. *Proposed: state the horizon as a normative consequence of §2.3 in RFC-0002; it is currently an implementation reading of a sentence.*
3. **RFC-0011 §2 / RFC-0016 S4 — "touching lens definition and border classification only."** Held in spirit: the soil layer needed no code that knows soil. But "border classification" had to grow to include *what the records are called*, because the weather adapter had its names hard-coded. The lesson is that an adapter is not config-and-translation until its vocabulary is also config. *Proposed: RFC-0011 §2 says so in one sentence; module rule 4 in PLAN-001 gains "including classification names."*
4. **RFC-0012 §5 — concurrent supersession "degrades to preserved, derived disagreement."** True, and now visible (two heads, two lines, a notice). But the record shape allows a reconciliation to supersede *one* head, so settling a fork takes a supersession plus a retraction — two acts where one was meant. *Proposed: RFC-0004 §5 decides whether a record may supersede several (a merge-shaped supersession, still addition-only) or whether two acts is the honest cost. Recommendation: leave it at two; a fork should be visibly settled, not quietly collapsed.*

One informal note, not a strain: RFC-0011 §9 said the conservative border default (uncertain → Assertion) "deserves to be normative." The feeds have honored it since M4; the sentence is still in a self-review. It should move to §2.

## 5. RFC-0016 §6's architectural risks, statused

1. **The predicate-scoping bet** — S6 held under real collaboration; C2 was administrable as one decision (who, what kind, until when). *Not re-opened.*
2. **Bitemporality's weight** — unmeasured in the sense that matters (§3, S9(a)); the designed sources all work. *Open until a lived season.*
3. **Authored-only confidence sprawl** — the demo record is legible, but it is small. *Open.*
4. **Promotion friction** — zero promotions in the baseline is the friction reading at its most honest; the shell put "Keep this answer" one tap from every claim. *Open; needs people.*
5. **The claim/presentation line under UI pressure** — the crop colouring is projected state (RFC-0004 §4), the count badge is a count, the fork notice names two records. Nothing was minted. *Held so far; the first aggregate that is not a count is the next test.*
6. **Engagement evaporation** — implemented as designed (close the panel, the exchange is gone). Whether users read it as brokenness is unmeasured. *Open.*

## 6. Amendments proposed

Through the normal open process, none executed here:

- **RFC-0012 §4** — the grown-world clause made explicit (§4.1 above).
- **RFC-0002 §2.3** — the horizon stated normatively (§4.2).
- **RFC-0011 §2** — adapter vocabulary is configuration; the conservative default moved from §9 to §2 (§4.3, §4 note).
- **RFC-0004 §5** — a decision on multi-head supersession (§4.4); recommended answer: no.

## 7. What the build could not do

It could not measure a season. Every number in §3 comes from seeds, fixtures, and a rule-based reasoner standing where an LLM will stand (RFC-0010 §0 made that swap architectural; it has not yet been made). The reasoner's replacement is the first thing the next phase should do, because S7 and S8 were proven against an engine that cannot be tempted to launder, and the gate's real test is an engine that can. The second is a real weather and imagery provider behind the M4 adapters, which will hit the mechanism debt REVIEW-003 §2.F logged (full-log rescans per read) — scheduled cost, still unpaid, still not architecture.

## 8. Recommendation

**Continue. Do not revise the architecture.** S1–S8 hold, S9's instruments exist and have first thresholds, S10 is zero and enforced. The four strains are one-sentence clarifications and one decision, none of which changes a primitive, an operation, or an invariant. The open-because-closed claim (RFC-0005 §9) was executed as S4 and the sixth layer cost a grant, a config, and a lens.

Conditions: adopt §6's amendments in the open; replace the rule reasoner with a real engine behind the same interface before any user sees an answer; run the first live season with the instruments on, and reconvene this review when S9 has numbers that came from a farm.

## 9. Self-review

**Did the review read its instruments or grade its own homework?** The verdict table cites tests the same session wrote, and the person reading them wrote them. The defense is structural: S1, S2, S5, S10 are greps and can be re-run by anyone; S3, S4, S6 are the absence of code, which a diff shows; S7 and S8 are properties of an interface a misbehaving engine was thrown at. S9 is the part that could be self-flattering, and §3 says plainly which of its numbers are artifacts. If this review is wrong, it is wrong in the thresholds, which are guesses labelled as guesses.

**Is "near-free offline" honest?** Twenty-one lines is the count of code that exists *because* of offline. The durability work (P-43, 114 lines) is excluded because RFC-0014 §1 obligated it for every device regardless; a reviewer could reasonably charge some of it to offline, and the number would still be small. The claim RFC-0012 §5 made was "no merge step exists"; that one is exactly true.

**The thinnest verdict.** S7. "Zero context restatement" was verified by construction (the ask carries only text) and never by a transcript, because there are no transcripts. It holds as an interface property; whether people *feel* they must restate — typing "the field in the northwest" anyway — is the measurement, and it has not been taken.

**Overall.** Highest confidence: S3, S4, S6 — each is the architecture cashing a check it wrote in RFC-0002, RFC-0005, and RFC-0012, and each was tested where it was cheapest to lose. Lowest confidence: every S9 number, for the reason §3 gives. The series asked to be proven wrong by a calendar; the calendar has not started. Stated plainly, so the next review knows which numbers were real.

---

*The first cut: eight milestones, one map, no pages, three stores, two operations, zero merge code, zero leaks, a sixth layer for the price of a lens. The architecture passed its own experiment. What it has not yet met is a farmer.*
