# Plugin patterns: what Vision Board built, for nclite's plugin specification

updated: 2026-11-20 (§ 1: built on nclite's `print(ask)`, the board names no page and sets no print theme, folders-labels-print T_04); 2026-11-19 (§ 3: the host's scrollbar, point 632); 2026-11-19 (first version: printing, files, the scrollbar, dates, small cross-cutting rules)

A note for nclite. nclite will own shared patterns and give them to every plugin through hooks and CSS variables, so a
hard problem is solved once and no plugin keeps an old copy. This is what Vision Board built and what it suggests the
host provides. It describes; it ships no code to copy. Paths are in this repository. Journal writes the same note with
the same headings; nclite merges both and picks one answer where they differ.

---

## 1. Printing

1. **The need**: print a board, or one part of it, to paper or PDF, looking like the screen.
2. **What we built**: a print stylesheet over the live page, no PDF library. `apps/board/src/styles/print.css` hides
   the board's chrome, fits the chosen part to one page (`apps/board/src/board/canvas/print-view.ts` `printFit`), and
   keeps colours (`print-color-adjust: exact`), all inside the board's own root. The person chooses light or dark for
   the print, default the screen's theme. Then the host's `print(ask)`. Decisions D-107, D-108.
3. **What the host provides**: nclite's `print(ask?: PrintAsk)` (`shared/plugin-host.ts`; the board's copy of the
   shapes in `apps/board/src/board/host.ts`), built as § 2 of `plugin-patterns-merged.md` proposed. The host owns the
   paper (size, margins), hiding everything but the board's root, and the look's colours (its `--host-color-scheme`
   on the printed root). A plugin's sheet may not hold `@page` (nclite's sheet check refuses it). The standalone host
   does the same for its own page (`apps/board/src/shell/page-files.ts` `print`, `apps/board/src/styles/shell.css`).
4. **How a plugin uses it**: sets its print scope on its own root, then calls `print({ title, look, orientation })`
   with no `content` (its root as it stands); a rejection's words go through `notify`.
5. **Fallback**: no `print` hook, no Print item in the plugin's menus.
6. **Versioning**: the hook is optional and feature-detected; its options are optional fields on `ask` (seam 2 still).
7. **Pitfalls found**: an SVG path styled only by a class prints as a filled shape when anything copies the SVG out of
   its stylesheet: give link paths `fill="none"` as an attribute (`apps/board/src/board/links/wires.ts`). Browsers drop
   backgrounds in print unless `print-color-adjust: exact`. Soft shadows print as grey blocks: drop them in print.
   Content still settling (links drawn after a layout) can be missing from the print: draw it before printing.
8. **Open questions for nclite**: should the host own the light or dark choice for every plugin's print?

## 2. Files: save, open, export and import

1. **The need**: share a board as a file, and bring one in, without a server of our own in between.
2. **What we built**: export writes the current state (no history) as `{ v, title, items, answers?, notes? }`, the
   items being exactly what an agent sends to `write_board`
   (`packages/format/schema/api/export-file.schema.json`). Import goes through the same write path in an `import`
   mode: older files upgrade by `v` (`packages/format/src/export/` `upgradeExport`, `EXPORT_STEPS`), unknown parts are
   dropped and named (`conditionExport`), then the normal checks. D-107, D-108.
3. **What the host should provide**: `saveFile(name, type, bytes): Promise<void>` and
   `openFile(accept): Promise<{ name, bytes } | undefined>` (`apps/board/src/board/host.ts`).
4. **How a plugin uses it**: builds the bytes itself, then `saveFile`; `openFile`, then reads the bytes itself.
5. **Fallback**: no hook, no Export or Import item.
6. **Versioning**: a file carries its own version number and an upgrade chain, the same pattern as the ledger's
   (`packages/format/src/migrate/`), so a file from an older version still imports; anything not understood is named,
   never silently lost.
7. **Pitfalls found**: a person's import and an agent's import differ in who may write what (a person's ✓/✗ and moved
   places stay the person's); a retried import writes twice, so check the reply before retrying.
8. **Open questions for nclite**: one file-type naming rule for every plugin (ours is `.vboard.json`).

## 3. The scrollbar

1. **The need**: every scrolling area looks the same, quiet but findable.
2. **What we built**: inside a host, nothing: the plugin carries no scrollbar rule and wears the host's (point 632).
   The standalone page draws a thin, always-visible thumb, CSS only (`apps/board/src/styles/shell.css`).
3. **What the host should provide**: its scrollbar, for every plugin, written into the contract.
4. **How a plugin uses it**: draws none of its own.
5. **Fallback**: native scrollbars.
6. **Versioning**: nothing to call.
7. **Pitfalls found**: `overflow: hidden` on a label inside a scroller stopped a wheel scroll mid-thread; `clip` did
   not. A plugin rule that beats the host's `*` rule brings back a second bar next to the host's thumb.
8. **Open questions for nclite**: none (point 632: nclite's look, for consistency).

## 4. Dates

1. **The need**: a date means the same thing in every plugin and every agent's writing.
2. **What we built**: one ISO 8601 key at four precisions, `2026`, `2026-10`, `2026-10-13`, `2026-10-13T14:30`; the
   precision is what is written, no separate field (`packages/format/src/timeline.ts` `TIMELINE_FORMS`). A model's
   habits are tidied at the edge to one stored spelling (`normaliseTimeline`: zone, seconds and a space for `T`
   dropped; a whole-number year read as a year), anything else refused with words naming the four forms. Times are
   shown as written, no zone conversion. Ordering: by start, coarser before finer, then creation. D-105.
3. **What the host should provide**: one shared date format and its normaliser, so a date picker in one plugin and a
   date key in another agree.
4. **How a plugin uses it**: stores the normalised value only; shows it in its own words.
5. **Fallback**: the plugin's own normaliser, held equal to the host's by a test.
6. **Versioning**: a new precision is an addition; the stored spelling never changes.
7. **Pitfalls found**: models write zones, seconds, quarters and "next week": normalise what is safe, refuse the rest.
8. **Open questions for nclite**: time zones. We show times as written; a calendar may need a zone. One rule for all.

## 5. Small rules every plugin should keep

- **Words**: every sentence a person or an agent reads lives in a words file, never in code (`docs/specification/words.md`).
- **Colour**: from tokens only, contrast checked (APCA, light and dark); the host passes its themes in.
- **Hooks are optional**: every host hook is feature-detected; a missing one hides its feature, never breaks.
- **One home per pattern**: a pattern the host owns is used, never copied into the plugin.
