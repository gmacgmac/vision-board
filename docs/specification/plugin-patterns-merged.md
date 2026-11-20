# Plugin patterns: Journal and Vision Board, merged for nclite

updated: 2026-11-20 (§ 2 built in nclite as proposed, and VB asks it); 2026-11-19 (§ 4: both plugins wear the host's scrollbar, point 632); 2026-11-19 (first version, from Journal's and Vision Board's notes of the same day)

nclite's two plugins each wrote down the patterns they built that the host could own: Journal in its own
`docs/specification/plugin-patterns.md`, Vision Board in `docs/specification/plugin-patterns.md` here. This merges
them into one proposal for nclite's plugin contract. Where the two differ, it picks one answer and says what each
plugin changes to fit. Nothing here is built in nclite yet. Every hook is optional and feature-detected, so a
plugin still works with a host that lacks it. Paths name the plugin they are in: (J) Journal, (VB) Vision Board.

## What nclite would own

| Pattern | The host gives | Today |
|---|---|---|
| Dates and times | One written rule and one normaliser; the person's locale and first day of the week | Each plugin has its own; they agree |
| Printing | `print(ask?)` and the `@page` rules | Built in nclite as § 2 proposes (its `7415189d`); VB asks it (folders-labels-print T_04) |
| Files | `saveFile`, `openFile` | In VB's contract; J has no files |
| Scrollbar | The overlay scrollbar, as today, written into the contract | nclite has it; both plugins wear it |
| Calendar | `ui.calendar(...)`, or at least its tokens | J's own package |
| Popover | `ui.popover(...)` | J's own package; VB's menus are its own |
| Confirm | `confirm(ask)`, as today | Both use it |

## 1. Dates and times

1. **The need**: a date means the same thing in every plugin and in every bot's writing.
2. **What each built**: J stores days as `YYYY-MM-DD` and times as `HH:MM`, both floating (no zone), and refuses
   anything else (`isDate`, `TIME_RE`). VB stores one key at four precisions, `2026`, `2026-10`, `2026-10-13`,
   `2026-10-13T14:30`, floating, and tidies a model's habits to one spelling before refusing the rest
   (`packages/format/src/timeline.ts` `normaliseTimeline`). They agree: J's two forms are two of VB's four.
3. **Proposed rule**:
   - A date is floating ISO 8601 at year, month, day or minute precision; the precision is what is written.
   - A time on its own is `HH:MM`, 24-hour, the person's wall clock.
   - A moment, when a plugin needs a real instant, is ISO 8601 with an offset. Neither plugin needs one yet.
   - Today is the person's local day, never UTC's. Day arithmetic runs in UTC, so a zone or a clock change never
     moves a day (J `addDays`, `daysBetween`).
   - At the edge (routes, bot tools) one host normaliser: safe tidying only (seconds dropped, a space for `T`,
     `9:30` to `09:30`, a whole-number year read as a year); anything else refused with words naming the forms.
     Relative dates and quarters are never guessed.
   - Host settings: the person's locale and first day of the week. Plugins show dates with `Intl` in that locale,
     in their own words.
4. **What each changes**: J nothing (its forms are a subset). VB holds `normaliseTimeline` equal to the host's by a
   test, or calls the host's.
5. **Fallback**: a plugin's own normaliser, held equal to the host's by a test.
6. **Versioning**: a new precision is an addition; a stored spelling never changes.
7. **Pitfalls found**: models write zones, seconds, quarters and "next week" (VB). UTC's today is the wrong day in
   the person's evening (J).
8. **Open**: a zone written on a floating time. VB drops it today; J refuses it. Proposed: drop it, because a bot's
   `Z` is habit, not meaning; J would then accept it too.

## 2. Printing

Built as proposed: nclite's `print?(ask?: PrintAsk)`, `PrintLook`, `PrintOrientation` (`shared/plugin-host.ts`,
its `7415189d`), and Vision Board asks it.

1. **The need**: print some of a plugin's content, or save it as a PDF, plain or in the app's colours.
2. **What each built**: J builds a fresh element for paper (`src/view/print.ts` `printContent`) and asks the host to
   print it. VB prints its live page under a print stylesheet, after fitting the chosen part, the board or one
   container, to one page (`apps/board/src/board/canvas/print-view.ts` `printFit`). Both keep colours with
   `print-color-adjust: exact`; both offer light or dark, and J also plain.
