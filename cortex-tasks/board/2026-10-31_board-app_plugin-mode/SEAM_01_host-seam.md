# SEAM_01_host-seam: The seam, with standalone on it

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The contract in PLAN § The seam exists, and the standalone chat reaches the board only through it: `BoardSide` is gone. No behaviour changes.

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (SEAM_01)
- **Files to reference**: PLAN.md; RESEARCH_plugin-seam.md § 3 (the table of what goes around the host) and § 5; `apps/board/src/board/host.ts`, `chat-side.ts`, `mount.ts`; `apps/board/src/shell/page-host.ts`, `chat-bridge.ts`, `chat-panel.ts`; `apps/board/server/engine/tools.ts`; `packages/mcp/`
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **Contract first**: `BoardHost.chat` (`attach(key, chip | null)`, `send()`, `status`, optional `reveal(ref)`); `BoardView.reveal` takes `cards`; the engine's `tools.list()` and `tools.call(name, input, ctx)` in MCP's shapes, `route` with `{ caller, signal }`. Types in `host.ts`, doc comments saying what each promises. Keep `chips` as a union a host can pass through unread.
2. **Failing tests first**, in `tests/` of a fake host: the live chip replaced as the selection changes; Send through `chat.send`; `reveal({ cards })` zooms without selecting; `chat.status` drives the board's working mark; a tool listed and called in MCP's shape, with an error as `isError`.
3. **Move standalone onto it**, one mechanism at a time, each with the chat specs green: the composer's chip (the answers as a chip resolved through `resolve`, PLAN Decisions), Send, a change chip's zoom and board switch, a first board's opening, the stepper's link back to the chat, the working mark and news. A change chip's `{ board, cards, head }` comes from the tool's result in a general shape, for any host, not parsed from Claude's stream alone.
4. **Delete `BoardSide`** and let the compiler find the rest. `host.page` stays for what is truly the standalone page's own.
5. **`vb-mcp`** serves `tools.list` and `tools.call`, so one list has two transports' worth of callers.

## Validation

- [ ] `grep BoardSide` finds nothing; `tests/pages/chat*.spec.ts` pass; no screenshot changes
- [ ] The fake host in step 2 drives the board without importing anything from `shell/`

## Implementation Notes

**Status**: Completed · **Completed**: 2026-10-31

### Done (steps 2 and 5 for the engine, and the change's facts in step 3)
- `apps/board/server/engine/tools.ts` `makeTools`: `tools.list()` and `tools.call(name, input, { caller, signal })` in MCP's shapes; an error is `isError`, never a throw. A board write adds `_meta` `TOOL_CHANGE` (`vb/change`): `{ board, cards, head }`, from `#agent` `boardWriteSummary`, so a host reads one shape and a CLI's stream reads the same facts from the text. The adapters did not need changing.
- `packages/mcp`: `ToolHost`, `httpTools` (the old HTTP path), `createMcpServer({ tools })` serves any host's tools; `answerResult`, `problemResult`, `unknownToolResult` shared with the engine. The tool table is now a JSON import, so it bundles.
- Tests: `apps/board/tests/engine.test.ts` (list, call, `isError`, the change, a held call, the MCP server over `engine.tools`).

### Run 1: blocked (resolved in Run 2)
Steps 1, 3, 4 and `route(req, { caller, signal })` need files outside this task's row: see TASK-STATUS Requests. Step 4's "let the compiler find the rest" lands in `controller.ts`, `board-types.ts` and `App.svelte`, and none of them is in the row. Nothing was changed in them.

