# 3_FE_04_container-notes-and-drag: Notes on a whole container, and dragging containers

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Stage 3;
> decisions 4 and 5; Format changes: notes with a `region`, region pins) · **Reference**: Uplynk
> Architect, `architect-extract/` README §2 and §4 ("Area notes" -> container notes) ·
> **Builds on**: 2e_FE_01 (note bubble, one unsent note, `note-edit`/`note-remove`), 3_FE_02
> (group notes, command table, selection bar), 3_FE_03 (`move`, Later frame, drop targets,
> `sender.ts`), 2d_BE_01 (`collide.ts` `applyPins`, `makeRoom`), N12 (incremental layout,
> counting tests) · **Contract**: `docs/specification/api.md` (person acts, versioning, drift) ·
> **Model**: Opus 5.5

## Objective

A person can write one note on a whole container from its title line, and can drag a container
to a new place on the board; that place is remembered. Containers never overlap. Card numbers,
container ids and every existing note stay as they are (rule 10).

## Rulings (do not reopen)

1. **Format first.** Ledger v7, `openapi.json` minor bump, every `$id` to `/ledger/7/`,
   regenerated outputs and drift tests, numbered points appended to `api.md` (71 onwards).
   - A container note is the existing `comment` or `context` act with `board` + `region` in place
     of `n`/`ver`/`nodes`. `note-edit` and `note-remove` work on it unchanged (they name the
     note's `seq`).
   - A container place is the existing `pin` / `unpin` act with `board` + `region` in place of
     `n`/`ver`: `{action:'pin', board, region, x, y}` in board coordinates. This is the only
     coordinate a container ever has, and only the person writes it (rule 9). Agents still never
     send coordinates.
   - `region` must be a container on that board. A pin may also name `later` (Later can be
     placed); a note may not (ruling 2).
2. **Container notes follow the card note rules (2e).** At most one unsent note per container:
   pressing Comment again opens it to edit, with Remove. After Send it is read-only history. An
   agent sees only the latest text and never a removed note. The built-in Later takes no note
   (it is not a thread the agent drew); refuse it in `act.ts` with a plain-English problem.
3. **Where it shows.**
   - A "Comment" icon button on the container's title line, beside the cog, using the existing
     icon set and the region pattern's states. The cog stays last.
   - The bubble (the existing note-bubble pattern, not a copy) opens beside the title line, with
     its arrow on the title. Its border uses the container's own line colour, fainter at rest,
     as the card bubble does.
   - A saved note shows as a numbered pin on the title line, and a short "Your note" line under
     the title. Clicking either reopens the bubble. Pin numbers continue the same sequence as card
     notes in the current Send.
4. **Reads.** `show_container`, `get_board` and `check_responses` include the container's
   latest note (kind, text, seq, sent or not), shaped like a card note with `region` in place of
   `n`. Reply text names it once, as "on container <title>".
5. **Moving a container: by a grip handle only**, matching the cards' kind-tab rule (3_FE_01).
   A small grip at the start of the title line (grip dots, shown on hover and focus, always
   present for keyboard and screen readers, `aria-label` "Move container <title>"). Dragging the
   grip moves the frame and everything in it. A plain drag anywhere else on the title line or the
   container's background still pans, and Shift+drag still draws the lasso, exactly as today.
6. **Drop and no overlaps.** While dragging, only the frame's transform changes (no layout, no
   measuring). On drop, write one `pin` for the container, then lay the board out: the pinned
   container stays exactly where it was dropped, and `collide.ts` (`applyPins`, `makeRoom`, reused,
   not copied) moves unpinned containers right or down to make room. Pinned containers never move
   for one another; if two pinned containers would overlap, the one dropped last wins and the
   earlier one is pushed (record that rule in `api.md`). Links are re-routed only for the
   containers that moved.
7. **Putting it back.** The cog gains "Put container back" (greyed out with "Not moved" when the
   container has no pin), which writes `unpin` with `board` + `region`. The existing
   "Reset places" (card pins) is unchanged.
