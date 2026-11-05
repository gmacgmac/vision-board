# FIX_01_findings: Wave 2 findings and signal follow-ups

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Close what wave 1 left and VERIFY_01 found blocking, so the set meets PLAN Decision 10 everywhere "new" and
"updated" show.

## Items

1. **FE_01-R3**: `packages/ui/src/region/region-note.css` `.vb-nblock-reply`: container note replies take the
   same edge as card replies under `[data-update-signals]` (bright amber while unseen, muted after).
2. **The "N updates" tab on hover/open** keeps the bright `--vb-state-updated`, not the duller changed amber:
   hovering must never look like a step down (`packages/ui/src/node/node-steps.css`).
3. **The toolbar's "N new" chip** is still the accent pink: one colour per meaning (Decision 10). New is teal:
   the chip takes `--vb-state-fresh` under `updateSignals`; if it counts updated cards too, say how it reads and
   pick the teal unless VERIFY_01 found it confusing.
4. **Card NEW tab** (VERIFY_01 finding 3): `packages/ui/src/node/node-popover.css` `.vb-node-btab[data-tab='new']` is
   pink while the pill's "new" is teal: teal with the toolbar chip (item 3), so no pink "new" is left.
5. **Light amber** (VERIFY_01 finding 1): in light, `--vb-state-updated` `#a66800` reads as the action amber
   `#b57c09` (ΔE76 9.0, and darker). Pick a light value that reads clearly apart from the action amber (aim ΔE76
   ≥ 20, by hue toward orange and/or chroma, as bright as Lc 45 words on the card allows), keep dark `#ffc21a`;
   the seen-reply mix and `-soft` follow; figures in the token comment; `update-signals.spec.ts` checks light too.
   Report the value: the maintainer may change it (point 429).
6. **`tests/pages/read-only-controls.spec.ts`** gallery "…last…" selector skips `[data-feature="updateSignals"]`
   (VERIFY_01 finding 2), as the three other specs now do.
7. **Gallery**: `update-signals-section.ts` box taller than its cards so the shot shows the badges and the tab;
   `editing-section.ts` meta says `readOnlyStart` is on by default.

8. **Table column widths** (VERIFY_01 finding 5, and the orchestrator's look): equal columns waste room (a column
   of short numbers as wide as one of sentences) and break words like "Internationalisation" and "Enterprise".
   Try widths that follow content (`table-layout: auto`, `overflow-wrap: break-word`, not `anywhere`, so short
   words never break; a word only breaks when it alone is wider than its column) while the table still never
   overflows or scrolls at L and S. MD_01 tried auto with `anywhere` and saw short words break: avoid that. If no
   approach meets "no scroll, no overflow, short words whole", keep `fixed` and say why. `packages/ui/src/markdown/markdown.css`,
   `tests/pages/markdown-more.spec.ts` and its screenshots, the gallery's Markdown screenshots.

## Steps

Failing test first for each; the specs and screenshots each touches; APCA (labels Lc 45, edges Lc 30), light and
dark; gallery entries updated; a look at 1400, 900, 600 px.

## Validation

- [ ] Each item's spec green, light and dark; `check`; `npm test`; flag off = as before

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files; other needs under `REQUESTS`. Behind the flag each piece already uses; off is
exactly the old behaviour.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

## On Completion

Notes here (Changes Made, Verification, Caught Beyond the Brief, Deviations); your TASK-STATUS row; one LOG line,
`[board-ui] FIX_01: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/FIX_01_findings.md]]`, ending in a
newline; the return block.
