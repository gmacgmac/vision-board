# Card Polish and Card History - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Created**: 2026-10-19  
> **Source**: maintainer review of the app card in chat, 2026-10-19 (points 1-10 and the Z request;
> numbers below are that conversation's)

---

## Problem Statement

App cards waste room and repeat themselves: the panel sits inside the card's side padding, the
card title repeats the app's own header, and a full-width "Nothing to allow" row sits over the
panel in every state. On every card, a long note thread can't be put away, a note or reply shows no
time, and nothing shows what happened to a card over time once its "N updates" are seen. Z on an
app card zooms it to 75% of the stage, too small to use the app.

---

## Current State

- **Card width**: `vb-node[data-kind='app']` is `--app-w` plus `2 * --vb-space-4` plus the border
  (`packages/ui/src/node/node.css`); `.vb-node-content` has `--vb-space-4` side padding.
- **Allow row**: `appView` (`packages/ui/src/node/node-app.ts`) gives `ask` (needs-approval,
  changed) or `text` ("Nothing to allow", "Allowed to run") plus `stop`; `appSlot`
  (`node-template.ts`) draws it as `.vb-app-ask` over the frame (`node-app.css`). Allow and Stop
  app are the `app-allow` / `app-revoke` actions (`packages/actions/src/registry.ts`), wired in
  `apps/board/src/board/app-cards.ts`.
- **Footer**: `footer()` in `packages/ui/src/node/node-template.ts`: kind icon, divider, state
  word on the left; `offers(n)` quick actions and the flag button on the right; `STEP_NAV` takes
  its place while a changed card is stepped.
- **Notes**: `notesView` (`packages/ui/src/node/node-core.ts`) and `notesMarkup` /
  `replyMarkup` (`node-template.ts`). `ItemNote` has `at` (`packages/actions/src/notes.ts`);
  `CardReply` (`node-core.ts`) has none.
- **Private card marks**: `flag` / `unflag` are `CARD_MARKS` and `PRIVATE_ACTIONS`
  (`packages/format/src/ledger.ts`), folded by `packages/actions/src/card-flags.ts`, in
  `packages/format/schema/events/act.schema.json`, kept out of every agent read
  (`apps/board/tests/api-flag.test.ts`). Ledger format is 17 (`LEDGER_FORMATS`).
- **Updates**: `unseenSteps` (`apps/board/src/board/updates.ts`) builds `CardStep`s for unseen
  versions only; `versionTime` (`apps/board/src/board/versions.ts`) formats a time in the
  person's clock; `linesTo` there reads ledger pages.
- **Z**: `'zoom-selection'` in `apps/board/src/board/selection-flow.ts` fits the selection box
  with `SELECTION_FIT` (`{ fill: 0.75, cap: MAX_K }`, `apps/board/src/board/viewport.ts`).

---

## Proposed Solution

### Key Changes

1. **Panel fills the card** (point 1): no side padding on an app card with its panel; the panel
   runs edge to edge inside the border. Card width becomes `--app-w + 2px`.
2. **No duplicate title** (point 2), behind a new flag `appTitle` (rule 12), default on once the
   maintainer approves by eye: an app card in a panel state hides its title visually
   (visually-hidden class, still in the accessible name) and shows it when zoomed far
   (`[data-zoom='far']`), where the panel is a placeholder. States without a panel keep the title.
3. **Allow moves to the footer** (point 3): `.vb-app-ask` row removed. The footer's left side gets
   an app status control after the kind icon:
   - needs-approval / changed: an accent "Allow" button (`vb-pop-primary` look) with the reason as
     its tip ("Code changed");
   - ready + allowed: "Allowed ▾", a menu button opening one item, Stop app (`app-revoke`);
   - ready, no tools: nothing;
   - missing / invalid / broken / past / checking: unchanged, drawn over the panel.
   `appView` keeps owning the words; only the drawing moves. The panel keeps its full size, so a
   state change still never moves the card (app-cards FIX_02).
4. **Z fills the screen for an app card** (Z request): when the selection is exactly one app card,
   Z fits it with a new `APP_FIT` (`fill: 0.95`, no 110% cap clamp below 1) so its longer axis
   fills 95% of the stage. Other selections keep `SELECTION_FIT`.
5. **Hide notes on a card** (point 4): new private card marks `notes-hide` / `notes-show`, the
   flag's pattern exactly: format bump 17 → 18, in `CARD_MARKS` and `PRIVATE_ACTIONS`, never in an
   agent read. A hidden thread draws as one "N notes" pill button; pressing it shows the thread
   (`notes-show`). The toggle lives on the "N notes" line and on the pill.
6. **Time on hover** (point 9): each note and reply shows a small time chip at its top right on
   hover and on keyboard focus, `versionTime`-style ("Oct 19, 09:42", "Today 09:42" when today),
   full date in `title`. `CardReply` gains `at`.
7. **Card history** (points 6, 7, 10): an ⓘ button at the far right of the footer, after the flag,
   on every card with a footer. It opens a box (the card popover pattern, `node-popover.ts`) listing
   what happened to the card, newest first, as time + one line, with no note or reply text:
   agent drew vN (with agent label), you sent / edited / removed note N, agent replied, ✓ / ✗ /
   reopened, Later / parked, size, moved, allowed / stopped (app), proposals. Private marks
   (`PRIVATE_ACTIONS`: flag, notes-hide) never show. A note or reply row is a button that closes
   the box, scrolls that note into view on the card and highlights it briefly.

---

## Contracts first (rule 6, cortex-architecture)

- BE_01 changes the source first: `act.schema.json` (`notes-hide`, `notes-show`, the flag's
  `if/then`), `LEDGER_FORMATS` gains 18, `CARD_MARKS`, the action registry, then the generated
  artifacts (`npm run` generate scripts the repo uses for `tools.generated.json` / openapi; find
  them in `package.json`) and `docs/specification/api.md` (the flag's section is the model).
- History is a read of ledger lines the page already pages through; **no new endpoint** unless
  BE_02 finds the page can't get a card's lines in proportion (rule 15). If it can't, BE_02 stops
  and proposes the contract change.

---

## Dependencies

- Wave 1: BE_01 (format + actions for hide notes, reply `at`) and FE_01 (app card layout, footer
  status, Z). Disjoint files.
- Wave 2: BE_02 (`cardHistory` model) and FE_02 (hide notes UI + hover time). FE_02 needs BE_01's
  actions and reply `at`. BE_02 touches `packages/actions/src/index.ts` after BE_01 did.
- Wave 3: FE_03 (history button and box) needs BE_02's model, FE_01's footer and FE_02's note
  highlight.
- Wave 4: VERIFY_01.
- Shared Foundations: see TASK-STATUS.md.

---

## Out of Scope

- The chat panel's auto-scroll (its own task:
  `cortex-tasks/board/2026-10-19_board-app_chat-follow-latest.md`).
- The paste-into-chat issue (point 11): waiting on the maintainer's console test.
- Editing or removing notes from the history box; rewinding (tracker N23).
- Teaching the agent skill anything new (point 5: maintainer said not needed).

---

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| Footer crowding on narrow cards (Allow + quick actions + flag + ⓘ) | ⓘ is 24px like the flag; FE_03 checks an S card and a 375px-wide stage; if it overflows, ask before shrinking anything |
| Hiding the title loses the card's name at a glance | Behind `appTitle` flag; shows when zoomed far; maintainer approves by eye in VERIFY_01 |
| Allow less visible in the footer than in a row over the panel | Accent button, the board's one call to act on the card; page test that it's the first footer control and in the accessible name |
| History cost on an old card | Build only when the box opens, from that card's lines; timing test with a 1,000-event card |
| New ledger format breaks old readers | Format 18 adds two actions only; old lines still read (schema tests on fixtures at 17 and 18) |
| Protected files (decisions, tokens) | If a new token or decision entry is needed, propose the exact change and wait |

---

## References

- `.kiro/steering/vision-board-proj.md` (rules 3, 4, 5, 6, 8, 12, 13, 15)
- `docs/specification/components.md` § App card (D-047, app-cards FE_01), § Notes beside cards (2e_FE_01), § Feature flags (rule 12)
- `docs/specification/api.md` (flag section), `docs/specification/apps.md`
- `docs/decisions.md` D-045, D-046, D-047
- `cortex-tasks/board/2026-10-17_board-app_app-cards/` (FIX_02: a state change never moves the card)
- `tests/pages/app-cards.spec.ts`, `app-states.spec.ts`, `notes.spec.ts`, `flag-retire.spec.ts`, `card-updates.spec.ts`, `zoom-and-lasso.spec.ts`

---

## Success Criteria

- [x] An app card's panel touches the card's inner border on both sides; no "Nothing to allow" anywhere
- [x] Allow / Allowed ▾ / nothing show in the footer per state; Stop app works from the menu and Allow again after it
- [x] Z on one selected app card: its longer axis is 95% (±1%) of the stage
- [x] A card's notes hide (head only, one right-hand Hide/Show toggle; FE_02 replaced the "N notes" pill at the maintainer's change) and come back; the state survives reload; no agent read contains it
- [x] Hover or focus on a note or reply shows its time; nothing shows otherwise
- [x] ⓘ opens the history, newest first, no note text, no flag; a note row scrolls to and highlights that note
- [x] Every new control has all its states, keyboard access, labels, a gallery entry and page tests; APCA tiers pass light and dark
- [~] `npm test`, `npm run verify` pass; `npm run test:pages` 560 pass, 1 fails (chat-context.spec.ts:139, a race with the lazy-loaded chat panel, not this set; see TASK-STATUS VERIFY_01) and 6 serial tests after it did not run. Evidence for all: TASK-STATUS.md § VERIFY_01
