# 2a_BE_01_node-type-registry: One registry of node types

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Stage 2a) ·
> **Pattern**: `docs/specification/components.md` § The node-type registry · **Model**: Sonnet 5.5

## Objective

Every fact about a node type lives in one registry in `packages/format`, and the action layer,
the keyboard and the buttons all obey it (D-015, rules 1 and 8).

## Context

Today the kind list or per-kind behaviour is defined in nine places (research brief
`temp/research/stage-2a-brief.md` § 3). The actions a kind offers (`OFFERS` in
`packages/ui/src/item/item-core.ts`) are enforced only by the buttons: the server's `validateAct`
(`packages/actions/src/act.ts`) and the keyboard (`BY_KEY` in `apps/board/src/board/keys.ts`)
don't check them, so pressing X on a finding sends a `drop` the server accepts. Look and
behaviour otherwise stay the same.

## Inputs

- **Create**: `packages/format/src/node-types.ts`, `packages/format/tests/node-types.test.ts`,
  `packages/ui/tests/item-core.test.ts`
- **Modify**: `packages/format/src/index.ts`, `packages/ui/src/item/item-core.ts`,
  `packages/ui/src/item/item-template.ts` (its `KIND_LABEL` use),
  `packages/actions/src/act.ts`, `packages/actions/tests/actions.test.ts`,
  `apps/board/src/board/controller.ts` (`act`, and the `KIND_LABEL` use),
  `packages/ui/src/item/pattern.json` (`attributes.data-kind`), `docs/specification/modules.md`
  (regenerate with `npm run map`)
- **Reuse**: `KINDS`, `Kind` (`view.ts`), `ActionId` (`ledger.ts`), `ITEM_ACTIONS` (actions)

## Steps

1. [ ] **Failing tests first** (rule 13), in `packages/actions/tests/actions.test.ts`: `validateAct`
   refuses `drop` on a numbered finding with the problem `drop: a finding doesn't offer this`, and
   refuses any review action on a numbered topic or note. `reopen`, `pin`, `unpin` and `mode` are
   not review actions and are not restricted by type. Run them and see them fail.
2. [ ] `node-types.ts`: `interface NodeType { readonly label: string; readonly actions: readonly
   ActionId[] }` and `NODE_TYPES: Readonly<Record<Kind, NodeType>>`, with exactly today's values:
   labels from `KIND_LABEL`; question, decision, risk, action offer ack, drop, comment, context,
   later; finding offers ack, comment, context, later; topic and note offer none. Header comment
   points at `docs/specification/components.md`. Export it from the format front door.
3. [ ] `validateAct`: for an action in `ITEM_ACTIONS` on a numbered item, add the problem above
   when `NODE_TYPES[latest(node).kind].actions` doesn't include it.
4. [ ] `item-core.ts`: delete `KIND_LABEL`, `REVIEW` and `OFFERS`; `offers(n)` and `itemLabel`
   read `NODE_TYPES`. Keep `STATUS_LABEL`, `isItem`, `isPressed`, `buttonLabel` as they are.
5. [ ] `controller.ts`: replace `KIND_LABEL[n.kind]` with `NODE_TYPES[n.kind].label`; in `act`,
   return before sending when the action is in `ITEM_ACTIONS` and not in `offers(n)`, so the
   keyboard can't send what the card doesn't offer.
6. [ ] `pattern.json`: `data-kind` becomes `"one of KINDS; see NODE_TYPES in
   packages/format/src/node-types.ts"`.
7. [ ] Tests: `node-types.test.ts` checks every entry of `KINDS` has a type with a non-empty label
   and that every listed action is in `ITEM_ACTIONS`; `item-core.test.ts` checks `offers` for a
   numbered finding, a numbered question and an unnumbered topic, and `itemLabel` text.
8. [ ] `npm run map`.

## Validation

- [ ] `npm test`, `npm run check`, `npm run verify` exit 0 each (read the exit codes)
- [ ] `grep -rn "KIND_LABEL\|OFFERS\|REVIEW" apps packages --include=*.ts` finds nothing
- [ ] No existing test changed except the additions in `actions.test.ts`

## Constraints

No visual change. No new dependency. Don't touch CSS, `skills/`, tokens or protected files. No
commits. A deviation from these steps: stop and report.

## Implementation Notes

**Status**: Not started