8. **Keyboard (rule 5).** With focus on the grip, Alt+arrows move the container by the same step
   cards use, writing one `pin` when the key is released (or after a short idle, matching the
   cards' Alt+arrows behaviour; reuse it). With focus on the title line, C or N opens the
   container note. Add both to the 3_FE_02 command table and the help line.
9. **Performance (extend `perf.spec.ts`, counting style).** A drag frame touches no card,
   measures nothing and lays out no container. A drop re-measures nothing and lays out no
   container (repack only), and redraws only the links of containers that moved. A container note
   updates only that container's title line.
10. **Not in scope:** container resizing; agent-side placement hints; area notes on empty lasso
    space (the lasso over empty space keeps "Zoom to this area" only); the 2f shapes; parking
    (Stage 5). Agents cannot pin containers or write container notes (person-only, rule 8).

## Inputs

- **Modify**: `packages/format` (act shape, schema, ledger index context), `packages/actions`
  (fold, notes, reads, act validation, reply), OpenAPI and generated outputs, `packages/layout`
  (board packing honours container pins through `collide.ts`), `apps/board/src/board/` (pointer
  for the grip, a container-drag module, the note flow for a container target, commands, help
  line), `packages/ui` region pattern (grip, comment button, pin and "Your note" line, states in
  `pattern.json`), the gallery (container with a note, a moved container, grip states, dark and
  light), `tests/pages/` and baselines, `docs/specification/api.md`,
  `docs/specification/components.md` (short section)
- **Read first**: `apps/board/src/board/moves.ts`, `selection-flow.ts`, `commands.ts`,
  `packages/actions/src/notes.ts`, `packages/layout/src/board.ts` (`packRegions`, `layoutBoard`),
  `packages/layout/src/collide.ts`, `packages/ui/src/region/`

## Steps

Keep this list ticked as you go, so an interruption loses nothing. If you near your turn limit,
stop at a ticked step with the tree compiling and say so.

1. [x] Failing tests first: format and fold for container notes and container pins (unit);
   layout: a pinned container stays put and others make room, same input same picture (unit);
   page tests for the note from the title line (one note, edit, remove, read-only after Send),
   grip drag, plain title drag still pans, "Put container back", Alt+arrows, the counting tests.
2. [x] Contract (orchestrator, 2026-10-05): `api.md` 71-76; `act.schema.json` container-act rules;
   `v` and `stampAgent` take 7; every `$id` at `/ledger/7/`; `openapi.json` 1.4.0;
   `get_board` `state.containerNotes` / `state.containerPins`; `show_container` `notes` / `pin`;
   `npm run gen` run. Schema and OpenAPI tests pass (32/32).

The rest runs as small separate builds, one sub-agent each. Each ticks its own line.

- [ ] **4A. Format, fold, act rules, reads, reply, server** (`packages/format/src`,
  `packages/actions`, `apps/board/server`). Turns green: `packages/actions/tests/containers.test.ts`,
  `apps/board/tests/api-containers.test.ts`, `apps/board/tests/board-data.test.ts`. Naming: the
  in-memory board state keeps the step-1 test names, `regionPins` (region id -> `{x, y}`) and
  `regionNotes` (region id -> notes, the same note type a card's notes use), as Maps beside `pins`
  and `moves`; 4B and 4C's tests use those names too. The JSON the API returns follows the
  contract: `state.containerPins` / `state.containerNotes` in `get_board`, and `notes` (array) and
  `pin` in `show_container`. Where a step-1 test expects a single `note` on the container detail,
  change the test to the contract, not the contract to the test.
- [ ] **4B. Layout honours container pins** (`packages/layout` only, reusing `collide.ts`). Turns
  green: `packages/layout/tests/container-pins.test.ts`, plus the existing layout tests.
- [ ] **4C. Region pattern** (`packages/ui` only): grip, Comment button, pin, "Your note" line, the
  cog's "Put container back", `pattern.json` states. Turns green: `region-core`, `region-template`
  and `note-bubble` tests.
- [ ] **4D. Page wiring** (`apps/board/src/board/`): container note flow through the existing note
  bubble, grip drag (transform only while dragging, one `pin` on drop), Alt+arrows, C/N on the
  title line, command table and help line.
- [ ] **4E. Gallery, axe dark and light, baselines viewed before updating, perf counting tests,
  all five gates.**

## Validation

- [ ] All five gates exit 0 (read the exit codes): `npm test`, `npm run check`, `npm run verify`,
  `npm run test:pages`, `npm run gen -- --check`
- [ ] Board in dark and light: a container note and a container drag, checked through the page
  tests and gallery frames; say plainly if you did not watch a live drag.

## Constraints

Project rules apply. No new dependency. No commits. Files over 300 lines need a reason; split
rather than grow (`controller.ts` is at 271; new code goes in its own module). Reuse the note
bubble, `collide.ts`, the command table and `sender.ts` rather than copying them. Deviation from
a ruling: stop and report. Probe scripts under `temp/` only, deleted after. Use the file-edit tool
for edits (scripted edits are refused). Fill in the Implementation Notes and return: modules and
symbols, the event shapes, tests added or changed and why, baselines, gate exit codes, anything
unsettled.

## Implementation Notes

(to be filled in by the builder)
