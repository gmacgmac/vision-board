# Code map (survey of 2026-11-16)

> A read-only survey of this branch, made by a Sonnet 5.5 agent while the set was planned. It is a map, not a spec:
> check a path or symbol against the code before relying on it. Paths are from the repo root.

## 1. Node pattern (`packages/ui/src/node/`)

Files, one line each:
- `pattern.json`: the pattern's spec, with the parts, attributes, events and flagged states. It is the best single index of the card.
- `node-core.ts`: pure state.
  - Exports `nodeState`, `NodeState`, `nodeLabel`, `offers`, `isPressed`, `isItem`, `asksAnswer`, `buttonLabel`, `proposalsView`, `changeTab`, `handoverView`, `AWAITING`, `SIZE_LETTER`, `sizeLabel`, `STATUS_LABEL` and `STATUS_NAME`.
  - Also holds `FLAG_KEY = 'Shift+F'` and `flagLabel`.
  - Re-exports `node-notes.ts`.
- `node-template.ts`: `nodeTemplate(n, opts)`, the only place the markup is built. Also `notesMarkup`, `stepMarkup`, `proposalsMarkup`, `handoverMarkup`, `appStateMarkup`, `popoverId`, `stepsId`, `appMenuId` and `esc`.
- `node-icons.ts`: icon paths (see below).
- `vb-node.ts`: `defineVbNode`, `VbNodeElement` (light DOM). Methods `render()` and `update()`; the card popovers are bound there with `bindCardPopover`.
- `node-notes.ts`: `notesView`, `conversation`, `replyEntry` (notes and replies, hidden or shown; no DOM).
- `node-time.ts`: `noteTime`, `versionTime`, `fullTime`.
- `node-updates.ts`: `updatesView` (the "N updates" tab and stepper).
- `node-app.ts`: `appView`, `APP_CARD_STATES`, `APPS_OFF`.
- `node-app-apply.ts`: `applyApp`, `applyPanelSize`, `bindAppNameTip` (browser only).
- `node-note-tip.ts`: `bindNoteTip`, the full-text tip on a cut note.
- `node-popover.ts`: `bindCardPopover(card, name, tabSel)`, `POPOVER_SHOW`, `POPOVER_CLOSE`, `POPOVER_OPEN`, `POPOVER_HIDE`.
- `node-history.ts`: `HISTORY`, `HISTORY_TAB`, `historyButton`, `historyBox`, `historyMarkup`, `historyRowMarkup`.

CSS files:
- `node.css`: core card, tabs, footer, buttons, size control, and the zoom-far rules.
- `node-popover.css`: bottom-edge tabs, card popover box, proposals.
- `node-steps.css`: "N updates" tab, step section, stepper.
- `node-parking.css`: Awaiting tip, handover box, reply edge.
- `node-notes.css`: note head, toggle, time chip.
- `node-app.css`: app-card slot, state views, app status and name.

Main classes: `vb-node` (the tag itself is the selector), `vb-node-num`, `vb-node-kind`, `vb-node-pin`, `vb-size*`, `vb-node-content`, `vb-node-title`, `vb-node-body`, `vb-node-tags`, `vb-node-steps`, `vb-node-notes`, `vb-node-note`, `vb-node-reply`, `vb-node-foot`, `vb-node-state`, `vb-node-kico`, `vb-node-sep`, `vb-node-status`, `vb-node-actions`, `vb-act`, `vb-note-pin`, `vb-node-btabs`, `vb-node-btab`, `vb-card-pop`.

Where each part is built, all in `node-template.ts`:
- **Footer:** `footer(n, opts)` builds `<footer class="vb-node-foot">`: the kind icon, the separator, the status word, then the actions toolbar, then the history button, then `STEP_NAV`. It is built for items (cards with a number) and for app cards. Non-items get none.
- **Number tab:** `tabs(n)` builds `<span class="vb-node-num">${n.n}</span>`, items only.
- **Kind tab:** `tabs(n)` builds `<span class="vb-node-kind">${NODE_TYPES[n.kind].label}</span>`.
  - It is the drag handle: `apps/board/src/board/input/pointer.ts:56` has `const HANDLE = '.vb-node-kind'`.
  - The "moved by you" marker is `vb-node-pin` (a ◆).
- **Note pin:** `tabs(n)` also builds `<button class="vb-note-pin" ... hidden>`, items only; `update()` shows it and sets the latest note number.
- **Note count:** `notesHead(v)` builds `.vb-node-notes-head`, `.vb-node-notes-count` and the `.vb-node-notes-toggle` (Hide/Show, `data-notes`).
- **Note hover tip:** the `vb-tip vb-note-tip` inside each note in `notesMarkup`, bound by `bindNoteTip`.
- **Later and the review buttons:** `button(a, n)` builds `<button class="vb-act" data-act="${a}">` for each action in `offers(n)`, which is `NODE_TYPES[kind].actions`. Icons come from `ACTION_ICON`.
- **Flag button:** `flagButton(n)` builds `class="vb-act vb-flag" data-flag`, only when `opts.flag` is set (the `cardFlag` flag) and the card is an item. It is last in the toolbar.
- **History "i":** `historyButton` from `node-history.ts`, class `vb-act vb-history`, shown when `opts.history` is set (the `cardHistory` flag). `historyBox` follows the footer.
- **Size control:** `sizeControl(n)` builds `.vb-size` with `.vb-size-trig` and `.vb-size-menu`.
  - Buttons are `data-size-pick="s|m|l|auto"`.
  - Drawn when `opts.sizeControl` is set (the `nodeSize` flag) and the card is not an app.
- **Bottom tabs:** `bottomTabs(n, prefix)` builds `.vb-node-btabs`, with `.vb-node-btab` and `data-tab` set to:
  - `proposal`
  - `handover`
  - `updates` (the "N updates" button)
  - `new` (a `<span>` labelled "NEW", not a button)
- **Popover boxes:** `.vb-card-pop` (`data-pop`) for proposal and handover.
- **Stepper:** `STEP_NAV` (`.vb-node-stepnav`, Back and Next buttons).
- **Step section:** `.vb-node-steps`, built in `nodeTemplate`.
- With the `oneChangeTab` flag the proposal tab also stands for updates (`data-updated`). `placeSteps` in `vb-node.ts` moves the steps into the proposal box.

`node-icons.ts` exports `KIND_ICON` (`Record<Kind, string>`), `ACTION_ICON` (`Partial<Record<ActionId, string>>`: ack, drop, comment, context, later), `FLAG_ICON`, `INFO_ICON`, `SIZE_ICON` and `svgIcon(paths, box, cls)`.
- Icons are inline SVG path strings keyed by kind or action, not by name at runtime. `svgIcon` wraps them: `<svg class=... viewBox="0 0 ${box} ${box}" aria-hidden="true">`.
- Kind icons are 24 box; action, flag and info icons are 20 box.
- The comment says: "Records keyed by Kind, so the compiler fails when a kind is added without its icon."
- `packages/ui/src/region/region-icons.ts` has the same style for modes (`MODE_ICON`, `WIDTHS_ICON`, `COG_ICON`, `EYE_ICON`, `RETIRED_ICON`).

## 2. Actions and kinds (`packages/format/src/`, plus `packages/actions/src/`)

`ActionId` is defined in `packages/format/src/ledger.ts`. `ACTION_IDS` has 29 values:
`'ack','drop','comment','context','later','reopen','pin','unpin','mode','grant','deny','revoke','size','send','note-edit','note-remove','move','reject','flag','unflag','notes-hide','notes-show','widths','archive','restore','lock','unlock','app-allow','app-revoke'`.

Related constants in `ledger.ts`:
- `CARD_MARKS` (flag, unflag, notes-hide, notes-show)
- `BOARD_MARKS` (archive, restore, lock, unlock)
- `PRIVATE_ACTIONS` (both sets combined)
- `APP_ACTIONS`
- `CONTAINER_ACTIONS`
- `CONTAINER_PLACES`
- `LEDGER_FORMAT = 19`

Registry: `packages/actions/src/registry.ts`.
- `ACTIONS: Record<ActionId, ActionDef>` with `id`, `label`, `key`, `by`, `needsConfirmation`, `onItem`, `text`, `status`, `reply`.
- Keys: `ack`=a, `drop`=x, `comment`=c, `later`=l, `reopen`=o.
- `decision` (confirmed): ack, drop, later, grant, deny, revoke, archive, app-allow, app-revoke.

