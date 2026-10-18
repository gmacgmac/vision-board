# FE_01_app-frame: Frame pattern: vb-app-frame and the message protocol

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Build the reusable, framework-free frame pattern that draws an app panel safely and speaks the
panel protocol, plus the app card's states inside `<vb-node>`.

## Context

PLAN.md rulings 3, 4, 5, 10, 14, 15. BE_01 has landed: read its notes and `docs/specification/apps.md`
(the protocol is defined there; implement it exactly). BE_02 builds the server side beside you; you
do not call the server: the element takes an injected `callTool(name, args) → Promise<result>`.

## Inputs

- **Files to create**: `packages/ui/src/app-frame/`
  - `app-frame-core.ts` (DOM-free; the protocol): `createAppBridge({ callTool, hostContext, onEscape,
    onState })` returning `{ receive(message, fromFrame: boolean), post }`: the handshake
    (`ui/initialize` → result with host context; `ui/notifications/initialized`), `tools/call`
    forwarding with id correlation, `ui/notifications/escape`, `ui/notifications/host-context-changed`
    sent on theme change, JSON-RPC 2.0 validation (shape, id, method table), errors with the standard
    codes, a cap on messages per second and calls in flight (from BE_01's `APP_LIMITS`; import it, no
    copy), nothing posted before `initialized`.
  - `vb-app-frame.ts` (the element): creates the `<iframe>` with `sandbox="allow-scripts"`, `src`, `title`,
    width and height from the card's `app.w`/`app.h` (clamped by `APP_SIZE`), listens to `message`
    on `window` and passes only events whose `source` is its frame's `contentWindow`; posts with
    `'*'` (PLAN.md note on ruling 5); tears down listeners on disconnect; exposes `load()` / `unload()`
    so the page can create the frame only on screen (ruling 14).
  - `app-frame.css` (tokens only), `pattern.json` (states, a11y notes), front-door exports in
    `packages/ui/src/index.ts`.
- **Files to modify**: `packages/ui/src/node/node-template.ts` (for `kind: 'app'`: the frame slot in
  place of the Markdown body, and the state views of ruling 10: loading, ready, needs approval with an
  **Allow** button, code changed, missing, invalid with its problems, broken with Restart, placeholder
  for far zoom / off screen / past version), `node-core.ts` (app card label and state words; no status
  word), `vb-node.ts` (no size control on app cards; width from `app.w` via CSSOM), `node.css` (card
  width = panel `w` + card padding, from tokens), `node/pattern.json`.
- **Tests**: `packages/ui/tests/app-frame-core.test.ts` (protocol, with fake windows: handshake,
  every method, bad JSON-RPC, unknown method, rate cap, a message from another source ignored, nothing
  before initialized, theme change), `node-core` / `node-template` tests for every app state.
- **Patterns to follow**: `packages/ui/src/note-bubble/` (core + element + css + pattern.json split),
  `vb-node.ts` (CSSOM, no inline style attributes: the page CSP has no `style-src`), tokens only,
  every state (rule 4), framework-free core (rule 16).
- **Shared artifacts to reuse**: BE_01's `APP_SIZE`, `APP_LIMITS`, `AppRef`, `NODE_TYPES.app`, `KIND_ICON.app`,
  `--vb-kind-app`.
- **Skills**: `cortex-architecture` (pattern-owned UI, every state, accessibility) · `cortex-docs`
  (`components.md` § App card).

## Steps

1. [x] Tests first, each seen failing.
2. [x] Core, then element, then the node template states; `components.md` § App card (states, the
   protocol in one paragraph pointing at `apps.md`, a11y: frame title, Tab in and out, Esc).
3. [x] Gates one after another: `npm run check`, `npm test`, `npm run verify`, `npm run build`. **Not**
   `npm run test:pages` (wave 2 runs in parallel; the orchestrator runs page tests after the wave;
   FE_02 adds the page tests for this pattern).

## Validation

- [x] All gates above exit 0; every protocol rule in `apps.md` has a unit test.

## Constraints

- Do not touch `apps/board/` (FE_02) or `apps/board/server/` (BE_02). No git commits.
  Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Completed (2026-10-18)

**What landed.** `packages/ui/src/app-frame/`: `app-frame-core.ts` (DOM-free: `createAppBridge`,
`parsePanelMessage`, `panelSize`, `hostContext`, `hostStyles`, `PROBLEM_WORDS`, `FRAME_CALLS`, the
protocol types), `vb-app-frame.ts` (`defineVbAppFrame`, `VbAppFrameElement`, `AppFrameWiring`,
`readLook`, `PANEL_PATH`), `app-frame.css`, `pattern.json`; defined in `defineBoardElements`,
exported from the front door. Node pattern: `node-app.ts` (`appView`, `APP_CARD_STATES`, `APPS_OFF`,
`problemLine`), `node-app.css`; `node-template.ts` (`appSlot`, `appStateMarkup`, Stop app,
`NodeTemplateOptions.appCards`), `node-core.ts` (`CardConditions.app`, `NodeState.app`, the name's
state words, no size on an app card), `vb-node.ts` (`updateApp`, `--app-w`/`--app-h` via CSSOM),
`node.css` (card width = panel + padding + border), `node/pattern.json`. Docs: `components.md` §
App card, `packages/ui/README.md`, apps.md § Errors (`data.detail`). Tests:
`app-frame-core.test.ts`, `app-frame-limits.test.ts` (+ `app-frame-harness.ts`, fake windows),
`node-app.test.ts`, `node-template.test.ts` (footer).

