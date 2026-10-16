# Review polish: containers, selection, notes, and a board that stays put - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)
> **Created**: 2026-10-15
> **From**: maintainer, 2026-10-15, using the board after the answer model (chat 82-116; every
> ruling below approved in chat) · **Go to build**: not yet (waits on the maintainer's yes to
> § Token values; `packages/tokens/src/tokens.css` is protected)

---

## Problem Statement

Reviewing real boards, the maintainer found the board hard to read and twitchy. Containers barely
stand out from the background and their titles vanish when zoomed out; a selected card is hard to
see; hovering your own note shows nothing; the hover box is grey on grey; a click on a note shows
one note, not the card's conversation, newest first. A narrow container's header cuts its marker
(N41) and the retired marker's version hides answers (N42). Worst, a click moves the board: a
press on ✓ on a tall card pans instead of ticking.

---

## Current State

- **Container frame**: `packages/ui/src/region/region.css` `vb-region` border
  `color-mix(in srgb, var(--region) 70%, var(--vb-line))`; `--region` is `REGION_COLOUR_DEFAULT`
  (`var(--vb-line-strong)`, `region-core.ts` `regionColour`). No fill: `apps/board/src/styles/board.css`
  draws connectors below the frames (wireLayers flag, D-032) and relies on that. Measured against the
  canvas: Lc 17.8 light, 0 dark (under APCA's low clip).
- **Container title**: `vb-region .vb-region-head h2`, `--vb-text-sm` (12px) in board units,
  two-line clamp with `overflow-wrap: anywhere` (found-in-use FE_03 ruling 2). The world is one
  `scale(k)` (`apps/board/src/board/viewport.ts` `Viewport.apply`, k from `MIN_K` 0.2 to `MAX_K`
  2.5), so at 20% a title is 2.4px on screen.
- **Header crowding (N41)**: `.vb-region-count` (`flex-shrink: 1000`) and `.vb-region-retired`
  (`flex: 0 100000 auto`) give way before the title, which then breaks mid-word.
- **Selected card**: `packages/ui/src/node/node.css` `vb-node[data-selected]`: border, half-pixel
  ring and top hairline in `var(--kind)`, glow at 65%.
- **Hover box**: `packages/ui/src/tip/tip.css` `.vb-tip`: border `--vb-line-strong` on
  `--vb-surface-raised`, Lc 27.6 light, 0 dark. Every tip uses it (note, reply, title, status).
- **Hover on your own note**: `packages/ui/src/node/node-note-tip.ts` `bindNoteTip` opens the tip
  only when `needed`: the world carries `data-note-preview` (notePreview flag, on by default) **and**
  the note's text is cut (`scrollHeight > clientHeight`). So a note short enough to show in full
  shows no tip by that rule. Whether the maintainer's note was short or cut is not established;
  FE_03 reproduces it first.
- **Click on a note or reply**: `apps/board/src/board/wiring.ts` `bindStage` sends
  `.vb-node-reply[data-reply]` to `showReply` and `[data-note]` to `showNote`;
  `apps/board/src/board/notes.ts` `show` / `reply` open one note with its replies (`edit` or `sent`
  mode) or an orphan reply alone (`reply` mode); `note-views.ts` `cardView`, `repliesOf`. The
  bubble's bottom row holds Close (read-only modes) or Cancel and Save
  (`packages/ui/src/note-bubble/note-bubble-core.ts` `bubbleView`).
- **Order**: `packages/ui/src/node/node-core.ts` `notesView` builds the entries oldest first, then
  `.reverse()`s them; `pin` is `entries[0]`, the latest note. Orphan replies come after the notes.
- **Retired marker (N42)**: `apps/board/src/board/retired.ts` `retiredCounts` opens the latest run
  before the latest retire; `versions.ts` `show` folds the ledger only up to that run's line
  (`linesTo`, `foldLedger`), so answers given after it are missing.
- **Focus pans**: `apps/board/src/board/focus.ts` `createFocus`: `focusin` anywhere in a card calls
  `set`, which calls `Viewport.reveal` (pans by the overflow, 48px margin, whenever the box is not
  fully in view). A press on ✓ focuses the button, so it counts; a card taller than the stage
  always overflows, so the press pans and the click lands elsewhere. On window blur, `focusout` with
  no `relatedTarget` calls `set(null)`; on return `focusin` reveals again. `POPOVER_OPEN` reveals too.
- **Z**: `selection-flow.ts` `command('zoom-selection')` calls `Viewport.fit`: 32px margin a side,
  zoom capped at `Math.min(1.1, …)`. Fit (whole board), zoom-area and `finder.ts`
  `zoomToContainer` share it. `chat-bridge.ts` `zoomTo` runs the zoom-selection command.
- **⌘ + drag**: `apps/board/src/board/pointer.ts` `bindPointer`: on a card's content a press is
  `press` (a drag selects text; ⌘/Ctrl click adds or removes the card); nothing inside `INTERACTIVE`
  (buttons, notes, replies, the note bubble, card popover, selection bar) starts a gesture. Only a
  plain drag on a background pans.

---

## Rulings (maintainer; do not reopen)

1. **Containers a step brighter**, border and fill, so groups stand out from the background
   (maintainer, 82). Values in § Token values.
2. **Container titles stay a constant on-screen size**, so they read when zoomed all the way out
   (83).
3. **Selected cards brighter**: grey cards (note, topic) a full step, every other colour half a
   step (84, 113). Values in § Token values.
4. **Hovering the person's own note shows that note.** Today it shows nothing: likely a
   regression; failing test first (85, 97).
5. **The hover box gets a visible border**; today it is grey on grey (86). Value in § Token values.
6. **Hover shows only the thing hovered**: your note, or that one reply. **A click (or Enter or
   Space) opens the card's whole conversation**: every note and reply on it, oldest first, scrolled
   to the one clicked (97, 114, 115B). It replaces today's click, which opens one note with its
   replies (`vb-note-bubble`; `notes.ts`, `note-views.ts`, `wiring.ts`).
7. **The exchange window's Close button becomes an ×** in the top corner; Esc and a click outside
   close it too; the space goes to the conversation (88).
8. **Notes and replies are listed oldest first**, top to bottom, like a chat: note 1, its replies,
   note 2… A new note goes at the bottom. Today `notesView` lists newest first (`.reverse()`). The
   pin (top-right badge) still opens the latest note (105, 110).
9. **A narrow container's header**: the retired marker ("N retired") and the container controls
   never shrink; the title takes the remaining space on one line and ends in "…", the full title on
   hover and in the accessible name. Tracker N41 (94, 100).
10. **The past version the retired marker opens shows the person's answers as they stood when those
    cards were retired**, not as at that older version. Past versions stay read-only
    (`versions.ts`). Tracker N42 (95, 101).
11. **Focus never moves the board.** Clicking a card or any control in it, or the window getting
    focus back, does not pan or zoom. Keyboard focus moving to another card (Tab, J) may pan only
    when that card is off screen; never pan to fit a card bigger than the screen. Failing test first
    (107, 111).
12. **Z fits the selection to about 75% of the screen**, one card or several; the 110% cap in
    `Viewport.fit` is raised for Z only; Fit for the whole board is unchanged (107, 112, 116).
13. **⌘ + drag (Ctrl on other systems) pans the board from anywhere**: over text, over a card, over
    a hover box or popover (106).

---

## Maintainer's answers, 2026-10-15 (chat 125-132; these win over anything below)

- **Colours by eye, not by the tier (125, 132):** "a full step on everything and see"; this is
  highlighting, not reading text (D-009 lets the maintainer overrule a tier by eye). Container frame
  and the tip border: one step up the existing Lines scale from today's value, light and dark (in
  light, one step deeper). Selected card: a full step for every kind (`--vb-select-lift` 50%, no
  separate grey token). Then the maintainer tunes by eye on a real board.
