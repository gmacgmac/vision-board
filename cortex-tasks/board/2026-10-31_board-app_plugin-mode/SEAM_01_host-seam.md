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

_To be completed by agent after task completion._

**Status**: Pending · **Completed**:

## On Completion

Notes; your row; one LOG line (`[board-app] SEAM_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS`.