How each is recorded: `ActEvent` in `ledger.ts`, shape `{ type:'act'; action; id?; ver?; text?; proposal?; x?; y?; board?; region?; mode?; widths?; request?; holder?; size?; note?; kind?; nodes?; app?; hash?; head? }`, plus the `Base` stamp `{v, seq, at, by, agent?, person?}`.
- `ack`, `drop`, `later` and `reopen`: act on card `id`, `ver`. `ack` and `drop` with `proposal` accept an agent proposal.
- `comment`: act with `text` (required). It names `id`, or `nodes` for a group note, or `board`+`region` for a container.
- `ack` and `drop` map to `check` and `cross` at the agent edge (`ACTION_OUT` in `registry.ts`; status `STATUS_OUT`).
- `flag` and `unflag`: private marks. The act names the card by `id` and nothing else, and no agent reads them. The fold is `packages/actions/src/card-flags.ts` (`flagsOn`). In `BoardState` they are `flags: Set<string>`.
- `drop` is ✗. There is no separate "dismiss" action.
- `later` is also written with `move` into the built-in container `LATER_REGION = 'later'`. See `moves.status` in `apps/board/src/board/cards/item-acts.ts`.

Kinds and node types:
- `NODE_TYPES` is in `packages/format/src/node-types.ts`: `Record<Kind, {label, answer, actions}>`.
  - Ask (`answer: true`, actions `ANSWER_ACTIONS` = ack, drop, comment, later): question, decision, action.
  - Tell (`NOTE_ACTIONS` = comment, later): finding, risk, topic, note, app.
- `KINDS` in `packages/format/src/view.ts`: `['question','finding','decision','risk','action','topic','note','app']`.
- `MODES` in `view.ts`: `['grid','flow','lanes','radial','column','row']`.
  - `RENAMED_MODES = { list: 'column' }`.
  - `WIDTHS = ['match','own']`, with `DEFAULT_WIDTHS` and `widthsOf`.

`ViewNode` (`view.ts`), all fields:
```
id: string; region: string; kind: Kind; title: string; body?: string;
n?: number; lane?: string; tags?: string[]; emphasis?: boolean;
size?: NodeSize; app?: AppRef
```
- `AppRef` (`apps.ts`) is `{ id: string; w?: number; h?: number }`.
- There is no icon, image, colour or skin field on `ViewNode`.
- Images are Markdown in the body (the `cardImages` flag).
- The card's size is `size?: NodeSize` (`'s'|'m'|'l'`), the agent's suggestion. The person's `size` act wins (`ACT_SIZES` adds `'auto'`).
- The ledger-side `NodeBody` adds `item?` (legacy, ignored). `NODE_SIZES` is in `ledger.ts`.

Container (`Region`, `view.ts`): `id, title, mode, lanes?, center?, columns?, widths?`. `LedgerRegion` is the same with `center` as a number.

Board-level settings in the ledger:
- `BoardEvent` is `{ type:'board'; board; title; summary? }` only. The person can write one via `put_board` (`PERSON_TOO` board: 9).
- No per-board options or preferences record exists.
- Existing per-board person state: the acts `archive`, `restore`, `lock`, `unlock` (each names `board` only, listed in `BOARD_MARKS`).
- A page-side per-board store exists for zoom: the `keepView` flag, key `vb.view.<board>` in sessionStorage or the host's `store.get`/`store.set` (`docs/specification/plugin.md:82`).
- The only precedent for a per-board preference inside the ledger is that `BOARD_MARKS` pattern (a new private act).
- "skin" per board appears nowhere in the code or in the specs I searched.

`packages/format/src/flags.ts`: `FLAGS = { name: { default: boolean } } as const satisfies Record<string, FlagDef>`.
- Also `FlagName`, `flagOn(name, overrides)` (throws on an unknown name), `parseFlags`, `isFlag`, `HOST_FLAGS`, `withoutHostFlags`, `FLAG_DESCRIPTIONS` (one string per flag, at the end of the file).
- Default off: `goAfterPause`, `answeredLaterChips`, `singleAgent`. All others default true, including the two spike flags `cardDetails` and `appStage`.
- The page builds overrides from `?flags=` and localStorage `vb.flags` (`apps/board/src/flags.ts`).

## 3. Contract sources

The single source is `packages/format/schema/openapi.json`, which references the JSON Schemas by `$id`: `common.schema.json`, `events/*.schema.json`, `ledger-event.schema.json`, `api/*.schema.json`. The chat package's `schema/` is a second schema dir. The vendored OAS 3.2 meta-schema is in `schema/vendor/`.

Generator: `scripts/gen-api.mjs` (`npm run gen`; `--check` exits 1 if a file would change). It writes:
- `packages/format/src/operations.generated.ts` (route table, via `gen-contract.mjs`)
- `packages/format/src/api-types.generated.ts` (via `gen-types.mjs`)
- `packages/cli/src/commands.generated.ts`
- `packages/format/src/tools.generated.json` (via `gen-tools.mjs`: `toolTable`, `renderToolTable`, `x-hosts`)
- `packages/mcp/src/tools.generated.json` (via `gen-mcp.mjs`, `renderTools`)
- `docs/specification/api-reference.md` (via `gen-reference.mjs`)

`gen-tools.mjs` also exists as a separate script: `scripts/gen-tools.mjs`. The helper files are `openapi-refs.mjs`, `schema-shape.mjs`, `schema-descriptions.mjs`, `mcp-schema.mjs`.

Docs:
- `docs/specification/api.md` is the contract narrative. Its "One source" section says: "The OpenAPI spec is the only place an operation is defined".
- `docs/specification/api-reference.md` is generated.
- Other specs: `chat.md`, `apps.md`, `plugin.md`.

Tests holding code to the contract:
- `scripts/gen-api.test.mjs`: "`packages/cli/src/commands.generated.ts` is current", "`docs/specification/api-reference.md` is current".
- `scripts/gen-contract.test.mjs`, `scripts/gen-tools.test.mjs`, `scripts/gen-mcp.test.mjs`, `scripts/gen-types.test.mjs`.
- `apps/board/tests/openapi.test.ts`, `schema.test.ts` (it checks that `ACTION_IDS`, `EVENT_TYPES`, `KINDS` and `MODES` match the schema enums), `schema-apps.test.ts`, `schema-v18.test.ts`, `schema-v19.test.ts`, `chat-schema.test.ts`, `api-schemas.test.ts`, `contract-walk.ts`, `openapi-ajv.ts`, `schema-cases.ts`.
- `packages/mcp/tests/tools.test.ts`.
- `packages/format/tests/records.test.ts`, `node-types.test.ts`, `flags.test.ts`.

## 4. Action layer (`packages/actions/`)