- **No container fill (126):** drop `--vb-region-fill`; the container's inside stays as it is.
- **"Brighter" = more contrast with the canvas (127):** lighter in dark, deeper in light.
- **Ruling 4 dropped (129):** the maintainer tested it: hovering a note or a reply shows it. No fix.
- **The conversation opens at the bottom (129):** oldest at the top, the window scrolled to the
  latest; when an older note or reply was clicked, scrolled to that one.
- **Go:** FE_01 now (132: "just make the changes"); the rest on 2026-10-15 ("all ok, proceed"),
  with every "Decision inside the rulings" below approved as written (chat 137-147), except
  decision 11, moot now ruling 4 is dropped.

## Token values for the maintainer's yes

Proposed for `packages/tokens/src/tokens.css` (FE_01 edits it only after the yes). Measured with
APCA-W3 0.0.98G-4g using the repo's helper (`temp/apca-2b.mjs` `lc`; there is no contrast gate yet,
tracker N1), magnitude shown, light / dark. Mixes are `color-mix(in srgb, …)` worked out the same
way. Tier: decoration Lc 30 (D-009). "Brighter" is read as **more contrast with the canvas**:
lighter in dark, deeper in light (no colour on a light canvas is brighter than white).

| Token (new) | Light | Dark | Used by |
|---|---|---|---|
| `--vb-line-contrast` (Lines) | `#b8b8bf` | `#7c7c84` | Container frame (via `REGION_COLOUR_DEFAULT`), every `.vb-tip` border |
| `--vb-region-fill` (Surfaces) | `color-mix(in srgb, var(--vb-surface-region) var(--vb-card-fill), transparent)`: on the canvas `#fcfcfc` | same: on the canvas `#171719` | Container fill, see-through like a card (D-032) |
| `--vb-select-lift` (Item states) | `25%` | `25%` | Selected card: `--vb-ink-strong` mixed into `--kind` (half a step) |
| `--vb-select-lift-grey` (Item states) | `50%` | `50%` | The same for note and topic (a full step: ink-subtle 50% toward ink-strong lands on `--vb-ink`, `#424248` / `#c6c6cb`) |

