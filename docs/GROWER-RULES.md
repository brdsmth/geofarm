# The Grower Rules

Ten rules for anything a farmer or grower sees in geofarm, each with the
check that holds it. They sit under RFC-0000 §2.6 (the system's
complexity is never the user's) and say what that principle costs at the
pixel: the people this is for are smart, easily frustrated by software,
using a phone in a cab at noon, and they want the answer without digging.

A rule with no check is decoration (RFC-0000 §5). Where a check is
mechanical it runs in `bun run check` and in CI; where it is not yet, the
rule says so and the review owes it. Deviations are named in place and
counted, never hidden — the same discipline as the vocabulary membrane.

| # | Rule | Check |
|---|------|-------|
| 1 | **The farm's name is the first word.** Cover the map; the chrome still says whose farm this is, how old what you see is, and who is answering. Our product's name is small. | `#farm-name` is the farm line's name, then the product's in `<small>`. Browser test (T12): the first chip's text starts with the farm's name. |
| 2 | **Three things on the first screen.** The farm, the search, the season. Everything else is one tap away behind one quiet control. A layer a grower never wants off is not a switch. | `OPTIONAL` in `apps/web/src/main.ts` is the only list of switches. Browser test (T12): at most five fixed chrome elements on the landing screen. |
| 3 | **Every wait, failure, and empty has a sentence.** Nothing silently substitutes, retries, or stops. The sentence lives in the surface package and is shown on screen; copy that exists but is never rendered is a state that exists but is never said. | `lint:grower` — *copy*: every surface string is referenced by the client or carries `copy-pending: <reason>`; *attempt*: every network verb (`session.send`, `session.sync`, `engagement.ask`, `engagement.promote`, `fetch`) is called inside `attempt()` or on a line naming its deviation with `attempt-exempt: <reason>`. Browser test (T12): forced states render their copy. |
| 4 | **Readable in the cab at noon.** Nothing under 12px. Body 16px on touch. Every control 44px on touch. Chrome is opaque enough to read over bare soil. Two themes from one token set (T8). | `lint:grower` — *style*: no `font-size` under 12px; no raw colour outside the `:root` token block (`style-exempt: <reason>` names a deviation); `outline: none` only beside a `:focus-visible` rule. Browser test (T12): text and target sizes at 390. |
| 5 | **Colour never carries meaning alone.** Every hue on the map has a word beside it in the legend, and a field's label says its crop. | `lint:grower` — *legend*: the keys of `CROP_COLOR` and `GROUP_COLOR` in `apps/web/src/map.ts` equal the keys of `legend` in the surface package. |
| 6 | **Say how sure and how old.** A claim carries "70% sure". A view carries "as of". A source carries "last reported". The membrane translates honesty; it never removes it. | `lint:vocab` (S10) as today, plus rule 3's copy check keeping the freshness strings on screen. |
| 7 | **A control says what it does, and leaving is free.** No confirm-shaming, no fake urgency, no hidden stop buttons, no consequence bigger than the words on the button. Anything that stops something says what will stop. | Review checklist below. Browser test (T12): every button's text is a surface string. |
| 8 | **Sources are not people.** What feeds the map is listed as a source under "Where the weather, satellite, and soil survey come from", with "Stop using" and the consequence, never in the sharing list as someone who "sees" the farm. | `sharesHtml()` splits shares by `world.feeds`. Unit test owed on the split (T3 follow-up). |
| 9 | **Nothing collides at 390, 1024, or 1440.** Fixed chrome never overlaps other fixed chrome. Text never clips. Rows never crush. The season never hides under the sheet. | Browser test (T12): bounding boxes of every `position: fixed` element are pairwise disjoint at three widths; screenshots attached to the CI run. Until then: render the three widths and attach them to the commit body. |
| 10 | **The keyboard can do the five verbs.** Focus is visible. Escape closes. Pressed state is announced. Search is the keyboard's way onto the map. | `lint:grower` — *style* (rule 4's focus check). Browser test (T12): axe-core with zero serious violations. |

## Before touching `apps/web`

The four User Experience Implications checks every RFC amendment already
answers (REVIEW-002 §7), asked of a shell change:

1. **The projection.** Say what changed the way a grower would, in one
   sentence, in the surface package's words. If the sentence needs a
   system word, stop.
2. **The concealment.** Name what stays invisible.
3. **The leak check.** Run `bun run lint:vocab` and `bun run lint:grower`.
   Every deviation is marked in place with its reason.
4. **The wholeness check.** Every state has a sentence: opening, up to
   date, can't reach, offline, waiting to send, thinking, couldn't,
   nothing here, nothing found. New network call? It goes through
   `attempt()`.

Then render at 390, 1024, and 1440 (see `tests/shell.test.ts` once T12
lands; until then `bun run app` and a browser) and look for rule 9.

## Named deviations

The lints count these and print them; the review reads them. A deviation
without a reason fails the build.

- `copy-pending: <reason>` — a surface string written ahead of the state
  that will show it, in the surface package, on or above the key.
- `attempt-exempt: <reason>` — a network verb outside `attempt()`, on the
  same line; the reason names the failure state that stands in for it.
- `style-exempt: <reason>` — a raw colour outside the token block, on the
  same line.
- `surface-exempt: <reason>` / `surface-exempt-file: <reason>` — the
  membrane's own (RFC-0000 §2.6, Amendment 2).

## Provenance

Written from the grower shell audit of 2026-09-04 (REVIEW-005 is owed;
the audit report and its twenty tasks are linked from the roadmap).
Rules 1, 2, 5, 8, and 9 were each violated by the shipped shell at the
time; the rest were held by discipline and are now held by a check.
