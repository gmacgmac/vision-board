# FE_01_toolbar-versions: Toolbar and read-only version view

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (ruling 1) ·
> **Tracker**: U11 · **Model**: Opus 5.5

## Objective

The toolbar shows each fact once: the board picker holds titles only, and a version dropdown to
its right shows the board's own versions; choosing a past one shows the board as it was, read-only.

## Rulings (do not reopen)

1. **Picker**: options are titles only (no `· vN`); the ` · new` / ` · changed` marks stay. The
   visible `<h1 id="title">` goes; keep an `h1` for the page, visually hidden, with the same text
   (tests and screen readers), and update tests that read `#title` as visible text.
2. **Versions are a reference row**: a board's versions are the runs of agent drawing lines on
   it (`DRAWING_EVENTS`, consecutive lines by the same agent count as one version), labelled by
   the run's last line: "v42". Add this as one definition in `packages/actions` (a read next to
   `boardList`, built from the fold; keep a per-board list of run ends as lines are applied, so
   no full scan). The latest is "now".
3. **Version dropdown** replaces the `#version` chip: "v42 · now" at the top, then past versions,
   newest first, each with its time. It reads the board's own head, so other boards and seen
   lines never move it.
4. **Past view**: choosing v42 reads the ledger from the start up to line 42 (`readLedger` pages,
   stopping at 42; no contract change), folds it, and draws that board with the same drawing
   code. A banner under the toolbar: "Viewing v42 from <time> · read-only" and a "Back to now"
   button (Esc does the same). The live stream keeps running underneath; new lines don't redraw
   the past view, but the dropdown's "now" updates.
5. **Read-only, one guard**: while a past version shows, `sender` refuses every person act (the
   one funnel: `apps/board/src/board/sender.ts`), `attention.ts` sends no board seen, the world
   gets `data-readonly`, and CSS hides action buttons, the size control, grips and note pins;
   keys and drags that act do nothing. Selection, zoom, pan and the finder still work.
6. Behind a flag `versionView`, on by default.

## Steps

1. [x] Failing tests first: unit (versions of a board from a built ledger: runs, labels, other
   boards ignored; a coverage case); page (picker titles only; dropdown lists versions; picking
   one shows the old card set, no act buttons, a refused act is never sent; Back to now; axe in
   both themes with the banner).
2. [x] Versions read; toolbar; past view; guard; banner; gallery sample of the banner.

## Validation

- [x] The five gates exit 0; looked at in a browser, dark and light.

## Implementation Notes

**Status**: Completed (2026-10-07)

- **Versions read** (`packages/actions`): the fold keeps `runs` (board -> each run's last line,
  `BoardRun { seq, at, agent? }`, `addRun` in `fold.ts`): an agent's drawing line extends the
  board's last run when it comes right after that run's end among the board's own lines (a board
  seen is none) and from the same agent; else it starts one. `boardVersions(s, board)` in
  `reads.ts` (next to `boardList`): `{ now: heads(board), past: runs before now, newest first }`.
  A person act or another agent's line ends a run, so the gallery board has many versions; the
  real ledger's overview board reads `v56 · now`, `v42`. Tests: `packages/actions/tests/versions.test.ts`
  (built ledger: runs, other boards and board seen ignored; coverage over `DRAWING_EVENTS`; the
  fold equals a full walk on every fixture, at once and line by line).
- **Toolbar** (`Toolbar.svelte`, flag `versionView`, on): picker titles only; `<h1 id="title">`
  visually hidden; `#version` select "vN · now" then past versions with `versionTime` (local
  clock). Agents and Send hidden while a past version shows. Flag off = the old toolbar exactly
  (visible title, `· vN` in the picker, the `#version` chip on the ledger's latest line), so the
  board screenshot is unchanged with `-versionView` (components.md § Feature flags).
- **Past view** (`apps/board/src/board/versions.ts`): reads `read_ledger` pages from 0, stopping
  at the version's line, folds, and the controller's `redraw` draws `versions.state ?? live.state`
  with the same code. Live lines keep folding; `onLines` schedules no draw while past, but
  `versions.listed()` moves "now". Esc (after closing a note bubble) and Back to now end it;
  switching boards resets it.
- **Read-only**: `sender.ts` refuses every act before sending (`READ_ONLY`, error toast);
  `attention.ts` sends no board seen; `#world[data-readonly]` and `board.css` hide card buttons,
  size control, note pin, grip, container tools, note-block buttons and Remove access;
  `versions.guard` makes the acting stage handlers no-ops (list `ACTING`) and `carried` empty
  (`pointer.ts`: no card move when nothing is carried); commands get `acts` in `COMMANDS`
  (Comment, Move to, container note), hidden from the selection bar and refused while past.
- **Banner**: `VersionBanner.svelte` under the toolbar (`--vb-banner-h` pushes the stage; the
  requests strip is not shown meanwhile); gallery section `version-section.ts` (fixture
  `pastVersion`), its own screenshots `versions.spec.ts/past-version-{dark,light}` (UTC, en-GB).
- **Page tests**: `tests/pages/versions.spec.ts` (picker titles, hidden h1, now unmoved by board
  seen and other boards; flag off; past view: old card set, no act buttons, keys send nothing,
  live lines move only now, axe both themes with the banner, Back to now, Esc); `live-boards.spec.ts`
  option texts updated (the "label follows an append" test is now "label is the title; an append
  marks it changed": retitling a board is BE_01's); `board.spec.ts` and `gallery.spec.ts`
  screenshots taken with `-versionView` (baselines unchanged).
- `controller.ts` 300 lines (flags read through one `on` helper; `destroy` a list).
  `docs/specification/modules.md` regenerated (`npm run map`).
- Not done here: `docs/specification/components.md` has no section on versions yet (doc surface;
  left for the orchestrator or VERIFY).

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-app] FE_01: …`).
