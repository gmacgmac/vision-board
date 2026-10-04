# 2a_FE_01_vb-node: The card becomes `<vb-node>`

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Stage 2a) ·
> **Pattern**: `docs/specification/components.md` (read it first, all of it) · **Model**: Opus 5.5

## Objective

The card is a plain web component, `<vb-node>`, built the way the component pattern says. It is
the first element in the repo, so it sets the shape every later element copies. The board looks
and behaves exactly as before.

## Context

Today `apps/board/src/board/render.ts` builds `div.vb-item` cards (`buildCards`, `updateCard`)
from `itemTemplate` (`packages/ui/src/item/`), and the styles live in the app
(`apps/board/src/styles/item.css`). After 2a_BE_01, types come from `NODE_TYPES`. Stage 2b will
change the template and CSS to the locked design (mockups 01b and 05), so keep the template the
one place markup is built. Research: `temp/research/stage-2a-brief.md` §§ 1, 5, 6.

## Inputs

- **Move with `git mv`** (keeps history): `packages/ui/src/item/` → `packages/ui/src/node/`;
  `item-core.ts` → `node-core.ts`, `item-template.ts` → `node-template.ts`,
  `apps/board/src/styles/item.css` → `packages/ui/src/node/node.css`,
  `packages/ui/tests/item-core.test.ts` → `packages/ui/tests/node-core.test.ts`
- **Create**: `packages/ui/src/node/vb-node.ts`, `packages/ui/src/elements.ts`,
  `packages/ui/tests/node-template.test.ts`
- **Modify**: `packages/ui/src/index.ts`, `packages/ui/src/node/pattern.json`,
  `apps/board/src/board/{render,controller,pointer,keys}.ts`, `apps/board/src/main.ts`,
  root `tsconfig.json` (`lib`), `packages/ui/README.md`, `apps/board/README.md`,
  `docs/specification/modules.md` (`npm run map`)

## Steps

1. [ ] **Before screenshots.** Start `npm run dev` from a clean `temp/demo` (delete it first) on
   Node 22.23.1, and capture the roadmap board in dark and light, plus one card focused and one
   acknowledged, with a probe script under `temp/`. Keep them for step 9.
2. [ ] Moves above. Rename classes `vb-item-*` → `vb-node-*` everywhere (template, CSS, page);
   keep `vb-act`, `data-act`, `data-id`, `data-kind`, `data-status`, `data-pinned`,
   `data-emphasis`. `itemTemplate` → `nodeTemplate`, `itemLabel` → `nodeLabel`.
3. [ ] `node-core.ts`: add `interface NodeState { status; pinned; label; statusWord; noteLine?;
   pressed: Partial<Record<ActionId, boolean>> }` and `nodeState(n: ViewNode, s: BoardState):
   NodeState`, holding every rule now in `updateCard` (status word only for items not open; the
   note line with "N notes · " and "Asked for context" / "You"). Pure, no DOM.
4. [ ] `vb-node.ts`: `defineVbNode()` creates `class VbNode extends HTMLElement` inside the
   function and defines `vb-node` once (a second call is a no-op). `render(n: ViewNode)` sets
   `data-*`, `role="listitem"`, `tabIndex = 0`, `--kind` through
   `style.setProperty('--kind', \`var(--vb-kind-${n.kind})\`)`, and `innerHTML =
   nodeTemplate(n)`. `update(st: NodeState)` changes only attributes and text. Export a type
   `VbNodeElement` for the page. Under 100 lines.
5. [ ] `elements.ts`: `defineBoardElements()` calls `defineVbNode()`. Export it, `VbNodeElement`,
   `nodeState` and `NodeState` from the ui front door.
6. [ ] `node.css`: selectors on the tag (`vb-node`, `vb-node .vb-node-title`); `display: flex`
   stays. Delete the five colour-only `[data-kind]` rules (the element sets `--kind`); keep the
   topic and note surface rules and the radial-topic rule (2b redoes them). Header says it is the
   node pattern's styles.
7. [ ] Page: `buildCards` creates `vb-node` and calls `render`; `updateCard` calls
   `update(nodeState(n, s))`; `closest('.vb-item')` → `closest('vb-node')` in controller, pointer
   and keys. `main.ts` imports `node.css` from the package and calls `defineBoardElements()`
   before `mount`. Measuring and placing stay in the page.
8. [ ] Root `tsconfig.json`: `"lib": ["ES2023", "DOM", "DOM.Iterable"]`, with a comment pointing
   at components.md § Type checking. `pattern.json`: name `node`, tag `vb-node`, the
   `update(NodeState)` contract under `events`/attributes as fits. READMEs say the element exists.
9. [ ] Tests: `node-core.test.ts` covers `nodeState` for every status, pinned, zero, one and
   three notes, and a context note; `node-template.test.ts` covers escaping, the number only on
   items, and buttons matching `offers`. **After screenshots** as in step 1: they must match the
   before ones. Click ok, drop and comment, move a card, switch a layout, reload: all survive.
   Tab moves card to card, and the console has no errors.

## Validation

- [ ] `npm test`, `npm run check`, `npm run verify` exit 0 each (read the exit codes)
- [ ] `grep -rn "vb-item\|itemTemplate\|itemLabel" apps/board/src packages` finds nothing
- [ ] Before and after screenshots match; list them in the notes with their paths
- [ ] Every new file under 300 lines; no inline `style=` or `<style>` in any template

## Constraints

Look and behaviour unchanged. No shadow DOM. `packages/ui` imports only `format`, `actions`,
`tokens` (never `layout`). No new dependency. No edits to tokens, steering, decisions or
principles. Probe scripts and screenshots go in `temp/`. No commits. Deviation: stop and report.

## Implementation Notes

**Status**: Not started
