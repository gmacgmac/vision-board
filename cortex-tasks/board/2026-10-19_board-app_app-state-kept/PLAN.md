# Apps Keep Their State - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Created**: 2026-10-19 · **Source**: maintainer, chat 2026-10-19 (points 40, 40B, 40C; "ensure the
> design meets our architecture principles")

---

## Problem Statement

An app card forgets everything when you zoom out or pan away: the board removes its frame and starts
the panel again when it comes back, so a person three steps into the clip-and-export app is back at
step 1. A page reload or board restart loses it too.

---

## Current State

- `apps/board/src/board/app-cards.ts` `place()`: after every draw, pan and zoom, a frame is
  `unload()`ed when the zoom is far (`isFar`), the card is hidden, the card's state has no frame, or
  the card is more than a screen away (`viewBounds` / `outside`, `offscreen.ts`); it is `load()`ed
  again when on screen. D-047 ruling 14; `docs/specification/apps.md` says "Keep nothing in the panel
  that a restart would lose: keep state in a tool".
- The panel protocol (`apps.md` § The panel protocol; `packages/ui/src/app-frame/app-frame-core.ts`
  `createAppBridge`, `FRAME_CALLS`; constants in `packages/format/src/apps.ts`) has `ui/initialize`,
  `tools/call`, `ping`, size-changed, and the board's own `ui/notifications/escape`. Nothing saves or
  restores a panel's state.
- A card redraw (a new version) re-renders card markup (FE_03 note in the card-polish set); app
  card parts are applied in place by `packages/ui/src/node/node-app-apply.ts`. Moving or re-creating
  an `<iframe>` element reloads its document.

---

## Proposed Solution

### Key Changes

1. **Keep panels alive (40B).** Once a panel has loaded it stays loaded. Zoomed far or off screen
   it is frozen: `inert` (no clicks, no focus, out of the tab order), its frame not painted
   (`content-visibility` as `offscreen.ts` does for cards). A panel is unloaded only when more than
   `LIVE_PANELS` (8) are loaded — the least recently used goes first — or when its card leaves the
   board or the app's state stops showing a frame (missing, invalid, broken, past). A frame element
   is never re-created or moved in the DOM by a card redraw, a relayout, a selection or a size
   change.
2. **Panels save and restore their state (40C).** A new panel request saves a small JSON value for
   that card; the board hands the last saved value back in `ui/initialize`'s `hostContext`, so a
   panel that starts again (cap, reload, board restart, another computer opening the folder) carries
   on where it was.
   - **Prefer the standard.** First check MCP Apps (the `ext-apps` spec the protocol follows) for a
     state or widget-state mechanism. If one exists, use its names and shape; if not, add a
     board-own method beside `ui/notifications/escape`, named so it can't collide with a future
     MCP Apps method, and say in `apps.md` it is the board's own.
   - **One contract, one source (rule 6).** The message shape is a JSON Schema in
     `packages/format/schema/` with its constant in `packages/format/src/apps.ts`; the page↔server
     route is in `openapi.json` referencing it; types and docs follow; tests hold code to the source.
   - **One I/O layer (rule 7).** Only the server's I/O module reads and writes the state files;
     every read and write is validated. The page reaches it through `packages/client` only.
   - **Where it lives.** One file per app card, `.visionboard/app-state/<card identity>.json`
     (identity per D-041, project-wide), not the ledger: saves can be frequent, the ledger is
     append-only and read by agents. The route names the card by board and number and the server
     translates at its edge (D-041). Size cap (`APP_LIMITS.stateBytes`, 64 KB), JSON only, ids
     sanitised before any path (rule 18), Origin/Host checks as every route. Never in an agent read.
   - The page debounces saves (one in flight per card, the latest wins) and keeps the latest in
     memory, so a restore never waits on the server when the page already has it.
3. **The skill (rule 17).** Teach agents to save the panel's UI state on every meaningful change and
   restore it from the host context; to keep 12 px of padding at the panel's top (the card's
   number and APP tabs hang 9 px over it — maintainer point 33); update the calculator example to
   save and restore its display.

---

## Decision entry (protected file: proposed, for the maintainer's yes)

> **D-050 App panels stay loaded and keep their state** · Proposed · Supersedes D-047 ruling 14
> (frames removed off screen or zoomed out). A loaded panel stays loaded, frozen when off screen or
> zoomed out; at most 8 are live (least recently used unloaded first). A panel saves a small JSON
> state per card (board-held, `.visionboard/app-state/`, 64 KB cap, never read by agents) and gets it
> back when it starts. Why: people work through multi-step apps and lost their place on every zoom.
> Rejected: state in the ledger (append-only, agent-read, frequent writes); keeping every panel
> loaded with no cap (memory on a board of many apps). Task: this folder.

VERIFY_01 adds it to `docs/decisions.md` only after the maintainer's yes.

---

## Dependencies

- Wave 1: BE_01 (contract, server route and store) and FE_01 (keep alive). Disjoint files.
- Wave 2: FE_02 (page: save and restore through the bridge and client) needs BE_01's contract and
  FE_01's frame lifecycle. AGENT_01 (skill, example) needs BE_01's names.
- Wave 3: VERIFY_01.

---

## Out of Scope

- An app's server-side tools reading the saved state (the panel can pass it in a call).
- Notes beside app cards and Z on the panel alone (tracker M5); the grid stretch (tracker M6).
- Syncing state between two open pages live.

---

## Risks & Considerations

| Risk | Mitigation |
|------|------------|
| Many live panels slow the board | Cap of 8, frozen panels not painted, timing check on a board of 12 apps (performance.md) |
| An iframe reloads when moved in the DOM | Page tests that change the card (new version, relayout, select, size) and assert the panel's in-memory value survives |
| A frozen panel still runs timers | Accepted; the cap bounds it. Note in apps.md that a panel may be frozen |
| State file abuse (size, path) | Schema + 64 KB cap + sanitised identity + route guards; server tests for each |
| A panel saving on every keystroke | Page debounce; one write in flight per card |

---

## References

- `.kiro/steering/vision-board-proj.md` rules 6, 7, 13, 15, 17, 18; `cortex-architecture` skill
- `docs/decisions.md` D-041, D-047; `docs/specification/apps.md`, `api.md`, `performance.md`
- `apps/board/src/board/app-cards.ts`, `offscreen.ts`; `packages/ui/src/app-frame/*`;
  `packages/format/src/apps.ts`; `apps/board/server/apps.ts`, `apps/`, `reads.ts`, `writes.ts`
- `tests/pages/app-cards.spec.ts`, `app-follow.spec.ts`, `app-safety.spec.ts`

---

## Success Criteria

- [x] In a page test, a panel's in-memory value survives zoom out and in, a pan two screens away and
  back, a new card version, a relayout, selection and a size change
- [x] The ninth live panel unloads the least recently used one; that one restores its saved state
- [x] After a page reload, a panel restores its saved state
- [x] A frozen panel can't be clicked or tabbed into
- [x] The state route refuses oversize, non-JSON, bad ids and foreign origins; no agent read shows state
- [x] Skill v3.10 teaches save/restore and top padding; the calculator example does it
- [x] `npm test`, `npm run test:pages`, `npm run verify` pass
