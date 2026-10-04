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

1. [x] **Before screenshots.** Start `npm run dev` from a clean `temp/demo` (delete it first) on
   Node 22.23.1, and capture the roadmap board in dark and light, plus one card focused and one
   acknowledged, with a probe script under `temp/`. Keep them for step 9.
2. [x] Moves above. Rename classes `vb-item-*` → `vb-node-*` everywhere (template, CSS, page);
   keep `vb-act`, `data-act`, `data-id`, `data-kind`, `data-status`, `data-pinned`,
   `data-emphasis`. `itemTemplate` → `nodeTemplate`, `itemLabel` → `nodeLabel`.
3. [x] `node-core.ts`: add `interface NodeState { status; pinned; label; statusWord; noteLine?;
   pressed: Partial<Record<ActionId, boolean>> }` and `nodeState(n: ViewNode, s: BoardState):
   NodeState`, holding every rule now in `updateCard` (status word only for items not open; the
   note line with "N notes · " and "Asked for context" / "You"). Pure, no DOM.
4. [x] `vb-node.ts`: `defineVbNode()` creates `class VbNode extends HTMLElement` inside the
   function and defines `vb-node` once (a second call is a no-op). `render(n: ViewNode)` sets
   `data-*`, `role="listitem"`, `tabIndex = 0`, `--kind` through
   `style.setProperty('--kind', \`var(--vb-kind-${n.kind})\`)`, and `innerHTML =
   nodeTemplate(n)`. `update(st: NodeState)` changes only attributes and text. Export a type
   `VbNodeElement` for the page. Under 100 lines.
5. [x] `elements.ts`: `defineBoardElements()` calls `defineVbNode()`. Export it, `VbNodeElement`,
   `nodeState` and `NodeState` from the ui front door.
6. [x] `node.css`: selectors on the tag (`vb-node`, `vb-node .vb-node-title`); `display: flex`
   stays. Delete the five colour-only `[data-kind]` rules (the element sets `--kind`); keep the
   topic and note surface rules and the radial-topic rule (2b redoes them). Header says it is the
   node pattern's styles.
7. [x] Page: `buildCards` creates `vb-node` and calls `render`; `updateCard` calls
   `update(nodeState(n, s))`; `closest('.vb-item')` → `closest('vb-node')` in controller, pointer
   and keys. `main.ts` imports `node.css` from the package and calls `defineBoardElements()`
   before `mount`. Measuring and placing stay in the page.
8. [x] Root `tsconfig.json`: `"lib": ["ES2023", "DOM", "DOM.Iterable"]`, with a comment pointing
   at components.md § Type checking. `pattern.json`: name `node`, tag `vb-node`, the
   `update(NodeState)` contract under `events`/attributes as fits. READMEs say the element exists.
9. [x] Tests: `node-core.test.ts` covers `nodeState` for every status, pinned, zero, one and
   three notes, and a context note; `node-template.test.ts` covers escaping, the number only on
   items, and buttons matching `offers`. **After screenshots** as in step 1: they must match the
   before ones. Click ok, drop and comment, move a card, switch a layout, reload: all survive.
   Tab moves card to card, and the console has no errors.

## Validation

- [x] `npm test`, `npm run check`, `npm run verify` exit 0 each (read the exit codes)
- [x] `grep -rn "vb-item\|itemTemplate\|itemLabel" apps/board/src packages` finds nothing
- [x] Before and after screenshots match; list them in the notes with their paths
- [x] Every new file under 300 lines; no inline `style=` or `<style>` in any template

## Constraints

Look and behaviour unchanged. No shadow DOM. `packages/ui` imports only `format`, `actions`,
`tokens` (never `layout`). No new dependency. No edits to tokens, steering, decisions or
principles. Probe scripts and screenshots go in `temp/`. No commits. Deviation: stop and report.

## Implementation Notes

**Status**: Completed 2026-10-04 (not committed; the orchestrator verifies and commits).

**Moves** (`git mv`, history kept): `packages/ui/src/item/` → `packages/ui/src/node/`;
`item-core.ts` → `node-core.ts`; `item-template.ts` → `node-template.ts`;
`apps/board/src/styles/item.css` → `packages/ui/src/node/node.css`;
`packages/ui/tests/item-core.test.ts` → `packages/ui/tests/node-core.test.ts`.

**Files and symbols**
- `packages/ui/src/node/node-core.ts`: `itemLabel` → `nodeLabel`; new `interface NodeState`
  (`status`, `pinned`, `label`, `statusWord`, `noteLine?`, `pressed`) and `nodeState(n, s)`,
  holding every rule that was in `updateCard`. Kept `STATUS_LABEL`, `isItem`, `offers`,
  `isPressed`, `buttonLabel`.
