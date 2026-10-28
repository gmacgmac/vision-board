# WORK_01_working-alongside: Working alongside the agent

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

While the board's agent works, the person sees it on the board, keeps working, and can send more; a
reply that lands while they are elsewhere is announced and one click away (ruling 328). Behind the
`workAlongside` flag (page flags).

## Context

Today (`docs/specification/chat.md`, the panel): while the agent works the composer holds what is
attached and Send to agent shows "Waiting for agent" until the next `message_in`; the board shows
nothing; a reply in a closed or scrolled-away panel goes unnoticed. The chat's conditions table
(`packages/chat/src/conditions.ts`: busy, waiting, blocked, stopped, error) already knows the states.

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (WORK_01)
- **Files to reference**: `docs/specification/chat.md`, `packages/chat/src/conditions.ts`,
  `apps/board/src/shell/chat-bridge.ts`, `shell/words/shell-send.ts`, the toolbar's chat button and the
  page's toast (`shell/`), the board status (`apps/board/src/board/status.ts`)
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **Read how a message goes while the agent works** (the session's queue or hold, `chat.ts`,
   `chat-session.ts`, the composer): write in your notes exactly what happens today when the person
   sends during a turn. If sending more needs a server change (a queue), that is a `REQUEST` for WIRE_01
   with the shape; on the page, build what the server already allows and say what waits.
2. **Failing tests first** (`tests/pages/chat*.spec.ts`, with the existing fake agent): while a turn
   runs, a mark on the board says the agent is working (and "waiting for your OK" while a question is
   open, from the chat's own events), the board takes clicks, notes and answers as usual, and Send
   queues more (or holds, per step 1) with words saying so; when the reply lands with the panel closed
   or scrolled away: the chat button shows a count ("1 new"), a toast "The agent replied" with an Open
   action; opening the panel at the reply clears the count; a screen reader hears it (polite).
3. **The mark**: one place on the board's toolbar or header (reuse the chat button and the status; no
   new floating element unless no existing place fits: then ask). Tokens only; reduced motion: no
   animation.
4. **Words** in the shell's and the chat's words files. **Gallery**: the working mark, the waiting-for-OK
   mark, the count and the toast, light and dark, sections last.
5. **Docs**: chat.md § the panel. **Checks**: unit tests, `check`, `verify`, `gen-api --check`,
   `chat*.spec.ts`, the toolbar and gallery specs on 5300.

## Validation

- [ ] Working and waiting marks; the board stays usable; sending more works as far as the server allows; replies announced and one click away; flag off = today

## Implementation Notes

**Status**: Pending · **Completed**:

### Changes Made
-

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-app] WORK_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI.
