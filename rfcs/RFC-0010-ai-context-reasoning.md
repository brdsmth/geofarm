# RFC-0010 — AI Context & Reasoning

| | |
|---|---|
| **RFC** | 0010 |
| **Title** | AI Context & Reasoning |
| **Status** | Draft |
| **Author** | Bradley |
| **Created** | 2026-07-23 |
| **Depends on** | RFC-0000, RFC-0001, RFC-0002, RFC-0003, RFC-0004, RFC-0005, RFC-0006, RFC-0007, RFC-0009 |
| **Supersedes** | — |
| **Superseded by** | — |

---

## 0. Purpose and method

Every prior RFC is assumed complete, and each has already given the intelligence a piece of itself: the AI is an Actor (RFC-0001), scoped and attributed (RFC-0002), surfacing as a layer (RFC-0005), receiving the View (RFC-0006), accruing a track record (RFC-0007), reasoning over the semantic graph with no translation layer (RFC-0009). This document assembles those pieces into the one thing still undefined: **what the AI's context architecturally *is*** — what it holds when a person circles a corner of a field and asks *why?*

Boundaries first. This document defines context, not cognition: no prompts, no models, no vendors, no mechanics of inference. Those are mechanism — and more than that, they are *replaceable* mechanism: reasoning engines will be swapped many times over this platform's life, and what must survive every swap is the architecture of what any engine is given and what any engine's output must be. That permanence is this document's subject.

The thesis, in one sentence:

> **The AI does not receive context about the world; it is situated in the world.** Its context is not a package of metadata describing a situation — it is the situation itself: a place, a time, a way of looking, a set of indicated things, and the semantic neighborhood around them, read from the same single world everyone else reads, bounded by the same scopes that bound everyone else.

This is why the AI "feels spatially aware." Awareness is not simulated by attaching coordinates to questions; it is constitutional. There is no version of this AI that is *not* somewhere.

---

## 1. The AI's standing, and its two modes

Recapped from the series, because everything below rests on it: the AI is an **Actor** — never a feature, never an oracle. It holds grants (scoped view, scoped author); it represents a principal, dually attributed (RFC-0002 §1.4, §5.3); its claims are Assertions with provenance, confidence, and evidence; its predictions are graded by the arriving record (RFC-0007 §5); it appears on the map as a layer like any contributor (RFC-0005 §9).

It participates in exactly two modes, and the interaction laws (RFC-0006 §2) sort them:

- **Conversational** — engaged through the Ask verb, inside someone's View. Here the AI is read-only by construction: an exchange changes nothing in the world. Its answers are ephemeral, View-resident, and disposable — governed by the second law (ephemeral until promoted) exactly as a drawn circle or a measurement is.
- **Autonomous** — acting under its own granted agency: monitoring, evaluating, flagging, recommending without being asked. Here the AI exercises Author within its scope, and its output lands in the world as ordinary attributed Assertions, visible to properly-scoped readers through the ordinary lenses.

One consequence of dual attribution settles the accountability residue RFC-0002 §8.8 assigned here: **the claim belongs to the AI; the delegation belongs to the principal.** The AI's track record is its own — its calibration is auditable per Actor like anyone's (RFC-0009 §6) — while the standing decision to let it act, and the scope it was given, are readable from the principal's grants. Responsibility does not blur along the chain, because the chain is recorded at every link: *what was claimed* answers to the claimant; *why it was empowered to claim* answers to the grantor.

---

## 2. The anatomy of context

When the AI is engaged, its context is assembled from four strata — each one already defined by an earlier RFC, none invented here. That is the point: context assembly is *reading*, not construction.

**Stratum 1 — the Frame: the shared way of looking.** The viewer's View (RFC-0006 §1): spatial scope (*current viewport* — where, at what extent), temporal binding (*visible time* — when the projection is taken as-of), lens stack (*active layers and filters* — which aspects of the world are revealed, at what confidence thresholds, from which sources), and selection. The Frame is inherited whole, with no restatement by the user — the fulfillment of RFC-0000 §2.3's founding promise. Critically, the lens stack is context, not decoration: *what the viewer chose to reveal and hide is information about what the conversation is about.*

