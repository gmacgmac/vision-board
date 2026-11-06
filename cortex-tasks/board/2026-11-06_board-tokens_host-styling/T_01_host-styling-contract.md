# T_01: Contract — Host styling

> **Set**: [PLAN.md](./PLAN.md) · **Wave** 1 · **Skills**: cortex-architecture, cortex-docs

## Objective

Write the promise before the code: the "Host styling" section of `docs/specification/plugin.md`, the flag, any new
words, and a draft decision entry for the maintainer. Nothing in tokens or CSS here.

## Inputs

PLAN.md (Decisions 1-5, 7); the nclite handoff (path in PLAN References), items 1-7; `plugin.md` § Theme, § A guest in
the host's page, open point 8, § The types and the seam version; `docs/decisions.md` D-009; `packages/tokens/src/tokens.css`
for each mapped token's default.

## Steps

1. Replace § Theme with "Theme and host styling": the three font properties as today; then a table of every colour
   property in PLAN Key Changes 1 (`--host-color-scheme` included): what it means, the `--vb-*` tokens it feeds, the
   board's default (light / dark). Name the derived members (accent soft and line) and what stays the board's own
   (kinds, states, scrim, dot grid).
2. The rules, one short paragraph each: **mode** (`--host-color-scheme`, else `data-theme` on `<html>`, else the
   system; PLAN Decision 5 says why not inheritance); **scope** (on the root given to `mount` or any ancestor, never
   `<html>` required; two mounts may differ); **live** (a change applies without a remount); **contrast** (the host's
   pairs and the APCA tiers it must meet: ink on surface and canvas Lc 60, ink-muted Lc 60, on-accent on accent Lc 60,
   accent-strong as text Lc 45, line-strong and focus Lc 30, measured with APCA-W3 0.0.98G-4g in each mode it gives).
   Each claim names its test in `tests/plugin/host-styling.spec.ts` (FE_01 writes them; name them now, the
   spec-truth test will hold them).
3. Settle open point 8 (tokens on the board's root as well as `:root`) and update § A guest's "Styles" sentence on
   what the sheet sets. Say the seam stays 1, and why, under § The types and the seam version if needed.
4. Add two flags to `packages/format/src/flags.ts`: `layoutTooltip` (on; FE_02: the layout choices show a tooltip and the layout overlay never opens; off, as before), and `hostStyling` (on by default; its sentence: what a host's colours and
   `--host-color-scheme` do; off, the board keeps its own colours and mode as before).
5. Check `board.region.*` words for the six layout names and hints FE_02 needs (`words.json`, `region-core.ts`
   `MODE_LABEL`, `MODE_HINT`); add any missing sentence in its words file per `docs/specification/words.md`.
6. Draft the decision entry (next number after D-093) in your notes, as exact wording, for the orchestrator to put to
   the maintainer: a host may set the board's colours and mode; contrast of the host's pairs is the host's promise;
   refines D-009. Do not edit `docs/decisions.md`.

## Validation

`npm test` (spec-truth may fail only on the FE_01 test names, listed in your notes), `npm run verify`.

## Constraints

Deviation → stop and tell the user. No PII. No commits. Update this file's notes on completion. Writes over 50 lines in
chunks.

## Implementation Notes

**Status**: Completed 2026-11-06.

**Done**
- `plugin.md` § Theme is now "Theme and host styling": the type table (as before), the colour table (12 properties, each
  with what it feeds and the default light / dark from `tokens.css`), Derived, the board's own, then Mode, Scope, Live,
  Contrast (pair table), Off. § A guest's Styles sentence, the seam's "Not breaking" list (a new `--host-*` property),
  open point 8 (settled: tokens on `:root` and the board's root, native `light-dark()`), Not covered (board colours on host
  grounds; app-card colours read in script), and nclite rows 16-17 (last section only) updated. No `nclite` above the last
  section (spec-truth holds it).
- `flags.ts`: `hostStyling` and `layoutTooltip`, both on, with their `FLAG_DESCRIPTIONS`.
- Words: none new. All six names and hints exist (`packages/ui/src/words/region.ts`: `grid`…`row`,
  `aNumberedSetToWork`…`oneCardBesideAnotherIn`, read by `region-core.ts` `MODE_LABEL`, `MODE_HINT`). The handoff's one-line
  form ("Column: one card under another…") would be a new composed sentence (approval per words.md § Changing words); a
  tooltip of the name over the hint, the hint as the accessible description (the name is already `aria-label`), needs none.

**Test names FE_01 must write** (spec-truth matches the start; suggested full titles):
- `tests/plugin/host-styling.spec.ts`:
  - "no host property: every colour token and the mode as before"
  - "each host property reaches the tokens its row names, and the board's own colours stay"
  - "derived accents: one accent gives the soft ground and its line"
  - "mode: --host-color-scheme forces dark on a light system, and light on a dark one"
  - "scope: on the mount root alone, every property applies, the type's too"
  - "scope: two mounts in one page wear different colours and modes"
  - "live: a property or the mode changed while mounted applies without a remount"
  - "contrast: the board's own defaults meet every pair of the host's table, light and dark"
  - "flag off: a host's colours and mode reach nothing; the type's three still apply"
  - "the sheet: light-dark() stays native (no --lightningcss-*), and the tokens sit on the board's root too"
- `apps/board/tests/plugin-theme.test.ts`: "the spec's host table names each property the sheet reads, the tokens it feeds
  and their defaults" (parse the colour table in `plugin.md`; every `var(--host-…)` read in `tokens.css`, `theme.css` and
  `color-scheme.css` has a row; each row's Feeds tokens read that property; each default equals the token's `light-dark()`
  literals). This holds the hex values the table states.
