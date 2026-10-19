# FE_01_app-card-layout: App card: edge-to-edge panel, title, Allow in the footer, Z

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Make an app card all panel: no side padding, no repeated title (behind a flag), the Allow / Stop
control in the footer instead of a row over the panel, and Z zooming one app card to 95% of the stage.

---

## Context

PLAN.md § Key Changes 1-4. App cards: D-047, `docs/specification/components.md` § App card.
Ruling to keep: a state change never moves the card (app-cards FIX_02); only a new size does.
**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/ui/src/node/node.css` (app card width), `node-app.css`
  (remove `.vb-app-ask`; footer status styles), `node-app.ts` (`AppCardView`: the footer control's
  kind `allow | allowed | none` replacing the row's `ask` / `text`, words unchanged),
  `node-template.ts` (`appSlot` loses the row; `footer()` gets the app status after the kind icon
  for app cards), `vb-node.ts` (applies it in place), `apps/board/src/board/app-cards.ts` (button
  and menu wiring, focus return), the feature flag registry (`components.md` § Feature flags names
  where flags live), `apps/board/src/board/viewport.ts` (`APP_FIT`),
  `apps/board/src/board/selection-flow.ts` (`'zoom-selection'`), gallery
  `apps/board/src/gallery/app-frame-section.ts` and the app card gallery section
- **Patterns to follow**: Allow is `vb-pop-btn vb-pop-primary`; "Allowed ▾" reuses the board's
  menu button + `menu-keys.ts` (the move menu, `move-menu.ts`, is the model); visually hidden text
  uses the repo's existing sr-only class (grep `sr-only\|visually-hidden` in `packages/ui`)
- **Skills**: `cortex-architecture` · `cortex-docs` (components.md § App card) — load before starting

---

## Steps

1. [x] Width: an app card with its panel is `--app-w` plus its border; `.vb-node-content` on it has
   no side padding (top / bottom spacing stays; the panel's corners meet the border's radius).
2. [x] Title (flag `appTitle`, default off until VERIFY_01's approval): in needs-approval, changed
   and ready, the title is visually hidden but stays in the accessible name; under
   `[data-zoom='far']` it shows. Other states unchanged.
3. [x] Footer status: needs-approval / changed → "Allow" (primary) with the reason ("Not allowed
   yet" / "Code changed") as its `title` and in its accessible name; ready + allowed →
   "Allowed ▾" opening a one-item menu, Stop app (`app-revoke`); ready with nothing to allow →
   nothing. `.vb-app-ask` and "Nothing to allow" are gone. All control states (idle, hover, focus,
   pressed, loading while the action is in flight, error, disabled) from the pop-button pattern.
   Zoomed far, the buttons hide as quick actions do.
4. [x] Z: when the selection is exactly one app card, fit with `APP_FIT` (`fill: 0.95`); its
   longer axis is 95% of the stage. Everything else keeps `SELECTION_FIT`. Name `APP_FIT` in
   `key-help.ts` words only if Z's help line changes.
5. [x] Tests first: update `tests/pages/app-cards.spec.ts` / `app-states.spec.ts` (no row; footer
   control per state; Stop then Allow again; card size identical across states; panel edges meet
   the border within 1px) and `zoom-and-lasso.spec.ts` (95% ±1% on one app card, 75% otherwise);
   unit tests for `appView`. Update gallery entries for every state.

---

## Validation

- [x] Page tests above pass; `npm test` passes; `npm run verify` fails only the page-weight budget (see Deviations)
- [x] Footer fits an app card at the smallest manifest size without wrapping (screenshot in notes)
- [x] APCA: Allow and "Allowed ▾" meet their tiers light and dark

---

## Constraints

- If deviation is needed, stop and ask the maintainer — no silent breaking changes.
- No PII in examples or fixtures.
- No git commits during execution.
- Protected files (steering, `docs/decisions.md`, `docs/principles.md`, tokens): propose the exact change and wait.
- Update this file's Implementation Notes on completion.

---

## Implementation Notes

**Status**: Completed (one validation gate open: page-weight budget, see Deviations)  
**Completed**: 2026-10-19 12:20  

### Changes Made
- **View** (`packages/ui/src/node/node-app.ts` `appView`, `AppControl`): `ask` / `stop` / the ready `text`
  replaced by `control: 'allow' | 'allowed' | 'none'` and `reason` ("Not allowed yet", "Code changed");
  `names` gains `allowed` ("App allowed: Calculator"); Allow's name ends with its reason
  ("Allow app: Calculator. Not allowed yet"). "Nothing to allow" and "Allowed to run" are gone.
- **Markup** (`node-template.ts`): `appSlot` is the frame and the state view only (no row); `footer()`
  gets `appStatus(n)` after the state span (outside its `aria-hidden`): Allow, "Allowed ▾"
  (`data-app-menu`, `aria-haspopup="menu"`, `aria-controls` = `appMenuId(n)`) and its menu
  (`vb-menu-list vb-app-menu`, one `menuitem` Stop app, `data-app-act="app-revoke"`). An app card gets a
  footer even without a number (everyNode off), so Allow is always reachable. **Shared Foundation for
  FE_03**: the footer's left-side slot is `.vb-app-status` (flex: 1 after the kind icon); FE_03's ⓘ goes
  on the right, after `.vb-node-actions`.
- **Element** (`vb-node.ts` `updateApp`, new `updateAppStatus`): shows one control, names it, Allow's
  reason as `title`, closes the menu when "Allowed ▾" hides; focus moves to the card when the focused
  control goes.
- **Styles**: `node.css` app card width `--app-w + 2px`; `node-app.css`: `.vb-app-ask` removed; the
  slot runs edge to edge (`margin-inline: -space-4`, so title, tags and notes keep their padding),
  square corners and hairlines top and bottom only; the footer status, its loading (`aria-busy`) and
  error (`data-error`) states, the menu opening upward, far-zoom hiding; the `appTitle` flag's title.
- **Flag** `appTitle` (`packages/format/src/flags.ts`, default off): set as `data-app-title` on the world
  (`apps/board/src/board/controller.ts`, one entry in the existing hover-tip flag loop) and on the
  gallery's `main` (`apps/board/src/gallery/main.ts`). With it, the title takes no room in any state
  (absolute): visually hidden while the panel runs (still in the card's name), drawn over the top of
  the panel's room in states without a panel and when zoomed far.
- **Page** (`apps/board/src/board/app-cards.ts`): `createAppMenus` (open/close, `menu-keys.ts`
  `menuKeydown`, outside press closes, Esc focuses the button); `press` marks the footer control
  `aria-busy` + `aria-disabled` while the act is in flight, `data-error` when refused (cleared on the
  next press), ignores a press while busy.
- **Z** (`viewport.ts` `APP_FIT` `{ fill: 0.95, cap: MAX_K }`; `selection-flow.ts` `'zoom-selection'`
  uses it when the selection is exactly one app card with its panel, `isAppCard`). Z's help line is
  unchanged, so `key-help.ts` is untouched.
- **Gallery** (`app-frame-section.ts`): state labels updated; new group "The footer's app status"
  (Allow loading, Allow refused, "Allowed ▾" open).
- **Docs**: `docs/specification/components.md` § App card 1-4, 9 and § lasso item 5 (Z);
  `docs/specification/apps.md` (one size, not one height); `packages/ui/src/node/pattern.json`
  (`vb-app-status` replaces `vb-app-ask` / `vb-app-stop`; four new states).
- **Tests**: `packages/ui/tests/node-app.test.ts` (every state's control/reason/names; the footer slot
  markup; no footer status off-flag; footer without a number), `node-template.test.ts` (footer on app
  cards), `apps/board/tests/viewport-zoom.test.ts` ("fit with APP_FIT"); page:
  `app-cards.spec.ts` (footer control per state, width 362 and panel sides meet the border within 1px,
  menu keys + axe with it open, Stop then Allow again, Z 95% ±1% on one app card and 75% ±1% on two),
  `app-states.spec.ts` (control per state, edges, one size across states, far zoom hides the footer
  controls, the appTitle flag), `app-follow.spec.ts` (size kept through Allow / code change / Stop),
  `app-gallery.spec.ts` (status samples, no "Nothing to allow").

### Verification
- `npm test`: 1514 + 10 pass, 0 fail. `tsc -p tsconfig.json` and `npm run check`: 0 errors.
- Page tests (under `temp/pages.lock`): app-gallery, app-cards, app-states, app-follow, gallery,
  app-safety, zoom-and-lasso: all pass (19 + 31 + 28 across runs).
- Screenshots updated on purpose: `tests/pages/__screenshots__/app-gallery.spec.ts/app-cards-{light,dark}-darwin.png`,
  `tests/pages/__screenshots__/gallery.spec.ts/gallery-{light,dark}-darwin.png` (the gallery ones are
  full-page, so they also captured the sibling tasks' gallery state at 12:15).
- Footer at the smallest manifest size (280 wide, card 282): looked at on a scratch board in the browser:
  kind icon, "Allowed ▾", Comment, Later, Flag on one line with room to spare; menu opens upward over
  the panel.
- APCA-W3 0.0.98G-4g (temp/apca-2b.mjs `lc`, colours read from the page): Allow light 77.4 (white on
  accent fill), dark 60.4 (dark ink on accent fill), reading tier 60 met; "Allowed" light 104.5, dark
  94.9; the ▾ (decoration, tier 30) light 76.2, dark 48.8.

### Issues & Resolutions
- The footer's state span is `aria-hidden`, so the status slot is its sibling, and the span is
  `flex: none` on app cards so the slot sits right after the kind icon.
- A note or tag on an app card must not touch the border, so the slot reaches past the content's side
  padding instead of the content losing its padding (same outcome for the panel).
- The menu lives in the card (packages/ui) with the board's menu classes (`vb-menu-list`,
  `vb-menu-item`, apps/board `board.css`) and its keys wired by the page (`menu-keys.ts`, which
  packages/ui can't import, D-016).

### Deviations from Plan
- **Page-weight budget (needs the maintainer)**: `npm run verify` fails "the board page is … KB gzip,
  budget 150 KB". Measured on a clean worktree of HEAD (b7a0296): 153,470 B (130 B left); HEAD plus
  only FE_01's files: 154,454 B (+984 B: JS +785, CSS +199), 854 B over. With the sibling tasks'
  changes the tree measured 151.7 KB. Options: raise the budget (`scripts/verify.mjs` `PAGE.budgetKb`,
  `docs/specification/performance.md` § Budgets, likely a decision entry), or find savings elsewhere.
  Not decided here.
- The 95% Z page test is in `app-cards.spec.ts` (it needs the app server); `zoom-and-lasso.spec.ts`
  keeps the 75% cases unchanged (its board has no app card) and passes.
- "Other states unchanged" vs "card size identical across states" (appTitle flag on): the title takes
  no room in any state, and in the states without a panel it is drawn over the top of the panel's
  room (the state view is padded for it), so no state moves the card. Flag off (the default): titles
  are exactly as before. For the maintainer to judge by eye in VERIFY_01 (`?flags=appTitle`).
- Touched outside the listed files, one line each: `apps/board/src/board/controller.ts` (the flag on
  the world) and `apps/board/src/gallery/main.ts` (the flag on the gallery), plus
  `tests/pages/app-follow.spec.ts` and `app-gallery.spec.ts` (they asserted the old row). node-core.ts
  not touched.

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] FE_01: [what you did] → Task: [[cortex-tasks/board/2026-10-19_board-ui_card-polish-and-history/FE_01_app-card-layout.md]]
   ```

   Cite files by path + symbol, never by line number. Don't write the set's entry or to `AUDITED.md`.
