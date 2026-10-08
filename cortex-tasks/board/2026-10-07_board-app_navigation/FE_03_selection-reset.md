# FE_03_selection-reset: Reset places for a selection

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (ruling 3) ·
> **Tracker**: N19 · **Model**: Sonnet 5.5

## Objective

With cards selected, one command puts every selected card back where layout places it.

## Rulings (do not reopen)

1. A `reset-places` command in the one command table (`apps/board/src/board/commands.ts`
   `COMMAND_IDS`, `COMMANDS`, `SELECTION_COMMANDS`), shown in the selection bar as "Reset places",
   disabled when no selected card is pinned. Its key is `R`: with a selection, R resets every
   selected card; with none, R keeps resetting the focused card (`keys.ts`).
2. One `unpin` act per pinned selected card, sent as one step through `sender.run` (side by
   side, one redraw), as `places.ts` `resetRegion` does. No schema change.
3. Refused in a past version (FE_01's guard covers it).

## Steps

1. [x] Failing page test: pin three cards, select two, Reset places: those two return, the third
   stays; R with a selection does the same; the button is disabled when none is pinned.
2. [x] Command row, selection-flow case, keys.

## Validation

- [x] The five gates exit 0.

## Implementation Notes

**Status**: Completed

`reset-places` in `commands.ts` (key `r`, `acts: true`, in `SELECTION_COMMANDS` between Move to and Zoom to selection). `barButtons` takes a third `off` list; the bar's `BarButton` gained `disabled` (template, CSS `:disabled`, pattern.json state, unit test), so `selection-flow.ts` `place()` disables Reset places when no selected card is pinned (new deps `pinned`, `resetPlaces`; `command` returns false with no selection, so R falls through to the focused card's `unpin` in `keys.ts`, unchanged apart from a comment). `places.ts` `resetCards(ids)` sends one `unpin` per pinned card as ONE step through `sender.run` (new `run` dep), so one redraw; `resetRegion` left as it was. Refused in a past version via `acts: true` (button hidden, command false) and the guarded `unpin`. `controller.ts` stays at 300 lines (deps added on existing lines). Tests: new `tests/pages/reset-places.spec.ts` (own boards; item numbers are project-wide, so it reads ids from the DOM); `zoom-and-lasso.spec.ts` button list updated. Gallery selection-bar sample 1 now shows Reset places disabled; `gallery-{dark,light}-darwin.png` baselines updated (diff viewed: only the bar's new button; the pattern description was kept the same length so no other section shifted). Docs: `components.md` command list. All five gates 0.

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-app] FE_03: …`).
