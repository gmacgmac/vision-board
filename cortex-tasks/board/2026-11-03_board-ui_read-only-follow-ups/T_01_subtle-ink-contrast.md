# T_01_subtle-ink-contrast: Subtle ink to the reading tier

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

`--vb-ink-subtle` in dark passes Lc 60 on the surfaces it is text on, fixed in the token (tracker N45, PLAN decision 2).

## Context

The tokens are protected. This task runs in two halves with a stop between: measure and propose, then (after the
maintainer's yes, relayed by the orchestrator) write and re-take screenshots.

## Inputs

- **Files to modify**: `packages/tokens/src/tokens.css` (after the yes only), `packages/tokens/README.md`,
  `packages/ui/src/base/dialog.css` (only if a line there is not reading text), screenshots that change,
  `docs/specification/components.md` (FE_01's doc requests, relayed in your brief)
- **Reuse**: `tests/pages/apca.ts` (`lc`, `pixel`, `resolved`) for every measurement
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. List where `--vb-ink-subtle` is text and on which surface (dialogs, notes kind, quiet labels…), dark.
2. The darkest same-hue value that reaches Lc 60 on all of them (between `#b3b3bb` and `#b8b8c0` by PLAN), with
   its Lc per surface; check it still reads quieter than `--vb-ink` (`#c7c7cc`, Lc 71.6 on card).
3. **Stop**: return `BLOCKED` with the exact one-line change for the maintainer.
4. Run 2, after the yes: write it; re-take only the screenshots it changes, named in notes; the apca specs, gallery
   and dialogs in dark pass.

## Validation

- [ ] Run 1: the measured table and the exact value returned; Run 2: token written, the changed screenshots named, apca/gallery/dialog specs green

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files (TASK-STATUS File Ownership); other needs under `REQUESTS`.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

**Status**: Run 1 done; Run 2 pending the yes


### Run 1 (measure and propose; nothing changed)

**Status**: BLOCKED, waiting for the maintainer's yes.

Method: a throwaway page spec (untracked, in `tests/pages/`, deleted after) on the worker's own servers (`VB_TEST_PORT=6500`), the gallery and the board page,
light and dark. It walked every element with text (and placeholders) whose computed colour is the subtle ink, composited the
backgrounds above it, and scored with `tests/pages/apca.ts` (`pixel`, `lc`). Candidates were scored in a scratch script (deleted).
Both probes left nothing in the repo.

Surfaces where `--vb-ink-subtle` is TEXT, dark (hex, Lc of `#9e9ea6` now -> `#b8b8c0`):

| Surface | #9e9ea6 | #b8b8c0 | Where (examples) |
|---|---|---|---|
| canvas `#111112` | 49.6 | 63.9 | node status, region count, notes toggle, md label, gallery notes |
| card/dialog/raised `#1a1a1c` | 48.8 | 63.0 | dialogs (`.vb-dialog-item/-hint`), menu hints and disabled rows, note-bubble hint/placeholder, chat composer labels/lines/placeholder, folder heads, prop head/from |
| selection bar `#171719` | 49.1 | 63.3 | Reset places |
| sunken `#222225` | 47.7 | 61.9 | note who/state, region count on sunken, app caret, chat ask family |
| Note kind chip `#28282a` | 46.6 | 60.9 | `.vb-node-kind` "Note" |
| deep `#2c2c30` (no text on it in the gallery; kept as the floor) | 45.8 | 60.1 | |
| accent-tinted drop zone `#23151e` / grid tile `#2e1726` | 48.8 / 48.1 | 63.1 / 62.4 | region empty (drop), mode tile name |

Value: the darkest same-hue (blue offset +8, as `#9e9ea6`) value stepping one grey level at a time that reaches Lc 60 on every
surface above, deep included, is `#b8b8c0` (min 60.07 on deep). `#b7b7bf` gives 59.5 on deep and `#b3b3bb` 58.1 on the Note chip and 57.2 on deep, so they fail.
Versus `--vb-ink` `#c7c7cc`: ink is 71.6 on card (68.6 on deep); subtle `#b8b8c0` is 63.0 (60.1), about 8.5 Lc quieter, so it still reads quieter.

Light is unchanged (`#6b6b74`): 57.5 on the Note chip `#dfdfe1` (short coloured label, tier 45), 65.5 to 76.2 elsewhere; passes.

Non-text uses (a lighter value only adds contrast there): icon strokes (`app-frame.css` kind icon, container rail cog and icons, `region.css` grip and
icon buttons), rings and outlines (`region-note.css` ring, `node-notes.css` sent group outline), `note-bubble.css` `--kind`, `node.css` `--kind`/`--state`.
These sit in the decoration tier (Lc 30) and a lighter ink only raises them. Seen while measuring: the dark rail icons at `--vb-rail-rest: 0.5` measure Lc 16.9
on the canvas with `#9e9ea6` and 22.2 with `#b8b8c0`; still under 30 (already reported in tokens.css, awaiting the maintainer), not made worse. Also dimmed on purpose and not scored as text:
paused/stale ink at opacity 0.35 and the hidden size options (opacity 0).

### Changes Made
- none (notes only)
### Caught Beyond the Brief
- Rail icons at rest in dark stay under the decoration tier (16.9 now, 22.2 after); needs its own ruling, not this task.
### Deviations from Plan
- PLAN decision 2 said `#b8b8c0` reaches 60 on every surface; confirmed (60.07 on deep). No deviation.

### Changes Made
-
### Caught Beyond the Brief
-
### Deviations from Plan
-

### Run 2 (the write; maintainer's yes, point 415: "415 - ok")

**Status**: Completed.

### Changes Made
- `packages/tokens/src/tokens.css`: `--vb-ink-subtle: light-dark(#6b6b74, #b8b8c0);` with a comment naming the reading tier and point 415. `packages/tokens/README.md`: an "Ink tiers" line. `dialog.css` untouched: its three subtle lines (`.vb-dialog-item`, `.vb-field-note`, `.vb-dialog-hint`) are reading text.
- FE_01-R2 `ProposalsBar.svelte` Accept all `data-paused={readOnly || undefined}`; FE_01-R3 `access.css` `.vb-access-allow-all { white-space: nowrap; }`; FE_02-R1 `gallery/ledger-section.ts` meta "on by default · off with ?flags=-ledgerFolders".
- `docs/specification/components.md`: FE_01-R1 (write controls on a read-only ledger, after the header-controls item), FE_03-R1 (`railOnHover`, `data-rail-hover`, `data-use`, after the tool rail section), the stale "dark 48.8" lines (two) now 63.0, the ledger chip paragraph (last board through `pageStore`, `vb.lastBoard` read once), and § Feature flags (`FLAGS` is `{ default }`, sentences in `FLAG_DESCRIPTIONS`; written to match T_03, true after its merge). `docs/specification/words.md` and `scripts/words-homes.mjs` `DEVELOPER_TEXT` (flags.ts row): equal, "FLAG_DESCRIPTIONS", no gallery flag list; `node --test scripts/words.test.mjs` 7/7.
- Screenshots re-taken (`tests/pages/__screenshots__/`, light and dark each, 34 files). Dark: the lighter subtle ink (mean lightness of the changed pixels up 6 to 13 on gallery pages; app-fit, alongside, chat-attach, folder-access, current-folder, gallery-base/freshCards/groupNoteOnce, header, review-list, search, fresh-section, ledgers, read-only). Light: the same pages differ with no lightness change; they fail identically (same pixel counts) on the wave-2 base without my edits, so they are the set's earlier changes (FE_03's rail icons hidden unless in use, FE_01/FE_02/FE_03 sections shifting the gallery by a fraction of a pixel), not the token; I looked at fresh-section-light (rail size icon fainter) and app-fit-light (same words, shifted text) before re-taking. Rail: `container-rail-states.spec.ts/rail-{light,dark}` and `gallery.spec.ts/gallery-toolRail-{light,dark}` (2682 -> 3164 px tall, FE_03's new group). Height by one pixel: `ledgers-{light,dark}` (4566 -> 4567; FE_02's meta line and FE_01's section; the 4567 vs 4566 FE_02 reported), `read-only-*` (3844 -> 3845), `header-*` (2858 -> 2857), `review-list-*` (697 -> 696): the same cause.
### Caught Beyond the Brief
- I ran the whole page suite once by mistake (a bare spec name filter matches the folder name `vision-board`, so 915 tests ran), then a second time partly and stopped it. Both outside the one-group allowance; I kept to the results (875 passed, 24 failed at that run: the screenshot specs above and `same-picture.spec.ts`). Use `tests/pages/<name>.spec.ts` paths from now on.
- `same-picture.spec.ts` seeds 11, 77, 2026 fail on the base and with my edits (after "click later", a region's markup differs: `data-rail-hover`/`data-use` from FE_03). Not mine, not changed: REPORT.
### Deviations from Plan
- None.

## On Completion

Notes; your TASK-STATUS row; one LOG line, `[board-tokens] T_01: … → Task: [[cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/T_01_subtle-ink-contrast.md]]`, ending in a newline; the return block.
