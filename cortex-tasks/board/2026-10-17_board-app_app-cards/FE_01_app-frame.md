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

1. [ ] Tests first, each seen failing.
2. [ ] Core, then element, then the node template states; `components.md` § App card (states, the
   protocol in one paragraph pointing at `apps.md`, a11y: frame title, Tab in and out, Esc).
3. [ ] Gates one after another: `npm run check`, `npm test`, `npm run verify`, `npm run build`. **Not**
   `npm run test:pages` (wave 2 runs in parallel; the orchestrator runs page tests after the wave;
   FE_02 adds the page tests for this pattern).

## Validation

- [ ] All gates above exit 0; every protocol rule in `apps.md` has a unit test.

## Constraints

- Do not touch `apps/board/` (FE_02) or `apps/board/server/` (BE_02). No git commits.
  Deviation: TASK-STATUS.md instruction 5.

## Implementation Notes

**Status**: Pending

## On Completion

Fill the notes; update your row and section in TASK-STATUS.md; append one LOG line:
`[[YYYY-MM-DD HH:MM]] [board-ui] FE_01: <what you did> → Task: [[cortex-tasks/board/2026-10-17_board-app_app-cards/FE_01_app-frame.md]]`
