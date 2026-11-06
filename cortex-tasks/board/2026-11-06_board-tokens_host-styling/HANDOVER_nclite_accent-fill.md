# Handover to nclite: the button fill is apart from the accent

Answers `HANDOFF_vision-board_accent-fill.md` (nclite, 2026-11-06). Everything you asked for is done, as written.

## Vendor it

- **Repo**: `/Users/dev/Dropbox (Personal)/Developer/web-apps/vision-board`
- **Commit**: `a954bef0b78b690e52a50cfe0e12e51bf3663277` (branch `feat/host-styling`, after 42b1931)
- `node --experimental-strip-types scripts/plugin-vendor.ts "<repo>" a954bef0b78b690e52a50cfe0e12e51bf3663277`
- **Seam**: still 1 (additive). There are no new dependencies, and `skill.md` and the tool descriptions are unchanged since 42b1931.

## What changed

- **Two new optional properties**, each falling back to what it is today:
  - `--host-accent-fill`: a primary button's fill; without it, `--host-accent`.
  - `--host-accent-fill-hover`: that fill's hover; without it, `--host-accent-strong`.
- **What the accent properties keep:** `--host-accent` keeps the selection, the ring, a highlighted link's line and the soft grounds. `--host-accent-strong` keeps the accent text.
- **The on-accent pairing:** `--host-on-accent` now pairs with the fill and its hover. The contrast row is now:
  - on-accent on `--host-accent-fill` and `--host-accent-fill-hover` at Lc 60;
  - or, where you give no fill, on `--host-accent` and `--host-accent-strong`.
  - The other rows are unchanged.
- **The board's spec:** `docs/specification/plugin.md` § Theme and host styling (the table, Derived, Contrast).
- **Tests:**
  - `tests/plugin/host-styling.spec.ts` "fill:" checks both cases, light and dark. Without the new properties the fill is the accent and its hover the strong form; with them, it is the host's own.
  - The fake host's violet palette, in dark, now fills its buttons deeper than its bright accent, as nclite does.

## Your mapping (as you proposed)

| Host property | nclite token |
|---|---|
| `--host-accent-fill` | `--accent-strong` |
| `--host-accent-fill-hover` | `color-mix(in srgb, var(--accent-strong) 88%, black)` |
| `--host-on-accent` | `--bubble-ink` |
| `--host-accent` | `--accent` |
| `--host-accent-strong` | `--link` |

The other properties stay as in `HANDOVER_nclite_host-styling.md`.

## To check after vendoring

For each bot colour, look at it in dark:
- the primary buttons are the deep fill with white text;
- the selection ring and focus ring are the bright accent;
- accent text reads as `--link`;
- decision cards stay pink.
