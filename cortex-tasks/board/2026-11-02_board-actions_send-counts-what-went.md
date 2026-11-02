---
task_name: A Send Counts Only What Went
created: 2026-11-02
completed: 2026-11-02
status: completed
categories: [board-actions]
type: implementation
model: strong
persona: Messaging engineer on a payments platform — a message is acknowledged for exactly what was delivered, nothing is ever lost silently, and a retry never double-counts.
skills: [cortex-architecture, cortex-docs]
tracker:
---

# Task: A Send Counts Only What Went

## Problem Statement

A Send writes a `send` act on the board (`packages/actions/src/fold.ts` `lastSend`), and every answer
before it counts as sent (`answersChip`, `unsent.ts`). The board records it through the host's
`chat.send(record)` (`apps/board/src/board/mount.ts`) whether or not the answers chip went with the
message: a person who removes the chip and sends a message loses those answers from the next round,
though the bot never got them [INFERENCE from `docs/specification/plugin.md` § `send(record)`; prove
it with a failing test first]. The maintainer decided (point 377, 2026-11-02): **only a message that
carried the answers counts as their Send.** The person works non-linearly: answers some cards, sends,
answers more while the bot works, sends again. That must stay simple and safe.

## Properties to meet (the design must hold all of them)

1. **Acknowledge what was delivered.** Answers count as sent only if they were in the message the bot
   got. A chip removed, or a message without it: those answers stay unsent and come back in the next chip.