### View-side design, for review before it is built
1. `chat.send(record)`, not `chat.send()`: the host sends what is staged and calls `record` (the board's `send` act) unless its own server records it. Standalone's server records a message's Send, and the panel's wait needs the act's outcome. It is today's `boardSend` as the seam.
2. `chat.status` holds more than idle, working, asking: `agent` (the answers are scoped to the session's agent, `boardContext`), `held` and `staged` (Send's waiting and enabled, `ChatPanelDeps.waiting` and `attached`, which CHROME_01 needs once Send is inside `mount`). All optional.
3. Two new chip kinds, each one key: `selection` (`{ board, cards }`) and `answers` (`{ board, since, agent? }`), resolved by `engine.resolve`. A chip may carry `preview`: the composer's preview is synchronous and no route serves `resolve` (one would change `openapi.json`). Labels joined by " · " and previews by a blank line give today's `boardBlocks`.
4. A chip that went is spent until its key's `ref` changes. A title change updates the label and does not un-spend it: an agent redrawing a card just sent must not put it back on the next message.

### Noticed
- Standalone's answers still would not go through `resolve`: `chat-sessions.ts` `unsaid` uses `turnOf` with its own `told`, and `chat-prompt.ts` calls `resolveChip` directly. Unless `deliver` moves onto `engine.resolve`, the answers chip is only a preview here and the first host skips the path another host depends on.
- `MountedBoard.board` is a wide way round `BoardView`, and `EngineOptions.onSend`, `engine.ledger` and `engine.agents` are standalone-only parts of the engine. CONTRACT_01 should say so, or they should go.
- For BUILD_01: the engine now imports `#agent` and `#mcp` by their roots, so the bundle depends on tree-shaking; `#format/files` `TOOLS_FILE` is still read from disk beside the module.

### Run 2
Ownership widened and the four design points accepted by the orchestrator. The view half is done.
- **Contract**: `apps/board/src/board/host.ts` `BoardChat` (`attach`, `send(record)`, `status`, optional `reveal`, `hasLine`), `ChatStatus`, `BoardView.reveal` with `cards`; `addToChat` is gone. `apps/board/server/engine/engine.ts` `route(req, { caller, signal })`.
- **The board's side**: `board/chat-side.ts` `bindChat`, wired in `controller.ts`: the `selection` and `answers` chips, the status mirrored into `BoardStatus` (`chatWork`, `sendWaiting`, `chatAttached`), the stepper's link. `BoardSide` is deleted.
- **The standalone chat's side**: `shell/chat-bridge.ts` `host` is what `createPageHost` gets; the chat reaches the board only by `BoardView.reveal`. `shell.chatWork`, `sendWaiting` and `chatAttached` now arrive through the status, not from the panel to the page. The bridge exists with `chatPanel` off too: Send then only records.
- **The answers go through `resolve`**: `chat-sessions.ts` `unsaid` and `chat-prompt.ts` `promptFor` take `ChatOptions.resolve`, the engine's. `engine.turn` is removed as unused: the answers are a chip (D-074 rule 6). `apps/board/tests/api-chat-context.test.ts`: its exact-prompt tests pass unedited, and a new test holds that a session reads through the `resolve` it is given, word for word.
- **`MountedBoard.board` narrowed** to `mount.ts` `BoardControls`. No chat uses it. What still does: `App.svelte` for the page's own toolbar and strips until CHROME_01 (`switchTo`, `showVersion`, `goToContainer`, `go`, `command`, `toggleHide`, `access`, `nextFlagged`, `boardEdit`, `proposals`); `App.svelte` `exposeWork` (`rebuild`, `idle`, the page tests' door); `tests/pages/board-host-fixture.ts` (`idle`).
- **Docs**: `docs/specification/api.md` (131, 159, 162, 163), `components.md` (the mount, the host's chat, the standalone host, differences, the locked board), `chat.md`.

Beyond the plan, for review:
- `chat.hasLine?(ref)` beside `chat.reveal?(ref)`: the stepper shows its link only when the chat has the line, and that is asked while drawing, so it must be a synchronous question. With `reveal` and no `hasLine` the link always shows.
- `BoardView.reveal` of a board the ledger does not hold yet opens when its first line arrives (`Board.jump`), which is how an agent's first board opens through the seam (RESEARCH row 11).

Small behaviour differences, both at an edge:
- A change chip on another board while a note holds unsaved words: after OK it now also zooms to the cards (before, it only opened the board). This is what `reveal` documents.
- A selection changed while its message is on its way: only an exact match is spent now, so a card in both the old and new selection may go again. Before, it was spent by card number.

No gallery entry and no live look: nothing a person sees changed, and no screenshot changed. VERIFY_01 has the live look.

## On Completion

Notes; your row; one LOG line (`[board-app] SEAM_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS`.
