# FE_01_chat-package: Chat package, core and elements

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (rulings 1, 6,
> 9-11) · **Model**: Opus 5.5 · **Needs**: BE_01 (schema), BE_02 (fixture)

## Objective

`packages/chat`: the chat panel as a framework-free core and plain web components that this
board and nclite can both host.

## Rulings (do not reopen)

1. **Stands alone** (D-037): imports nothing from this repo; `LAYERS` entry `[]`. Follows
   `packages/ui`'s pattern split (pure core, template, element) so the core is unit-tested
   under plain Node.
2. **Core:** a reducer from chat events (BE_01 schema) to the feed: messages (the person's with
   their chips; the agent's text, interim then final), tool activity collapsed to one status
   line while running and to change chips for board writes, approval cards, system lines.
   The chat conditions table (`src/conditions.ts`): busy, waiting for approval, blocked,
   stopped, error, each row with what starts and ends it, one test per row.
3. **Elements:** the feed (Markdown text through a renderer the host passes in, so the chat
   package doesn't import ours), a message, an approval card (what would change, Allow once,
   Allow for this session, Deny; nclite's `ApprovalAsk` is the reference), a composer (text plus
   removable chips; Enter sends, Shift+Enter breaks a line), a header (agent, model, status, New
   session, Stop). Elements raise events; they never call the server.
4. **Styling:** only `--chat-*` custom properties, each with a neutral fallback, defined in
   `src/chat.css`; `apps/board/src/styles/chat-host.css` maps them to `--vb-*` tokens. Every
   state (empty, thinking, streaming, tool running, approval, blocked, stopped, error) has a
   gallery entry fed by the recorded fixture (mock the data, rule 11). APCA per D-035 tiers.
5. Accessible: the feed is a log region (`role="log"`, polite), approvals are reachable and
   labelled, the composer has a label; axe clean light and dark.

## Steps

1. [x] Failing tests first: reducer cases from the fixture; conditions rows; templates.
2. [x] Build core, elements, CSS, host mapping, gallery section; README (how nclite hosts it).

## Validation

- [x] The five gates exit 0. Look at every state, light and dark.

## Constraints

- If deviation is needed, stop and say so; no silent breaking changes. No PII in examples.
- No git commits or stash. Scratch in the system temp folder. Stop only your own processes.
- No dependencies (D-036). Protected files: propose wording, never edit.
- Fill Implementation Notes below, your row in TASK-STATUS.md, and your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-08

- **Package** `packages/chat/src` (LAYERS `chat: []`, front door `index.ts`), the `packages/ui` split, one
  folder per pattern with `pattern.json`: `feed/` (`feed-core.ts`: `applyEvent`/`applyEvents`/`EMPTY_CHAT`,
  `ChatState`, `FeedEntry`, `activityLine`, `changeLabel`; `feed-template.ts`; `<chat-feed>`), `message/`
  (`messageTemplate`, `chipTemplate`; `<chat-message>`), `approval/` (`approvalView`, `APPROVAL_CHOICES`,
  `outcomeOf`, `timeLeft`; `<chat-approval>`), `composer/` (`composerView`, `sendIntent`, `withoutChip`;
  `<chat-composer>`), `header/` (`headerView`; `<chat-header>`); `events.ts` (the schema's shapes as types,
  `CHAT_EVENT_KINDS`, `TEXT_MAX`), `esc.ts` (`esc`, `RenderText`, `plainText`), `conditions.ts`
  (`CHAT_CONDITIONS` busy/waiting/blocked/stopped/error with `startsWhen`/`endsWhen`/`send`/`stop`; `chatStatus`,
  `canSend`, `canStop`; `ChatHost { blocked? }` is the host's reason), `elements.ts` (`defineChatElements`).
- **Reducer choices**: an event at or before the last `seq` is passed over; an event of another session starts
  the feed over (FE_02: after a server restart the stream starts at 1 again, so start a fresh state then); a
  tool shows only as the status line (`Thinking…`, `Using Read…`, `Drawing on the board…` for a tool with
  `board`, `Writing…`, `Waiting for your answer`); a done tool with `board` becomes a change chip ("Drew 2 cards
  on Scratch", host's `boardName`), a failed one nothing; `system` with `turn: done` adds no line (stopped,
  error and turn-less lines show); approval results settle the card in place; unchanged entries keep identity
  so the feed redraws only what changed.
- **Elements** (light DOM, no inline styles, raise events only): `chat-send {text, chips}`,
  `chat-chip-remove {chip}`, `chat-answer {approvalId, answer}` (once; `feed.answerFailed(id, why)` re-arms),
  `chat-change {board, cards, head?}`, `chat-stop`, `chat-new-session` (host confirms), `chat-pick {field, id}`
  (agent/model picker when more than one option). The log is `role=log` polite, named, focusable; the status
  line `role=status` outside it; the composer text is labelled "Message to the agent"; Enter sends, Shift+Enter
  breaks; the composer keeps the words until the host calls `clear()`.
- **Styling**: `src/chat.css` (@imports each pattern's CSS) reads `--chat-*` once into private `--_*` with a
  neutral fallback each; `apps/board/src/styles/chat-host.css` maps them to `--vb-*` on `:root`.
- **Flag** `chatPanel` added to `packages/format/src/flags.ts`, default **off** (PLAN ruling 13: on once VERIFY
  passes). The gallery's chat section shows only with it (components.md § Feature flags), so the existing
  gallery screenshots are unchanged. FE_02 reuses this flag.
- **Gallery** `apps/board/src/gallery/chat-section.ts`: ten states (empty with chips and the agent picker,
  thinking, tool running, streaming, file approval, command approval, answered/denied, blocked, stopped,
  error), fed by `gallery.chat.json`: the recorded Claude turns through `toChatEvent`, plus the person's
  messages, the gate's approval events (facts from `factsFor`) and a stopped and an error ending.
  `apps/board/tests/chat-fixture.test.ts` keeps it in step with the recording (and checks the package's kinds
  against the schema and runs the reducer over it). packages/chat itself reads nothing of packages/agent.
- **Tests**: `packages/chat/tests/` (`feed-core`, `conditions` (one per row + coverage), `approval`,
  `templates`; 30), `apps/board/tests/chat-fixture.test.ts` (4), `tests/pages/chat.spec.ts` (9: states,
  status line and header, Markdown and change chip, approval answer-once, composer keys and chips, events,
  axe and screenshots light/dark). New baselines only: `tests/pages/__screenshots__/chat.spec.ts/chat-{light,dark}-darwin.png`
  (viewed, intended). No other baseline changed. Tests were written alongside the code, not strictly first.
- **APCA** (APCA-W3 0.0.98G-4g, measured in Chromium from computed colours; board mapping / neutral fallback):
  agent words ink on sunken L 84.8 D 70.5 / L 85.8 D 69.7; person words ink-strong on accent-soft L 93.8 D 94.2 /
  94.5, 92.9; ink on surface L 94.3 D 71.6; ink-strong on sunken L 95.1 D 93.8; ink-on-fill on accent-fill (Allow
  once, Send, chip number) L 77.4 D 60.4 / L 84.8 D 65.4 (fallback dark fill raised to `#a3b8f4` from 55.5);
  hover L 83.3 D 66.9; label tier: ink-subtle on surface L 76.2 D 48.8, on sunken L 66.8 D 47.7; warn on warn-soft
  (family) L 53.6 D 59.8; ink on warn-soft L 85.3 D 68.5; accent-text on accent-soft (change chip) L 64.0 D 49.1;
  ok on surface L 67.7 D 57.7; danger on surface L 72.9 D 46.9; decoration: focus/accent L 72.0 D 47.7, warn L 62.6
  D 62.9, danger edge on sunken L 63.5 D 45.8. Every pair meets its tier in both modes, board and fallback.
- **Docs**: `packages/chat/README.md` (how a host, nclite, wires it), `docs/specification/chat.md` § The panel,
  `docs/specification/modules.md` (`npm run map`).
- **For FE_02**: host the three elements in a `.chat-panel` (or place them yourself); import `chat.css` and
  `chat-host.css` in `main.ts` (the board page doesn't load them yet); set `ChatHost.blocked` for a past version
  or a refused start; card/note chips go through `composer.setChips`; `chat-change` carries `board`, `cards`,
  `head` for the zoom.

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-ui] FE_01: …`).