**Stratum 2 — the Gesture: the indicated things.** The selection (identities — *selected objects*), any drawn ephemeral regions (the circle around the struggling corner — RFC-0006 §3's query regions), and the ask itself. The Gesture is what turns a shared frame into a specific question: *this, here* — indicated, not described.

**Stratum 3 — the Neighborhood: the semantic surroundings.** For everything framed and indicated, the semantic neighborhood of RFC-0009 §7: identities and their projected state; their derived timelines (*historical context* — what has happened here, across every season on record); their spatial relations; the standing claims about them with authors, confidences, and calibration; the *evidence* chains beneath those claims, peel-able to observations and grounds; live contradictions; standing *recommendations*; and the record's own staleness and sparseness (RFC-0007 §7). The Neighborhood is where the AI's answer will actually come from — the reasoning substrate, pre-connected.

**Stratum 4 — the Engagement: the exchange so far.** The dialogue itself — prior asks and answers within this engagement, regions previously circled, threads previously pulled. This stratum is a **normative loosening of RFC-0006 §1**, which declared the AI's context to be "exactly the View" and whose own self-review predicted the loosening would be needed. It is needed: conversation has memory or it is not conversation. The Engagement is *apparatus* — View-adjacent, ephemeral, private to its participants, governed by the second law: it evaporates unless something in it is promoted. What deserves keeping — a conclusion, a finding, a decision — is promoted into the world as authored content; the exchange that produced it is not the record, the promoted claim is.

**Intent is not a stratum.** *User intent* appears in every context discussion and is deliberately not context here, because intent is not data the AI receives — it is an **inference the AI makes**, from the Frame (what they chose to look at), the Gesture (what they indicated), the Engagement (what they have been pursuing), and the ask. Like every inference in this architecture, a reading of intent is a revisable, confidence-bearing judgment — never a stored fact about the user, and never silently assumed: the architecture's posture toward ambiguous intent is the Ask verb pointed back — the AI asks. Treating intent as inference rather than input is what keeps the platform from building a dossier of assumed purposes; the user's intent remains theirs, read afresh from what they are actually doing.

---

## 3. Spatial awareness is constitutional

The task asks that the AI "feel spatially aware." The architecture's answer is that the feeling is not produced — it is inherited, for three compounding reasons:

1. **The question arrives placed.** Every engagement occurs inside a Frame with a spatial scope and a Gesture with geometry. The AI never receives a placeless question about located things; *where* is not an attribute of the query — it is the query's arena.
2. **The material is placed.** The Neighborhood's contents are themselves geometries with derived relations (RFC-0003 §5). "Near the drainage channel," "in the same soil zone as the two other weak patches," "downwind of the neighboring parcel" are not enrichments the AI requests — they are edges already present in what it reads.
3. **The answer returns placed.** An AI claim is an Assertion, and Assertions have geometry (RFC-0003 §1). The AI does not answer *about* the circled corner; it answers *at* it — its diagnosis has an extent, its recommendation covers a region, its output lands on the map as a layer because it was born with a place (RFC-0005 §9).

Place in, place throughout, place out. A system built this way cannot help but feel spatially aware, because at no point in the loop does spatiality have to be added.

---

## 4. The three rings: what the AI may reason over, and for whom

The hidden-hazard question RFC-0006 §7 left open — *the AI knows something the current View hides* — is resolved by recognizing that "the AI's context" has three concentric boundaries, each already defined:

- **The Frame** — what is currently revealed in the shared View. The innermost ring: the ground of the conversation.
- **The Conversable** — the intersection of the viewer's scope and the AI's scope (RFC-0002 §5.3). Everything that *could* be brought into this conversation.
- **The Reach** — the AI's own full sub-world: everything its grants admit, for its autonomous work.

Three rules govern the rings, and together they answer every case:

1. **The AI converses within the Conversable.** Content the viewer's View has merely *filtered out* — but which their scope admits — is fair game: the AI may surface it, and the honest way to surface located content is to **bring it into the Frame** — proposing the lens, the region, the time that reveals it — rather than describing invisibly. *"There's a wind advisory you've filtered out — shall I show it?"* is architecture, not manners: the map is where shared understanding lives (RFC-0000 §2.2), so surfacing means pointing.
2. **Conclusions delivered to a viewer must be derivable within the Conversable.** This is the sub-world rule (RFC-0002 §2.3) applied to reasoning itself, and it closes a leak the access model alone does not: an AI that reasoned over its full Reach and then asserted conclusions to a narrower viewer would *launder* inaccessible content through inference. Forbidden. What the AI tells this viewer must stand on evidence this viewer's scope admits — the peel-back chain (RFC-0009 §5) of any surfaced claim must itself be conversable.
3. **Reach-knowledge that cannot be told is acted on autonomously.** The genuine hidden hazard — known to the AI, outside this viewer's scope — is never leaked to this viewer, not even by implication. The AI's recourse is its other mode: author the Assertion into the world, where properly-scoped Actors see it through ordinary lenses, or engage an Actor whose scope admits it. The hazard is handled *by the world's own machinery*, not by breaching a boundary in conversation.

The rings make the AI trustworthy in both directions at once: the viewer can trust that the AI brings everything it legitimately can — and *shows* it rather than alluding to it — and every other Actor can trust that their scoped content never seeps out through a helpful intelligence talking to someone else.

---

## 5. Historical context: reasoning in time

The AI inherits the temporal model whole, and three of its capacities follow directly:

- **It reasons as-of.** The Frame's temporal binding is not trivia — it is the moment the AI's projections are taken at. A View bound to March engages an AI reasoning over March's state; scrubbing the time control moves the AI's world along with every lens (RFC-0005 §6). "What was happening here then?" needs no special handling; it is the same question as "what is happening here?" with a different argument (RFC-0007 §6).
- **It reconstructs what was knowable.** Bitemporality (RFC-0004 §1) lets the AI answer the audit-shaped questions an advisory system owes its users: *why did you recommend that, then?* is answered by projecting to that moment in knowledge time — reasoning over what the record *held* then, not what it holds now. The AI's past advice is judged against its past information, exactly and reconstructibly.
- **It carries its own history.** The AI's prior claims and their graded outcomes (RFC-0007 §5) are part of the Neighborhood like anyone's. It reasons in view of its own track record — and in view of its own *standing* recommendations, which brings a duty stated in §6.

---

## 6. Answers, evidence, and the authorship line

What an AI answer *is*, architecturally, in each mode:

**Conversationally, an answer is a candidate-Assertion.** It has the full shape of an Assertion — subjects (inward references to the things it concerns), evidence (inward to observations and claims; outward to the grounds it leaned on — RFC-0009 §3), stated confidence, and its author — but it is *unrecorded*: View-resident, ephemeral, gone with the engagement unless promoted. The second law applies to intelligence exactly as to gestures: **the world grows only by deliberate promotion.** An exchange full of exploratory answers leaves no residue; the one answer worth keeping is promoted and becomes a real Assertion, attributed to the AI, kept by the viewer's explicit act. This keeps conversation free (the first law: Ask changes nothing) while keeping the record clean of every stray musing.

**Autonomously, an answer is an authored Assertion** — recorded directly, within scope, superseding its own priors when conditions change. Self-supersession is a stated duty: a standing AI recommendation that events have undermined is the AI's to revise, by the ordinary supersession machinery, without waiting to be asked. Stale advice with a live signature is a failure of participation.

**In both modes, the claim/presentation line holds.** RFC-0005 §7 drew the series' sharpest boundary — a derivation that *claims* is an Assertion; one that merely *redraws* is presentation — and flagged that a future AI document must hold it. Held, here, normatively: **anything the AI outputs that asserts something about reality — a diagnosis, an estimate, an anomaly, a recommendation, an answer to "why" — is Assertion-shaped, evidence-bearing, and confidence-stated, in every mode, always.** The AI never produces bare authoritative text about the world; there is no output category of "just information." What is not a claim (a re-presentation, a navigation proposal, a clarifying question) asserts nothing and is bound to nothing. The line RFC-0005 could only draw, this document enforces — because the AI is where it would otherwise erode first.

**Recommendations** are the prescriptive case and inherit everything above: subjects, extent, evidence, confidence, grounds; standing until superseded; graded by outcomes into the track record; filterable by provenance like all claims. A recommendation is never a pop-up — it is a located, dated, signed, evidenced claim about what ought to be done *here*, living on the map among the things it concerns.

---

## 7. Explainability is a property, not a feature

The last consideration the task names, and the one the architecture dissolves rather than builds. Every AI output, in either mode, can answer three questions — not because an explanation subsystem generates rationales, but because the output's own structure contains the answers:

1. **"What were you looking at?"** — the Frame and Gesture of the engagement: the place, time, lenses, and indicated things the answer was situated in. Reconstructible because context is architectural (§2), not ambient.
2. **"What do you base this on?"** — the evidence chain: peel the Assertion back through claims to observations and grounds (RFC-0009 §5). An AI answer that cannot peel back is *malformed by construction* — well-formedness, not policy, is what forbids "I just know." The grounds boundary (RFC-0009 §9's flagged seam) is honored under load here: the AI cites the knowledge it applied; it never smuggles placeless content into the world as anything but citation.
3. **"How sure are you — and how good have you been?"** — stated confidence, plus earned calibration: the Actor-level track record that lets *this AI's 85%* be weighed against its history (RFC-0009 §6).

Explanation, then, is **navigation of the record** — walking evidence edges, adopting the Frame the answer was given in, projecting to the knowledge-time it was made at — performed with the same verbs as all other exploration. A platform that preserved history, required evidence, and attributed everything discovers at the end that explainability was never a feature to add. It is what an honest record *looks like* when you ask it questions.

---

## 8. The frozen context model

- **The AI is situated, not briefed** — its context is the situation itself, read from the one world; spatial awareness is constitutional (place in, place throughout, place out).
- **Context has four strata** — Frame (the shared View), Gesture (the indicated things), Neighborhood (the semantic surroundings), Engagement (the exchange, ephemeral, promoted-or-evaporating). RFC-0006's "exactly the View" is normatively loosened by the fourth.
- **Intent is inference, never input** — read from attention, held with confidence, asked when ambiguous, never stored as fact.
- **Three rings bound reasoning** — Frame ⊂ Conversable (viewer-scope ∩ AI-scope) ⊂ Reach. The AI converses in the Conversable, surfaces by bringing-into-Frame, delivers only conclusions derivable within the Conversable, and handles genuinely hidden knowledge autonomously through the world, never through leakage.
- **Two modes, two dispositions** — conversational answers are ephemeral candidate-Assertions (promoted deliberately); autonomous outputs are authored Assertions (self-superseded dutifully). The claim/presentation line is enforced at the AI: every claim it makes is evidence-bearing and confidence-stated; bare authority does not exist.
- **Time is reasoned in, not just about** — as-of projection, knowledge-time reconstruction of past advice, and the AI's own track record in view.
- **Explainability is the record's structure** — what-were-you-looking-at, what-do-you-base-this-on, how-sure-and-how-good, all navigable with the ordinary verbs.

---

## 9. Self-review

**Is the four-strata anatomy real, or a tidy relabeling?** Frame, Gesture, and Neighborhood are inherited concepts (View, Indication, semantic neighborhood) — §2's honest novelty is only the Engagement, and the claim that these four *exhaust* context. The exhaustiveness is the vulnerable part: a long-lived assistant may want durable knowledge *of the user* — preferences, patterns, standing concerns across engagements — and the anatomy deliberately gives that no home (Engagements evaporate; intent is never stored). I hold the line because a user-model held as fact is a dossier, and this architecture's answer — what deserves keeping gets *promoted, visibly, as content* — is more honest than ambient memory. But the pressure for cross-engagement continuity is real, users will call its absence forgetfulness, and if a future RFC yields to it, the yielding must be an open amendment here, not a quiet cache somewhere. This is the document's most likely point of erosion.

**Does the Conversable-derivability rule (§4.2) overconstrain?** Requiring every conversationally-surfaced conclusion to peel back within the viewer's scope is the strongest anti-leak guarantee available, and it may sometimes make the AI *less helpful than it could safely be* — an aggregate insight over reach-wide data ("across the co-op, this variety underperforms on sandy ground") may be harmless to share yet fail strict derivability. The architecture's escape is legitimate (author the insight into the world with appropriate scope, whence it becomes conversable), but that indirection has friction, and pressure to relax rule 2 into "harmless inference is fine" will be constant. It must be resisted at the rule and solved at the scopes — anonymization and aggregate publication are scope-design problems (REVIEW-001 deferred them to integration) — because "harmless" judged by the leaking party is how every access model dies.

**Is candidate-Assertion status for conversational answers coherent?** §6 has answers carrying full Assertion shape while remaining unrecorded — which means the AI's *most-consumed* outputs are, in the ontology's terms, nothing at all until promoted. Two costs follow honestly: first, unpromoted advice that a user silently acts on leaves a gap — the record shows an action with no advisory antecedent, weakening the auditability §5 celebrates; second, the AI's track record accrues only from *recorded* claims, so calibration systematically under-samples casual conversation. Both costs are accepted as the price of the first law (Ask must change nothing) — the alternative, recording every exchange as world content, would flood the record and chill exploration. But the gap is real: heavily-acted-on-but-never-promoted advice is invisible advice, and interaction design (not this document) will have to make promotion of consequential answers nearly frictionless for the audit story to hold in practice.

**Did this document define reasoning after all?** The boundary claimed in §0 — context, not cognition — is thinnest in §4 (rules about what conclusions may be *delivered*) and §6 (duties of self-supersession). I judge these to be interface obligations — properties any reasoning engine's outputs must satisfy — rather than cognition, and that judgment is what keeps the document vendor- and mechanism-free. But rule 2 of §4 does constrain *how* an engine may use what it reads (no laundering), which is a constraint on process, not just output. The line held, with visible strain, and a future document on autonomous behavior (when to monitor, when to interrupt, how often to speak) will strain it further — that behavioral layer is named here as deliberately unwritten.

**The inherited seams, statused.** RFC-0009's grounds boundary: honored — the AI cites outward, asserts inward, and nothing here needed placeless content (the seam held under its heaviest expected load). RFC-0005's claim/presentation line: enforced at the strongest point of erosion (§6). RFC-0006's context loosening: performed, openly, as predicted (§2). RFC-0002's accountability residue: resolved by chain-reading (§1). The series' debts to this document are, to my accounting, all either paid or explicitly reassigned — the behavioral layer above being the one new debt this document itself creates.

**Overall.** Highest confidence: the three rings (§4) — they resolve the series' longest-standing open question with machinery entirely in hand, and the no-laundering rule is the kind of constraint that is obvious only after it is written down. Lowest confidence: the evaporating Engagement and the refusal of a durable user-model — architecturally principled, experientially costly, and the place where product pressure and this document will collide first. If this RFC is wrong, it is wrong there; and because the collision is predictable, the amendment path (open, here, never a quiet cache) is pre-committed. Stated plainly, so that when the pressure arrives, the terms of surrender were written while heads were cool.

---

*This RFC situates the intelligence: four strata of context, three rings of reach, two modes of participation, one world. The AI now has everything the series can give it — a place to stand, a record to read, a scope to honor, and a signature it cannot escape. What remains of the roadmap is the machinery that carries all of this — integration, interfaces, persistence, rendering — and the lifecycle document (RFC-0008) still owed to the content this intelligence reasons over.*
