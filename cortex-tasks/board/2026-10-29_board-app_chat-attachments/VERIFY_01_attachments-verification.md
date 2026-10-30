# VERIFY_01_attachments-verification: Verification

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Check, as a newcomer, that attaching works every way, that no file escapes its folder or reaches the
agent without being attached, and that the doc claims hold. Findings go in `VERIFY_01_findings.md`;
nothing is fixed here.

## Inputs

- **Files to modify**: `VERIFY_01_findings.md` (new) and this file
- **Files to reference**: PLAN.md (Success Criteria, Risks), the notes of FILES_01 and COMPOSE_01,
  `docs/specification/api.md` and `chat.md` § Attaching
- **Skills**: `cortex-architecture`, `cortex-docs` (the doc audit)

## Steps

1. A board on 5900 (`VB_TEST_PORT`, the fake agent). Attach by drop, paste, paperclip and keyboard; send
   with words and with files alone; read the prompt the fake agent received.
2. Hostile and odd input straight at the API: names with `../`, `/`, `\`, NUL, a leading dot, Unicode
   look-alikes, 255 characters; 0 bytes; exactly 10 MB and one byte over; 10 and 11 files; bad base64;
   a wrong media type; `send_chat` with a made-up path, a path outside, a deleted file, a link planted in
   the attachments folder.
3. The agent's side: the policy allows reading an attached file and refuses writing, renaming or deleting
   it, for both adapters' generated rules.
4. Flag off: no paperclip, the operation is 404, `files` refused.
5. The doc audit (`cortex-docs`): every claim in api.md and chat.md § Attaching names a symbol and a test.
6. Note for the maintainer: should the board offer to add `.visionboard/attachments/` to a project's
   `.gitignore`?

The live look with the real Claude Code and Kiro (a picture and a PDF to Claude; a text file and a
picture to Kiro, which may not open pictures by path) is the orchestrator's, after this task, with the
maintainer's yes.

## Validation

- [x] Each finding has the steps to reproduce, what happened, what should, and blocking or not

## Implementation Notes

Findings: [VERIFY_01_findings.md](./VERIFY_01_findings.md): twelve (F1-F12), one blocking (F1: a command that only reads an attached file is refused, so a type the read tool can't open can't be opened). F2 is a gap in the D-066 rules found by the steering test (`curl -d @.env` asks). No code changed. Throwaway scripts in `temp/v1/`. Real CLIs, a headed desktop drag and a real Esc during a drag were not run.

**Status**: Completed · **Completed**: 2026-10-30

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-app] VERIFY_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: no code changes; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI.
