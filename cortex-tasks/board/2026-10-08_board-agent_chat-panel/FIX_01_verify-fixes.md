# FIX_01_verify-fixes: Fixes from VERIFY round 1

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) · **Found in**:
> [VERIFY_01](./VERIFY_01_end-to-end.md) round 1 (bugs 1-7) · **Model**: Opus 5.5

## Objective

Fix the seven bugs VERIFY_01 round 1 found, each with a failing test first (rule 13).

## Rulings (do not reopen)

1. **Message after New session:** a message sent while a session is starting waits for it and goes
   to the new session (or the composer keeps the text and says why). The round's Send is
   recorded only when the message is accepted.
2. **Kiro board writes:** read the write's result (cards and head) from Kiro's tool-call update
   so the chip zooms. Record a real successful Kiro write as a fixture (one short round, scratch
   board; stop and report on a login or credit error, never retry) and test from it.
3. **Reload after restart:** the panel attaches to the board's current session (the newest in
   `list_chats`, which lists newest first) and shows its agent and model.
4. **Feed after restart:** when the stream starts over for the same session, the feed shows one
   system line: "Earlier messages aren't shown after a restart; the agent still remembers them."
5. **Turn error once:** a turn error shows once, as the error line; the agent's text that only
   repeats it is not added.
6. **Pickers:** the agent and model pickers show their full labels at the default width (400px);
   adjust the header layout in `packages/chat` (the model picker may sit on its own row).
7. **NEW on a first drawing:** a card is never NEW when it came in the board's first agent
   drawing, even if the person opened the board while it was empty. Change the round baseline
   in `packages/actions/src/rounds.ts` so it is the later of the first board seen and the end of
   the board's first agent run; update the `item.new` row's `trueWhen` and api.md 97.

## Steps

1. [x] A failing test per bug (unit or page, with the fake CLIs).
2. [x] Fix; update docs and the task notes.

## Validation

- [x] The five gates exit 0.

## Constraints

- If deviation is needed, stop and say so; no silent breaking changes. No PII in examples.
- No git commits or stash. Scratch in the system temp folder. Stop only your own processes.
- No dependencies (D-036). Protected files: propose wording, never edit.
- Fill Implementation Notes below, your row in TASK-STATUS.md, and your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-09. Each bug had its test fail first, then pass.

1. **Message after New session.** Page: `chat-panel.ts` holds the session on its way in `st.starting`
   (`hold`), from the New session / pick confirm on (the dialog answers a moment after it closes); `send`
   waits for it and sends to the new session; a cancelled confirm sends to the session in use; a failed
   start keeps the text (the start says why). Server: `send_chat` records the Send only after
   `live.send` accepted it, and a message to a session while a new one starts on its board is a
   `conflict` (`Chats.starting`, `inUse` in `chat.ts`). Tests: `apps/board/tests/api-chat-starting.test.ts`
   (start held: 409, no Send; then the new session takes it, one Send); page test "a message sent while
   a new session starts" (`chat-server.ts` gained `holdStarts`).
2. **Kiro board writes.** One real round (kiro-cli 2.28.0, in-process server over a temp project, board
   `pricing`, one card in a new region): no login or credit error; the write's result is in
   `tool_call_update.rawOutput` as `{ items: [{ Json: { content: [{ type: 'text', text }] } }] }`, no
   `content`. `kiro-turn.ts` reads it (`rawOutputText`). Fixture `packages/agent/tests/fixtures/kiro-draw.jsonl`
   (agent's side, ids/paths/secret scrubbed, noise and the model list dropped). Tests: `kiro.test.ts`
   replays it (`write_board` done, cards [20], head 57), `kiro-turn.test.ts` the shape.
3. **Reload after restart.** `load` took `sessions.at(-1)`, the oldest; now `sessions[0]` (newest first);
   `io.ts` doc fixed. Page test: pick Sonnet (new session), reload: the header shows Sonnet and a send
   runs that session (failed with "Default" before the fix).
4. **Feed after restart.** A session loaded again after a restart (`chat-sessions.ts` `load`) starts its
   events with one `system` line (no `turn`), `RESTARTED` in `chat-session.ts`, the ruling's words. The
   page's start-over (`follow`) then shows that one line. Test: the restart case in
   `api-chat-sessions.test.ts`.
5. **Turn error once.** `ClaudeStream.end`: on an error result, held text the result's message contains
   is dropped. Test in `claude-stream.test.ts` (rate limit once; unrelated text kept).
6. **Pickers.** Header layout in `packages/chat/src/header/header.css`: agent and model on the first line
   across the width (pickers `flex: none`, the line may wrap in a narrower host), status with Stop and New
   session under it. Page test checks both pickers are as wide as their label needs at 400px and at the
   360px minimum (it cut the agent picker at 360 before; 400 was not cut in headless Chromium, so the
   reported cut was likely the pane's wider select rendering). Gallery screenshots `chat-light/dark`
   updated after viewing the diffs: only the header (status and buttons on row 2, feeds shifted down).
7. **NEW on a first drawing.** `rounds.ts`: the round baseline is the later of the first board seen
   and, when the board had no card then, the end of the run its first card came in (`firstCards` in the
   fold, board -> first card seq and run index); no Send starts a round before the board's first card
   (so the chat's Send before the first drawing does not). Kept from 97: a card added after the person
   opened a board that already had cards is still NEW, even in the same run (`added()` test) -- a
   literal "end of the first run" would have hidden it, as a board seen does not end a run. `item.new`
   `trueWhen` and api.md 97 updated. Tests: two in `rounds.test.ts`.

Docs: api.md 97, 105, 107, 108; `docs/specification/chat.md`; `packages/agent/README.md`;
`packages/chat/src/header/pattern.json`. Gates: `npm test` (880 + 6 timing), `check`, `verify` (0
warnings), `gen -- --check`, `test:pages` (261) all exit 0. `fold.ts` is at 300 lines exactly.

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-agent] FIX_01: …`).
