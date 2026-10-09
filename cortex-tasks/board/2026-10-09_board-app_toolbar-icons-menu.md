---
category: board-app
status: completed
created: 2026-10-09
tracker: cortex-tasks/tracker.md#U1
---

# Toolbar: icons for every action and a "⋯" menu, so nothing is cut off

> **From**: maintainer, 2026-10-09 (chat 380-386) · **Model**: Opus 5.5 · **Runs after**:
> `2026-10-09_board-app_page-polish.md` (page tests share ports)

## Problem

The toolbar holds 12 controls in one row (board picker, version, containers, counts, zoom, Hide
decided, Theme, Reply, Agents, Send to agent, Chat). Below about 1050px the right end is cut off,
so Chat and Send to agent can't be reached.

## Rulings (maintainer; do not reopen)

1. **Icons for every action, with tooltips** (`apps/board/src/shell/ButtonIcon.svelte`, same
   drawing style: 24 grid, 1.5 stroke, currentColor):
   - Chat: a speech bubble (exists).
   - Send to agent: a bot with a send arrow.
   - Agents: a bot with the holder count beside it.
   - Reply: a quote mark.
   At narrow widths these show their icon only (as Hide/Theme/Reply/Chat already do under 1500px);
   the words stay for screen readers and the tooltip (title) says what it does and its key.
2. **A "⋯" menu** at the end of the toolbar holding Theme, Hide decided and Reply, each as a
   labelled row with its key. A popover on click or Enter, closed by Esc, a click outside or a
   choice; keyboard reachable; the existing keys (H, the theme cycle) keep working. Reply's panel
   still opens from the menu.
3. **Always visible:** board picker, version, containers, counts (bare numbers when narrow), zoom
   (unchanged), Agents, Send to agent, Chat, "⋯". Nothing in the toolbar is ever cut off from
   the smallest supported width (pick and state it, e.g. 768px) upward; a page test checks no
   toolbar control is clipped at several widths (1500, 1200, 1024, 900, 768).
4. Tokens only; every icon and the menu meet their APCA tiers (icons: decoration Lc 30; menu text:
   reading Lc 60) light and dark; WCAG target size 24px; axe clean.
5. Behind a flag (`toolbarMenu`, on by default); off is today's toolbar. Gallery: the toolbar at a
   wide and a narrow width, and the menu open.

## Steps

1. [x] Failing tests first: the no-clipping page test at the widths above; the menu (open, choose,
   Esc, outside click, keys still work); tooltips present; axe light and dark.
2. [x] Build the icons, the menu (reuse an existing popover pattern if one fits: the Agents panel
   or the card popover), the narrow-width rules in `board.css`; gallery; update screenshot
   baselines only after viewing the diffs.

## Validation

- [x] The five gates exit 0 (`npm test`, `npm run check`, `npm run verify`,
  `npm run gen -- --check`, `npm run test:pages`).

## Constraints

- If deviation is needed, stop and say so. No PII in examples. No git commits or stash.
- `tokens.css` and the other protected files: propose wording, never edit.
- Scratch in the system temp folder; stop only your own processes; don't touch `.visionboard/`.
- One job per file, under 300 lines (`controller.ts` is at its limit).
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-09 (Opus 5.5)

### What was built
- **Flag** `toolbarMenu` (`packages/format/src/flags.ts`, on by default; unit test in
  `packages/format/tests/flags.test.ts`). The header carries `data-menu` with it on.
- **Icons** (`shell/ButtonIcon.svelte`, 24 grid, 1.5 stroke, currentColor): `agents` (a bot),
  `send` (a bot with a send arrow), `quote` (a closing quote mark, Reply), `more` (three dots).
- **End group** split out of `Toolbar.svelte` into `shell/ToolbarEnd.svelte` (zoom, then flag off:
  Hide decided, Theme, Reply as before; flag on: Agents, Send to agent, Chat, "⋯"). The gallery
  mounts it with `placement: 'gallery'`, which drops the board's ids and `aria-controls`.
- **Menu** `shell/ToolbarMenu.svelte`: "⋯" (`#toolbar-menu`, `aria-haspopup="menu"`,
  `aria-expanded`, title "More: Theme, Hide decided, Reply") opens a `role="menu"` list on click or
  Enter and focuses the first row. Rows: Theme (`menuitem`, cycles system/light/dark, `#theme`),
  Hide decided (`menuitemcheckbox`, `aria-checked`, `aria-keyshortcuts="h"`, a tick and `H`,
  `#hide`), Reply (`menuitem`, `aria-expanded`, `aria-controls="reply"`, `#reply-toggle`; the
  panel opens and takes focus as before). Closed by Esc (focus back on "⋯"), a press outside, a
  choice or Tab. H in the menu chooses Hide decided; H on the board still works (keys.ts unchanged).
  The popover reuses the Move to list rather than the card popover (hover-based, wrong for a menu):
  its keys are now one helper, `board/menu-keys.ts` `menuKeydown`, used by `move-menu.ts` and the
  menu; its look is the same CSS rules (`.vb-move-menu, .vb-menu-list`, `.vb-move-item,
  .vb-menu-item`). It hangs under "⋯" like the Agents panel (`right: 0`), raising the toolbar's
  z-index while open.
