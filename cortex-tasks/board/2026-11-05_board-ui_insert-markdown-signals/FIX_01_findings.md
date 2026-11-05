# FIX_01_findings: Wave 2 findings and signal follow-ups

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Close what wave 1 left and VERIFY_01 found blocking, so the set meets PLAN Decision 10 everywhere "new" and
"updated" show.

## Items

1. **FE_01-R3**: `packages/ui/src/region/region-note.css` `.vb-nblock-reply`: container note replies take the
   same edge as card replies under `[data-update-signals]` (bright amber while unseen, muted after).
2. **The "N updates" tab on hover/open** keeps the bright `--vb-state-updated`, not the duller changed amber:
   hovering must never look like a step down (`packages/ui/src/node/node-steps.css`).
3. **The toolbar's "N new" chip** is still the accent pink: one colour per meaning (Decision 10). New is teal:
   the chip takes `--vb-state-fresh` under `updateSignals`; if it counts updated cards too, say how it reads and
   pick the teal unless VERIFY_01 found it confusing.
4. **Card NEW tab** (VERIFY_01 finding 3): `packages/ui/src/node/node-popover.css` `.vb-node-btab[data-tab='new']` is
   pink while the pill's "new" is teal: teal with the toolbar chip (item 3), so no pink "new" is left.
5. **Light amber** (VERIFY_01 finding 1): in light, `--vb-state-updated` `#a66800` reads as the action amber
   `#b57c09` (ΔE76 9.0, and darker). Pick a light value that reads clearly apart from the action amber (aim ΔE76
   ≥ 20, by hue toward orange and/or chroma, as bright as Lc 45 words on the card allows), keep dark `#ffc21a`;
   the seen-reply mix and `-soft` follow; figures in the token comment; `update-signals.spec.ts` checks light too.
   Report the value: the maintainer may change it (point 429).
6. **Docs**: `docs/specification/components.md`: what you change, and its quotes of "Read-only: press Edit to change it"
   / "Press Edit again" take the new words (FIX_02 owns the words; read them from `#actions` `READ_ONLY_PERSON`).
7. **Gallery**: `update-signals-section.ts` box taller than its cards so the shot shows the badges and the tab;
   `editing-section.ts` meta says `readOnlyStart` is on by default.

8. **Table column widths** (VERIFY_01 finding 5, and the orchestrator's look): equal columns waste room (a column
   of short numbers as wide as one of sentences) and break words like "Internationalisation" and "Enterprise".
   Try widths that follow content (`table-layout: auto`, `overflow-wrap: break-word`, not `anywhere`, so short
   words never break; a word only breaks when it alone is wider than its column) while the table still never
   overflows or scrolls at L and S. MD_01 tried auto with `anywhere` and saw short words break: avoid that. If no
   approach meets "no scroll, no overflow, short words whole", keep `fixed` and say why. `packages/ui/src/markdown/markdown.css`,
   `tests/pages/markdown-more.spec.ts` and its screenshots, the gallery's Markdown screenshots.

## Steps

Failing test first for each; the specs and screenshots each touches; APCA (labels Lc 45, edges Lc 30), light and
dark; gallery entries updated; a look at 1400, 900, 600 px.

## Validation

- [ ] Each item's spec green, light and dark; `check`; `npm test`; flag off = as before

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files; other needs under `REQUESTS`. Behind the flag each piece already uses; off is
exactly the old behaviour.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

### Run 1 (2026-11-05, Opus 5.5, worktree `.claude/worktrees/fix-01`, branch `feat/fix-01`, port 7700; look server 7790)

**Changes Made**
1. Container note replies (`packages/ui/src/region/region-note.css` `.vb-nblock-reply`): under `[data-update-signals]` the
   muted amber edge, as card replies; a `[data-unseen]` rule for the bright edge, ready for when the frame's template marks
   one (it marks none today: REQUEST).
2. The "N updates" tab hovered or open (`node-steps.css`): keeps `--vb-state-updated` (outline and words) and gains its
   `-soft` fill; no step down to `--vb-state-context`. Flag off: as before.
3. The toolbar's "N new" chip: tone `fresh` (`--vb-state-fresh` on its `-soft`, Lc 54.8 light, 63.5 dark) under
   `updateSignals`, `new` (pink) off. New `apps/board/src/board/chrome/chip-tone.ts` `newTone` (one home; a `.svelte`
   module export does not type-check from `.ts`), used by `Toolbar.svelte`, `HeaderFields.svelte` (the "⋯" row) and the
   gallery's `fresh-section.ts`; `chrome/index.ts` re-exports it. The chip counts new and updated together under the word
   "new" (its list ends updated rows "· updated"); teal, as VERIFY_01 did not find it confusing. The tone's rule is in
   the chip pattern (`packages/ui/src/base/chip.css`, its `pattern.json` tone list).
