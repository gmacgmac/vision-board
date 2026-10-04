# 2b_FE_02_open-frames: Containers become open frames

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Stage 2b) ·
> **Decision**: D-024 · **Spec**: mockup `05-final-spec.html` (`fieldset.fs`, `legend`,
> `.band-name`, `.meta`) · **Worked example**: 2b_FE_01 · **Model**: Sonnet 5.5

## Objective

`<vb-region>` is an open frame in its own colour, with its title and decided count on the top
line, on the dot-grid canvas, as in mockup 05. The five layout buttons stay as text buttons on
the right of the top line; Stage 2d replaces them with the icon row and cog.

## Inputs

- **Modify**: `packages/ui/src/region/{region-template.ts,region.css,pattern.json}`,
  `packages/ui/tests/region-*.test.ts`, `packages/layout/src/types.ts` (`REGION_HEAD`),
  `tests/pages/` baselines
- **Reuse**: tokens only; the frame colour comes from `--region` (default
  `var(--vb-line-strong)` mixed toward the region colour as in `.fs`)

## Steps

1. [ ] Frame: no fill, a 1.5px border mixed from `--region` and `--vb-line`, large radius. The
   title (mono, uppercase, letter-spaced) and count sit in a gap in the top border on the left;
   the layout buttons and Reset places sit in a gap on the right. The gap uses the canvas colour.
2. [ ] The region colour: every region uses the neutral default for now. Leave a `--region`
   hook the element sets (from the default only) so a later region colour is one property.
3. [ ] `REGION_HEAD` becomes the height the top line takes inside the frame; it stays one
   constant in `layout`, and the frame's CSS padding reads the same number from a comment, not
   a second constant. Layout tests must stay green; update a test only if it hard-codes 40, and
   say so.
4. [ ] Lane bands keep drawing inside the frame; check every mode in the gallery and the board.
5. [ ] View and update the baselines; list the paths.

## Validation

- [ ] All four gates exit 0
- [ ] Gallery and board in dark and light match 05's frames by eye; no card overlaps a frame's
  top line in any mode

## Constraints

As 2b_FE_01. No commits. Deviation: stop and report.

## Implementation Notes

**Status**: Not started (runs after 2b_FE_01)
