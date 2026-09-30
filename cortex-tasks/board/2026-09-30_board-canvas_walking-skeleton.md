---
category: board-app
type: task
status: written-untested
created: 2026-09-30
scope: Walking skeleton of the board: format, layout modes, actions, canvas, local server
---

# Board canvas: walking skeleton

Approved by the maintainer in chat on 2026-09-30 ("just go ahead ... follow our design
principles"). Time-boxed to one session; zero third-party dependencies.

## Goal

An agent-written view file draws on a canvas in several layout modes, the person responds per
numbered item, moves nodes (places remembered as pins), and the result is saved to the transcript
and summarised as a numbered reply to paste back into chat.

## Plan

1. `packages/format`: view and transcript types, `validateView`, a CLI validator, fixtures.
2. `packages/layout`: pure, deterministic modes (grid, flow, lanes, radial, list), region packing,
   pins, orthogonal rounded connectors.
3. `packages/actions`: action registry (acknowledge, drop, comment, more context, later, reopen,
   pin, unpin, mode), record validation, transcript reducer, numbered reply text.
4. `packages/tokens`: `--vb-` tokens, light and dark via `light-dark()`.
5. `packages/ui`: item core (states, allowed actions) and template (pure markup).
6. `apps/board`: localhost server (id sanitising, Host/Origin checks, JSON only, live updates,
   type-stripped TypeScript served to the browser) and the canvas page.
7. Unit tests on Node's runner; a headless browser check in `temp/`.

## Out of scope (next)

Contrast gate port, pattern index, web-component elements, type-checking with `tsc` (needs a
dependency decision), versions diff, Confirm these, Approve, agent skill.

## Outcome

All files written, not run. Handover: `HANDOVER.md`.