- `packages/ui/src/node/node-template.ts`: `itemTemplate` → `nodeTemplate`; classes
  `vb-item-*` → `vb-node-*`. Markup otherwise unchanged.
- `packages/ui/src/node/vb-node.ts` (new, 54 lines): `VB_NODE_TAG`, `interface VbNodeElement`
  (`render`, `update`), `defineVbNode()` (class `VbNode` made inside the function; a second call
  returns early). `render` sets `data-id`, `data-kind`, `data-emphasis`, `role`, `tabIndex`,
  `--kind` (CSSOM) and `innerHTML`. `update` sets `data-status`, `aria-label`, `data-pinned`,
  `aria-pressed`, the status word and the note line.
- `packages/ui/src/elements.ts` (new): `defineBoardElements()`.
- `packages/ui/src/index.ts`: exports node core, node template, `type VbNodeElement`,
  `defineBoardElements`.
- `packages/ui/src/node/node.css`: selectors on the tag (`vb-node`, `vb-node .vb-node-*`,
  `vb-node .vb-act`). The five colour-only `[data-kind]` rules are gone, and `--kind` is gone from
  the topic and note rules (the element sets it). Kept the topic and note surface rules and the
  radial-topic rule. New header comment.
- `packages/ui/src/node/pattern.json`: name `node`, tag `vb-node`, `files`, full attribute list,
  `methods` (`render(ViewNode)`, `update(NodeState)`).
- `apps/board/src/board/render.ts`: `buildCards` creates `vb-node` and calls `render`, returning
  `Map<string, VbNodeElement>`. `updateCard` is `el.update(nodeState(n, s))`. Removed the unused
  imports `itemTemplate`, `isPressed`, `itemLabel`, `STATUS_LABEL` and `ActionId`.
- `apps/board/src/board/controller.ts`: `S.cards` is `Map<string, VbNodeElement>`;
  `closest('.vb-item')` → `closest('vb-node')` (3 places). `pointer.ts` and `keys.ts`: the same
  selector change (1 place each).
- `apps/board/src/main.ts`: imports `packages/ui/src/node/node.css` and calls
  `defineBoardElements()` before `mount`.
- Root `tsconfig.json`: `"lib": ["ES2023", "DOM", "DOM.Iterable"]`, with a comment pointing at
  components.md § Type checking.
- `packages/ui/README.md` and `apps/board/README.md` now say the element exists.
  `docs/specification/modules.md` was regenerated with `npm run map`.
- Tests: `packages/ui/tests/node-core.test.ts` has the 4 existing tests (with `itemLabel` renamed
  to `nodeLabel`) and 8 new `nodeState` tests (every status, no response, offered-only pressed,
  non-item, pinned, one note, three notes, context note). `packages/ui/tests/node-template.test.ts`
  (new) has 5 tests: `esc`, escaping of title/body/tags, the number only on items, buttons equal
  to `offers` for every kind (item and non-item), and no inline style.

**Gates** (exit codes): `npm test` 0 (82 → 95 tests), `npm run check` 0, `npm run verify` 0
(1 warning; see below). `grep -rn "vb-item\|itemTemplate\|itemLabel" apps/board/src packages`
finds nothing. Every new file is under 300 lines. The templates have no `style=` or `<style>`
(a test checks this).

**Screenshots** (probe `temp/probe-2a.mjs`, Playwright at 1440×900, a clean `temp/demo` for each
run): `temp/shots/2a-fe01-before/{1-dark,2-light,3-focused,4-acknowledged}.png` and
`temp/shots/2a-fe01-after/` (same names). Compared pixel by pixel with Pillow: all four pairs
are identical (0 differing pixels). The same probe ran this behaviour pass before and after,
14/14 ok both times, with no console errors or page errors: A acknowledges, the drop button,
comment (dialog, note line "You: …"), drag pins, the layout switches to list, Tab reaches the
next card, and after a reload the ack, drop, comment, pin and layout are all still there.

**Findings not acted on**
1. Port 4466 was already held by an earlier `node apps/board/server.ts` (started 13:59, not
   started by this task), so both runs used `VB_PORT=4467` with the same `npm run dev` command.
   That server also points at `temp/demo`, which this task deleted and re-seeded. It was left
   running.
2. `npm run verify` warns that `apps/board/src/board/controller.ts` is 344 lines (it was 343
   before this task; this task added one import line). It needs a split before it grows further.
3. `HTMLElement` already has a `part` property, so a private helper of that name on the element
   fails type checking. The helper is called `piece`. Later elements should avoid `part`, `slot`
   and other built-in names.
4. Scoping the styles by the tag changed selector specificity from one class (0,1,0) to tag plus
   class (0,1,1). The order between the pattern's own rules is unchanged, and the screenshots
   are identical, but page CSS that targets inside cards will now need tag-level specificity.
