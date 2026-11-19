---
skills: [cortex-docs]
---
# VERIFY_01_testing: Final Verification

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Use it as a person would, with `?flags=boardFiles`: export a real board and one container, import into a new board
and into the current one, print a board and a container to PDF (border on and off), in both skins, light and dark.
Judge against PLAN.md § Decisions; confirm nothing listed under "Not built" crept in.

## Steps

1. The full gates: `npm run verify`, `check`, `gen -- --check`, `npm test`, `test:plugin`, the full page suite
   once (with the config).
2. Round trips on the fixtures (`packages/format/fixtures/*.ledger.jsonl`): what comes back equals what went out
   (cards, links, answers, places, timeline dates); an agent's import drops answers.
3. The PDFs: curves are strokes, colours kept, nothing of the page's chrome; open them and look.
4. Docs match the code (`cortex-docs`): `api.md`, `plugin.md`, `components.md`.
5. Findings with severity; fix a defect inside the set's files with its failing test first; else report.

Port 8710.

## Constraints

No git commands that change state. No PII in examples. Deviation: stop and report. Each behaviour starts with a failing
test. Sentences in words files. Budgets never block: report measured numbers.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row and notes, append one LOG line:
`[[YYYY-MM-DD HH:MM]] [category] ID: [what changed] → Task: [[cortex-tasks/board/2026-11-19_board-app_export-import-print/<file>]]`

## Implementation Notes

**Status**: Completed (2026-11-19), in `.claude/worktrees/app-window`, nothing committed. Plan trimmed mid-task by the
maintainer (through the orchestrator): no full page suite (it runs once after T_02), only the set's specs at 10 workers,
`npm test` once, one person pass with each skin in one theme.

**Maintainer's ruling 621 (built here, test first)**: an imported note owes nothing. A note carrying its original
author (`from`, FIX_01) never counts as waiting for an agent; a note the person writes after the import is owed as
usual. One rule, `packages/actions/src/note-answer.ts` `owes`, used by both `item.owed` (`conditions.ts` `owedNote`) and
`container.owed`. Test: `api-import.test.ts` "an imported note owes nothing (ruling 621)" (red: both conditions came
back, the card `with-agent`). api.md 206 says so.

**Defects found and fixed (each red first)**
1. **High: a card the person moved to Later was lost on import.** The export writes it with `region: later`;
   conditioning let it through; the write refused it (`node.region: unknown "later"`). Every board export with a card in
   Later lost those cards, for the person and for an agent. Found by the fixture round trips (gallery: cards 2 and 3).
   Fix: the card is drawn in the file's first container (`export/writer.ts` `laterHome`), then the person's import
   moves it to Later as the person's act (`write-import.ts` `personActs`); an agent's import leaves it in that container
   and names the move (`keptFor`, words `agentLater`). Test: "a card the person moved to Later comes into the new
   board's Later". **For the maintainer**: the first container is a choice (where it was drawn is not in the file); a
   later "put back" sends the card there.
2. **Medium: a person's import was silent about refused items** (FIX_01 Caught 6). The page shows `dropped` alone and
   toasted "Imported" while cards had failed. Now the person's `dropped` names each refused item (`importFile`); an
   agent still reads `results`. Test: "a person's import names each item the normal checks refused".

**Round trips** (`temp/verify-files/roundtrip.mjs`, every board of every fixture, through the real server): each board
exported with notes, imported by the person into a new board, exported again; each container exported, imported into
its own board, the new container exported again. After fix 1: **0 differences** in cards, links, containers (mode,
widths, direction, radial centre), answers, places, notes and replies with their authors, for all 4 fixtures (gallery's
11 boards and 22 containers; login-review, login-layout, roadmap). Every imported container was new (`<id>-2`), none
merged. An agent's import (`vb get-board --export --notes`, then `write-board` `import`) of the gallery board: 104
items written, 0 failed; 14 answers, 3 places and 2 Later moves dropped and named; notes and replies kept.

**As a person** (`temp/verify-files/person.mjs`, the real menus and dialog, `?flags=boardFiles`)
- Exported the gallery board without and with conversations (104 items, 14 ✓/✗, 3 places, 0 then 20 notes); a
  container (Review) without and with conversations. Names: `pattern-gallery.vboard.json`,
  `where-vision-board-goes-from-here-review.vboard.json`.
- Imported the board into a new board: it opened, 86 cards, 18 containers and Later, toast "Imported "Pattern
  gallery"." Imported the container into this board: 4 containers became 5.
- Printed board and container, border on and off, default skin light and Command Lens dark, plus each in the other
  theme: 10 PDFs, each one page; the dialog opened with the border on for the board, off for a container, and the
  screen's theme. Looked at the board PDF (default, light, border on: Letter portrait) and the container PDF (Command
  Lens, dark, border off: Letter landscape): links are thin strokes with arrowheads, never filled; colours kept; no
  toolbar, rail or menus; the border off leaves no frame.

**Gates** (trimmed plan)
- Before my changes: `npm run verify` ok (47 warnings, none on this task's files), `check` clean, `gen -- --check`
  current, `npm test` 2,775/2,775, `test:plugin` 116/116.
- After: the set's page specs (board-files, conversation-labels, conversation-box, conversation, parking-replies,
  chat-ask; `VB_TEST_PORT=8710`, 10 workers) 56 passed; `npm test` 2,778/2,778 (+3 tests); `verify` ok; `tsc` clean.
- Full page suite: not run, by the maintainer's change of plan (it runs once after T_02).
- Budgets measured: plugin `view/board.js` 207,010 gzip (budget 207,100); page weight within its budget (verify ok).

**Right-sized**: nothing from "Not built" crept in: no history, no merge (every container new), fresh numbers, no PDF
or image library (pdfjs-dist predates the set, D-071), no PNG/SVG export, one wrapper shape.

**Docs** (`cortex-docs`): api.md 204-206 updated for the two fixes and ruling 621. Still untrue or missing (requests,
not this task's files): `plugin.md` `print()` row says nothing of the two named pages a host must define
(`vb-print-landscape`, `vb-print-portrait`) or of `data-vb-print-theme` (FE_01 and FIX_01 requests, still Open);
`plugin-patterns.md` § 1 has both. components.md's FIX_01 section matches what I saw.

**Security**: nothing new. The person's `dropped` now carries the server's refusal details as text; the page renders
them as text.

**Caught Beyond the Brief** (programme manager's view)
1. **A container imported into its own board keeps its title**: two containers called "Review" side by side, no way to
   tell the copy from the original (low). An "(imported)" suffix or the file name would help; a choice.
2. **Command Lens prints its Tick and Cross buttons** under each open card: on paper they read as an empty form (low).
3. **Export dialog words**: "your ✓ and ✗" but places travel too (low, words only).
4. **The agent's `dropped` repeats one line per answer** (14 identical lines for the gallery board): fine for a bot,
   noisy (low).
5. **Pointer index**: a refused item's pointer (`items[i]`) is its place in the conditioned file, as `results` and the
   centre's are; when conditioning removed an earlier item, the person's line names the wrong card's title (low; the
   same holds already for a refused centre).
6. **My error**: the walk-through script's first run wrote its output under a stray `~/Dropbox%20(Personal)/…` folder
   (a URL path left encoded). Moved into `temp/verify-files/out/` and the stray folder removed; nothing else was in it.