Entry points:
- **Person's click:** the page builds an `ActFields` body (`apps/board/src/board/io/acts.ts`) and sends it through `sender.ts` and `io.ts`. The operation `act` is `POST /api/boards/{board}/act` (cookie auth). Item buttons go through `createItemActs` in `apps/board/src/board/cards/item-acts.ts`.
- **Agent:** `write_board` (`POST /api/boards/{board}/write`), plus `request_grant`. Agents never write an `act`.
- **Both:** `apps/board/server/ledger.ts` `check()`. It runs the schema, then the hand-written shape rules, then `writeProblem`, then `validateAct` (an act's action rules), then `contextProblems`. The server stamps `by` from the caller (`apps/board/server/callers.ts`, `{ by:'person' }` vs `{ by:'agent'; agent }`).
- The page also calls `validateAct`-style checks before sending: the comment in `packages/actions/src/act.ts` says "The server runs it before appending; the page before sending."

Adding a new person action:
1. Add the id to `ACTION_IDS` in `packages/format/src/ledger.ts`, and add its schema in `schema/events/act.schema.json` (the schema is the source, per api.md).
2. Add an `ActionDef` row to `ACTIONS` in `registry.ts`. It is a `Record<ActionId,…>`, so the compiler demands one.
3. Add any per-action rule to `RULES` or a rule function in `packages/actions/src/act.ts`.
4. Add a fold case in `packages/actions/src/fold.ts` `applyEvent`.
5. If it should be private, add it to `CARD_MARKS` or `BOARD_MARKS` in `ledger.ts`.
6. Add its words (`packages/actions/src/words/actions-registry.ts`) and a button or key (item buttons are a `NODE_TYPES` action list; commands are `apps/board/src/board/input/commands.ts`).
7. Run `npm run gen`.
- Related check: `NAMES_BOARD` and `CONTAINER_ACTS` in `apps/board/src/board/io/acts.ts` decide which acts name their board.

Where "✓ and ✗ are the person's only" is enforced:
- `validateAct` in `packages/actions/src/act.ts`: `if (e.by !== 'person' || def.by !== 'person') return [actionsRefusalsWords.onlyThePersonCanDo(e.action)]`.
- Schema-level: `AGENT_EVENTS`/`PERSON_EVENTS` and `ledger-shape.ts` lines 283-284, so an `act` is never an agent event.
- Route-level: `ledger.ts` `wrongCaller` ("only the person can do this"), plus person-cookie vs agent-secret auth.
- `ACTIONS.<id>.needsConfirmation` for the confirmed decisions (the page asks first; `app-cards.ts:271`).
- Statement of the rule: `.kiro/steering/vision-board-proj.md:79` ("✓, ✗ and approving are the person's clicks, never an agent's") and `skills/vision-board/SKILL.md:310-312`.
- The agent's own items are `AGENT_ACTIONS`: reply, propose, park, request_grant.

## 5. Seen state

Storage: a person-only ledger event `SeenEvent` (`ledger.ts`): `{type:'seen', id, ver}` for a card, or `{board, head}` for a whole board. The API operation is `mark_seen` (`POST /api/boards/{board}/seen`).

Fold (`packages/actions/src/fold.ts`):
- `LedgerState.seen` is a map from card id to the latest seen version. `LedgerState.looked` is a map from card id to the `seq` of the latest look.
- The helper `look(s, id, ver, seq)` raises `seen` and never lowers it. It is called from `seeCards`, because any person act naming cards except `send` or a container act counts as seeing them (`api.md` 94).
- Board seen: `heads`, and `LedgerState` fields holding the first board seen. `rounds.ts` has `newFrom`.

Deciding NEW or updated: the conditions table in `packages/actions/src/conditions.ts`.
- `item.new`: `!s.seen.has(x.id) && !decided && drawnAfterOpening(s, board, seq)`. Cleared by `['select','act']`, or by a decision on it.
- `item.unseen`: `latest(x).ver > (s.seen.get(x.id) ?? 0) || unseenAnswer(s, x.id) || unseenReply(s, x.id)` (`clears.ts`).
- `container.fresh`: `fresh.ts` `freshOf`, `freshContainers`, `showsUpdates`. The page tab shows only when `ver > max(seen,1)`.
- `answers/updates.ts`: `unseenCount`, `unseenSteps`, `seenDue`, `seenMarks`, `seenOnSelect`, `seenVer`.
- Page: `apps/board/src/board/cards/update-flow.ts` (`createUpdateFlow`).

What clears them:
- **Select:** selecting the card (click, Space, lasso) sends a `seen` per card (`seenMarks(... seenOnSelect(...))`, line ~210).
- **Stepper:** each step shown marks its version seen.
- **Act:** any act naming the card except a Send.
- **Go to card, finder, search:** selected `by: 'find'` marks nothing (the `findKeepsMarks` flag; ruling 322).
- **Hover or tabbing past:** nothing is sent.
- **While a past version shows:** nothing is sent.
- **Decisions:** D-054 (docs/decisions.md:684): "NEW and "N updates" end only when the person selects or acts on the card (no clearing when a round starts)". D-088 (docs/decisions.md:1210) sets updated amber (`--vb-state-updated`) and new teal (`--vb-state-fresh`), behind the `updateSignals` flag.
- Nothing is stored for containers; fresh containers are derived.

Read-only or locked board:
- **Locked board:** `passesLock` in `packages/actions/src/lock.ts` lets `type === 'seen'` through, so seen lines still write on a locked board.
- **Ledger open read-only (D-085):** `update-flow.ts` has `quiet` (`d.quiet?.()`). The version seen is kept in page memory only (`kept` map) and nothing is sent, so the tab still goes away. A `readOnly()` page also means `current()` and `live()` return null. NEW is not shown while read-only: `if (!d.readOnly() && fresh().has(n.n) ...) return { new: true }`.
- **Archived board:** `boardLocked` counts it as locked.

## 6. Zoom

`apps/board/src/board/canvas/viewport.ts`:
- `export const FAR_K = 0.55`, plus `MIN_K = 0.2`, `MAX_K = 2.5` (not exported), `zoomPercent`, `isFar`, `SELECTION_FIT` (`{fill:0.75, cap:MAX_K}`), `APP_FIT` (`{fill:0.95}`), `revealPan`.
- `class Viewport` has `x`, `y`, `k`, `stage`, `world`, `zoomOn`, `hideFar`, `onApply`, and methods `apply`, `toWorld`, `panBy`, `zoomAt`, `zoomCentre`, `fit`, `reveal`, `restore`, `snapshot`, `resized`. The constructor is `(stage, world, hideFar, zoomOn)`.
- `apply()` sets `world.style.transform = translate(...) scale(k)`, writes `--vb-zoom` on `zoomOn` (the regions layer) only when `k` changed, and sets `stage.dataset.zoom = 'far'` when `hideFar && isFar(k)`.
- Constructed at `controller.ts:57` as `new Viewport(stage, world, on('hideControlsZoomedOut'), els.regions)`.

`--vb-zoom` counter-scaling (CSS only; no TS counter-scales):
- `packages/ui/src/region/region.css`: `@property --vb-zoom { syntax:'<number>'; inherits:true; initial-value:1 }`.
  - `vb-region .vb-region-head` is `width: calc((100cqw - 2*var(--vb-space-4)) * var(--vb-zoom))` with `transform: scale(calc(1 / var(--vb-zoom))) translateY(-50%)`.
  - `.gliding & .vb-region-head` transitions `--vb-zoom`.
- `packages/ui/src/region/region-rail.css`: `vb-region[data-rail] > .vb-region-rail` has width and height multiplied by `--vb-zoom` and `transform: scale(calc(1 / var(--vb-zoom)))`. `.gliding &[data-rail] > .vb-region-rail` transitions `--vb-zoom`.
- `apps/board/src/styles/board.css`, lines ~284-289: the search rings (`.vb-world[data-search] vb-node[data-found]` and `[data-found='current']`) use `calc(Npx / var(--vb-zoom, 1))` for outline, outline-offset and box-shadow.
- The cards layer never takes `--vb-zoom` (`pattern.json` "far": "the cards layer never takes it").
- `apps/board/src/board/controller.ts:208` `vp.onApply` calls `notes.place()`, `flow.place()`, `drawing.viewMoved()`, `boards.moved()`. Overlays are on the stage, outside the scaled world, and are placed in stage pixels.
- Other TS reads of `vp.k`: `selection-flow.ts:138` (`pillGap(d.vp.k)`), `pointer.ts` (drag deltas), `offscreen.ts`, `draw.ts:136` and `app-cards.ts:208` (`isFar`), `proposal-flow.ts:132-134` (`FAR_K / d.vp.k`), `note-hide.ts:72`.

`data-zoom='far'` rules (stage attribute; only with the `hideControlsZoomedOut` flag):
- `packages/ui/src/node/node.css:253` `[data-zoom='far'] & .vb-node-actions { visibility: hidden }`
- `node.css:308` `.vb-size`, `.vb-size-menu`
- `packages/ui/src/node/node-popover.css:112` `.vb-history`
- `packages/ui/src/node/node-app.css:63` `.vb-app-status`, `.vb-app-state .vb-pop-btn`
- `packages/ui/src/region/region.css:226` `display:none` on `.vb-region-tools, .vb-region-grip, .vb-region-retired, .vb-region-holders`
- `packages/ui/src/region/region-narrow.css:84-85` `.vb-region-bar { --vb-region-lead: 0px }`, `.vb-region-handle { height: 1lh }`

`hideControlsZoomedOut` effect (default on; `FLAG_DESCRIPTIONS` in `flags.ts`): below `FAR_K` (55%) the card buttons, the size control and the container icon row hide, but "keeping their space"; the keyboard shortcuts still work. Off: every control stays visible at every zoom and the stage is never "far".

What keeps its size:
- The container's top line (title, grip, count, pill) and the rail keep on-screen size at every zoom (the counter-scale above). Layout reserves `REGION_HEAD = 38` (`packages/layout/src/types.ts`, matched by `padding-top: 38px` in `region.css`).
- Card content scales with the world.
- The selection bar does not scale. `pillGap(k)` adds `TAB_RISE*k + clamp(8k, 4, 16)`.

Plugin hosts:
- `apps/board/plugin/theme.css`: `--vb-ui-text-scale: var(--host-text-scale, 1.25)`.
- `apps/board/src/styles/ui-scale.css` and `ui-text.css`: `--vb-ui-text-*` built from `--vb-text-*` by that scale.
- Held equal by `apps/board/tests/plugin-theme.test.ts`.
- `docs/specification/plugin.md:195`: host CSS rules are written round `&`, e.g. `vb-node { [data-zoom=far] & .vb-size {…} }`.
- Nothing in `apps/board/plugin/*.ts` scales for zoom; the host's store keeps each board's zoom (`view.<board>`).

Tests: `tests/pages/zoom-counter-scale.spec.ts`, `zoom-level.spec.ts`, `zoom-and-lasso.spec.ts`, `container-zoom.spec.ts`.

## 7. Selection

`packages/ui/src/selection-bar/`:
- `selection-bar-core.ts`: `BAR_GAP=12`, `BAR_EDGE=8`, `TAB_RISE=10`, `TAB_CLEAR_MIN=4`, `TAB_CLEAR_MAX=16`, `TAB_CLEAR_PER_K=8`, `pillGap(k)`, `placeBar(box, bar, stage, gap, avoid)` returning `{side:'above'|'below', x, y}`, `barView`, `BarView`, `BarButton`, `BarPlacement`, `selectedCount`, plus re-exported `boxAround`, `boxBetween`, `touches`.
- `selection-bar-template.ts`: `selectionBarTemplate`.
- `vb-selection-bar.ts`: `VB_SELECTION_BAR_TAG`, `defineVbSelectionBar`, `VbSelectionBarElement` with `show(v)` and `place(p)`; events `vb-command` and `vb-toggle`.
- `selection-bar.css`. Classes: `vb-sb-count`, `vb-sb-pill`, `vb-sb-btn`, `vb-sb-primary`, `vb-lasso`.

Mounting and placement: `apps/board/src/board/selection/selection-flow.ts` `createSelectionFlow`.
- It creates `document.createElement('vb-selection-bar')` and appends `d.stage.append(lasso, bar)`.
- `place()` computes `gap = area ? BAR_GAP : pillGap(d.vp.k)` and calls `bar.place(placeBar(toStage(world), size, {w: stage.clientWidth, h: stage.clientHeight}, gap, titleLines()))`. It avoids each container's `.vb-region-label`.
- `selection-pill.ts` `createPill` (the `selectionPill` flag) is the compact "3 selected" pill.
- Selection state is in `selection.ts`. The gallery entry is `apps/board/src/gallery/selection-bar-section.ts`.

`apps/board/src/board/input/commands.ts`:
- `COMMAND_IDS`, with keys from `COMMANDS`:

| id | keys |
|---|---|
| `zoom-out` | `-` |
| `fit` | `f` |
| `zoom-in` | `+`, `=` |
| `comment` | `n`, `c` (primary, acts) |
| `move` | `shift+m` |
| `reset-places` | `r` |
| `remove` | `delete`, `backspace` |
| `zoom-selection` | `z` |
| `zoom-area` | none |
| `container-note` | `c`, `n` (on a container's title line) |
| `go-to-card` | `0`-`9`, `/` |

- Groupings: `HEADER_COMMANDS` (zoom-out, fit, zoom-in), `SELECTION_COMMANDS` (comment, move, reset-places, remove, zoom-selection), `AREA_COMMANDS` (zoom-area), `REGION_COMMANDS` (container-note).
- Helpers: `commandForKey`, `regionCommandForKey`, `selectionButtons`, `barButtons`.
- Item keys on a focused card come from the `ACTIONS` registry (a, x, c, l, o) and `FLAG_KEY` Shift+F; see `keys.ts`.

`zoom-selection`:
- `selection-flow.ts`, in `command()`: `case 'zoom-selection': return zoomTo(d.selection.selected())`.
- `zoomTo(ids)` is `worldBoxOf(d.layout(), ids)` then `d.vp.fit(b, true, ids.length === 1 && isAppCard(d.stage, ids[0]!) ? APP_FIT : SELECTION_FIT)`.
- It handles several cards: `worldBoxOf` takes the union box of all `ids`, and `fit` fits that box.
- With focus on a container's title line, `keys.ts:106` calls `h.zoomRegion?.(region)` first (`container.zoom`).

Lasso:
- Shift+drag on the background, Shift+Cmd/Ctrl+drag adds (`pointer.ts`: `kind:'lasso'`, `add: e.metaKey || e.ctrlKey`).
- `lassoMove` draws the `.vb-lasso` div. `lassoEnd` selects the touched cards via `touches(world, b)`; touching none gives the area bar (`area`, command `zoom-area`).

Right-click or context menu on a card: not found. No `contextmenu`, `oncontextmenu` or "context-menu" string in `apps/`, `packages/`, `tests/`, `docs/` or `skills/`.

## 8. Containers (`packages/ui/src/region/`)

Files: `region-template.ts` (`regionTemplate`, `holdersTemplate`, `regionIds`, `layoutTipId`, `EMPTY_DECIDED`, `nblockRepliesMarkup`), `region-core.ts` (state, `MODE_LABEL`, `MODE_HINT`, `WIDTHS_LABEL`, `retiredMarker`, `regionNote`, …), `region-icons.ts`, `vb-region.ts` (`defineVbRegion`, `VbRegionElement`), `region-row.ts` (`bindModeRow`), `region-layout-tip.ts` (`bindLayoutTips`), `region-note.ts`, `region-preview.ts`, `region-title.ts` (`bindTitleTip`), `region-fresh.ts`, plus `region.css`, `region-narrow.css`, `region-modes.css`, `region-note.css`, `region-rail.css`, `region-fresh.css`.

Layout mode buttons: `modeButton(m, id, tipId)` in `region-template.ts`.
- Markup: `<button class="vb-mseg" role="radio" aria-checked data-mode="${m}" data-region="…">` with `svgIcon(MODE_ICON[m], 24, 'vb-mode-icon')`. One per `MODES` entry, inside `.vb-mode-row` (`role="radiogroup"`), then a `.vb-mode-div` divider.
- After the divider: `widthsSwitch` (`.vb-mseg.vb-widths`, `role="switch"`, with the `widthsControl` flag), `commentButton` (`.vb-region-comment`) and the cog (`.vb-mseg.vb-cog`).
- Tooltip: `.vb-tip.vb-mode-tip` (the `layoutTooltip` flag). Otherwise `modePopover` draws `.vb-mode-pop` with `.vb-mtile` tiles.
- The settings menu is `.vb-region-menu`: Reset places, Put container back, Remove container (the `personRemove` flag).

Tool rail:
- The `toolRail` flag (default true) passes `rail` in `RegionFrameOptions`. The tools then go in `<div class="vb-region-rail">` outside the header, with `data-rail` on `vb-region`, and the top line holds only the label.
- The `railOnHover` flag (default true) passes `railHover`, which sets `data-rail-hover` and `data-use` (`canvas/region-use.ts`).
- Both are threaded through `apps/board/src/board/canvas/draw.ts` and `render.ts`. The gallery entry is `apps/board/src/gallery/rail-section.ts`.

Title line:
- `<header class="vb-region-head"><div class="vb-region-bar"><div class="vb-region-label">`, containing `.vb-region-handle` (grip, `<h2 id>`, `.vb-region-count`), `.vb-region-fresh-slot`, `.vb-region-retired`, `.vb-region-holders` and `.vb-title-tip`.
- Counter-scaled by `--vb-zoom`.
- The bar's grid columns are `var(--vb-region-lead, minmax(0,1fr)) minmax(0,auto) minmax(max-content,1fr)`.

How the mode strip decides how many buttons fit (CSS container queries only, no JS measuring):
- On the top line (`region-narrow.css`, the line `.vb-region-head` is `container-type:inline-size`):
  - `@container (max-width: 408px) or ((max-width: 568px) and style(--region-marked: 1))` collapses to the checked icon, Comment and the cog.
  - `(max-width: 289px)` shows the retired marker as an icon.
  - `(max-width: 225px) or ((max-width: 260px) and style(--region-marked:1))` keeps the cog, plus Comment while its badge shows.
- In the rail (`region-rail.css`, `container: vb-rail / size`):
  - `@container vb-rail (max-height: 248.98px) or ((max-height: 274.98px) and style(--rail-widths: 1))` collapses to the checked layout, Comment and the cog.
  - `(max-height: 111.98px)` collapses to the cog, plus Comment while its badge shows.
  - Hover or focus expands the rail as an overlay.

Mode change becomes an action:
- Click wiring: `apps/board/src/board/input/wiring.ts:103-105` matches `button[data-mode], button[data-tile]` and calls `h.setMode(modeBtn.dataset.region, mode)`.
- `apps/board/src/board/canvas/places.ts` `setMode` calls `d.record({ action: 'mode', region, mode })`, then `d.vp.reveal(r.box)`.
- `setWidths` records `{ action: 'widths', region, widths }`.
- The act `mode` names `board` (see `NAMES_BOARD` in `io/acts.ts`).

## 9. Layout engine (`packages/layout/src/`)

One line each:
- `index.ts`: exports (`layoutBoard`, `layoutRegion`, `packRegions`, `MODE_FNS`, `routeLines`, `routeLinks`, …).
- `board.ts`: `MODE_FNS = { grid, column, row, flow, lanes, radial }`, `layoutRegion`, `layoutBoard`, `packRegions`; applies pins, collisions, then routing.
- `types.ts`: types and constants (`GAP=24`, `ROW_GAP=30`, `COL_GAP=72`, `REGION_PAD=28`, `REGION_HEAD=38`, `REGION_GAP=56`, `LANE_GUTTER=112`, `LANE_PAD=GAP`, `Align = 'start'|'center'`).
- `layers.ts`: shared layering and ordering (`graphOf`, `layersOf`, `acyclic`, `columnWidths`, `matched`, `columnX`, `place`, `mean`).
- `structure.ts`: `structureOf`, the structure-only answer behind `show_layout`.
- `place.ts`: `placeContainers`, container pins.
- `collide.ts`: `applyPins`, `makeRoom`, the collision pass for pinned cards.
- `geometry.ts`: `boundsOf`, `overlaps`, `normalise`, `round`, `centre`.
- `size.ts`: `sizeTier`, `autoTier`, `measureBody`, `TIERS`, `LONG_BODY=480`, `MEDIUM_BODY=140`.
- `modes/grid.ts`: `grid`, `column`, `row`.
- `modes/flow.ts`: `flow`.
- `modes/radial.ts`: `radial`.
- `modes/lanes/lanes.ts`, `columns.ts`, `order.ts`, `untangle.ts`: lanes, column assignment, order within each stack, crossing-reduction swaps.
- `route/route.ts`: `routeLinks`, `routeLines`.
- `route/ports.ts`: which side a connector leaves or enters, and port spreading.
- `route/search.ts`: three-run and five-run candidates through free space.
- `route/free.ts`: free spans, `CLEAR_CARD = 6`.
- `route/tracks.ts`: parallel runs get their own tracks.
- `route/frame.ts`: mirror or rotate into one direction.
- `route/crossings.ts`: `crossingLines`, `crossingPoints`.
- `route/labels.ts`: `labelSize`, `LABEL_H`, label placement.
- `route/path.ts`: `roundedPath`, `elbow` (`RADIUS = 10`).

Direction:
- There is no direction setting.
- Flow is hard-coded left to right: `flow` in `modes/flow.ts` ("Left to right with branches: layered, then three barycentre sweeps").
- `column` is top to bottom and `row` is left to right, both in card order with no links needed (`modes/grid.ts`).
- The only alignment option is `Align = 'start'|'center'` (`LayoutOptions`; the `alignSetting` flag).
- Default container mode: the schema default is `row`. `apps/board/server/write-board.ts:48` says "the schema's default (`mode.default`, `row`)". `skills/vision-board/SKILL.md` says a container with no `mode` is a `row`. Default widths come from `DEFAULT_WIDTHS` in `view.ts`.
- The tests are `apps/board/tests/api-row-default.test.ts` and `api-modes.test.ts`.

Link routing:
- `routeLinks` and `routeLines` in `route/route.ts`.
  - Links inside one container run through free space (never under a card). Each is the cheapest candidate once crossings cost `CROSS` px.
  - Links between containers, links in radial, and links with no free route keep the plain `elbow` (`path.ts`).
  - Tracks (`tracks.ts`) spread runs that would share a line, and labels are placed by `labels.ts`.
- Routing around cards: `free.ts` grows each card by `CLEAR_CARD = 6` px as an obstacle. `search.ts` builds `threeRuns` and `fiveRuns` through gutters and free bands.

Fork in flow mode (one card linking to two):
- `layersOf` gives both successors the same layer (the same column).
- The barycentre sweeps in `flow` (`sweep('preds')`, `sweep('succs')`, `sweep('preds')`) stack them in that column, each placed near the mean of its predecessors (`place()` in `layers.ts`).
- In `ports.ts`, ports are spread along the side in the order of the far ends, "so fan-outs don't start from one point".

Lanes: `modes/lanes/lanes.ts` (`laneNames`) lays out several left-to-right flows, one per lane, on one column grid.
- Each lane is as tall as its tallest stack, with `LANE_PAD` above and below.
- `LANE_GUTTER = 112` holds the lane label.

Tests (`packages/layout/tests/`): `layout.test.ts`, `routing.test.ts`, `route-checks.ts`, `lanes-layered.test.ts`, `no-overlap.test.ts`, `align-widths.test.ts`, `container-pins.test.ts`, `head-insets.test.ts`, `labels.test.ts`, `per-container.test.ts`, `size.test.ts`, `stack-gap.test.ts`, `structure.test.ts`, `layout.timing.ts`.

## 10. Notes and conversation

- `packages/ui/src/note-bubble/`: `note-bubble-core.ts` (`placeBubble`, `titleAnchor`, `partAnchor`, `bubbleView`, `BubbleMode` incl. `'new'|'edit'|'sent'|'thread'`, `saveIntent`, `cancelIntent`, `NOTE_DISCARD_EVENT`, `PLACEHOLDER`, `BUBBLE_GAP=18`), `note-bubble-template.ts`, `vb-note-bubble.ts` (`<vb-note-bubble>`, event `vb-note`, `show`, `place`, `reveal`, `focusText`), `note-bubble.css`, `pattern.json`.
- "Conversation on N" is `packages/ui/src/words/note-bubble.ts:32` `conversationOn = (container) => \`Conversation on ${container}\``, used in `note-bubble-core.ts:160` when `b.mode === 'thread'`.
- Card popover: `bindCardPopover(card, name, tabSel)` in `packages/ui/src/node/node-popover.ts`, called from `vb-node.ts` for `HISTORY` (the "i"), `'proposal'` and `'handover'`.
- Note hover tip: `node-note-tip.ts` `bindNoteTip`, on the shared `tip/hover-tip.ts` `bindHoverTip`. It is behind the `notePreview` flag (`data-note-preview` on the world).
- History box: `node-history.ts`, filled by the page when `POPOVER_SHOW` fires (`apps/board/src/board/cards/history-flow.ts`; rows from `packages/actions/src/card-history.ts` `HistoryRow`).
- Where a note is written:
  - Action `comment` (text required, `ACTIONS.comment`, key `c`) goes through `apps/board/src/board/notes/notes.ts` (`openWith` modes new/edit/thread) and `note-views.ts`, then `sender.ts`.
  - `note-edit` and `note-remove` change a note not yet sent.
  - Container notes are in `notes/region-notes.ts`; group pins in `notes/group-pins.ts`.
  - `context` is a legacy action that reads as a note.
- Replies:
  - An agent `reply` event (`ReplyEvent`, `{id, text, to?}`) is drawn on the card by `replyMarkup` in `node-template.ts` (`.vb-node-reply`, from `ReplyEntry` in `node-notes.ts`).
  - In the note bubble's thread mode, and under a container note in `region-template.ts` `nblockRepliesMarkup` (`.vb-nblock-reply`).
- Send to agent:
  - A `send` act (`board` only), made by `controller.ts` `send(id, acks)` (~line 310). It adds `sendHead(...)` when `sendCountsWhatWent` is on, then `attempt(fields)`.
  - UI: `apps/board/src/board/chrome/SendButton.svelte`, with the labels in `words/chrome-send.ts`.
  - With a chat session and something attached, the Send is the composer's message instead (`chat.md:109`, `chat-panel.ts` `boardSend`). While the agent works it reads "Queued" and the answers go when the turn ends (the `workAlongside` flag).
  - The message text is built in `packages/actions/src/board-message.ts` (`boardBlocks`, `roundOf`), with `unsent.ts` deciding what is "new".
- Live send to the bot ("ask now"): I found no "ask now", "raise" or "live" send. Nothing in `apps/`, `packages/ui` or `server` matches those words for notes.
  - The nearest things are the chat panel's composer (`packages/chat/src/composer/`, `apps/board/src/shell/chat-panel.ts` `sendChat` -> operation `send_chat`), which sends a free message to the agent's session, and Send itself.
  - The HANDOVER file's plan mentions "Raise" and "Live mode" for the app drawer, but `Raise` is not in the code.

## 11. Theme, tokens, fonts

- `packages/tokens/src/tokens.css` (218 lines, the only source of style):
  - `:root { color-scheme: light dark; ... }` holds type (`--vb-font`, `--vb-font-mono`, `--vb-text-xs..xl`, weights), space, radius and sizes.
  - `:root, .vb-board { ... }` holds the colours, each one `light-dark(a, b)` fronted by a `--vb-host-*` (e.g. `--vb-surface-canvas: var(--vb-host-canvas, light-dark(#f5f5f6, #111112))`).
  - `[data-theme='light'] { color-scheme: light }` and `[data-theme='dark'] { color-scheme: dark }` at lines 199-200.
  - `--vb-rail-rest: 0.5` is declared at `:root` (a number can't be `light-dark()`).
- `data-theme` is set by `apps/board/src/shell/theme.ts`: `applyTheme(theme)` sets or removes `document.documentElement.dataset.theme` and stores it with `keep('vb-theme', …)`. Themes are `'system'|'light'|'dark'`, via `keptTheme` and `nextTheme`.
- The control is `apps/board/src/shell/ThemeControl.svelte`, drawn by `page-parts.ts` `parts.theme` and placed in `ToolbarEnd.svelte` (`<PagePart draw={parts.theme}>`) and in the "⋯" `ToolbarMenu.svelte`. The gallery has its own at `apps/board/src/gallery/main.ts:108`.
- `app-cards.ts:112` `watchTheme` observes the `data-theme` attribute.
- `apps/board/plugin/theme.css` maps `--host-*` onto `--vb-host-*` for a host: `--host-font`, `--host-font-mono`, `--host-text-scale`, `--host-accent*`, `--host-canvas`, `--host-surface*`, `--host-ink*`, `--host-line*`, `--host-focus`, `--host-color-scheme`.
  - The colour ones apply only on a root with `data-vb-host-styling` (the `hostStyling` flag).
  - `apps/board/plugin/color-scheme.css` handles `data-theme` under a host.
  - `vite.plugin.config.ts` strips the tokens' `:root` and `[data-theme]` `color-scheme` rules from the plugin build.
- Skin or theme variants: no notion of "skin" in code or specs. A word-boundary grep for "skin" over `apps/`, `packages/`, `docs/`, `skills/`, `.kiro/` found nothing. The only theme variants are light, dark, system, and the host `--host-*` look.
- Fonts today: `--vb-font: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` and `--vb-font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace`.
  - There is no `@font-face`, no `.woff` file and no fonts folder in `apps/`, `packages/`, `apps/board/public/` (only `favicon.svg`) or elsewhere outside the skipped folders.
  - `apps/board/server/static.ts` already maps `.woff2` to `font/woff2`, so the server can serve one.
  - The server's CSP is set at `apps/board/server/app.ts:40`, and `font-src data:` appears in the SVG and PDF-frame CSPs.
  - `skills/vision-board/SKILL.md:513`: "no outside fonts or files" (for agent-built apps).
- Third-party network rule:
  - `docs/principles.md:239-240`: "**Local-first and safe.** The server is a localhost tool: sanitised ids, Origin and Host checks, JSON only, no third-party network calls."
  - `.kiro/steering/vision-board-proj.md:80-81`: "Local-first: localhost only, Origin and Host checked, JSON only, ids sanitised; no third-party network call without a decision."
  - `scripts/verify-style.mjs` enforces "network calls ... only in their layers".
  - The page tests run Chromium with `--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1` (`LOCAL_ONLY` in `tests/pages/playwright.config.ts`).
- `docs/specification/dependencies.md`:
  - Front matter: `category: project-tooling`, `status`, `scope`.
  - Sections: "Summary", "Known audit findings we accept", "Direct dependencies: what and why (D-014)" (a table `| Package | Version | Declared in | Used by | Why |`), "Weight and risk" (`| Package | Transitive | Install scripts | Licence | Alternative not taken |`), "Install scripts", "Licences", and "Built ourselves instead of installing" (`| Need | Our code | Not installed |`).
  - It registers npm packages only; there is no row type for a vendored asset or font.
  - `checkManifest` in `scripts/verify.mjs` fails when a `package.json` names a package without an exact version or without a row. The rule text is "build it ourselves when that is small, install only what a decision lists, pin exact versions".

## 12. Words

Word files:
- `packages/ui/src/words/`: `app-frame.ts`, `markdown.ts`, `node-app.ts`, `node-notes.ts`, `node-updates.ts`, `node.ts`, `note-bubble.ts`, `region-note.ts`, `region.ts`, `selection-bar.ts`, `ui-common.ts`.
- `apps/board/src/board/words/`: `access`, `app-cards`, `board`, `boards`, `cards`, `chrome-access`, `chrome-board`, `chrome-boards`, `chrome-common`, `chrome-confirm`, `chrome-go-to-card`, `chrome-key-help`, `chrome-proposals`, `chrome-send`, `commands`, `common`, `confirm`, `go-to-card`, `key-help`, `notes`, `proposals`, `reply`, `send`, `toolbar` (all `.ts`).
- `packages/format/src/words/`: `format-common.ts`, `format-kinds.ts` (the kind labels), `format-ledger.ts`, `format-view.ts`.
- Also: `apps/board/src/shell/words/`, `apps/board/server/words/`, `apps/board/plugin/words/`, `packages/actions/src/words/`, `packages/agent|cli|mcp/src/words/`.

How the check works:
- `scripts/words.test.mjs`, `scripts/words-scan.mjs` (`scanFile`), `scripts/words-text.mjs` (`isSentence`, `htmlSegments`) and `scripts/words-homes.mjs` (`PARTS`, `OTHER_HOMES`, `NOT_SCANNED`, `EXEMPT`; `sentencesOutside`).
- The test names are in `docs/specification/words.md` § Mechanisms.
  - "no sentence a person or an agent reads stands outside a words file"
  - "the doc lists every words file"
  - "every sentence has a key"
  - "a words file imports only other words files, and types"
  - "a fixed sentence has one home in a part"
- Keys are `vision-board.<area>.<name>`.
- The words check runs in `npm test` (`scripts/*.test.mjs`), not in `npm run verify`.
- Companion test: `scripts/words-scan.test.mjs`.

"flag" as person-facing text (words files only):
- `packages/ui/src/words/node.ts`: line 8 `flagItem = (n, FLAG_KEY) => \`Flag item ${n} (${FLAG_KEY})\``, line 40 `flag = (FLAG_KEY) => \`Flag · ${FLAG_KEY}\``, line 67 `flaggedInName = ', flagged'`.
- `packages/actions/src/words/actions-registry.ts`: line 24 `flag = 'Flag'`, line 25 `removeFlag = 'Remove flag'`.
- `apps/board/src/board/words/key-help.ts:20`: `flagOrUnflagTheCard = 'Flag or unflag the card'`.
- `apps/board/src/board/words/toolbar.ts:70`: `flagged = 'Flagged'`.
- `apps/board/src/board/words/cards.ts` lines 9-11: `flaggedGoToTheNext`, `flagRemoved = 'flag removed'`, `theFlaggedCardsAreHidden`.
- `apps/board/src/board/chrome/FlaggedChip.svelte` and `Toolbar.svelte` draw the toolbar's flagged chip.
- Also in words files but a different meaning (the feature-flag system or CLI flags, not the card flag): `apps/board/server/words/*` (`appCardsAreOffOn`, `ledgersUndone`, `plugin-tools.ts` comments), `packages/cli/src/words/{globals,args,help}.ts` (command-line flags), and comments in `apps/board/src/shell/words/{chat,editing,ledgers}.ts` and `apps/board/src/board/words/{go-to-card,chrome-go-to-card,chrome-send,toolbar}.ts` that name feature flags.

"flag" as an identifier or non-words text:
- By tool, not exhaustive: the counts are lines matching a card-flag-specific regex (`cardFlag`, `FLAG_KEY`, `FLAG_ICON`, `flagLabel`, `flagItem`, `[Ff]lagged`, `vb-flag`, `data-flag`, `flagsOn`, `card-flags`, `FlaggedChip`, `flagging`, `flag-flow`, `unflag`, `'flag'`, `state.flags`, `removeFlag`, …), over `apps`, `packages`, `scripts`, `skills`, `docs`, `tests` and `.kiro`.
- Non-test source files, in order:

| File | Lines |
|---|---|
| `apps/board/src/board/cards/flag-flow.ts` | 22 |
| `apps/board/src/gallery/flag-section.ts` | 15 |
| `packages/ui/src/node/node-core.ts` | 10 |
| `packages/ui/src/node/node-template.ts` | 9 |
| `apps/board/src/board/chrome/Toolbar.svelte` | 9 |
| `apps/board/src/board/controller.ts` | 8 |
| `apps/board/src/board/chrome/FlaggedChip.svelte` | 8 |
| `packages/ui/src/node/pattern.json` | 6 |
| `docs/specification/components.md` | 6 |
| `packages/actions/src/card-flags.ts` | 5 |
| `apps/board/src/board/chrome/HeaderFields.svelte` | 5 |
| `packages/ui/src/node/node.css` | 4 |
| `packages/format/src/ledger.ts` | 4 |
| `packages/actions/src/board-state.ts` | 4 |
| `apps/board/src/board/chrome/ButtonIcon.svelte` | 4 |
| `packages/ui/src/words/node.ts` | 3 |
| `packages/ui/src/node/vb-node.ts` | 3 |
| `packages/ui/src/node/node-icons.ts` | 3 |
| `packages/format/src/flags.ts` | 3 |
| `packages/actions/src/fold.ts` | 3 |
| `apps/board/src/styles/board.css` | 3 |
| `apps/board/src/gallery/remove-section.ts` | 3 |
| `apps/board/src/gallery/header-section.ts` | 3 |
| `apps/board/src/board/words/cards.ts` | 3 |
| `apps/board/src/board/toolbar-counts.ts` | 3 |
| `apps/board/src/board/status.ts` | 3 |
| `apps/board/src/board/chrome/header-tier.ts` | 3 |

- Files with 1-2 lines each (not itemised): `packages/ui/src/node/pattern.json` aside, `packages/actions/src/registry.ts` (2), `packages/actions/src/{references,index}.ts`, `packages/format/src/ledger-shape.ts`, `apps/board/src/board/input/key-help.ts` (2), `apps/board/src/board/controller/board-types.ts` (2), `apps/board/src/gallery/{lock-section,fixture}.ts` (2 each), the schemas `packages/format/schema/events/act.schema.json` (2), `check-responses-response.schema.json` (2), `openapi.json` (1), `packages/format/src/api-types.generated.ts` (2), `packages/tokens/src/tokens.css` (1; `--vb-state-flag`), `packages/ui/src/region/pattern.json` (1).
- Tests (counts): `apps/board/tests/flag-flow.test.ts` 28, `tests/pages/flag-retire.spec.ts` 27, `packages/ui/tests/node-flag.test.ts` 17, `packages/actions/tests/card-flags.test.ts` 17, `tests/pages/header-tiers.spec.ts` 8, `tests/pages/read-only.spec.ts` 6, `apps/board/tests/api-flag.test.ts` 6, `packages/ui/tests/node-paused.test.ts` 5, `apps/board/tests/schema-cases.ts` 5, plus a few 1-4.
- Feature-flag-system "flag" (case-insensitive, all senses) is far wider: `packages/format/src/flags.ts` alone has 102 lines.
- CSS: `.vb-flag`, `.vb-flag-cloth`, `--vb-state-flag`, `[data-flagged]` in `packages/ui/src/node/node.css` (4 lines) and `tokens.css`.

## 13. Tests and gallery

Page specs live in `tests/pages/*.spec.ts` and are named by feature in kebab-case, one file per feature or ruling. Helpers: `helpers.ts`, `board-page.ts`, `serve-boards.ts`, `servers.ts`, `ports.ts`, `global-setup.ts`, `apca.ts`. Fixtures: `tests/pages/fixtures/`.

Specs that cover:
- **Nodes:** `every-node`, `size`, `focus-ring`, `review-colours`, `answer-model`, `flag-retire`, `card-history`, `card-updates`, `new-cards`, `fresh-cards`, `update-signals`, `one-change-tab`, `tab-place`, `big-titles`, `card-images`, `proposals`, `proposals-review`, `proposals-notice`, `board`.
- **Selection:** `select`, `selection-pill`, `pill-gap`, `zoom-and-lasso`, `move-and-later`.
- **Zoom:** `zoom-counter-scale`, `zoom-level`, `zoom-and-lasso`, `container-zoom`, `app-fit`, `wheel-chaining`.
- **Regions:** `containers`, `container-polish`, `container-rail`, `container-rail-hover`, `container-rail-states`, `container-title`, `layout-controls`, `layout-tiles`, `layout-tooltip`, `reset-places`.
- **Notes:** `notes`, `note-polish`, `note-discard`, `note-folder`, `note-key-target`, `conversation`, `popover-thread`, `group-note`, `parking-replies`, `hover-tip`.
- **App cards:** `app-cards`, `app-alive`, `app-fit`, `app-follow`, `app-gallery`, `app-pan-key`, `app-safety`, `app-states`.
- Also `gallery.spec.ts`, `host-styles.spec.ts`, `lock-board.spec.ts`, `read-only*.spec.ts`.

Gallery:
- Page `apps/board/gallery.html`, code in `apps/board/src/gallery/` (`main.ts` plus one `*-section.ts` per pattern or feature, e.g. `node-section.ts`, `region-section.ts`, `selection-bar-section.ts`, `note-bubble-section.ts`, `app-section.ts`, `app-frame-section.ts`, `flag-section.ts`, `rail-section.ts`; shared `dom.ts` (`ownIds`), `fixture.ts`, `mini-board.ts`, `gallery.css`).
- Data: `packages/format/fixtures/gallery.ledger.jsonl`, plus `gallery.apps.json` and `gallery.chat.json`.
- How a pattern gets an entry (`docs/specification/components.md:167-174`):
  - "A new pattern needs a gallery entry: a section in `apps/board/src/gallery/` drawn from `#format/gallery.ledger.jsonl` through the pattern's own core (`nodeState`, `regionState`), never hand-written markup."
  - The gallery lists patterns from `PATTERNS` in `packages/ui/src/patterns.ts` (each pattern's `pattern.json`).
  - `tests/pages/gallery.spec.ts` fails for a pattern that has no samples.
  - A card drawn more than once takes ids from `gallery/dom.ts` `ownIds`, passed as `idPrefix`.

Screenshot baselines: `tests/pages/__screenshots__/<spec file>/<name>-<light|dark>-darwin.png`. Set by `snapshotPathTemplate: '{testDir}/__screenshots__/{testFileName}/{arg}-{platform}{ext}'` in `tests/pages/playwright.config.ts`. Update with `npm run test:pages -- --update-snapshots`.

`package.json` scripts:
```
build            vite build --config apps/board/vite.config.ts
board            npm run build && node apps/board/server.ts
serve            node apps/board/server.ts
dev              npm run build && VB_EDIT=1 VB_PROJECT=temp/demo VB_SEED=packages/format/fixtures/roadmap.ledger.jsonl node apps/board/server.ts
board:watch      node scripts/board-watch.mjs
worktree         node scripts/worktree.mjs
ledgers:undo     node apps/board/bin/ledgers-undo.ts
watch            vite build --config apps/board/vite.config.ts --watch
build:plugin     node apps/board/bin/build-plugin.ts
check            svelte-check --tsconfig apps/board/tsconfig.json && tsc -p tsconfig.json
validate         node apps/board/bin/validate.ts
reply            node apps/board/bin/reply.ts
vb               node packages/cli/bin/vb.ts
mcp              node packages/mcp/bin/vb-mcp.ts
test             node --test --test-timeout=120000 "packages/*/tests/**/*.test.ts" "apps/*/tests/**/*.test.ts" "scripts/*.test.mjs" "skills/**/*.test.mjs" "tests/plugin/**/*.test.ts" "tests/evals/**/*.test.ts" && npm run test:timing
test:timing      node --test --test-concurrency=1 "packages/*/tests/**/*.timing.ts" "apps/*/tests/**/*.timing.ts"
verify           node scripts/verify.mjs
map              node scripts/verify.mjs --write-map
gen              node scripts/gen-api.mjs
test:pages       playwright test --config tests/pages/playwright.config.ts
test:plugin      playwright test --config tests/plugin/playwright.config.ts
test:plugin:webkit  VB_TEST_BROWSER=webkit playwright test --config tests/plugin/playwright.config.ts
eval:bot         node tests/evals/bot/run.ts
```

`eval:bot` (`tests/evals/bot/run.ts`): the board's bot run through every scenario and scored from what it did. It is on demand only, never in CI, because a real run costs money.
- Options: `--dry` (scripted fake bot, no cost), `--fake bad`, `--standalone`, `--only a,b`, `--repeat N`, `--max-runs N` (default 16, max 30), `--max-usd X` (default 3, max 10), `--model` (default `sonnet`), `--port` (default 6010), `--flags`, `--instructions server|none`, `--out`.
- Scenarios are in `tests/evals/bot/scenarios/`: `answered-note.ts`, `draw.ts`, `index.ts`, `insert-step.ts`, `join-ledger.ts`, `ledger-picture.ts`, `new-card-number.ts`, `offsite.ts`, `other-ledger.ts`, `own-board.ts`, `person-board.ts`, `picture.ts`, `read-only.ts`, `refusals.ts`, `send-round.ts`, `summary-card.ts`, `two-turns.ts`, `wait.ts`, `where-cards-stand.ts`.
- Supporting files: `checks.ts`, `eval.ts`, `fake-bot.ts`, `host.ts`, `limits.ts`, `mcp-bot.ts`, `model.ts`, `report.ts`, `standalone.ts`, `types.ts`, and the test `bot-eval.test.ts`.

## 14. Agent skill (`skills/vision-board/SKILL.md`)

Files: `SKILL.md`, `NOTES.md`, `scenarios.md`, `examples/` (including `examples/apps/calculator.test.mjs`).

Headings:
```
# Vision Board
## The conversation
## Where you are running
## Starting a board
## Access
## Another ledger
## Layout: fit the task and the screen
### Check a `flow` or `lanes` container once
## Writing cards
### Images in cards
## Kinds: the kind decides
## What the person's answers mean
## Changing a card
## Retiring and distilling
## Reading the person's answers
## Answering
## Propose, never decide
## Saved for later
## Apps on the board
```

- Layout guidance for agents is `## Layout: fit the task and the screen` (line 166; a table at line 173) and `### Check a flow or lanes container once` (line 204; it says to call `show_layout` after the first draw).
- Mode default: a container with no `mode` is a `row` (v3.31).
- Card guidance: `## Writing cards`, `### Images in cards`, `## Kinds`.
- Version tracking:
  - A `status:` line in the front matter (line 5), with a running changelog: "v3.33 (2026-11-09, ...); v3.32 ...".
  - A `## Skill v3.30 (...)` style section per version in `skills/vision-board/NOTES.md` (line 760).
  - `apps/board/tests/plugin-skill.test.ts` has tests named by version (`'v3.30 ...'`, `'v3.31 ...'`).
  - The plugin skill build is `apps/board/plugin/skill.ts` with `apps/board/plugin/words/skill-edits.ts`; the `eval:bot` standalone run uses `STANDALONE_SKILL`.

## 15. App cards (spike)

`packages/ui/src/app-frame/` (`<vb-app-frame>`, a sandboxed frame with an opaque origin, speaking JSON-RPC over postMessage, `apps.md` § The panel protocol):
- `app-frame-core.ts`: `createAppBridge`, `AppBridge`, `AppBridgeOptions`, `hostContext`, `hostStyles`, `parsePanelMessage`, `PROBLEM_WORDS`, `FRAME_CALLS`, `BridgeState`, `AppTheme`, `AppStyles`, `AppHostContext`, `AppLook`, `HostMessage`, `JsonRpcId`, `PanelError`, `AppCallError`; re-exports `panelSize`, `panelHeight`, `APP_FRAME_RESIZE_EVENT`.
- `app-frame-size.ts`: `panelSize`, `panelHeight`, `APP_FRAME_RESIZE_EVENT = 'vb-app-frame-resize'`.
- `app-frame-state.ts`: `checkSave`, `SAVE_WORDS`, `SaveCheck`.
- `vb-app-frame.ts`: `VB_APP_FRAME_TAG`, `defineVbAppFrame`, `VbAppFrameElement`, `AppFrameWiring`, `readLook`. Spike additions: a pick becomes a note (`vision-board/note`), the loaded panel goes on stage (line ~72), replies are told to it.
- `app-frame.css` (line 45 "On stage (appStage, spike)") and `pattern.json`.

`apps/board/src/board/apps/`:
- `app-cards.ts`: `createAppCards`, `AppCards`, `AppCardsDeps` (comment at line 66: "The appStage flag (spike): Open on an app card, a panel's picks as notes, replies told to it"), `watchTheme`, `LIVE_PANELS = 8`, `overCap`. The Allow and Stop confirm is at line 271 (`ACTIONS[action].needsConfirmation`).
- `app-state.ts`: `createAppStates`, `AppStates`, `AppStateDeps`.
- `panel-states.ts`: `createPanelStates`, `PanelKey`, `SAVE_DELAY_MS=500`, `LOAD_WAIT_MS=2000`.
- `index.ts` exports `createAppCards`, `watchTheme`.

Flags (`packages/format/src/flags.ts`):
- `appStage` (default true). `FLAG_DESCRIPTIONS.appStage` starts "Spike. An app card has Open: its panel leaves the card and fills the board (the top layer ...)". It is used in `node-template.ts:139` (the `.vb-app-open` button, `data-app-act="stage"`) and `controller.ts:163` (`staging: on('appStage')`).
- `cardDetails` (default true). `FLAG_DESCRIPTIONS.cardDetails` starts "Spike. A card's body may hide detail behind a disclosure triangle: a line `+++ Label` opens it and a line `+++` closes it". It is used in `packages/ui/src/markdown/render.ts:28, 86, 123`, `markdown.css:122`, `host.ts:206` and `cards/card-images.ts:172`.
- Related non-spike flags: `appCards`, `appTitle`, `appFit`.

The 13 failing page specs named in `cortex-tasks/board/2026-11-11_board-ui_app-window-handover/HANDOVER.md` § How it was checked (line 75): "`npm run test:pages` (full suite, 10.5 minutes): 990 passed, **13 failed**, 10 did not run. The failures are app card and gallery specs: `app-fit`, `app-gallery`, `app-states` (the window look), `card-history` (the smallest app card's footer), `chat-attach-gallery`, `gallery`, `host-styles`, `size`."
- That is 8 spec names for 13 failures; the file lists no per-test breakdown ("Not gone through one by one").
- Likely cause per the file: "the new Open button in the app card's footer".
- Also: "No gallery entries and no page specs were written for the new behaviour".

## 16. Module rules (`docs/specification/modules.md`, generated by `npm run map`)

1. Modules: `apps/board`, and `packages/` `actions`, `agent`, `chat`, `cli`, `client`, `documents`, `format`, `layout`, `mcp`, `search`, `tokens`, `ui`, plus `scripts`.
2. `modules.md` is generated and not hand-edited; `npm run verify` fails when it is out of date ("out of date: run npm run map").
3. Allowed import directions are `LAYERS` in `scripts/verify.mjs` (D-016, D-029): `format: []`, `tokens: []`, `actions: [format, search]`, `search: []`, `documents: []`, `layout: [format]`, `ui: [format, actions, tokens]`, `agent: []`, `chat: []`, `client: [format]`, `mcp: [format, client]`, `cli: [format, actions, agent, client]`. Apps may import any package; nothing imports an app.
4. Actual map: `ui` depends on `actions`, `format`; `layout` on `format`; `actions` on `format`, `search`; `apps/board` on all except `cli`; `chat`, `agent`, `documents`, `search` and `format` depend on nothing.
5. `npm run verify` checks `checkLength`: warn over 300 lines, fail over 500 unless the file says `verify: long-file <reason>` (`LIMITS = {warn:300, fail:500}`).
6. It checks `checkFunctionLength`: about 50 lines per function (`FUNCTION_LIMIT = 50`, `verify: long-function <reason>`; `verify-functions.mjs`).
7. It checks layers and front doors: `checkReferences` (modules reached by name, D-059), `checkBoardHost` (the board imports nothing from the page around it and no Svelte outside `chrome/`), `checkFeatureFolders` (a board feature folder is entered only through `index.ts`).
8. It checks style and layers (`verify-style.mjs`, UI_01): colour literals only in `packages/tokens`, network, file, socket and process access only in their layers, board stylesheets scoped and sized by the board's own width.
9. It checks `checkDataFolder` (only the paths module names the data folder; PATHS_01), `checkManifest` (exact versions and a row in `docs/specification/dependencies.md`), and `weightOf` (the page's gzipped JS+CSS within a 200 KB budget, from the last build; rule 15).
10. Not in `verify`: the words check (`scripts/words.test.mjs`, run by `npm test`), the generated-contract checks (`npm run gen -- --check` and the `gen-*.test.mjs` tests), types (`npm run check`) and page tests (`npm run test:pages`).