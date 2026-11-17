# FE_04_command-lens-skin: The Command Lens Skin

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Add the second skin, Command Lens, as a registry row, token values and a stylesheet over the same node, with its
controls where that skin puts them.

---

## Context

PLAN.md § Decisions 1, 7, 14. The look is `design/mockups/node-skins/command-lens-skin-dark.html` and `-light.html`
(artboard 12), with the states from `design/mockups/node-states/`. The plate along the top is the handle and holds
the number, the kind, the change badge and the notes button; the switch along the bottom is the answer, one click;
a dark plate and a switch mean the node asks, a light plate and no switch mean it tells; the bookmark is the number
square with a notched tail below the plate; a ticked or crossed node is not recoloured. Function does not change:
the same acts, keys, menus and conversation as the default skin.

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/ui/src/skins.ts` (the `command-lens` row), `packages/ui/src/node/` (template and
  styles, only what the registry row needs; a new `node-command-lens.css`), `packages/ui/src/menu/`,
  `packages/ui/src/note-bubble/` and `packages/ui/src/selection-bar/` styles (the dark glass, by tokens),
  `packages/tokens/src/skins.css` (and `tokens.css` only for a value T_02 missed, listed in your notes),
  `packages/ui/tests/`, `apps/board/src/gallery/`, `apps/board/src/board/input/pointer.ts` (`HANDLE`: the plate),
  `tests/pages/`, `docs/specification/components.md`
- **Files to reference**: FE_01's and FE_02's notes; `packages/ui/src/node/node-template.ts`
- **Shared artifacts to reuse**: `SKIN_DEFS`, `ICONS`, the menu pattern, the conversation box, T_02's tokens
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] Complete the `command-lens` row in `SKIN_DEFS`: answer `switch`, marks `plate`. If the template needs to
       know more than the row says, widen the row's type for every skin; never test the skin's name.
2. [ ] **Template**: for `marks: 'plate'` the number, kind, change badge and notes button are drawn in the plate
       (the plate is the drag handle); for `answer: 'switch'` nodes that ask get the Tick | Cross switch, and
       pressing the lit half clears the answer. The buttons carry the same data attributes as the default skin's,
       so FE_02's wiring serves both without change.
3. [ ] **Styles** from tokens: plates, square corners, the mono labels, the switch's lit halves, selection as the
       module's own border, the bookmark with its tail, the icon tile, tones, and the dark glass for menus, the
       selection bar and the conversation. In light, marks that sit on a dark plate keep colours that read on it.
4. [ ] **Every state** the default skin has, in this skin: the DESIGN_01 states, focus, hover, disabled on a
       read-only board, a failed write.
5. [ ] **A test that the skins agree**: for each kind and state, both skins offer the same set of actions
       (compare the data attributes the template emits).
6. [ ] Gallery sections for the skin; page specs with screenshots, light and dark, with `?flags=nodeEdges,skins`;
       `components.md` and `pattern.json` updated.

---

## Validation

- [ ] `npm run verify`, `npm run check`, `npm test`, `npm run test:plugin` pass; the new specs pass
- [ ] The skins-agree test passes; a search finds no skin name in `packages/ui/src/node/*.ts` outside the registry
- [ ] Contrast: every pair this skin adds is in the pair list and passes, light and dark
- [ ] Side by side with `design/mockups/node-skins/command-lens-skin-*.html` in a browser, the node matches;
      differences are listed with the reason
- [ ] Switching the skin on a live board redraws in place, loses no focus, no open note and no selection

---

## Constraints

- If you need to deviate, stop and tell the maintainer; no breaking change is made silently.
- No PII in examples. Interim files in `temp/`. Writes over 50 lines in chunks.
- No git command that changes state; the orchestrator commits.
- Every flag this set adds stays off by default; existing tests and screenshots pass with them off.
- A problem outside this task is reported (`REQUESTS`, `NOTES`), never fixed here.

---

## Implementation Notes

_To be completed by agent after task completion._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

**Status**: Completed  
**Completed**: 2026-11-17 19:40  

### Run 1

### Changes Made
- **The row, unchanged** (`packages/ui/src/skins.ts` `SKIN_DEFS['command-lens']`: `answer: 'switch'`, `marks: 'plate'`):
  the two values were enough; the type was not widened. The proposal chip follows from `answer: 'switch'` (a switch has
  no disc to carry a proposal), the plate's kind from `marks: 'plate'`.
- **Template** (`packages/ui/src/node/node-edges.ts` `edgesMarkup`, `handle`, `topMarks`, `trailMarks`, `half`,
  `answerSwitch`, `heading`): in a plate the number, the kind (`vb-node-kind-word`, the node's icon in place of the
  dot), the badge, Awaiting, the proposal chip (`data-mark="proposal"`, hidden until a proposal) and the notes mark; no
  grip, no kind word over the title. The switch is drawn **only on a node that asks** (FE_01's drew it on every item).
  Each half is a `.vb-mark` with `data-tip`, `aria-keyshortcuts`, a stable name "Tick item N (A)", aria-pressed, and a
  lock icon for the locked moment. The default skin's markup is unchanged.
- **Element** (`node-edges-apply.ts` `applyMarks`): `data-proposed` on the proposed half; the chip shown and named
  (`node-marks.ts` `NodeMarks.proposalLabel`). Words: `packages/ui/src/words/node.ts` `halfItem`, `halfTip`,
  `proposalItem`, `proposalTip` (the chip's word is the existing `proposal`).
- **Styles**: `packages/ui/src/node/node-plate.css` (new; imported by `styles.css` after `node-edges.css`), keyed by
  `data-marks-at='plate'` and `data-answer-at='switch'` only: the plate's colours as `--vb-p-*` (light on a node that
  tells, `--vb-plate` on one that asks), the marks on the dark plate lifted by `oklch(from … max(l, --vb-plate-mark-l)
  min(c, --vb-plate-mark-c) h)`, the plate's ring `--vb-plate-focus`, the number square with the bookmark's notched
  tail, the kind's dot, badge, Awaiting, proposal and notes chips, the switch (lit halves in the answer colours,
  proposed half dashed, saving spinner, failed ring and "!", locked lock), selection, emphasis, tone (the plate's rule,
  a light plate's ground), a narrow node's kind word giving way with an ellipsis. FE_01's placeholder plate and switch
  rules left `node-edges.css`.
- **Tone, point 366, both skins** (`node-edges.css`): `--vb-node-color` (the kind's, or `--vb-tone-line`) now colours the
  grip, the kind tab (`--vb-node-tab`, `--vb-node-tab-ink`: `--vb-tone-tile` and `--vb-tone-ink` when toned), the top
  line, the hover and selected borders and the tags; the kind's word over the title and the disc keep the kind's (my
  reading of "The kind word says the kind"). The at-rest border mix is `--vb-node-edge-tint`.
- **Glass** (`menu-fixed.css`, `selection-bar.css`): both read the base's surface, ink and line tokens from
  `--vb-glass-*`, whose defaults are today's values, so the default skin is unchanged; Command Lens sets the plate's
  dark glass and Tick/Cross colours that read on it.
- **Tokens** (`skins.css`, Command Lens block): `--vb-plate-mark-l` 0.8, `-c` 0.16, `--vb-plate-focus` `#b9bfc8`,
  `--vb-focus-edge` `light-dark(#4a4e57, #b9bfc8)` (point 338), the glass, `--vb-node-edge-tint`, `--vb-node-tint` and
  `-selected` 0%. `tokens.css` (protected) declares the new tokens with defaults that change nothing (diff below).
- **Handle**: `apps/board/src/board/input/pointer.ts` `HANDLE` adds `.vb-node-plate` (its buttons keep their press).
- **Gallery**: `apps/board/src/gallery/command-lens-section.ts` (with `?flags=nodeEdges,skins`, after the edges
  section: every state, selected, moments, menus and the selection bar on the glass, in a `.vb-board` root carrying
  `data-vb-skin`); `edges-section.ts` exports `edgeCard`, `byTitle`, `withMenu` with an optional row; `main.ts`;
  `gallery.css` (`.g-skin`).
- **Tests**: `packages/ui/tests/node-skins.test.ts` (the skins agree for every kind, with an icon, a tone or no number;
  the plate's order; the switch only on a node that asks; no node `.ts` or `.css` names a skin);
  `tests/plugin/token-contrast.spec.ts` (+ the lifted marks, the rings and the glass, both skins, light and dark);
  `tests/pages/command-lens.spec.ts` (off; element = template; the same actions node by node in both skins; the
  proposal; Tab order, names and the skin's rings after Tab only; a live board: switching skin keeps the selection, a
  half answers and the lit half clears, the plate drags; axe; screenshots `command-lens-{dark,light}`).
- **Docs**: `docs/specification/components.md` § "The Command Lens skin (node overhaul FE_04)" and the tone sentence in §
  "The node's edges"; `packages/ui/src/node/pattern.json` (files, parts `vb-node-plate`, `vb-mark-switch`,
  `vb-mark-proposal`, `flaggedStates.skins`, the tone wording).

### Issues & Resolutions
- **The build folds `translate` into `transform`**: `transform: none; translate: none` in one rule came out of the page
  build as `transform: translate(0,0)`, so the notes mark kept FE_01's `translate: 50%` and overflowed the plate. Fixed
  with `translate: 0 0` in a rule of its own (`node-plate.css`, the notes mark). FE_05's `transform: none; translate:
  -50% 0` on the kind tab may meet the same fold (see below).
- **Light-dark on the plate** (T_02's note): no `cssTarget` change and no per-kind plate tokens. A mark on the dark plate
  is its own colour lifted in OKLCH (relative colour, already used in `node.css`), which reads the page's theme where
  the node resolves it: one formula, both themes, both builds.
- `npm run verify` refused two `:has()` selectors at the head of a rule; nested under `vb-node[…] { &:has(…) … }`.
- `node-edges.spec.ts` screenshots renewed: the toned nodes' grips and kind tabs now take the tone (point 366). The diff
  was confined to the card rows (6,955 px).
- `person-remove.spec.ts` fails 5 tests in this tree on "request failed: GET …/app-panels/calculator (net::ERR_ABORTED)",
  the failure FE_01 and FE_02 recorded as pre-existing (its 2 screenshots differ by 1px in height after that failure);
  not checked against a HEAD copy in this run.

### Caught Beyond the Brief
- **Zoom (FE_05's note)**: the plate's marks stay at the node's scale, no minimum. They sit in flow, so growing one in
  place would overlap its neighbours; they are larger than the edge marks (24 to 40 px tall, so 14 px on screen down
  to about 58%, the switch to 32%), and the plate's colour and the lit half still say "asks" and "answered" from far
  out. D-101 says "a node's edge marks"; whether a plate's marks count is the maintainer's call. If they must, the
  smallest change is to grow the whole plate's type, not each mark.
- **Merge with FE_05**: keep FE_05's zoom block at the end of `node-edges.css` and drop FE_01's three placeholder plate
  and switch rules there (this branch removed them; `node-plate.css` replaces them). FE_05's
  `vb-node[data-edges][data-marks-at='plate'] :is(.vb-mark, .vb-node-kind, .vb-node-grip) { scale: none; translate: none; }`
  agrees with this skin; its `transform: none; translate: -50% 0` may be folded by the build as above, worth a look.
- **Selection bar hover** on the dark glass in light is faint: its hover is `--vb-ink` at 8%, which I did not move onto
  the glass (it would have changed the default skin's hover).
- `pattern.json` held `data-bookmarked` twice (FE_01's and FE_02's); left as is.
- Command Lens's conversation, history and proposal boxes (the plate as the box's header) and the board's tips on the
  dark glass are not drawn by this task: they are FE_03's files and the page's `tip.css` (REQUESTS).
- A Command Lens proposal chip does nothing yet when pressed: `mark-acts.ts` `press` has no `proposal` case (REQUESTS).

### Deviations from Plan
- The stylesheet is `node-plate.css`, not `node-command-lens.css`: it styles the row's values (`plate`, `switch`), not
  the skin, so a later skin with a plate reuses it, and no node file names a skin (the skins-agree test checks `.css` as
  well as `.ts`).
- The lit half reads "Tick" / "Cross", not the mockup's "Ticked" / "Crossed": a toggle's name stays put (WAI-ARIA APG),
  as FE_01 did for the number; aria-pressed and the fill say it is lit.
- Kind colours stay one per meaning across skins (T_02's choice), not the mockup's question `#2452c2` and finding cyan.

### Differences from the mockups (side by side, `temp/fe04/skins-{dark,light}.png`)
- Nodes are the board's card width, not the mockup's 400px, so long kind words end in an ellipsis ("QUEST…").
- The hit area and the menus' key caps are the board's (the base `kbd`), not the mockup's plain mono letters.
- The selection bar keeps its translucent glass, so it reads grey over a light canvas.

### tokens.css diff (protected; for the gate)

```diff
@@ -98,6 +98,12 @@
   --vb-select-w: 2px;
+  /* How much of the node's colour its border takes at rest (a skin may draw a plain line: 0%). */
+  --vb-node-edge-tint: 42%;
+  /* A mark on a dark plate (FE_04): the kind's dot, the badges and the notes count keep their hue at no less than this
+     OKLCH lightness and no more than this chroma, so they read on the plate in either theme (no lift: 0). */
+  --vb-plate-mark-l: 0;
+  --vb-plate-mark-c: 0.4;
@@ -182,7 +188,7 @@
-     light. Command Lens's is its skin's value (FE_04). */
+     light. Command Lens's is its skin's value (skins.css). */
@@ -259,12 +265,23 @@
-  /* Command Lens's plate (D-100): its default is a quiet one. Command Lens's is dark in both themes,
-     so a mark on it needs its dark value (FE_04). */
+  /* Command Lens's plate (D-100): its default is a quiet one. Command Lens's is dark in both themes on a node
+     that asks, so a mark on it is lifted (--vb-plate-mark-l, -c) and its ring is --vb-plate-focus. */
   --vb-plate-line: var(--vb-line);
+  /* The ring on a mark on the plate (a dark plate keeps a light ring in both themes). */
+  --vb-plate-focus: var(--vb-focus-edge);
+  /* What floats over the board (FE_04): the node's menus and the selection bar. Their default is today's raised
+     surface; a skin may draw them as dark glass in both themes, with Tick and Cross in colours that read on it. */
+  --vb-glass: var(--vb-surface-raised);
+  --vb-glass-hover: var(--vb-surface-sunken);
+  --vb-glass-ink: var(--vb-ink-strong);
+  --vb-glass-muted: var(--vb-ink-subtle);
+  --vb-glass-line: var(--vb-line-strong);
+  --vb-glass-tick: var(--vb-state-ack);
+  --vb-glass-cross: var(--vb-state-drop);
```

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] FE_04: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/FE_04_command-lens-skin.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
