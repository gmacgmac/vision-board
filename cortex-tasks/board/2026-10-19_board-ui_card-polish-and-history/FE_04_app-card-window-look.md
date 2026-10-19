# FE_04_app-card-window-look: App cards look like app windows; the name in the footer

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Make app cards read as running app windows, not ordinary cards: no title above the panel, the
app's name in the middle of the footer (cut short with "…" when narrow, full on hover), and a
window-like frame of their own.

---

## Context

Maintainer, 2026-10-19 (point 28, option A "window bar" without a header): "we already have the
footer with Allowed and the buttons… if there is a name given to a node, let's put that there so
it's clear… if an agent mentions this node… in the middle of the bottom footer… only a certain
amount of characters so even when the node is very small it's not wrapping… truncate… if you hover
it, you should see the full name." Also: app cards should look "more special", not like every other
card; the duplicate title (the card's above the app's own header) must go.

Current state after FE_01, FE_03 and FIX_01: the panel runs edge to edge; the title is hidden only
with the `appTitle` flag (off by default, `packages/format/src/flags.ts`); the footer is kind icon,
`.vb-app-status` (Allow / "Allowed ▾"), the quick actions, the flag, the ⓘ history button.
**Read previous task notes in TASK-STATUS.md before starting** (FE_01's and FE_03's especially).

---

## Inputs

- **Files to modify**: `packages/ui/src/node/node-template.ts` (`footer()`, `appStatus`: the name
  slot), `vb-node.ts` (apply in place), `node-app.css` / `node.css` (the window look, the name's
  truncation), `node-app.ts` (`AppCardView.name` is already the manifest title else the card's),
  `packages/format/src/flags.ts` (`appTitle` default on, or retire the flag if the maintainer's
  look makes it permanent — say which in notes), the app gallery sections, page specs
  `app-cards.spec.ts`, `app-states.spec.ts`, `app-gallery.spec.ts`, docs `components.md` § App card
- **Patterns to follow**: the footer's existing slots; tooltips the board already uses
  (`vb-tip` / `title`); tokens only — the app kind's colour (`--kind`) for the frame accents
- **Skills**: `cortex-architecture` · `cortex-docs` — load before starting

---

## Steps

1. [x] **No title above the panel**: the card title is not drawn on an app card in any panel
   state (still in the card's accessible name). In states without a panel (missing, invalid,
   broken, past, checking) the state view's own head names the app, so no title is needed there
   either. Zoomed far, the panel is a placeholder: show the name there (it already shows the app's
   title as the placeholder text — check).
2. [x] **Name in the footer**: between `.vb-app-status` and the quick actions, the app's name
   (`AppCardView.name`), one line, `text-overflow: ellipsis`, taking the space left (flex 1,
   `min-width: 0`); full name in a tooltip on hover and keyboard focus of the footer (and in the
   accessible name already). Never wraps; the footer's height never changes. Reading text tier
   (Lc 60).
3. [x] **Window look**: a frame of its own so an app card is told apart at a glance — the footer
   reads as the window's bar (a quiet tint of the app kind's colour across its width, a hairline
   above), the card's border one step stronger in the kind's colour, square panel top meeting the
   border. Keep it quiet: no gradients, no glow, nothing that fights the app's own design.
   Light and dark. Then a design critique by eye in the gallery before reporting done.
4. [x] **Flag**: `appTitle` on by default (or retired); update tests that expected it off.
5. [x] **Tests first**: page tests — no visible title above a ready panel; name in the footer,
   truncated at the smallest app width (282px card) with the full name in its tooltip and
   accessible name; footer one line at every width; card size unchanged across states. Update
   gallery entries and screenshots on purpose (list each).

---

## Validation

- [x] `npm test`, the app page specs, `npm run verify` pass
- [x] APCA tiers light and dark for the name and the tinted bar
- [x] Screenshots of a wide and a narrow app card, light and dark, in the notes for the maintainer

---

## Constraints

- If deviation is needed, stop and ask the maintainer — no silent breaking changes.
- No PII in examples or fixtures.
- No git commits during execution.
- Protected files (steering, `docs/decisions.md`, `docs/principles.md`, tokens): propose the exact change and wait.
- Update this file's Implementation Notes on completion.