**Measured pairs** (Lc, light / dark; "now" is today's value for the same place):

| Pair | Now | Proposed | Tier |
|---|---|---|---|
| Frame line on the canvas (outside) | 17.8 / 0 | 32.1 / 32.6 | 30 |
| Frame line on its fill (inside, `#fcfcfc` / `#171719`) | n/a (no fill) | 36.3 / 32.1 | 30 |
| Tip border on its own box (`--vb-surface-raised`) | 27.6 / 0 | 38.1 / 31.8 | 30 |
| Tip border on the canvas beside it | 21.7 / 0 | 32.1 / 32.6 | 30 |
| Container title (`--region` 20% into `--vb-ink`) on the label's canvas gap | 77.3 / 56.5 | 79.0 / 63.8 | 45 (heading) |
| Mode row border (`--region` 55% into `--vb-line`) on the canvas | 16.0 / 0 | 22.2 / 16.6 | 30: **under, before and after**; reported, not in the rulings |
| Fill on the canvas | n/a | 0 / 0 (a surface step, under APCA's clip) | none (surfaces) |

Selected card (line, ring, hairline and glow in the lifted colour), on the canvas / on the new
container fill:

| Kind | Light now → proposed (canvas, fill) | Dark now → proposed (canvas, fill) |
|---|---|---|
| question | 66.7 → `#2d5ba3` 76.8, 80.9 | 52.8 → `#91b8f1` 62.3, 61.8 |
| finding | 60.7 → `#1d7165` 72.9, 77.0 | 59.8 → `#77cec0` 67.5, 67.0 |
| decision | 66.1 → `#a5146e` 77.2, 81.3 | 48.5 → `#fb80ca` 56.2, 55.7 |
| risk | 58.8 → `#ae4626` 71.7, 75.8 | 53.3 → `#f2a184` 61.9, 61.3 |
| action | 57.3 → `#8e630e` 70.4, 74.5 | 64.5 → `#e9bf73` 71.1, 70.6 |
| topic (full step) | 70.6 → `#453871` 87.6, 91.8 | 48.8 → `#c9bef1` 70.8, 70.3 |
| note (full step) | 70.3 → `#424248` 87.3, 91.4 | 49.6 → `#c6c6cb` 71.8, 71.3 |

Notes on the values:
- **The tier makes the frame more than "a step"**: in dark, Lc 30 needs about `#7c7c84`, close to the
  connector colour (`--vb-wire` `#7c7c89`, Lc 32.8), from today's `#35353b`. A smaller step stays
  under the tier (`#76767e` is 29.9 on the canvas). The maintainer may overrule the tier by eye
  (D-009); FE_01 shows both in the gallery first if asked.
- **One line token for both** the frame and the tip border: one value meets 30 on the canvas, the
  fill and the raised box in both themes, so a third step on the Lines scale is reused, not two.
- **The fill is see-through** (`--vb-card-fill`, 70%) because connectors draw below the frames
  (board.css, D-032): an opaque fill would hide them. A card on the fill reads `#fefefe` on
  `#fcfcfc` (light) and `#19191b` on `#171719` (dark): cards keep their own border and shadow, but
  their fill barely differs from the frame's. Look at it in the gallery before the yes.
- **Topic is purple** (`--vb-kind-topic` = `--vb-state-later`); it reads grey because its surface is
  sunken. It takes the full step as ruled.
- `REGION_COLOUR_DEFAULT` moves to `var(--vb-line-contrast)` and the frame reads `--region` whole, so
  a region colour later is still one function. That also changes the title (better, above) and a
  container note bubble's edge (`note-views.ts` `containerView` passes `regionColour`).

---

## Proposed Solution

Six page tasks along file seams, then one check by hand. No contract, ledger or action-layer change:
every ruling is page and pattern work (`packages/ui`, `apps/board`), plus the approved tokens.

### Key Changes

1. **Colours (FE_01)**: rulings 1, 3, 5. The four tokens; frame border and fill; selected state;
   `.vb-tip` border. Gallery, APCA re-measured from the browser, screenshots.
2. **Container header (FE_02)**: rulings 2, 9. One zoom value for CSS, set in `Viewport.apply`; the
   header drawn at a constant on-screen size; one-line title with "…"; marker and controls never
   shrink.
3. **Notes on a card (FE_03)**: rulings 4, 6 (hover), 8. The hover fix (failing test first);
   `notesView` oldest first, pin on the latest.
4. **The conversation window (FE_04)**: rulings 6 (click), 7. A new read-only bubble mode holding
   the card's whole conversation in FE_03's order; × in the corner; Esc and a click outside.
5. **The board stays put (FE_05)**: rulings 11, 12, 13. Focus never pans unless the keyboard moves to
   an off-screen card; Z fills about 75%; ⌘ + drag pans from anywhere.
6. **Retired answers (FE_06)**: ruling 10. The marker's past view shows the answers as at the retire.
7. **By hand (VERIFY_01)**: every ruling on the real board, light and dark, a large and a small
   screen.

---

## Decisions inside the rulings (for review)

Calls the plan makes where a ruling leaves room. Each task says which it owns; the maintainer can
change any before the go.

1. **"Off screen" (ruling 11)**: a card that fits pans, as today, when any part of it is outside the
   stage; a card bigger than the stage pans only when none of it shows, and then only to bring its
   top-left corner in (48px margin), never to fit it.
2. **A card's popover (ruling 11)**: `POPOVER_OPEN`'s reveal is a pan on a control's click, so it
   goes for a pointer; opened by Enter, it may still pan to show the box (the keyboard has no other
   way to see it).
3. **A container's mode change** (`places.ts` `setMode` reveals the frame) is a container control,
   not a card's: unchanged.
4. **Z only (ruling 12)**: the selection fills 75% of the stage's width or height, whichever binds,
   capped at `MAX_K` (2.5). Fit, zoom-area and `zoomToContainer` keep `fit` as it is; the chat's
   "zoom to these cards" (`chat-bridge.ts` `zoomTo`) runs Z, so it follows Z.
5. **⌘ + drag (ruling 13)**: a press with ⌘ or Ctrl becomes a pan only once it moves past the drag
   threshold; without moving it keeps today's meaning (⌘ click adds or removes a card, opens a link
   in a new tab, presses a button). Text fields (`input`, `textarea`) keep their own press. ⌘ or
   Ctrl on any system, as Ctrl/Cmd + scroll already is.
6. **Header (ruling 2)**: the whole top line (title, count, marker, holders, controls) keeps its
   on-screen size, so the controls no longer grow past 100% either; below 75% they hide as now.
7. **Header (ruling 9)**: the count ("2 of 4 answered") stays whole like the marker; the holders
   give way first, then the title.
8. **The conversation (ruling 6)**: orphan replies (naming no note of the card) take their place by
   time among the notes; the person's note that can still be edited shows an Edit button in the
   conversation, which turns the window into today's edit mode for it; the pin and C still open the
   latest note as today. A container's notes and replies open the same conversation for the
   container (one pattern).
9. **× (ruling 7)**: on the read-only conversation only; a note being written or edited keeps Cancel
   and Save, and a click outside it keeps today's discard question when words changed.
10. **N42 (ruling 10)**: the cards drawn are exactly that version's; the answers are those standing
    just before the first retire line after it. No banner wording change.
11. **Ruling 4's cause**: if a short note shows nothing only because `bindNoteTip` opens its tip
    for cut text alone, the cut condition goes (the notePreview flag check stays), so every note and
    reply shows its tip on hover. FE_03 says which cause it found.
12. **No new feature flag** (rule 12): every ruling changes an existing pattern, as the popovers and
    answer-model sets did.

---

## Dependencies

- **The maintainer's yes to § Token values** before any task starts (FE_01 writes them; the others
  run in the same go so screenshots are updated once per wave).
