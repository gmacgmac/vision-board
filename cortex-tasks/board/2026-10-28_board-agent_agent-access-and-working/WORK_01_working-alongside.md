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

- [x] Working and waiting marks; the board stays usable; sending more works as far as the server allows; replies announced and one click away; flag off = today

## Implementation Notes

**Status**: Completed · **Completed**: 2026-10-28

### Step 1: what happens today when the person sends during a turn
- **The composer** (`packages/chat` `composerView`, `sendIntent`): the `busy` and `waiting` rows have `send: false`, so words alone are not sent (Enter does nothing; the line under the box says "What is attached goes when it finishes; Stop it to send words alone"). On a board the host holds what is attached (`ChatHost.holds`), so a message with the composer's chip (selected cards, answers since the last Send) goes, with or without words.
- **The page** (`shell/chat-panel.ts` `send`, `boardSend`): such a message posts `send_chat`; the server answers with a system line instead of a `message_in`, and Send to agent shows "Waiting for agent" until the next `message_in` (`st.wait`). The board's Send with no session posts the `send` act, which the server also holds.
- **The server** (`server/chat.ts` `sendChat`, `server/chat-sessions.ts` `tell`, `server/chat-session.ts` `post`): on a board, a message with something attached (cards, notes, or answers the session's agent is still to be told) waits, one at most; a second joins it (`joined`: both messages' words and every chip); it is built when the turn ends, so answers given meanwhile go too, and the board's Send is recorded then. Words alone while busy are refused (409, `BUSY`), and that refusal releases the session's waiting approvals (`busy()`). In the folder, any message while busy is refused.
- **So, built on the page**: Send to agent while working is "Queued" and the answers given until the turn ends go with it (the server already allows it). **What waits**: words alone while working (a server queue: REQUEST to WIRE_01 below); until then the composer keeps them and says why, as today.

### Changes Made
- `apps/board/src/shell/chat-news.ts` (new): `agentWork` (the mark, from the chat's own `chatConditions`: `waiting` → asking, `busy` → working), `isNewReply` (a non-interim `message_out` stamped at or after the page began following the session), `createReplyNews` (count and announce only out of sight; clear once the latest can be seen), `panelNews` (the panel's side: mark changes, the feed's `data-following` watched, Open chat → open, draw, follow, focus the composer). Unit tests `apps/board/tests/chat-news.test.ts`.
- `apps/board/src/shell/chat-panel.ts`: calls `panelNews` (follow on a new session or none, each event, `show` on render, `drawn`, `ChatPanel.opened`). Its two interfaces moved to `chat-panel-types.ts` (new; re-exported), which keeps the file at 279 lines.
- `apps/board/src/shell/ChatButton.svelte` (new, out of `ToolbarEnd.svelte`): the Chat button and the board's one mark: dot + "Agent working" (pulses; still under reduced motion) or "Waiting for your OK" (attention dot and edge, plus a polite status line), and "1 new"; narrow toolbar: icon with dot and number badges, words for screen readers. CSS in `styles/chat-sidebar.css` (tokens only).
- `apps/board/src/shell/Toast.svelte` (new, out of `App.svelte`): a plain toast stays `#toast`, `role="alert"`; a toast with an action (`shell.svelte.ts` `ToastAction`, `takeToast`, 8 s) renders in an always-present `role="status"` region, so it is heard politely. CSS beside `.vb-toast` in `styles/board.css`.
- `shell.svelte.ts`: `workAlongside`, `chatWork`, `chatNews`; `toast(text, tone, action?)`. `App.svelte` (wiring): sets the flag (with `chatPanel`), passes the `NewsHost` deps only with it on, calls `opened()` when the sidebar opens, renders `<Toast />`. `ToolbarEnd.svelte`: `<ChatButton>`, `queue` to Send. `SendButton.svelte`: `queue` makes waiting read "Queued" with its tooltip.
- Words: `shell/words/chat.ts` (Agent working, Waiting for your OK, the polite line, new, The agent replied, Open chat), `shell/words/shell-send.ts` (Queued and its tooltip).
- Gallery: `gallery/alongside-section.ts` (new), last in `main.ts` behind `chatPanel` + `workAlongside`: the Chat button idle/working/asking/1 new/working + 2 new, wide and narrow; Send queued; the toast. CSS in `gallery.css`.
- Tests: `tests/pages/chat-alongside.spec.ts` (new: marks and the polite line while working and asking, the board takes ✓ meanwhile; Send queued and answers given meanwhile go; reply out of sight → count, polite toast, Open chat opens at it, focus in the composer; the Chat button opening clears it; scrolled away → count, cleared by Open chat or scrolling back; flag off = today; gallery states, axe, APCA and screenshot light and dark — new baselines `__screenshots__/chat-alongside.spec.ts/alongside-{light,dark}-darwin.png`). `tests/pages/chat-send.spec.ts`: the "waits" test runs with `-workAlongside` (today's words).
- Docs: `docs/specification/chat.md` § On the board, "Working alongside the agent".
- Checks on 5300: `chat-news`, `chat-panel`, `chat-bridge`, words and verify unit tests pass; `check` clean for my files; `gen-api --check` current; `chat*.spec.ts`, `toolbar.spec.ts`, `gallery.spec.ts`, `access-by-bot.spec.ts`, `app-cards.spec.ts` pass (121). `npm run verify` fails only on `docs/specification/modules.md` (out of date from RULES_01's new `packages/agent` exports; orchestrator's `npm run map`).

### Caught Beyond the Brief
- A refused words-alone message releases the session's waiting approvals (`server/chat.ts` `busy()`): a message that does not go still denies the open question. The page never sends one (the composer skips it), but an API caller can. Reported to WIRE_01 / HOLD_01.
- A page test whose cards were drawn by another agent gets no handover: the session's agent is told only the answers it may see (api.md 41), so a queued Send is empty. The spec draws the board through the session's own agent first.
- The toast's action button is removed when taken, which would drop focus to the page; Open chat now puts focus in the composer.

### Deviations from Plan
- The toast's action reads "Open chat", not "Open": the words test allows one home per sentence, and "Open" already lives in `shell/words/folders.ts`. Moving it to `shell-common.ts` would touch a file outside this task.
- No change to `packages/chat` composer or header: the header's status and the composer's line already say what holds; the mark reads the same conditions table.
- Files beyond the listed ones, all the pieces named in the brief: `SendButton.svelte` (Send's words), `ToolbarEnd.svelte` (the chat button), `shell.svelte.ts` (the toast and the status fields), `styles/board.css` (the toast's CSS), `styles/chat-sidebar.css` (the mark's CSS), `shell/chat-panel-types.ts` (split from `chat-panel.ts`), `apps/board/tests/chat-news.test.ts`.

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-app] WORK_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI.
