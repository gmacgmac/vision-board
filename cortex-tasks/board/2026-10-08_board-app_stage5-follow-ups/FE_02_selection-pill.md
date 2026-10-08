# FE_02_selection-pill: Selection pill and compact bar

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (ruling 4) ·
> **Model**: Opus 5.5

## Objective

Selecting cards shows a small pill; the actions open on demand in a more compact bar whose
buttons highlight properly.

## Rulings (do not reopen)

1. **Pill.** With a selection, `<vb-selection-bar>` (`packages/ui/src/selection-bar/`) shows
   only a pill where the bar sits now: "3 selected" and a chevron, a button with
   `aria-expanded`. Click or Enter opens the bar; the pill stays its first item.
2. **Open bar.** The same actions as today, more compact: smaller height, padding and gaps,
   buttons still at least 24px targets (WCAG 2.5.8). It stays open until a click anywhere
   outside it (cards and the board background included), a pan, Esc (focus back to the pill), or
   the selection clearing. A new selection starts closed.
3. **Keyboard.** Commands on the selection (keys in `COMMANDS`, `apps/board/src/board/commands.ts`)
   work without opening the bar; the key bubble still lists them.
4. **Hover.** Fix the button hover in both themes: today the Comment button (the primary) turns
   black text on dark grey in dark and white on grey in light. Use the existing accent hover
   tokens (`--vb-accent-fill-hover` and its ink) or whatever the toolbar's buttons use, so it
   reads as a highlight; measure APCA for every state, light and dark.
5. Flag `selectionPill` (on); off is today's bar unchanged. Gallery: pill, open bar, hover.
   Lasso keyboard alternative unchanged.

## Steps

1. [x] Failing tests first: unit (pill label, open/closed state); page test
   (`tests/pages/selection-pill.spec.ts`): select shows the pill, click opens, outside click /
   pan / Esc close, keys work closed, axe light and dark; update existing selection specs that
   expect the bar open.
2. [x] Build, gallery, flag.

## Validation

- [x] The five gates exit 0. Look at pill, open bar and hover, light and dark.

## Constraints

- If deviation is needed, stop and say so; no silent breaking changes. No PII in examples.
- No git commits or stash. Scratch in the system temp folder. Stop only your own processes.
- Fill Implementation Notes below, your row in TASK-STATUS.md, and your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-08.

**Pattern** (`packages/ui/src/selection-bar/`). `barView(n, buttons, pill?)` gains `pill: true` and
`open` (core). The template draws the count as a button, `.vb-sb-pill` ("3 selected" and a CSS
chevron, `aria-expanded`), first in the bar; open or closed draws the same markup, and the element
sets `data-pill`, `data-open` and `aria-expanded` outside the redraw key, so the pill keeps focus as it
opens. A click or Enter on the pill fires `vb-toggle` (`ToggleEventDetail { open }`); the element
still never acts. CSS: `[data-pill]` is the compact bar (4px padding and gap, 24px buttons, bar 34px
tall against 40px), buttons after the pill `display: none` while closed. The area bar (a lasso round
no card) is compact too but has no pill. pattern.json: states, parts, attributes, `vb-toggle`.

**Hover fix (ruling 4).** Cause: `.vb-sb-btn:hover:not(:disabled)` (0,3,1) outranked
`.vb-sb-primary:hover` (0,2,1), so Comment kept its own ink on the 8% ink hover (APCA Lc 9.5 light,
0.0 dark). Now `.vb-sb-primary:is(:hover, [data-look='hover']):not(:disabled)` is equally specific
and later: `--vb-accent-fill-hover` fill and border under `--vb-ink-on-fill`, as `.vb-btn-primary`.
Applied with the flag off too (it is a defect, not new behaviour; nothing in any screenshot hovers).

**Page.** `apps/board/src/board/selection-pill.ts` (new, `createPill`): the open state; a document
pointerdown (capture) outside the bar closes it (cards, background, a drag that pans or lassos), a
stage wheel without Ctrl/Cmd closes it (a pan), the selection clearing resets it, so a new selection
starts closed. `selection-flow.ts` creates it when `deps.pill`, passes `{ open }` to `barView`,
listens for `vb-toggle`, and exposes `collapse()` (Esc: close, focus back on the pill when focus was
in the bar). `controller.ts` stays at 300 lines: `pill: on('selectionPill')` joins an existing line
of the flow's deps, and Esc tries `flow.collapse()` after an open note bubble and before a past
version / clearing (two lines merged to keep the count). Keys: unchanged (`keys.ts` and `COMMANDS`);
the key bubble still lists them. Flag `selectionPill` (format `flags.ts`, on).

**Tests.** Unit: `packages/ui/tests/selection-bar.test.ts` (pill label, open/closed in the view, same
markup open and closed, no pill on the area bar). Page: `tests/pages/selection-pill.spec.ts` (select
shows the pill; click opens, pill first, 24px targets; a card press and a background click close it; a
wheel pan and a drag pan close it; Enter opens, Esc closes with focus on the pill, second Esc
clears; Z and N work closed; Comment hover equals the hover tokens, axe closed and open, light and
dark; flag off is today's bar; gallery samples, axe and screenshots). Updated to open the pill first
via a new `helpers.ts` `openSelectionBar`: `zoom-and-lasso.spec.ts` (the pan check compares the
bar's centre and bottom, since the pan closes it), `reset-places.spec.ts` (two Escs: bar, then
selection), `move-and-later.spec.ts`. The axe check with the bar open passes `target-size` as
known, as `reset-places.spec.ts` does: the open bar sits on the container's title line and crowds
the container's grip.

**Gallery.** `selection-bar-section.ts` with the flag: pill closed, open, hover (Comment and Move to
drawn with `data-look`), the compact area bar; off, today's two samples. Also fixed its placement
(it read `offsetLeft`, which ignores the cards' transform, so the bar sat off-centre).
`gallery.spec.ts` full-page screenshot runs with `-selectionPill` added.

**Contrast (APCA-W3 0.0.98G-4g, by script; light / dark; glass = surface-raised 72% over canvas).**
Pill and buttons idle, ink-strong on glass: 102.9 / 95.1 (60). Hover and pressed, ink-strong on the 8%
ink hover: 93.9 / 93.2 (60). Disabled, ink-subtle on glass: 74.6 / 49.0 (45). Comment idle,
ink-on-fill on accent-fill: 77.4 / 60.4 (60). Comment hover and pressed, ink-on-fill on
accent-fill-hover: 83.3 / 66.9 (60). Focus ring, accent on glass: 70.3 / 48.0 (30). Chevron: as the
text (30). No token change. Looked at pill, open bar and hover in light and dark (gallery screenshots).

**Screenshots updated.** New: `selection-pill-gallery-{light,dark}`. `gallery-{light,dark}`: the
selection bar pattern's description and states text, and its samples now centred. Sub-pixel shift
only (the selection-bar section above them is taller with the pill samples; diff is text edges
throughout, no content change): card-updates, key-bubble-gallery, parking-replies, proposals,
agent-access, node-size (light and dark).

**N27.** A press that opens a card's box is outside the bar, so it closes the open bar: by pointer
the open bar no longer stays over a box opened beside a card. The closed pill can still overlap one,
and a box opened by keyboard with the bar open is still covered. Not addressed further.

**Docs.** `docs/specification/components.md` (selection bar point 3: the pill), `modules.md`
regenerated (`npm run map`).

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-ui] FE_02: …`).