- Until these exist, `tests/plugin/spec-truth.test.ts` "every test the spec names exists" fails on ENOENT for
  `host-styling.spec.ts` (expected; it stops at the first missing file, so I checked every other cited name by script:
  only the 11 above are missing).

**Contract choices for the orchestrator to confirm**
- **One scope rule for every property, the fonts too** (on `root` or any ancestor). Today `theme.css` maps the three type
  properties on `:root` only, so FE_01 must declare that map on `.vb-board` too (it owns `theme.css`). Two scope rules
  would trip every host.
- **`--host-color-scheme` wins over `data-theme`** whatever its value; `light dark` means the system's.
- **Contrast pairs**: beyond the task's list, ink and muted ink on `--host-surface-sunken` too (the board puts text on
  wells and fields), and on-accent on `--host-accent-strong` (it feeds the fill's hover, which carries the same text).
- **A token defined from a mapped one follows it**: `--vb-kind-decision`, `--vb-wire-hot` and `--vb-focus` follow the
  accent, `--vb-state-comment` the accent text, `--vb-kind-note` the muted ink, `--vb-state-open` the strong line, and
  every `--vb-state-*-soft` mixes into the card surface. So "the kinds stay the board's" is true but for a decision's
  (and a note's) colour; the spec says so.
- `--host-line-strong` does not feed the wires (`--vb-wire` is its own token), unlike the handoff's "and wires".

**Findings for FE_01 / VERIFY_01**
- `tokens.css` sets `--vb-rail-rest` by `prefers-color-scheme` and `:root[data-theme]`, not by the board's
  `color-scheme`: under `--host-color-scheme` against the system, the rail's rest opacity takes the wrong mode.
- `--vb-lane-band`, `--vb-wire`, `--vb-dot`, the shadows stay cool greys on a warm host canvas: look at them on the
  harness palettes.
- **D-081 rule 3** ("A host themes fonts and text scale only…; colours are the board's", and "Rejected: themable colours")
  is what this set overturns; PLAN names only D-009. The draft decision amends D-081 3.
- `docs/principles.md` § Design tokens and contrast ("Every foreground/background pair is listed … and checked by the
  tests") does not yet say a host's pairs are the host's; protected, so a proposed line is below.

**Draft decision (exact wording, for the maintainer; not written to `docs/decisions.md`)**

```
## D-094 A host may set the board's colours and mode
- **Date**: 2026-11-06 · **Status**: Accepted (maintainer, point <n>) · **From**: cortex-tasks/board/2026-11-06_board-tokens_host-styling/TASK-STATUS.md (T_01)
- **In short**: under a host, the board can wear the host's colours and light or dark; a host that sets nothing, and standalone, keep the board's own look.
- **Decision** (amends D-081 rule 3; refines D-009):
  1. A host may set the board's colours and mode through optional properties (`--host-accent`, `--host-accent-strong`, `--host-on-accent`, `--host-canvas`, `--host-surface`, `--host-surface-sunken`, `--host-ink`, `--host-ink-muted`, `--host-line`, `--host-line-strong`, `--host-focus`, `--host-color-scheme`), on the mount root or any ancestor, live. Each falls back to the board's own token. The card kinds, state colours, scrim, dot grid, wires, lane band and shadows stay the board's.
  2. Contrast of the host's pairs is the host's promise: D-009's tiers, measured with APCA-W3 0.0.98G-4g in each mode it gives, for the pairs `docs/specification/plugin.md` § Theme and host styling lists. The board's own colours stay measured on its own grounds; on a host's grounds they are looked at, not promised.
  3. Light or dark: `--host-color-scheme`, else `data-theme` on `<html>`, else the system; never an inherited `color-scheme`.
  4. The seam stays 1. Behind `hostStyling`, on.
- **Why**: under a host the board kept its own accent and greys beside a bot of another colour, and followed the system when the person had forced the host's mode the other way.
- **Rejected**: colours stay the board's (D-081 3: the board looks foreign in its host); the mode from an inherited `color-scheme` (a page that says nothing would make the board light); a board setting for its own look or the host's (the host decides by setting the properties or not, point 450).
- **Task**: cortex-tasks/board/2026-11-06_board-tokens_host-styling/TASK-STATUS.md
```

**Proposed line for `docs/principles.md` § Design tokens and contrast** (protected; maintainer's yes): after "a pair under
its bar is reported, never shipped quietly.", add: "Under a host, the colours a host gives replace the tokens they feed,
and their pairs are the host's promise (D-094)."