- Wave 1: FE_01, FE_03, FE_05, FE_06 (disjoint files). Wave 2: FE_02 (after FE_01: `region.css`;
  after FE_05: `viewport.ts`) and FE_04 (after FE_03: its order and list; after FE_06:
  `wiring.ts`). Wave 3: VERIFY_01.
- Shared foundations (TASK-STATUS.md): FE_01's tokens and `REGION_COLOUR_DEFAULT`; FE_03's
  `notesView` order, which FE_04's conversation lists without sorting again.
- No new packages. No API, ledger or skill change.

---

## Out of Scope

- **Go to a card by its number**: being designed in chat now; its own task.
- **The "what's new" container tags and step-through**: their own task.
- **Images on cards** (maintainer: after everything else).
- The skill's ✓ and ✗ rules (102): `cortex-tasks/board/2026-10-15_board-agent_skill-check-cross-rules.md`.
- The mode row's border, under the decoration tier before and after (§ Token values): reported only.
- A contrast gate in `npm run verify` (tracker N1).

---

## Risks & Considerations

| Risk | Mitigation |
|---|---|
| The frame at Lc 30 looks as strong as a connector (dark) | Gallery side by side before the yes; the maintainer may overrule by eye (D-009) |
| A filled frame hides connectors below it | Fill is see-through (`--vb-card-fill`); FE_01 checks a link that crosses a frame on the wires gallery and the roadmap board |
| The label's canvas-coloured gap (`.vb-region-label` background) now shows a notch over the fill below the line | FE_01 looks at it; the gap's lower half may take the fill (a two-stop background), decided by eye |
| Counter-scaling the header costs a layout per zoom step on every frame | One CSS custom property written once per `apply`; a `transform`, not a font size, so no reflow; FE_02 times a 1,000-card board (`tests/pages/perf.spec.ts`) |
| At 20% a constant-size title is wider than its frame on screen | One line, "…", width tied to the frame's on-screen width; page test at `MIN_K` |
| Focus changes break keyboard reach (rule 5) | Tab and J still bring an off-screen card in; `focus-ring.spec.ts` and axe kept green |
| ⌘ + press now captures the pointer | Only after the drag threshold; a still ⌘ click is untouched (unit and page tests) |
| N42's fold mixes the version's drawing with later acts on newer card versions | Acts naming a `ver` the past view does not draw are tested (`retired.test.ts`) |
| Parallel tasks in a wave each update the shared gallery screenshots | One page-test run at a time; a diff that shows a sibling's change is named, never reverted |