2. **Exactly what was delivered.** The prompt's answers are read at `resolve` time. An answer made after
   that read and before the record stays for the next round (a watermark: the Send acknowledges answers
   *through* the seq the resolve read, not through the Send's own seq).
3. **At-least-once, never zero.** A send that fails records nothing. If the host crashes between the
   bot getting the message and the record, the answers go again next time: a duplicate is acceptable,
   a silent loss is not.
4. **One path.** Standalone (its server records the Send with the message, `apps/board/src/shell/chat-bridge.ts`)
   and a host behave the same. The seam change is the smallest that meets 1 to 3.
5. **Old ledgers read unchanged.** The ledger stays append-only; a `send` line written before this
   change reads as it does today.
6. **Rounds.** Answer, Send, answer more while the bot works (with and without `held`), Send again:
   each round carries exactly its own answers. A note stays history only once its round went
   (`note-lock.ts` `sentAfter`).
7. **Behind a flag** in `packages/format/src/flags.ts`, default on once the suites pass.

## Steps

1. Read `docs/specification/plugin.md` (§ Chat, `send(record)`, `resolve`), `docs/principles.md`,
   `docs/decisions.md` D-045 and D-074, and the code: `packages/actions/src/answers/chips.ts`
   (`answersChip`, `resolveChip`, `turnOf`), `fold.ts`, `unsent.ts`, `note-lock.ts`,
   `apps/board/src/board/mount.ts`, `chat-side.ts`, `controller.ts` `send`, `apps/board/src/shell/chat-bridge.ts`,
   the server's send path, `tests/plugin/fake-host/chat.js`.
2. Write failing tests first: the removed-chip case (standalone and under the fake host), the
   watermark case, the rounds case, a failed send.
3. Write your design in this file's Implementation Notes **before** coding: the contract change
   (ledger shape in `packages/format/`, the seam's `send`/`record`/`resolve`), how each property is met,
   and what you weighed and rejected. Contract first, then code (`npm run gen-api` if the API moves).
4. Implement. Any new sentence goes in its words file (`docs/specification/words.md`).
5. Update `plugin.md` (§ Chat; the open point "The answers are a chip" becomes settled) and any other doc
   the change makes untrue (`cortex-docs`). Draft the decision entry for `docs/decisions.md` in your
   notes, not in the file.
6. Gates at `nice -n 15`: `npm run map`, `npm run verify`, `npm run check`, `node scripts/gen-api.mjs --check`,
   `npm test`, `npm run test:plugin` (`VB_TEST_WORKERS=3 VB_TEST_PORT=4910`), the page specs you touched,
   then the full page suite once (`VB_TEST_PORT=4810`).
7. Try it in a browser from this worktree on port 4820: answer, send, answer while working, remove the
   chip and send a message, send again. Light and dark for anything that looks different.

## Constraints

- Work only in the worktree you are given (branch `feat/send-receipt`). No commits, no git history.
- Never port 4466, never 4600–4799 or 5000–5199 (other runs). Tests `nice -n 15`, at most 3 workers.
- No protected files (`.kiro/steering/*`, `AGENTS.md`, `CLAUDE.md`, `docs/principles.md`, `packages/tokens/`,
  existing `docs/decisions.md` entries). Don't write `cortex/LOG.md` or `cortex/AUDITED.md`: the orchestrator logs.
- Don't touch `apps/board/src/gallery/` or `apps/board/src/styles/board.css` (another task owns them).
- ✓, ✗ and approving stay the person's; the agent never writes them. The ledger stays append-only.
- No screenshot re-baselined without saying which and why in your notes.
- STOP and report (DEVIATION) if the properties conflict, if a host would have to change in a way
  that breaks an existing host, or if the design needs the ledger to be rewritten.

## Success Criteria

- [x] Properties 1 to 7 each proven by a named test
- [x] Design, rejected options and the decision draft in the notes
- [x] `plugin.md` agrees with the code; gates green; full page and plugin suites pass
- [x] Tried in a browser; notes filled

## Implementation Notes

### Design (written before coding)

**The bug, confirmed in code.** `mount.ts` `send` hands the host `() => board.send()`; `controller.ts` `send` writes
`{ action: 'send' }`; `fold.ts` sets `lastSend` to the Send's own `seq`, and `answersChip`, `unsent.ts` and `note-lock.ts`
`sentAfter` all count from it. The board never learns *what* the message carried, so (a) a host message without the answers
chip still acknowledges every answer, and (b) an answer made between the host's `resolve` and its `record()` is acknowledged
though the bot never read it. A third, found reading: the record goes to whichever board is open when it lands, so a board
switch during a slow send acknowledges the *other* board's answers.

**The model: a consumer offset.** `resolve('answers')` is the read; it already reads the ledger up to its head (the round's
text names that head). The Send is the commit of that offset. So the Send line carries the offset it commits, and the fold
keeps a watermark that never moves back.

**Contract (first).**
1. Ledger, format **v19** (api.md 11: every ledger schema change bumps the format and the `$id` path): a `send` act may
   carry `head`, an integer from 0: *the ledger line its answers were read through*. Left out (every line before v19, and a
   Send no chat carried): through the Send's own line, so old ledgers fold exactly as today (property 5). `head` on any other
   action is refused; a `head` above the ledger's last line is refused (the `seen` rule's words, `headTheLedgerIsAt`).
   The word is `head`, as `seen`'s `{ board, head }` and the round's own "head it covers": one word for one thing.
2. Engine `resolve('answers', ref)` also answers `head`: the ledger line it read through.
3. Seam: `chat.send(record)` → `record(answers?)`. `answers` is what `resolve` answered for the answers chip that went (the
   board reads its `head`); `null` when the message went without one (none was staged, or the person removed it); left out,
   as today, when no message carried the answers (no chat: the bot reads the board itself). Existing hosts keep working:
   `record()` means what it meant. A chip the person removes from a message is left out of that message only.

**Fold.** `lastSend` keeps its meaning (the latest Send *line*: chat-side's "a Send went, spend what was attached" still
reads it). New `sentHead`: board → the watermark, `max(previous, head ?? seq)`, never lowered (a stale or retried record
cannot un-send anything: a retry never double-counts). `answersChip` (`since`), `unsent.ts` `foldMark`, `note-lock.ts`
`sentAfter` and the server's `previousSend` read the watermark. On a Send whose `head` is below its own line, `unsent.ts`
folds the answers after the watermark again (they are the next round's), dropping any whose cards have left the board.
The fast path (no gap: every old line, every standalone Send) is today's `clear()`.

**How each property is met.**
1. Acknowledge what was delivered: `record(null)` writes `head` = the current watermark: a Send line that acknowledges
   nothing new; the answers stay unsent and the board's answers chip stays (same `ref`), so it goes with the next message.
2. Exactly what was delivered: `record(answers)` writes `head` = what the resolve read; anything later folds after the watermark.
3. At-least-once: a host calls `record` only after the message went; a failed send records nothing; a crash between the
   message and the record leaves the watermark where it was, so the answers go again (a duplicate, never a loss).
4. One path: the standalone server reads the round and appends the Send in one synchronous step (`chat-sessions.ts`
   `deliver`), so it writes `head` = the line it read; same ledger shape, same fold. The board records on the board the Send
   was pressed on (captured at the press), not whichever is open when the record lands.
5. Old ledgers: no `head` ⇒ own `seq` ⇒ identical fold; schema accepts v2-v18 lines unchanged.
6. Rounds: the watermark makes each round exactly (watermark, next read]; with `held` the standalone read happens at delivery.
   A note is history only once a Send's `head` covers it.
7. Flag `sendCountsWhatWent` (page: what `record` writes; server: whether `deliver` writes `head`). Off: today's behaviour.

**Rejected.**
- *The answers chip's `ref` carries the head and `resolve` reads only up to it*: exact, but needs the board as of a past line
  (`replyLines` reads the board now), a second fold per message; and hosts then pass chips back, not the read.
- *The engine remembers the last answers `resolve` and the next Send uses it*: no host change, but `resolve` stops being a
  pure read, the memory is lost on restart, and a resolve whose message then failed would be committed by the next Send: a
  silent loss, the exact failure being fixed.
- *Refuse a Send whose answers moved since the read (a precondition)*: safe, but re-sends the whole round on every race and
  is not "exactly".
- *`record(null)` writes no line*: then chat-side cannot tell a Send went (spends nothing, Send stays on for a
  selection-only message), and the pull agent loses the Send signal. One line per Send that went, as today, is simpler.
- *Repurpose `lastSend` as the watermark*: every reader but chat-side wants the watermark, but a Send acknowledging nothing
  new would not move it, so chat-side would need a second signal anyway. Two named maps are clearer.
- *Adding `head` to v18 without a bump*: the maintainer's board already holds v18 lines; api.md 11 is binding.

**Tests (named, written failing first).** Listed under Verification once green.

### Changes

- **Contract.** Ledger v19 (`packages/format`): `head` on `send` in `events/act.schema.json` (`core`, and a `rules` entry:
  `head` ⇒ `send`); every ledger `$id` moved `18` → `19` (sed over `packages/format/schema`, `scripts/gen-contract.mjs`, the
  three schema tests), `common.schema.json` `v` enums take 19; `openapi.json` `info.version` 1.37.0; `ledger.ts`
  `LEDGER_FORMAT` 19, `LEDGER_FORMATS`, `ActEvent.head`; `ledger-shape.ts` `line` check and the send-only rule;
  `ledger-index.ts` head past the ledger refused (the `seen` words); words `headOnlyOnASend`, `integerFrom0`
  (`words/format-ledger.ts`). `npm run gen` regenerated the API types, tools and `api-reference.md`.
- **Fold** (`packages/actions`): `fold.ts` `sentHead` beside `lastSend`; `unsent.ts` `sent` (re-folds the answers after the
  watermark, `firstAfter`), `gone` shared with `dropRetired`; `note-lock.ts` `sentAfter` reads the watermark;
  `answers/chips.ts` `answersChip` counts from it, `resolveChip('answers')` answers `head`, new `sendHead` and `AnswersRead`.
- **Page**: `host.ts` `BoardChat.send(record: (answers?) => …)`; `mount.ts` `send` captures the board at the press;
  `controller.ts` `send(id, read)` writes `sendHead` behind the flag (`board-types.ts`).
- **Server**: `chat-sessions.ts` `deliver` writes `head: s.seq` (flag `sendHead` option, from `app.ts` / `project.ts`);
  `chat-round.ts` `previousSend` answers the previous Send's `head`.
- **Flag** `sendCountsWhatWent` (`flags.ts`), default on.
- **Fake host** (the reference host, from the spec): `chat.js` `drop(key)` (a removed chip, that message only) and
  `record(answers)`; `server.ts` `/chat` answers the answers chip's `resolve`; `host.js` `drop`.
- **Docs**: `plugin.md` § The chat (`send(record)`, chips removed, `resolve` row), open points 2 (settled) and 3;
  `api.md` 169 (ledger v19); `host.ts` comments. `docs/specification/modules.md` by `npm run map`.

### Tests (each property by name)

| Property | Tests |
|---|---|
| 1 Acknowledge what was delivered | `send-what-went.spec.ts` "removed chip" (fake host); `send-head.test.ts` "removed chip" |
| 2 Exactly what was delivered | `send-what-went.spec.ts` "watermark"; `send-head.test.ts` "watermark", "a mark changed after the read", "an answer after the read on a card that has since left"; `engine-hooks.spec.ts` "resolve:" (`head`) |
| 3 At-least-once, never zero | `send-what-went.spec.ts` "at-least-once"; `view-hooks.spec.ts` "chat.send: a chip the engine refuses" (nothing recorded); `send-head.test.ts` "a retry never double-counts" |
| 4 One path | `api-chat-send.test.ts` "one path" (standalone writes the head it read, same fold); `send-what-went.spec.ts` (host) |
| 5 Old ledgers read unchanged | `schema-v19.test.ts` "old ledgers read unchanged"; `send-head.test.ts` "a Send with no head covers every answer"; `unsent.test.ts` fixture ledgers |
| 6 Rounds | `send-head.test.ts` "rounds"; `api-chat-send.test.ts` "one path" (held: answers while the message waits go with it) and "while a turn runs" |
| 7 Flag | `send-what-went.spec.ts` "flag off" |

Failing first: `send-head.test.ts` (no `sendHead`/`sentHead`), `api-chat-send.test.ts` "one path" (`head` missing) failed
before the code; the plugin "flag off" test is the old behaviour reproduced (a Send without the chip clears the answers).

### Results

- `npm run map` (modules.md updated), `npm run verify` ok (warnings only; the files this grew were over 300 before:
  `chat-sessions.ts` 304→307, `controller.ts` 303→306, `fold.ts` 306→312, `flags.ts` 316→321), `npm run check` 0 errors,
  `node scripts/gen-api.mjs --check` current, `npm test` 2199 + 14 timing pass.
- `npm run test:plugin` (3 workers, 4910): 78 pass; `view-gives.spec.ts` "reveal of what is not on the board" failed in two
  of three full runs under load and passed 3 of 3 alone (`--repeat-each 3`) and in the third full run: focus timing, no Send
  in it. Not caused here, flagged.
- `npm run test:pages` (3 workers, 4810) once: 832 pass, 1 fail: `host-styles.spec.ts` "the board in a 550px pane… (light)",
  a toolbar text length 1433 vs 1442 between window and pane under load (load average ~18); passes alone in light and dark.
  No screenshot re-baselined.
- Browser (fake host from this worktree on 4820, dark then light): ✓ card 1, removed the answers chip, Send → `send`
  `head: 0`, the answers chip came back and Send stayed enabled; ✗ card 2, Send → `head: 10`, both went; ✓ card 3, Send →
  `head: 12`, the round carried card 3 only. Nothing looks different, so no gallery entry.

### Issues and caught beyond the brief

1. **The record went to whichever board was open when it landed** (pre-existing): a board switch during a slow send
   acknowledged the other board's answers. Fixed by capturing the board at the press (`mount.ts` `send`).
2. **The ledger format bump (v19)** is broader than the feature (42 schema files' `$id`s), but api.md 11 makes it binding.
3. **Standalone pull path, unchanged**: when the board's Send is recorded first and the server then hands the round to a
   session (`chat-sessions.ts` `round`, a board whose session is not in the panel), a server crash between the record and the
   delivery loses that hand-over; a pull agent still reads the ledger. Only the message path (`deliver`) records with the read.
   [needs-human-input] whether that path should also record after delivery.
4. **Agent-scoped answers under a host**: answers on a container the chat's agent may not read get no answers chip, so a
   host's Send records `null` and they stay unsent (Send stays enabled). Before, any Send acknowledged them. Correct by
   property 1, but the person may see Send stay on with nothing for this agent; flagged for the maintainer.
5. Line counts and the two load flakes above.

### Decision draft (for `docs/decisions.md`, not written)

## D-075 A Send counts only the answers that went
- **Date**: 2026-11-02 · **Status**: Proposed (maintainer, point 377) · **From**: board-actions send-counts-what-went
- **Decision**:
  1. A Send acknowledges the answers its message carried, as a consumer commits an offset: `resolve('answers')` answers
     `head`, the ledger line it read through; the host passes it to `record`; the `send` line keeps it (`head`, ledger v19).
  2. `record(null)`: the message went without the answers chip; the Send is recorded and acknowledges nothing new.
     `record()`: no chat carried the answers (the bot reads the board); the Send covers up to its own line, as before.
  3. The board's watermark is the highest `head` (own `seq` on a line with none), never lowered: the answers chip,
     `board.unsent` and a note's history count from it. Old ledgers fold unchanged.
  4. A host records only after the message went: a failure records nothing; a crash before the record re-sends (a
     duplicate, never a loss). A chip the person removes is left out of that message only.
  5. Behind `sendCountsWhatWent`, on by default.
- **Why**: a host that lets the person remove the answers chip, or an answer made between the read and the record, lost
  answers the bot never got.
- **Rejected**: the chip's `ref` bounding the read (needs the board as of a past line); the engine remembering the last
  resolve (makes `resolve` stateful, and a failed message's read would be committed by the next Send: a silent loss);
  refusing a Send whose answers moved (re-sends the whole round); `record(null)` writing no line (chat-side and pull agents
  lose the Send signal); a v18 field without a bump (api.md 11).
- **Task**: cortex-tasks/board/2026-11-02_board-actions_send-counts-what-went.md