**For FE_02.** Import `packages/ui/src/node/node-app.css` and `packages/ui/src/app-frame/app-frame.css`
in the board page (the gallery already does). Pass `CardConditions.app`: `{}` until list_apps
answers, `{ info }` after, `{ past: true }` on a past version; nothing with the flag off, and render
with `{ appCards: false }`. Per card: `card.querySelector('vb-app-frame')` → `wire({ callTool })`
once (`callTool` rejects with `{ problem, detail? }`, the API problem's code and detail), then
`load()` only while `st.app.frame` and the card is on screen at or above `FAR_K`, `unload()` when
it leaves (`update()` already unloads it in any state without a panel); `lookChanged()` on a theme
change. Left out, the look is `readLook` (tokens resolved through a probe; light-dark() safe) and
Esc focuses the card. Buttons: delegated clicks on `[data-app-act]`: `app-allow` (the act needs the
`hash` from list_apps), `app-revoke`, `retry` (read list_apps again). Suggested: announce the
outcome of Allow / Check again / Restart in the page's polite live region (WCAG 4.1.3). Wheel and
pointer events over a loaded panel go to the panel, not the board.
The gallery: `apps/board/src/gallery/app-frame-section.ts` draws the frame unloaded and loading,
an app card in every state from list_apps fixtures, and the flag off; add the live panel there or
in `app-section.ts`. It rounds its section's height to a whole pixel (it sorts first; a fractional
height moves every section below off the pixel grid and changes their screenshots).

**Deviations, all inside the rulings:**
1. **Gallery entry** (`apps/board/src/gallery/app-frame-section.ts`, `main.ts`: the two CSS imports
   and the `SAMPLES` row) although the task says not to touch `apps/board/`: a new pattern needs a
   gallery entry (components.md § Tests) and `gallery.spec.ts` fails without one, and the state
   views had to be seen for the design reviews. Gallery files only; no wave-2 sibling edits them.
2. **Gallery fixture**: the four `app` samples in the `kinds` region got `w: 280, h: 160`
   (`gallery.ledger.jsonl`); at the default 360 the matrix, which does not wrap, made the page
   17px wider than 1600.
3. Seams: `node-app.ts` / `node-app.css` (node-core.ts was at the 300-line mark, node.css near it);
   the protocol tests split into two files and a harness (300-line limit).
4. `createAppBridge` takes `send` too and returns `{ receive, post, contextChanged, close, state }`.
5. The frame caps waiting calls at `FRAME_CALLS` = `inFlight + queue` (what the host would take);
   requests (`ui/initialize`, `ping`, `tools/call`) are answered before `initialized`, only the
   board's own notifications wait; `hostInfo.version` is `String(LEDGER_FORMAT)`; -32000 adds the
   server's words as `data.detail`.
6. An app card draws no Markdown body (the slot is in its place, as the task says).
7. `CardConditions.app` is opt-in: no `c.app`, no app view (the flag off, or a page that draws no
   app state); Stop app shows on `ready` + `allowed` (list_apps names `tools` only after the first
   call, per BE_02's apps.md).
8. `PANEL_PATH` (`/app-panels/`) is a constant in `vb-app-frame.ts`; BE_02's server holds the same
   route string. A shared constant in `packages/format/src/apps.ts` would be the one source
   (not added: BE_02 edits that file in this wave).

**Design reviews** (design-critique, accessibility-review, ux-copy, on the gallery's state views,
light and dark): "Code changed. Allow it again?" (fits one line, so both approval cards keep one
height), "Ask the agent to add it." (the folder may never have existed), "It kept crashing.
Restart once the agent fixes it.", "The app is busy. Try again.", "This app wasn't found."; Allow
described by its line (`aria-describedby`); a focus ring on the frame while focus is in the panel
(keys go to the app, not the board); the problems list fills the room left and scrolls (tab stop);
"Loading…" in `--vb-ink`. APCA (0.0.98G-4g) light/dark: state head 95.1/93.8, state text
84.8/70.5, ask text 93.8/94.2, Allow 77.4/60.4, problems and Stop app 94.3/71.6, button text
104.5/94.9, app icon 61.8/60.4, warning icon 63.5/45.8: every pair over its tier. Targets: 24-26px.
A scratch Chromium check (stubbed panel route): axe clean on the section light and dark; sandbox,
title, src, no-referrer; the panel's cookie throws and `parent.document` is blocked; the handshake,
`tools/call` (12*3 → 36), Esc → the card, Tab from the card → the panel, theme change → dark; a
second frame's and the page's own `tools/call` never reach `callTool`; unload; card width = panel
+ 34px.

**Gates** (one after another, after the last change): `npm run check` 0; `npm test` 1417 + 7 pass;
`npm run verify` 0 warnings; `npm run build` 0; `npm run test:pages` 480 passed (run here: the
orchestrator's brief made FE_01 the wave's one page-test runner). First runs: 41 screenshot
failures and nothing else, all gallery shots. The gallery's new section (it sorts first) and the
node section's app column (now its panel slot) moved every section under them by a fraction of a
pixel. Each diff was viewed, light and dark, through labelled contact sheets of the diff images:
the same text and boxes, shifted, in every one; the two full-page gallery shots were cropped and
compared with the old ones (the new section, the node pattern's states line, the App column).
Then re-baselined with a full `--update-snapshots` run: 44 files (the 41, plus `retired-*` behind
`flag-*` in the same test, and `folder-picker-light`, each viewed against its old version: the
same, 1px taller).

**Long File Strategy**: two writes went over 50 lines in one go (`node-app.test.ts`, about 95
lines, and this notes block); no connection error. Every other file over 50 lines was created and
appended in chunks.

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FE_01: <what you did> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/FE_01_app-frame.md]]`