- **Agents** (`BoardAgents.svelte` `icon` prop): bot icon + visually-hidden "Agents" + the count,
  title "Agents who can draw on this board". **Send** (`SendButton.svelte` `icon` prop): the icon
  in idle and error; the spinner and tick stand in for it while sending and sent. **Chat**: title
  "Open or close the chat · T" with the flag.
- **Narrow rules** (`styles/board.css`): the old `@media (max-width: 1500px)` block is now
  `[data-narrow]` rules; `Toolbar.svelte` sets `data-narrow` from a Svelte `MediaQuery('max-width:
  1500px')` (same breakpoint, so flag off looks the same), and a gallery sample sets it itself, so
  the gallery can show wide and narrow side by side. Icon-only buttons are marked
  `.vb-btn-iconic` (replacing the old id list). New `@media (max-width: 1000px)` block, flag-gated
  on `[data-menu]`: gaps `--vb-space-1`, the app icon hidden, picker `min-width: 150px`, version and
  containers selects `6em`, count chips `--vb-space-1` padding with a 24px minimum.
- **Smallest supported width: 768px.** Measured with the long-title board and the "boards
  updated" chip: at 768 the last control ("⋯") ends at 760px with the picker at 198px; at 1024 and
  up the picker keeps 220px (330px at 1024).
- **Gallery** `gallery/toolbar-section.ts` (`data-feature="toolbarMenu"`): Wide, Narrow, Menu open;
  `.g-toolbar` in `gallery.css`. `gallery.spec.ts`'s full-page screenshot adds `-toolbarMenu`.
- **Docs**: `docs/specification/components.md` § Navigation, point 4 updated and point 5 added.

### Not done as ruled, reported
- Ruling 2 says each row shows "its key": only Hide decided has one (H). There is no theme key
  today ("the theme cycle" is the button's click cycle) and no Reply key, so those rows show none;
  no new keys were invented.
- The 220px picker floor (navigation VERIFY_01) now holds from 1024px up; below 1000px it is
  150px, which 768px needs (the full toolbar needs about 906px with the picker at 220).

### Tests
- `tests/pages/toolbar.spec.ts` rewritten (17 tests): no control clipped, overlapping, under 24px
  wide or scrolling, and the open menu inside the window, at 1500, 1440, 1280, 1200, 1100, 1024, 900
  and 768px, each with axe light and dark; icons when narrow and words when wide; the menu by
  pointer (rows and keys, choose, outside click, Theme cycle, Reply panel, H from the board) and by
  keyboard (Enter, arrows, Home/End, H, Esc, Tab); axe with the menu open (light, dark); flag off
  is today's toolbar; the gallery section (shown, not shown with the flag off, no board ids, axe and
  screenshot light/dark).
- `tests/pages/board.spec.ts`: "Reply (3)" is now checked as the menu row.

### Contrast (APCA-W3 0.0.98G-4g, scripted from the token values; light / dark)
Icons (decoration, Lc 30): `--vb-ink-strong` on a button (`--vb-surface-card`) 104.5 / -94.9, on
hover (`--vb-surface-sunken`) 95.1 / -93.8; the send icon `--vb-ink-on-fill` on `--vb-accent-fill`
-77.4 / 60.4. Menu text (reading, Lc 60): `--vb-ink-strong` on `--vb-surface-raised` 104.5 / -94.9,
on the focused row 95.1 / -93.8; the `H` key 104.5 / -94.9. The tick (`--vb-accent`, a state
glyph, held to Lc 45): 72.0 / -47.7 on the menu, 62.6 / -46.6 on the focused row. All pass. Targets:
every toolbar control is 32px high and at least 32px wide; menu rows 32px high.

### Screenshots
Viewed actual, expected and diff first. `board.spec.ts` `board-{light,dark}-darwin.png`: only
the toolbar's end changed (Hide decided, Theme and Reply replaced by "⋯"); updated on purpose. New:
`toolbar.spec.ts/toolbar-{light,dark}-darwin.png` (viewed: wide, narrow, menu open). No other
baseline changed.

### Gates (all exit 0)
`npm test` (891 + 6), `npm run check` (0 errors, 0 warnings), `npm run verify` (0 warnings),
`npm run gen -- --check`, `npm run test:pages` (290 passed).
