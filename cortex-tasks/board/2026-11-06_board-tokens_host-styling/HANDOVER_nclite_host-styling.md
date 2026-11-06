# Handover to nclite: host styling has landed in Vision Board

Answers `HANDOFF_vision-board_host-styling.md` (nclite, 2026-11-05). All nine items are done.

## Vendor it

- **Repo**: `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board`
- **Commit**: `42b1931fe58f16edbd0e81c979711ffa236cb8ad` on branch `feat/host-styling` (not merged to main yet; the commit is in the repo either way)
- `node --experimental-strip-types scripts/plugin-vendor.ts "<repo>" 42b1931fe58f16edbd0e81c979711ffa236cb8ad`
- **Seam**: still 1. Every change is additive, so `HOST_SEAM` stays and `plugin.d.ts` gains nothing you must give.
- **Dependencies**: none added or changed. `THIRD-PARTY-NOTICES.md` needs only the new commit hash.
- **Prompts changed**: `skill.md` is v3.31 (rule: a container with no `mode` is a `row`), and the
  `write_board` tool's `mode` description changed. Run the scenarios (TRACKER N220). The board's own
  `eval:bot` passed: 75/75 offline, 13/13 live.

## Set the properties (`app/src/lib/plugins/loader.ts`, beside `FONT_PROPERTIES`)

Set them on the pane's root (or any ancestor) and change them live. Each one you leave out keeps the board's own.

| Host property | nclite token |
|---|---|
| `--host-accent` / `--host-accent-strong` | `--accent` / `--accent-strong` (the bot's colour) |
| `--host-on-accent` | `--bubble-ink` |
| `--host-canvas` / `--host-surface` / `--host-surface-sunken` | `--bg` / `--surface` / `--surface-inset` |
| `--host-ink` / `--host-ink-muted` | `--text` / `--text-secondary` |
| `--host-line` / `--host-line-strong` | `--line` / `--line-strong` |
| `--host-focus` (optional) | falls back to the accent |
| `--host-color-scheme` | `light` or `dark` from `data-mode`; `light dark` when the mode follows the system |

- **The mode is one change from your decision 5.** The board does not inherit `color-scheme`, because a page
  that sets none says `normal`, which would make every colour light. Set `--host-color-scheme` from
  `data-mode`. The board ignores `data-theme` values other than `light` and `dark`, so your palette names
  (`warm`, `ocean`, …) are safe.
- **Give finished colours.** Give each one as a finished colour for the current mode, and change it when the mode changes.
- **Contrast is nclite's promise** (APCA-W3 0.0.98G-4g, in each mode):
  - Lc 60: ink and ink-muted on surface, canvas and sunken; on-accent on accent and accent-strong.
  - Lc 45: accent-strong as text on surface and canvas.
  - Lc 30: focus on surface and canvas.
  - The table is in the board's `docs/specification/plugin.md` § Theme and host styling.
- **The text faces and scale.** `--host-font`, `--host-font-mono` and `--host-text-scale` now work on the pane's root too, not only on `<html>`.

## What stays the board's

Every card kind keeps its own colour, decision pink included, and so do the state colours (answered,
dropped, commented, later, new, updated, flag), the wires, the dot grid and the shadows. A card's
colour says what it is, so it never takes the bot's (board D-094, maintainer point 455). The bot's colour
shows in the buttons, the selection, the focus ring, a highlighted link and the soft accent grounds.

## Also in this bundle

- **Item 8:** a container sent with no `mode` is a `row`. An existing one keeps its layout.
- **Item 9:** the layout icons show a small tooltip (the name over the hint) on hover and focus, beside the
  icon. The big popover no longer opens.
- **Flags**, both on: `hostStyling` and `layoutTooltip`. Turning a flag off gives today's behaviour.

## To check after vendoring

Open a bot's board in each bot colour, light and dark, including nclite forced dark on a light system.
Look for these:
- the canvas, cards and text match nclite's;
- the buttons and the selection are the bot's colour;
- the decision cards stay pink.