4. The card's NEW tab (`node-popover.css`): teal under `[data-update-signals]` (words `--vb-state-fresh` on its `-soft`,
   edge 45% toward the line, as the stale tab). No pink "new" is left on a card or in the bar (see Caught Beyond).
5. Light `--vb-state-updated`: `#a66800` → `#d66e00` (tangerine amber), dark `#ffc21a` kept. Light can't be lighter than
   the action amber and keep Lc 45 on deep (the action amber is already Lc 47.4 there), so it is apart by hue and chroma:
   chosen by a scan of every sRGB amber/orange that passes Lc 45 as words on card, sunken, deep, canvas, its `-soft` and the
   pill's teal `-soft`, and Lc 30 for the seen-reply mix, for the best balance of ΔE76 from the four neighbours. Light /
   dark ΔE76: action amber 22.1 / 23.1, changed amber 20.3 / 21.7, flag 21.4 / 33.6, risk 21.8 / 51.9. Light APCA:
   card 61.4, sunken 52.0, deep 45.6, canvas 55.5, its `-soft` 52.3, pill 51.7; seen-reply edge (50% toward
   `--vb-line-strong`) on sunken 38.3, on the card 47.7. The `-soft` and the seen mix follow by `color-mix`. Figures in the
   token's comment and `packages/tokens/README.md` § Signals. `update-signals.spec.ts` now checks ΔE76 ≥ 20 from all four
   in both themes (the dark-only "brighter than" check stays).
6. `docs/specification/components.md`: § Markdown table paragraph (the grid, held by "follow their content"); § 8 "Updated
   in amber" (hover keeps the amber, NEW tab and "N new" chip teal via `newTone`, the frame's replies muted, the new
   tests, what is still not covered); the read-only quotes take FIX_02's words ("Read-only: switch to Editing to change
   this ledger", "…to change it", and the toggle's name "so voice control can always say it").
7. Gallery: `update-signals-section.ts` pads its card list so the badges and the "1 update" tab sit inside the box (and its
   screenshot); `editing-section.ts` meta says `readOnlyStart` (and `readOnlyToggle`) on by default, off with
   `?flags=-…`, and (coordinator, from FIX_02) its description "until the person switches to Editing".
8. Tables (`packages/ui/src/markdown/markdown.css` `.vb-md-table`): a grid, one `minmax(0, auto)` track per column
   (`--vb-md-cols` 1-4 by `:has(th:nth-child(n))`; `thead`, `tbody`, `tr` `display: contents`), cells `overflow-wrap:
   break-word`, `min-width: 0`. Measured on the gallery's L and S samples plus two of my own (VERIFY_01's
   Plan/Seats/Languages/Notes with "Internationalisation" and "Enterprise"; a numbers table with one comment column):
   | layout | short words whole | no overflow | widths follow content |
   |---|---|---|---|
   | `fixed` + `anywhere` (was) | no ("Comment", "accounts", "Languages" at S; "Internationalisation" at L) | yes | no (equal) |
   | `auto` + `break-word` | yes | **no**: the S sample's paths/identifiers make the table 631 px in 246 | yes |
   | `auto` + `anywhere` (+ `min-width`, `keep-all`, `line-break`) | no ("Enterprise", "Region", "Q1") | yes | skewed |
   | `auto` + `break-word` + cell `max-width` caps (4.5em-8em, `25%`) | mostly | only with a cap ≤ holder/4 | near-equal |
   | grid `minmax(0, auto)` (now) | yes; only a word wider than its column breaks ("Respons·e" at S) | yes, every case | yes (L: 70/66/147/147; numbers 51/24/26/329) |
   The accessibility tree keeps table, rowgroup, row, columnheader and cell (checked in Chromium; axe passes).
   `markdown/pattern.json` `vb-md-table` row says so. New test in `markdown-more.spec.ts`: "columns follow their content"
   (no word breaks that would fit its cell whole, at L and S; at L "Price" narrowest, "Notes" widest).

