# RFC-0008 — Content & Grant Lifecycle

| | |
|---|---|
| **RFC** | 0008 |
| **Title** | Content & Grant Lifecycle |
| **Status** | Approved |
| **Author** | Bradley |
| **Created** | 2026-07-23 |
| **Depends on** | RFC-0001, RFC-0002, RFC-0004, RFC-0006, RFC-0007, RFC-0012, RFC-0014 |
| **Supersedes** | — |
| **Superseded by** | — |

---

## 0. Purpose and method

This document freezes the **lifecycle semantics** of everything the world holds — content (Entities, Events, Assertions), grants, and apparatus — answering the sponsor's original questions (creation, ownership, transfer, sharing, duplication, archival, restoration, versioning, deletion, invariants) in one place. It was deliberately written late (RFC-0016 §3): most answers were already *constrained* by frozen commitments, and this RFC's job is chiefly to consolidate those constraints, close the few genuinely open questions, and reconcile cloud-software lifecycle expectations with an append-only world. No persistence mechanism appears here; that is RFC-0013's. No new primitive appears anywhere.

## 1. The lifecycle of world content

- **Creation is authorship.** Content enters the world only through the Author verb (RFC-0006 §8) or the boundary's Append (RFC-0012 §2), under the admission contract — placed, dated (bitemporally, possibly backdated), sourced, classified (RFC-0011 §2). There is no other birth. Entities are *introduced* (identity posited, introducing Event recorded — RFC-0004 §6); Events and Assertions are recorded whole. Nothing enters partially: the world holds no drafts (RFC-0014 §4).
- **Ownership begins at contribution.** The introducer of an Entity and the author of an Event or Assertion hold original authority over it (RFC-0002 §4.4). Ownership is a relationship, not a field to edit.
- **Ownership changes by Event.** A transfer is a recorded, dually-attributed act: the prior owner (or their estate-shaped successor, itself established by Event) conveys original authority to another Actor. The transfer re-roots every grant chain over the affected scope. **Decision, made here:** grants issued under the prior owner *survive* the transfer — access continuity is the default, because collaborators' work should not silently break at a sale — and the new owner inherits full revocation authority over them from the moment of transfer. Continuity plus revocability, never silent expiry.
- **Sharing is granting** — nothing new here; the whole of RFC-0002 §4 applies. Grants are content too: they are Events, and every lifecycle rule in this document applies to them (§2).
- **Duplication does not exist.** There is nothing to copy: content is referenced by identity (RFC-0003 §7), presented through lenses that never contain (RFC-0005 §1), and shared by scope. "Duplicate this zone" is *authorship of a new Entity* whose geometry happens to match — a new identity with its own history, related to the original only if someone claims it (RFC-0009 §2). Copies outside the boundary (exports) are projections taken and gone (RFC-0012 §1); the model neither tracks nor pretends to control them (RFC-0002 §4.3).
- **Archival is a visibility state, not a location.** To archive is to record an Event declaring content dormant; default lenses exclude the dormant, exactly as they exclude by any classification. Nothing moves, nothing is boxed, and every projection that *asks* for the dormant still finds it, in place, in history. **Restoration is a further Event** ending dormancy — not a retrieval, because nothing left.
- **Versioning is supersession.** The chain of supersessions *is* the version history (RFC-0004 §5); identity + time is the version (RFC-0012 §7). There are no version numbers to manage and no "revert": restoring an earlier state is *a new superseding record whose content matches the old* — history moves only forward, even when its content looks back.
- **Deletion does not exist; retraction does.** A retraction is an Event declaring a record disavowed — mistaken, fraudulent, or withdrawn — with its own author, time, and (ideally) stated reason. Retracted content is excluded from ordinary projections, *included* in historical and audit projections, and never physically removed. What a previously-scoped reader saw before retraction was truly seen (RFC-0002 §4.3); retraction, like revocation, ends further projections and cannot reach memory.

## 2. The lifecycle of grants

Consolidated from RFC-0002 §4, with one addition from §1's transfer decision:

- **Issued** by an Actor with authority over the scope (owner, or grant-holder within attenuation — I4). An Event, dually timed.
- **Modified** by supersession — a new Grant replacing the old, the old standing in history.
- **Revoked** by superseding Event; the *fact* of past access is permanent record.
- **Expired** by its own terms — the bound was fixed at issuance; projection past it excludes the grant with no further record required; the lapse may additionally be observed as an Event.
- **Re-rooted** on ownership transfer (§1): surviving, newly revocable by the successor.

Access state at any moment, past or present, remains a projection of this history (I5) — the audit question needs no machinery here either.

## 3. The lifecycle of apparatus

Views, drawn gestures, measurements, drafts, and Engagements are born ephemeral in the View or in Pending (RFC-0006 §3, RFC-0014 §4), die by evaporation, and cross into the world only by explicit promotion — at which point they are *content* and §1 governs them entirely (a named View becomes an Entity — RFC-0002 §8.6 — and can thereafter be shared, archived, superseded, and retracted like anything else). Pending submissions committed but unadmitted are the one apparatus with a durability guarantee (RFC-0014 §1); admission completes their crossing, rejection returns them to their author with reasons, and abandonment is the author's own act. Nothing else about apparatus has a lifecycle, which is the point of apparatus.

## 4. Lifecycle invariants

- **L1 — One birth:** content enters only by authorship under admission; no import path, migration, or repair bypasses it.
- **L2 — No death:** nothing is ever removed; retraction and archival are recorded states, and every past projection remains reconstructable.
- **L3 — Forward-only history:** every lifecycle transition — transfer, archival, restoration, retraction, revocation — is itself an appended, attributed, dually-timed record. The lifecycle *is* history; there is no lifecycle metadata beside it.
- **L4 — Continuity at transfer:** ownership transfer preserves standing grants and re-roots revocation authority; no collaborator's access changes without a recorded act.
- **L5 — No copies:** identity is never duplicated; resemblance is authored anew and relatedness is claimed, never inferred silently.
- **L6 — Apparatus crosses or evaporates:** nothing ephemeral acquires world consequences without promotion; nothing promoted retains apparatus privileges.

## 5. User Experience Implications

*Projection:* in farm language the whole document is: "records can be corrected but never lost; old ones can be tucked away and brought back; the farm can change hands without the agronomist losing her access; and nothing you scribbled becomes permanent unless you kept it." *Concealment:* supersession chains, retraction semantics, re-rooting, and admission are invisible; users see corrections, an "archived" shelf that is really a lens, and sharing that survives a sale. *Leak check:* no internal term surfaces — "retraction" appears as *remove* with the honest footnote that history remembers, which farmers, who keep paper records for decades, expect rather than fear. *Wholeness:* a seasonal worker who only ever creates records participates in every invariant unknowingly; nothing in the lifecycle requires understanding it.

## 6. Self-review

**Is grant survival at transfer (L4) the right default?** The alternative — grants lapse at sale, forcing re-issue — is *safer for the new owner* and was rejected because it silently breaks working relationships at exactly the moment continuity matters most (harvest doesn't pause for closing day). The decision favors continuity-plus-immediate-revocability, and it is this document's only genuinely new architectural commitment; if buyers in practice demand lapse-by-default, this is the section to amend, openly. **Does "restore = new record matching old" surprise users?** A revert that is really a re-assertion may puzzle anyone expecting version-tree semantics; the UX projection ("put it back the way it was") is honest, but the audit trail shows a forward step, not a rewind — correct, and worth a support-article someday. **Thinnest section:** apparatus (§3) — deliberately, since RFC-0014 owns the machinery; if promotion flows grow states this consolidation doesn't cover (partial admission? collaborative drafts?), the gap lands here first. **Overall:** this RFC decides little because little was left undecided — its value is that every lifecycle question now has exactly one answer in exactly one place, and L1–L6 give reviewers teeth. If it is wrong, it is wrong at L4, and L4 is one paragraph to amend.

---

*Everything is born by authorship, changes by addition, and never dies — content, grants, and promoted apparatus alike. The reserved slot is filled; the lifecycle has one home.*