---

## References

- `.kiro/steering/vision-board-proj.md` (rules 1-5, 11-13, 15); `docs/decisions.md` D-009, D-013,
  D-030, D-032, D-044, D-045
- `cortex-tasks/board/2026-10-14_board-ui_popovers-larger-thread.md` (the exchange, popover tokens)
- `cortex-tasks/board/2026-10-15_board-actions_answer-model/VERIFY_01_by-hand.md` (N41, N42 found)
- `cortex-tasks/board/2026-10-09_board-app_pointer-focus-ring.md` (`pointer-focus.ts`)
- `docs/specification/components.md` (§ Notes beside cards, § Selecting and moving, § The lasso, the
  selection bar and view commands, § Navigation), `docs/specification/performance.md`
- `packages/tokens/src/tokens.css`; `temp/apca-2b.mjs` (`lc`)

---

## Success Criteria

- [ ] The token values approved and in `tokens.css`; every pair in § Token values re-measured from
      the rendered page, light and dark.
- [ ] Each ruling has a test that failed before its change (unit or page), and passes.
- [ ] Gallery entries for every new or changed state; screenshots viewed before update.
- [ ] The five gates exit 0, one after another (`npm run check`, `npm test`, `npm run verify`,
      `npm run gen`, `npm run test:pages`).
- [ ] VERIFY_01 passes by hand on the live board, light and dark.
