# T_03_switch-on: Switch On

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

After the maintainer's yes on the result, make the timeline the board's behaviour: remove the `timeline` flag and its
one gate, as node-overhaul T_04 did ("no legacy"), so nothing points at the flag any more.

---

## Context

PLAN.md decision 25 and call 11. The flag has one gate on the page (FE_02 names it), one row in `FLAGS` and
`FLAG_DESCRIPTIONS` (T_01), a `flag` in `packages/ui/src/timeline/pattern.json` (FE_01) and in the gallery sections
(FE_01, FE_02), and `?flags=timeline` in specs. Run only after the result gate (TASK-STATUS.md) and VERIFY_01's
must-fix findings are closed.

**Read previous task notes in TASK-STATUS.md before starting.** Wave 5, alone, in `.claude/worktrees/app-window`,
`VB_TEST_PORT=8310`.

---

## Inputs

- **Files to modify**: `packages/format/src/flags.ts`; the page's gate (FE_02's notes name it);
  `packages/ui/src/timeline/pattern.json`; `apps/board/src/gallery/timeline-section.ts`,
  `timeline-board-section.ts`; `tests/pages/timeline.spec.ts` and any spec or test naming the flag; the screenshots
  that change; `docs/specification/components.md`, `api.md` and any doc naming the flag.
- **Files to reference**: `cortex-tasks/board/2026-11-16_board-ui_node-overhaul/T_04_defaults-on.md` (how a flag was
  removed with every path).
- **Skills**: `cortex-docs`.

---

## Steps

1. [ ] `grep -rn "timeline" --include=*.ts` and the docs for every use of the flag (`flagOn('timeline')`,
   `flag: "timeline"`, `?flags=timeline`, `FLAG_DESCRIPTIONS`); list them in the notes before changing anything.
2. [ ] Remove the flag's row and description, the page's gate (the view keeps the key), the pattern's and sections'
   flag, and the `?flags=` in specs; the "flag off" spec case becomes "a board with no key draws as before".
3. [ ] Docs: no sentence still says the timeline is behind a flag.
4. [ ] Run `timeline.spec.ts`, `gallery.spec.ts` and every spec whose screenshots change (renew only those, listed in
   the notes); `npm run test:plugin`; the project checks.

---

## Validation

- [ ] `grep` finds no flag named `timeline` anywhere but history (task files, LOG)
- [ ] The named specs, `npm run test:plugin`, `verify`, `check`, `test`, `gen -- --check` pass

---

## Constraints

- Behaviour with the flag on is unchanged; only the switch goes. No git commands that change state. Never port 4466.

---

## Implementation Notes

**Status**: Completed  
**Completed**: 2026-11-19  

### Uses found before changing (step 1)
`flags.ts` (the `timeline` row and its `FLAG_DESCRIPTIONS` sentence); `controller.ts` (`dating = on('timeline')`, the
`datedView` call in `redraw`, its import); `board-data.ts` `datedView`; `board-data.test.ts` (its unit test);
`gallery/main.ts` (`flagOn('timeline')` on the board section, a comment about the pattern's flag);
`gallery/timeline-board-section.ts` (header comment, a meta line naming `datedView` and "timeline flag");
`gallery/timeline-section.ts` (header comment); `packages/ui/src/timeline/pattern.json` (`flag`);
`packages/ui/src/node/pattern.json` and `markdown/pattern.json` (`flaggedStates.timeline`: "off until T_03", "with the
flag on"); `timeline-template.test.ts` (asserted `p.flag`); specs `timeline.spec.ts` (`?flags=timeline` x3, flag-off
cases x3), `timeline-layers.spec.ts`, `app-alive.spec.ts`; docs `api.md` 196, `components.md` (intro, item 5, 12, 13).

### Changes Made
- Flag, description and the one gate removed: `controller.ts` passes the view as stored; `datedView` and its test gone.
  `app` cards never hold a date (`app-shape.ts`, the write refuses it), so the gate's app-card strip had no stored case.
- The pattern and gallery: no `flag` on the `timeline` pattern; the board section is appended always; the dated node
  and entry states moved from `flaggedStates.timeline` into `states` (node: dated, dated toned, dated with an icon, dated
  day/month/year/time; markdown: entry from a heading, from a bold lead, in a list, entries off), which prints them.
- Specs: no `?flags=timeline`; the flag-off cases became "a board with no key draws as before" (no line, no date header,
  no date in a name; Tab and name tests lose their flag-off halves). Four specs that name the gallery's last section
  (`header-tiers`, `ledgers`, `read-only`, `read-only-controls`) exclude `timeline-board` as they do the other
  always-on sections.
- Docs: `api.md` 196 and `components.md` (intro, 5, 12, 13) say no flag; no sentence says the timeline is behind one.
- Baselines renewed, all because the gallery now holds the timeline sections by default (the timeline pattern's section
  shifts every section below it, and the node and markdown meta lines print more states): `gallery.spec.ts` 30 renewed,
  4 new (`gallery-timeline-{dark,light}`, `gallery-timeline-board-{dark,light}`); `chat-attach-gallery`; and one pair
  each in `big-titles`, `card-updates`, `chat-alongside`, `chat-folder`, `chat`, `command-lens`, `container-rail-states`,
  `current-folder`, `fresh-cards`, `go-to-card`, `header-tiers`, `key-bubble`, `ledgers`, `lock-board`,
  `markdown-more`, `node-edges`, `open-folder`, `open-list`, `parking-replies`, `person-remove`, `picker-archive`,
  `proposals`, `read-only-toggle`, `read-only`, `search`, `selection-pill`, `send-access`, `size`, `toolbar`,
  `versions`; `bookmark-retire` 2 pairs; `layout-controls` 3 pairs. `timeline.spec.ts` own baselines were FIX_04's.
- Gates: `grep` for `flags=timeline`, `FLAGS.timeline`, `datedView`, `flagOn('timeline'` outside task files and LOG: none.
  check 0 errors, verify ok, gen --check current, `npm test` 2,723 pass, test:plugin 116; pages: timeline, timeline-layers,
  gallery, chat-attach-gallery, app-alive 53 passed; the FE_02 list, node-edges, markdown-more, big-titles, command-lens
  and every spec that screenshots the gallery: the renewed set passes (403).

### Caught Beyond the Brief
- The timeline switch shifts every gallery screenshot below the new pattern section; 30+ baselines is the honest size of
  that, not a regression.
- `update-signals.spec.ts` "APCA (light)" failed once in a 440-test run ("read in the box: muted") and passed alone,
  10 of 10: a flake, not caused here.
- `timeline.spec.ts` is 485 lines.

### Deviations from Plan
- None

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update your row and notes block in [TASK-STATUS.md](./TASK-STATUS.md).
3. Append your own LOG entry to `cortex/LOG.md`, one line, append-only:
   ```
   [[YYYY-MM-DD HH:MM]] [board-layout] T_03: the timeline switched on, flag removed → Task: [[cortex-tasks/board/2026-11-18_board-layout_timeline/T_03_switch-on.md]]
   ```
4. Return block: `TASK_ID`, `STATUS`, `FILES`, `VERIFICATION`, `REQUESTS`, `NOTES`.
