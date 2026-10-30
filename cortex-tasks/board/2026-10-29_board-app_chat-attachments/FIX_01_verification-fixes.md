# FIX_01_verification-fixes: The fixes from VERIFY_01

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Fix VERIFY_01's findings F1 to F5 and F9 to F12, per D-069. F6 is accepted (no change); F7 is the doc
correction below; F8 goes to the tracker (orchestrator).

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (FIX_01)
- **Files to reference**: `VERIFY_01_findings.md` (the steps to reproduce each), `docs/decisions.md` D-066,
  D-067, D-068, D-069; `packages/agent/src/policy.ts` (`commandPolicy`, `candidates`, `refusedTail`),
  `access-rules.ts`, `readonly-command.ts`, `kiro-permission.ts` (`verdictFor`), `bin/gate.ts`;
  `apps/board/server/chat-files.ts`, `chat-sessions.ts`; the existing `ignoreInGit`
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

Each starts with its failing test.

1. **F1, rulings 1 and 2 of D-069.** On `.visionboard/attachments/**` a command the rules don't know asks,
   as on any other file; known changers stay refused (the list in D-069; a redirection onto it counts;
   `mv` as a source counts). `cp` with an attached file as source asks; as target, refused. The table stays the
   one source: express this as a property of the row, not a path check inside `commandPolicy`. Every other
   row refusing a write keeps refusing an unknown command: the ledger, `.git/`, the bots' secrets. Hold it
   through `policy()`, the real gate and Kiro's `verdictFor`. A command naming a closed file still refuses,
   whatever else it names (`cp attached .env`). Tests also: `python3 read.py <attached>`, `unzip -p`,
   `pdftotext` ask; `rm`, `mv`, `sed -i`, `> <attached>`, `tee` refuse. A yes for one of these is once only
   unless the existing remembered-head rules already say otherwise: check `rememberedHead` and
   `NEVER_REMEMBERED`, and report what you find.
2. **F2.** `candidates` treats `@.env` as `.env`, in every form the finding lists (`-d @x`, `--data-binary @x`,
   `-F f=@x`, `--data-binary=@x`), so a closed file behind `@` refuses. This fix reaches every closed path,
   not only attachments.
3. **F3.** Files are checked again when a waiting message goes; one that has gone is left out of the prompt
   and the person is told which (words file). `nextNumber` never reuses a path already named by a waiting message,
   or say why that can't happen.
4. **F4.** The refused chip is marked from `/files/<i>`: keep the problem's pointers on `ApiError`
   (`apps/board/src/board/io/errors.ts`), and mark that chip.
5. **F5, ruling 3.** The board adds `attachments/` to `.visionboard/.gitignore` through the existing `ignoreInGit`.
6. **F9.** Picking many files: at most what fits, one short status line for the batch. **F11.** A blank label is
   refused (the schema's `$defs/fileLabel`).
7. **Docs, F6, F7, F10, F12**: the seven claims in F12; chat.md says the page and the server each have the flag,
   and that an agent's unknown command on an attached file asks (`docs/specification/chat.md` § the agent's
   access); api.md 165 names its test; the skill's line says how to read a file its read tool can't open, and that it
   may copy out (version bump). Nothing in `docs/decisions.md` (orchestrator).
8. **Checks**: unit tests, `check`, `verify`, `gen-api --check`, `tests/pages/chat*.spec.ts` on 5950.

## Validation

- [ ] Every finding's steps now give what the finding said they should
- [ ] The ledger, `.git/` and the secrets still refuse an unknown command
- [ ] A closed file behind `@` is refused

## Implementation Notes

_To be completed by agent after task completion. Re-run? Add a `### Run N` block; never overwrite._

**Status**: Pending · **Completed**:

### Changes Made
- 

### Caught Beyond the Brief
- 

### Deviations from Plan
- 

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-security] FIX_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI; writes over 50 lines in chunks; never re-baseline an existing screenshot (a `REQUEST`).