---

## Implementation Notes

_To be completed by agent after task completion._

**Status**: Completed  
**Completed**: 2026-10-19 15:45  

### Changes Made
- **Flag** `appTitle` (`packages/format/src/flags.ts`): kept, now **on by default** (rule 12: off restores the
  old title and an unnamed footer). Description rewritten for the window look. Not retired: that is the
  maintainer's call once seen.
- **Markup** (`packages/ui/src/node/node-template.ts`): `appName(n)` in `footer()` after `appStatus(n)`, before
  the quick actions: `.vb-app-name` > `.vb-app-name-text` (the name) + `.vb-tip.vb-app-name-tip` (aria-hidden).
- **Element**: the app-card code moved out of `vb-node.ts` (297 -> 240 lines) into a new
  `packages/ui/src/node/node-app-apply.ts`: `applyPanelSize`, `applyApp` (was `updateApp` / `updateAppStatus`;
  now also writes `AppCardView.name` into the bar) and `bindAppNameTip` (the shared hover tip: shows while the
  name is cut and the pointer is on it or keyboard focus (`:focus-visible`) is in the footer; never while the
  app's menu is open; Esc closes). `vb-node.ts` binds it once per app card.
- **Styles** (`packages/ui/src/node/node-app.css`), all under `[data-app-title]`: the title visually hidden in
  every state (absolute, 1px, clip-path; still in the card's name); the far-zoom title and the state view's
  title padding removed (the frame's placeholder shows the app's title zoomed far; the state view's head
  speaks otherwise); content padding top and bottom 0 on an app card (bottom kept when tags or notes follow
  the slot), so the panel meets the top border with its top corners on the border's curve and meets the bar;
  the tabs on the top border draw over the panel (z-index 1); the footer is the bar: `color-mix(--kind 10%,
  --surface)`, a hairline `color-mix(--kind 60%, --vb-line)`, inner bottom radius; the card border one step
  stronger (`--kind` 60%, hover 85%; selected keeps node.css's selection border); `.vb-app-status` flex none
  and the name `flex: 1; min-width: 0`, centred, one line, ellipsis, `--vb-ink-strong`; the tip spans the bar
  just above it. No gradient, no glow; tokens only.
- **The appTitle axe finding (FE_03's)**: cause fixed, not the test: `.vb-app-state` now `overflow: auto`
  (contained), so a state view never draws past the panel's room over the footer; the problems list keeps three
  lines at least and the view scrolls on a small panel. Check again is reachable by scrolling, never over the bar.
- **Gallery** (`apps/board/src/gallery/app-frame-section.ts` `windowCards`): group "The window look": 280x120
  cards with Allow and with "Allowed ▾", and a long name cut with its tip open.
- **Tests**: `packages/ui/tests/node-app.test.ts` (+1: the name slot's place, escaping, none on other kinds or
  flag off); `tests/pages/app-states.spec.ts` (the old appTitle test replaced: "the window look …": no title in
  any of six states, the name in the bar, panel within 16px of the card top, one size, one footer height, one
  line and no overflow at 282px in every state, the state view inside the panel with Check again above the bar,
  axe clean; a cut name ("Tries too much" beside Allow, 282px card) with its tip on hover and on keyboard focus,
  not on a pointer press, Esc closes; a name that fits shows none; and "with the appTitle flag off …");
  `app-gallery.spec.ts` (the window group); `app-cards.spec.ts`, `app-follow.spec.ts` select an app card by its
  bar's name (the title is no longer drawn) and click inside the panel below the tabs.
- **Docs**: `docs/specification/components.md` § App card 1 (the window look), 2, 3, 4, 9;
  `packages/ui/src/node/pattern.json` (files, `vb-app-name` part, `data-name-tip-open`).

### Verification
- `npm test` 1525 + 10 pass; `npm run check` 0 errors; `npm run verify` ok (warnings: controller.ts 305,
  fold.ts 308, untouched).
- Page specs app-states, app-gallery, app-cards, card-history, app-follow, app-safety, review-colours,
  focus-ring: 61 passed. Full page run: 520 passed, 46 failed before the baseline update: 44 were gallery
  section screenshots shifted by a fraction of a pixel (an app card in the node section lost its title's
  fractional line height) plus the app-cards screenshots (intended); `review-colours` (my border rule beat the
  selection border, fixed); `board.spec` "Tab moves…" was a 404 while I rebuilt mid-run (passes; its screenshot
  depends on run order and passes in a full run).
- Footer at the smallest app card (282px): kind icon, Allow / "Allowed ▾", the name (cut), Comment, Later, Flag,
  ⓘ on one line, no overflow (page test and by eye). No deviation needed.
- APCA-W3 0.0.98G-4g (temp/fe04/apca.ts, colours read from the page; the bar's fill from a screenshot pixel),
  light / dark: name on the bar 95.0 / 92.7 (tier 60); quick-action icons 66.7 / 46.6, kind icon 61.7 / 59.3
  (tier 30); card border on the canvas 46.7 / 33.2 (tier 30); bar hairline 43.1 / 30.1 (tier 30).
- Page weight: 152,031 -> 152,490 B gzip (+459 B), budget 200 KB.
- Screenshots for the maintainer (temp/fe04/): `wide-{light,dark}.png` (360x440 calculator),
  `narrow-{light,dark}.png` (280x160 calculator with Allow), `narrow-missing-{light,dark}.png`,
  `narrow-tip-{light,dark}.png` (cut name, tip open), `narrow-invalid-{light,dark}.png` (state view scrolling
  inside the panel), `phone-{light,dark}.png` (375px window, Z on the narrow card), `board-{light,dark}.png`.

### Design critique (by eye, gallery and board, light and dark, wide and narrow)
- Works: the bar reads as a window's bar at a glance; the stronger kind border and tinted bar tell an app card
  from other cards without fighting the app; the name sits where the eye looks for a window title; nothing
  wraps at 282px; the tip spans the bar so a long name wraps inside the card.
- For the maintainer: (a) the top border's tabs (number, APP) now sit over the panel's top 9px, so an app needs
  about 12px of its own top padding (the calculator has it); a thin tinted top strip would avoid that at the
  cost of 10px; (b) the name is centred in the room the controls leave, so it moves a little between Allow and
  "Allowed ▾"; (c) at the least height (120) a missing or invalid state scrolls, with a scrollbar in the view.

### Issues & Resolutions
- Found, not mine: in grid mode a column wider than an app card stretches the card (inline `width`) but not its
  panel, leaving a blank strip on the right of the panel (seen with a 280 and a 360 card in one column).
  Pre-existing; for the tracker.
- The title can't be the click target to select an app card any more; a press on the bar's name (or the
  state view) selects it. Specs updated to click the name.
- A scratch script of mine wrote screenshots once to a stray folder `~/Dropbox%20(Personal)/` (a URL-encoded
  path); removing it was refused by the permission check, so it is still there for the maintainer to delete
  (it holds only those PNGs and the empty folders).

### Deviations from Plan
- None. Screenshot baselines changed on purpose (46), all `tests/pages/__screenshots__/`:
  app-gallery app-cards-{light,dark}; card-updates card-updates-*; chat chat-*; flag-retire flag-*, retired-*;
  gallery gallery-*; go-to-card go-to-card-*; key-bubble key-bubble-gallery-*; layout-controls alignment-*,
  card-widths-*, link-labels-*; lock-board lock-*; open-folder folder-picker-*; parking-replies
  parking-replies-*; person-remove remove-*; picker-archive archive-*; proposals proposals-*; selection-pill
  selection-pill-gallery-*; send-access agent-access-*; size node-size-*; toolbar toolbar-*; versions
  past-version-*; wires see-through-* (each light and dark). Only app-cards and gallery-* show the new look; the
  rest are the sub-pixel shift.

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] FE_04: [what you did] → Task: [[cortex-tasks/board/2026-10-19_board-ui_card-polish-and-history/FE_04_app-card-window-look.md]]
   ```

   Cite files by path + symbol, never by line number. Don't write the set's entry or to `AUDITED.md`.
