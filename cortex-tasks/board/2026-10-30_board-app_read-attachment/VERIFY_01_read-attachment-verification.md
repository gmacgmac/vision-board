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

- [x] Each finding has the steps to reproduce, what happened, what should, and blocking or not

## Implementation Notes

**Status**: Completed · **Completed**: 2026-10-31

Findings: [VERIFY_01_findings.md](./VERIFY_01_findings.md). Blocking: F1 (a good PDF and a big picture fail on a full Chromium build; a race in `pdf-pages.ts`), F2 (SmartArt, charts, drawn shapes, EMF and Excel's pictures vanish with no word), F3 (Word's heading and list numbers dropped or wrong). A hostile file reached nothing.

### Changes Made
- `VERIFY_01_findings.md` (new); this file; my row in TASK-STATUS.md; one LOG line. No code. Throwaway scripts and files in `temp/verify-01/`.

### Caught Beyond the Brief
- The suite's browser is the headless shell, which doesn't show F1. `temp/verify-01/pw-full.config.ts` runs the spec on a full build.
- 5 MB raw is over Bedrock's 5 MB base64 limit (the caps section); `temp/verify-01/docs/about-4.5mb.png` is for the live look.

### Deviations from Plan
- None. Step 1 used the page's paperclip, composer drop and paste; a drop on the board was left to its spec. Numbers and Pages were tried as real writers, gave no answer in 45 s, and I stopped both, having started them. openpyxl and python-docx came from a local image already here, run with no network.

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-app] VERIFY_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: no code changes; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI.
