# VERIFY_01_read-attachment-verification: Verification

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Check, as a newcomer, that the agent really gets what is in a document, that a hostile file reaches nothing, and that the doc
claims hold. Findings go in `VERIFY_01_findings.md`; nothing is fixed here.

## Inputs

- **Files to modify**: `VERIFY_01_findings.md` (new) and this file
- **Files to reference**: PLAN.md (Success Criteria, Risks), READ_01's and PAGES_01's notes, `docs/specification/api.md`, `chat.md`
- **Skills**: `cortex-architecture`, `cortex-docs` (the doc audit)

## Steps

1. A board on 6300, the fake agent. Attach by every route; read what the fake agent is told; call `read_attachment` as the agent does.
2. Documents built to look real: an Excel with several sheets, formulas, dates, merged cells; a Word file with headings, a merged table and
   a diagram picture; a zip of those; a PDF with a diagram and no text. Does what comes back let someone answer "what does cell F20 calculate?" and
   "what does the diagram connect?"
3. Hostile: zip bombs, slips and links; billion laughs; deep nesting; a PDF that runs script, a PDF that hangs the renderer; a picture bomb (huge
   dimensions, small file); a path outside; a `.env`; tool calls racing a delete.
4. The access rules: board-made folders are read-only to the agent, on both adapters' generated rules.
5. Flag off. The doc audit: every claim names a symbol and a test.
6. Re-measure the picture caps' reasoning: are 5 MB and 2000 px right? (Note for the orchestrator's live look; no real CLI here.)

The live look with the real Kiro on Sonnet, with tiny files, is the orchestrator's, after this task.

## Validation

- [ ] Each finding has the steps to reproduce, what happened, what should, and blocking or not

## Implementation Notes

_To be completed by agent after task completion._

**Status**: Pending · **Completed**:

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-app] VERIFY_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: no code changes; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI.