3. **Proposed hook**: `print(ask?) → Promise<void>`, with `ask` `{ title?, content?, look?, orientation? }`.
   - `content`: an element to print on its own (J's way). Absent: the plugin's mount as it stands (VB's way).
   - `look`: `plain | light | dark`. Plain is dark ink on white with no host colours. For light or dark the host
     sets its root's `color-scheme` while printing, so its `light-dark()` tokens resolve to that theme.
   - `orientation`: `portrait | landscape`, default portrait.
   - `title`: the document's title while printing, which a PDF takes as its name.
   - Resolves when the print window closes, printed or cancelled; rejects only when printing cannot start. The
     plugin says a rejection through `notify`.
   - The host owns `@page` (size, margins), hiding everything but what is printed, and the window. A plugin's
     sheet holds no `@page` (nclite's sheet check already refuses it).
4. **What each changes**: J adds `look` to its ask (it already sets `data-look`). VB passes `orientation` and
   `look` instead of naming its pages `vb-print-landscape` and `vb-print-portrait` and setting
   `data-vb-print-theme`; its standalone host keeps doing what nclite would. Done in VB (folders-labels-print T_04).
5. **Fallback**: no hook, no Print control at all: no disabled button, no hint.
6. **Versioning**: new options are optional fields on `ask`, ignored when unknown.
7. **Pitfalls found**:
   - Browsers drop backgrounds unless `print-color-adjust: exact` (both).
   - A base `color-scheme: light` on the print element silently overrode the dark look (J).
   - Printing from inside a modal `<dialog>` clipped the print to the screen: print from the page's own flow (J).
   - An SVG path styled only by a class prints as a filled shape once anything copies the SVG out of its
     stylesheet: put `fill="none"` on it as an attribute (VB `apps/board/src/board/links/wires.ts`).
   - Soft shadows print as grey blocks: drop them in print (VB).
   - Content drawn after a layout settles (VB's links) can be missing: draw it before calling `print` (VB).
   - Page breaks: `break-inside: avoid` on each unit, `break-after: avoid` on headings, `box-decoration-break:
     clone` for padding on every page, and close a section with its rule rather than open one with it (J).
8. **Open**: margins on a coloured page. With margins the colour stops short of the paper's edge; without them the
   plugin must pad its own content. Proposed: 10 mm for plain, none for light and dark, the plugin padding with
   `box-decoration-break: clone`. And: `light-dark()` pairs become part of the contract, since both plugins'
   themed print depends on them.

## 3. Files: save and open

1. **The need**: share a plugin's content as a file, and bring one in, with no server in between.
2. **What each built**: VB only. Export writes the current state, no history, as `{ v, title, items, ... }`;
   import goes through the same write path as any other write (`packages/format/src/export/` `upgradeExport`,
   `conditionExport`). J has no files: its data is day files its engine owns.
3. **Host provides**: `saveFile(name, type, bytes): Promise<void>` and
   `openFile(accept): Promise<{ name, bytes } | undefined>`, as in VB's contract (`apps/board/src/board/host.ts`).
4. **How a plugin uses it**: builds the bytes itself, then `saveFile`; `openFile`, then reads the bytes itself.
5. **Fallback**: no hook, no Export or Import item.
6. **Versioning**: a file carries its own version and an upgrade chain, so an older file still imports; anything
   not understood is dropped and named, never silently lost.
7. **Pitfalls found**: who may write what differs between a person's import and a bot's; a retried import writes
   twice, so read the reply before retrying (VB).
8. **Open**: one naming rule for plugin files. Proposed `<name>.<plugin>.json` (VB's is `.vboard.json`).

## 4. The scrollbar

1. **The need**: every scrolling area looks like the app's: a thin thumb, not the system bar.
2. **What each built**: nclite installs its overlay scrollbar once for the whole document (`installOverlayScroll`),
   and J relies on it with no styles of its own. VB draws a thin, always-visible thumb on its standalone page only
   (`apps/board/src/styles/shell.css`); its plugin carries no scrollbar rule, so inside nclite it wears nclite's
   (point 632).
3. **Proposed**: the host's, for every plugin, written into the contract. Plugins don't style scrollbars;
   `data-overlay-off` opts an area out. A plugin that wants another behaviour asks for a host option (for example an
   attribute for always visible), not its own rule.
4. **What each changes**: nothing; both already wear the host's.
5. **Fallback**: native scrollbars.
6. **Versioning**: none needed; no API.
7. **Pitfalls found**: two thumbs when a plugin draws its own as well (J). `overflow: hidden` on a label inside a
   scroller stopped a wheel scroll mid-thread; `clip` did not (VB).
8. **Open**: none; nclite's look stands, for consistency (point 632).

## 5. The calendar (J)

1. **The need**: pick one day from a month, and see which days already have something.
2. **What J built**: a dependency-free package, `src/ui/date-pick/` `createCalendar`: the WAI-ARIA date-picker grid
   (arrows by day and week, Home and End, Page Up and Down by month, Shift by year) with `min`, `max`, `today`,
   `value`, `weekStart`, and `mark(dates)` for dots. VB has no date picker today.
3. **Proposed**: the package as a host component, `ui.calendar({ value, min, max, marked, labels, onPick })`, using
   § 1's locale and first day of the week. At the least, its tokens from the host's theme (`--dp-surface`,
   `--dp-ink`, `--dp-muted`, `--dp-line`, `--dp-hover`, `--dp-accent`, `--dp-fill`, `--dp-on-fill`, `--dp-ring`,
   `--dp-radius`, `--dp-font`).
4. **How a plugin uses it**: passes its own words (`labels`), its range and its marked days; it decides what a pick
   does.
5. **Fallback**: the plugin ships the package (J today); without host tokens it falls back to system colours.
6. **Versioning**: options are an object, new ones optional; tokens only gain names, each with a fallback.
7. **Pitfalls found**: all words come from the plugin; dates in UTC so a zone never moves a day; nclite's rule that
   every selector sits under the plugin's class was met by nesting the package's CSS at build (J
   `bin/scope-css.ts`).
8. **Open**: a component, or tokens only. Proposed: the component, so a second plugin that needs a day never keeps
   a second copy.

## 6. The popover (J)

1. **The need**: a button opens a small panel (a picker, a menu), then gets out of the way.
2. **What J built**: `openPopover` in the same package: placed under its anchor, or over it when there is more room,
   held inside a boundary; closes on Escape, a press outside, focus leaving, or its scroller scrolling; focus
   returns to the anchor; `aria-expanded`, `aria-controls`; placed through the CSSOM so a strict CSP allows it.
   VB's menus (the board's ⋯ menu, a container's settings menu) are its own.
3. **Proposed**: `ui.popover({ anchor, content, label, align }) → { close }`, so every plugin's menus and pickers
   place, close and return focus the same way.
4. **How a plugin uses it**: supplies the content and the label; a second press on its own button closes it.
5. **Fallback**: the plugin's own.
6. **Versioning**: optional options; the handle only gains methods.
7. **Pitfalls found**: a panel opening past the pane's right edge: align it `end` and hold it inside the boundary.
   A panel left open while its anchor scrolled away: close on the scroller's scroll (J).
8. **Open**: one host popover, or the native `popover` attribute once nclite's shell supports it. Whether VB's
   menus move onto it is VB's to decide once it exists.

## 7. Confirm

1. **The need**: ask "are you sure?" before a destructive step, in the app's own style.
2. **What each built**: neither draws a dialog. Both call `confirm(ask)`: J before removing a day and when leaving
   unsaved writing; VB before removals and through its `leave()`. VB's ask adds `list` (the cards a step affects).
3. **Proposed**: keep `confirm` as today: required, `{ heading, body, confirm, list? }`, resolving true when
   confirmed.
4. **How a plugin uses it**: words from its own words file; acts only on `true`.
5. **Fallback**: none needed while it is required; if it became optional, a plugin offers Undo instead.
6. **Versioning**: new optional fields on `ask`.
7. **Pitfalls found**: none.
8. **Open**: an optional `undoable` on `ask`, so the host words "can be undone" the same way for every plugin.

## 8. Rules every plugin keeps

- **Words**: every sentence a person or a bot reads lives in the plugin's words file, never in code.
- **Colour**: from tokens only, contrast checked in light and dark; the host passes its themes in.
- **Hooks are optional**: feature-detected; a missing one hides its feature and never breaks the plugin.
- **One home per pattern**: a pattern the host owns is used, never copied into a plugin.

## Decisions for nclite

1. Dates: the rule in § 1, and a zone on a floating time dropped or refused.
2. Print: the `ask` in § 2, and margins on a coloured page.
3. Whether `light-dark()` pairs are part of the contract.
4. Calendar and popover: host components, or tokens only.
5. A naming rule for plugin files.
6. An `undoable` field on `confirm`.
