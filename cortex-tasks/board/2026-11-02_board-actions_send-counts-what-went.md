---
task_name: A Send Counts Only What Went
created: 2026-11-02
completed:
status: pending
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

- [ ] Properties 1 to 7 each proven by a named test
- [ ] Design, rejected options and the decision draft in the notes
- [ ] `plugin.md` agrees with the code; gates green; full page and plugin suites pass
- [ ] Tried in a browser; notes filled

## Implementation Notes

_To be completed by the agent: design first, then changes, issues, caught beyond the brief, deviations._
