---
category: board-app
status: completed
created: 2026-10-12
tracker: cortex-tasks/tracker.md#N13
---

# See the zoom level; hide card controls below a chosen level

> **From**: maintainer, 2026-10-12 (chat 651: "let's hide them, but let's pick a level … how can we
> find out what zoom level we're at") · **Model**: Sonnet 5.5 · **Go**: given

## Rulings (maintainer; do not reopen)

1. **The zoom level is visible**: the toolbar's zoom group shows the current zoom as a percentage
   (e.g. "75%"), next to or under Fit, always up to date (wheel, pinch, keys, buttons, Fit). The zoom
   buttons' tooltips say what they do and the level ("Zoom in · 75% now"). Every state, tokens only,
   APCA (reading text), screen readers announce the level politely on change (not on every frame).
2. **Hide card controls below a level**: the existing switch (`hideControlsZoomedOut`,
   `apps/board/src/board/viewport.ts` `FAR_K`) is turned **on** by default at today's level (0.75);
   the level stays one constant so the maintainer can pick a new one after reading the percentage.
   Below it, cards' buttons, the size control and containers' icon rows hide, as the switch already
   does; the board's axe checks follow (the existing `target-size` excuse at the opening zoom is
   reviewed: with hiding on, nothing small is drawn, so no excuse should be needed).

## Steps

1. [x] Failing tests first: the percentage shows and follows every zoom path; tooltips; the live
   announcement; controls hidden below the level and shown above; keyboard focus never lands on a
   hidden control; axe light and dark at the opening zoom and at 1.
2. [x] Build (`ToolbarEnd.svelte` zoom group, `viewport.ts`, `flags.ts` default); gallery state;
   screenshots after viewing the diffs, each with its reason.
3. [x] Update tracker N13 in your notes (the orchestrator edits the tracker).

## Validation

- [x] The five gates exit 0, one after another.

## Constraints

- Project rules (`.kiro/steering/vision-board-proj.md`): patterns first, one job per file about 300
  lines (500 hard), tests first, tokens only, every state, accessibility.
- No git commits or stash. Protected files: propose wording. Scratch in the system temp folder (never
  the repo's `temp/`); stop only your own processes and leave none running; never touch
  `.visionboard/` or real home-folder files; don't use the board on 4466.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-12. Gates: `npm test` 1192 + 7 timing pass, `npm run check`, `npm run verify`
(ok, 0 warnings), `npm run gen -- --check` (current), `npm run test:pages` (404 passed), all exit 0, run one after another.

**Built**
- `apps/board/src/shell/ZoomLevel.svelte` (new): the readout `NN%` beside Fit (`.vb-zoom-level`, `aria-hidden`,
  fixed width, tabular digits, `--vb-ink`, tokens only) and a visually hidden polite status that says "Zoom NN%"
  600 ms after the zoom stops changing (a burst of keys or a pinch is one announcement; the level the page
  first mounts at is not announced). Clears first, so the same level reached again is announced again.
- `ToolbarEnd.svelte`: shows `ZoomLevel` after Fit; tooltips come from `zoomTitle` (`commands.ts`): "Zoom in · + · 75% now",
  "Zoom out · - · 75% now", "Fit · F · 75% now" (the key kept; the accessible names are unchanged). New optional prop `zoom`
  (the gallery passes its own); the board reads `shell.zoom`.
- `viewport.ts`: `zoomPercent(k)` (rounds **down**) and the "far" rule now compare the shown percentage
  (`zoomPercent(k) < zoomPercent(FAR_K)`), so the number on screen and the hiding always agree ("75%" means the controls
  show; rounding to nearest would have shown "75%" at 0.745 with the controls hidden). `FAR_K` is still the one constant;
  its comment now says to read the percentage in the toolbar and change that one number.
- `controller.ts` sets `shell.zoom` in `vp.onApply` (every path: wheel, pinch, keys, buttons, Fit, restored view);
  `shell.svelte.ts` holds `zoom`. `flags.ts`: `hideControlsZoomedOut` default **true** (`?flags=-hideControlsZoomedOut` turns it off).
- `board.css`: `.vb-zoom .vb-zoom-level`. Docs: `components.md` item 4 (Zoomed out), `packages/ui/src/node/pattern.json` (`data-zoom`).
- Gallery: the toolbar section's three samples show 100%, 75% and 250%; its description text is unchanged, so no other gallery
  section's screenshot moved (a longer description had shifted every section below it by a fraction of a pixel).

**Tests**
- New `tests/pages/zoom-level.spec.ts` (9): the readout matches the drawn zoom on open and after keys, buttons, Fit, ctrl-wheel (pinch)
  and the limits; tooltips; one announcement for a burst; hide below / show above the level; 60 Tab stops never land on a hidden control;
  C still opens a card's note while its buttons are hidden; `-hideControlsZoomedOut` keeps everything visible; axe light and dark
  with **nothing excused** at the opening zoom, zoomed out, and at 100%.
- New `apps/board/tests/viewport-zoom.test.ts` (4): `zoomPercent`, the far rule against the shown percentage, flag off never far, tooltip text.
- `board.spec.ts`: the opening-zoom axe test no longer excuses `target-size` (it asserts the stage is far and nothing is drawn); a second
  test keeps the flag-off case (controls visible, only `target-size` excused there). Excuses removed from `live-boards`, `finder`,
  `versions`, `size`, `flag-retire` (2) and `key-bubble.spec.ts` (its `expectCleanBoard` helper is gone); all pass without them.
  Excuses kept: `reset-places` and `selection-pill` (the container grip, a different cause, stated in their comments) and `send-access`
  (its own known failure).
- Tests that clicked a card or frame control at the opening zoom now zoom first (`zoomToControls` in `helpers.ts`: `select`, `notes`,
  `move-and-later`), or open with `-hideControlsZoomedOut` where the whole board must stay in view (`layout-controls` widths test).

**Screenshots changed, each after viewing actual, expected and diff** (4, nothing else moved):
- `board-dark/light`: the cards' footer buttons and the containers' icon rows are gone at the opening zoom, and "47%" shows beside Fit.
- `toolbar-dark/light` (gallery): the zoom group has the readout (100%, 75%, 250% in its three samples).

**Measured: the zoom the board opens at** (Fit; `k` x 100) on the roadmap fixture (17 cards): 1280x720 **32%**, 1440x900 **41%**,
1600x1000 **47%**, 1920x1080 **51%**, 2560x1440 **70%**; the 1,000-card board opens at **20%** (the minimum). So at today's level
(75%) the board opens with the controls hidden on every common screen, and they show only after zooming in; the card
buttons are drawn from 75%. The test browser (1600x1000) opens at 47%.

**For the maintainer**
- Tooltip wording keeps the key ("Zoom in · + · 75% now"); the ruling's example left it out. One line to change in `zoomTitle` if not wanted.
- Proposed tracker N13 (the orchestrator edits the tracker): "Done 2026-10-12. The toolbar shows the zoom (rounded down, beside Fit), tooltips
  and a polite status say it; `hideControlsZoomedOut` is on by default at 0.75 (`FAR_K`); axe excuses nothing at the opening zoom. Open: pick the
  level after trying it (the board opens at 47% at 1600x1000, 20% for 1,000 cards)."
- No decision-register or protected-file change was needed.