Tests changed with the behaviour: `update-signals.spec.ts` (ΔE76 both themes; hover and chip Lc on their soft fills; a
board test: hovered tab amber on its soft fill, NEW tab teal, "2 new" chip tone `fresh` and teal; flag off: changed amber
on hover, NEW and chip pink; gallery: NEW tab, chip, the frame's muted reply; gallery flag off: pink, grey);
`fresh-cards.spec.ts` (its hover/NEW test now expects the amber kept and NEW teal); chip selectors
`[data-tone="new"]` → `[data-tone="fresh"]` in `fresh-cards`, `find-keeps-marks`, `header-tiers`.

Screenshots re-taken, each failing diff looked at first: content the fix meant (`gallery` freshCards, note-bubble,
updateSignals, markdown; `fresh-cards` fresh-section; `card-updates`; `parking-replies`; `header-tiers` header (the "N new"
chips teal); `toolbar`; `open-list`; `markdown-more`; `update-signals-replies`); a sub-pixel shift only (the Markdown
section got shorter: its tables wrap less, so every gallery section below moves): `access-by-bot`, `app-fit`,
`chat-alongside`, `chat-attach-gallery`, `chat-folder`, `chat`, `container-rail-states`, `current-folder`, `flag-retire`,
`go-to-card`, `key-bubble`, `layout-controls` (3 pairs), `lock-board`, `open-folder`, `person-remove`, `picker-archive`,
`proposals-review`, `proposals`, `search`, `selection-pill`, `send-access`, `versions`, `wires`. Not re-taken (FIX_02's,
REQUEST): `read-only`, `read-only-toggle`, `read-only-controls`, `read-only-writes` gallery shots.

**Caught Beyond the Brief**
- The narrowest bar's "new" dot (`apps/board/src/styles/header.css` `.vb-count-dot`) is still the accent pink: the last
  pink "new" (REQUEST).
- The toolbar's "N updated" chip for other boards (`Toolbar.svelte` `boards-updated`, tone `new`) is pink; "updated" is
  amber elsewhere now. Another meaning (other boards, not cards), left for the maintainer.
- A container's replies on the frame never carry `data-unseen` (`region-template.ts` `nblockRepliesMarkup`), so they are
  muted from the start; the bright rule waits for it (REQUEST).
- Light vs dark updated now differ in hue (tangerine 61° vs golden 83° LCh): light has no room to be lighter than the
  action amber at Lc 45 on deep. Its nearest neighbours are the flag and risk oranges (ΔE76 21.4, 21.8): an updated tab
  on a risk card is the closest pair; read apart on the look board, but the maintainer's eye decides (point 429).
- The grid table keeps its table roles in Chromium (checked with the accessibility tree and axe); other engines are not
  checked here (the tokens are Chromium-checked only too). A host that embeds the board in Safari should look once.
- Files outside the listed ownership, each the home of what an item changed: `packages/ui/src/base/chip.css` and its
  `pattern.json` (the chip's tones: the "N new" chip's colour lives there), `packages/ui/src/markdown/pattern.json` (its
  `vb-md-table` row described the fixed layout), the new `apps/board/src/board/chrome/chip-tone.ts` (in `chrome/**`),
  and the three specs whose chip selector the new tone touched. `docs/specification/modules.md` (orchestrator) may want
  `chip-tone.ts`; `verify` passes.

**Verification** (tier: wide)
- `npm run build`, `npm run check` 0 errors, `node scripts/verify.mjs` ok (35 warnings, none on a touched file).
- `npm test`: 2398/2400; the 2 failures are FIX_02's (`api-read-only.test.ts`, `ledger-move.test.ts`, BOT_01-R1).
- Page specs by group (port 7700, 3 workers, `nice -n 15`, 5 min each): update-signals + markdown-more 18 pass; fresh-cards,
  find-keeps-marks, header-tiers, card-updates, group-note, parking-replies 75 pass after re-takes; gallery, notes,
  note-polish, popover-thread, size pass after re-takes. Full page suite (chromium, 10.7 min): 912 passed, 4 failed, all
  FIX_02's: `read-only-controls`, `read-only-writes`, `read-only` (the reworded reason, BOT_01-R1) and `read-only-toggle`
  gallery screenshot (my editing-section words plus the shift).
- The look (look server on 7790, scratch HOME and project, gallery fixture seeded; `temp/fix-01/{shots,action}.mjs`):
  gallery at 1400 light and dark; a board drawn through the API with an updated action card, a plain action card, a
  question and a NEW risk card at 1400, 900 and 600 px, light and dark. Light: the "1 update" tab reads orange beside the
  gold ACTION badge (VERIFY_01's failing case); "2 new" and NEW teal; the reply edges bright then muted; the L table on
  one line per row. PNGs in `.claude/worktrees/fix-01/temp/fix-01/` (`before-*` and `after-*`: tab-pill-new, tab-hover,
  toolbar-chip, reply-edges, container-reply, table-L, table-S, board; `after-action-updated-{light,dark}-{1400,900,600}`).
  The `before-tab-hover-*` crop misses the tab (fixed for `after-*`).

**Deviations**: none from the PLAN. Item 8 is met by a grid, not `table-layout: auto` (the brief's suggestion), because
no table layout meets all three of its conditions (table above).

## On Completion

Notes here (Changes Made, Verification, Caught Beyond the Brief, Deviations); your TASK-STATUS row; one LOG line,
`[board-ui] FIX_01: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/FIX_01_findings.md]]`, ending in a
newline; the return block.
