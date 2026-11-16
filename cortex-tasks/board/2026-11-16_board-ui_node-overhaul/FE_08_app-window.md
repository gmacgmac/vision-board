# FE_08_app-window: The App Window

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Turn an app node into a window: one thin title bar and nothing else of the board's, with a conversation drawer on
its right that pushes its neighbours aside, behind `appWindow`; and finish what the spike left open.

---

## Context

PLAN.md § Decision 18 (tracker U20) and the handover (`cortex-tasks/board/2026-11-11_board-ui_app-window-handover/HANDOVER.md`
§§ 3 and 5). The spike built Open (the stage), a panel's note and the agent's reply to it, behind `appStage`. Its
gaps: no gallery entries or page specs, WebKit unchecked, focus not held on the stage. The maintainer disliked the
app card's look and notes drawn under the app. DESIGN_01 drew the app node's states. The sandbox is never loosened:
the frame stays `sandbox="allow-scripts"` with an opaque origin, and tools still need the person's Allow.

**Read previous task notes in TASK-STATUS.md before starting.**

---

## Inputs

- **Files to modify**: `packages/ui/src/node/` (`node-app.ts`, `node-app-apply.ts`, `node-app.css`, the template's
  app parts, `pattern.json`), `packages/ui/src/app-frame/`, `packages/ui/src/words/` (`node-app.ts`,
  `app-frame.ts`), `packages/ui/tests/`, `apps/board/src/board/apps/`, `apps/board/src/board/notes/` (the drawer),
  `apps/board/src/board/canvas/` (the node's width with its drawer open), `apps/board/src/gallery/`
  (`app-section.ts`, `app-frame-section.ts`), `apps/board/tests/`, `tests/pages/` (`app-*.spec.ts`, new specs),
  `docs/specification/apps.md`, `docs/specification/components.md`
- **Files to reference**: `CODE-MAP.md` § 15; `design/mockups/node-states/` (the app node); the handover's
  `check.mjs` and `demo-board.json`; `skills/vision-board/examples/apps/mission-control/`
- **Shared artifacts to reuse**: the conversation box (FE_03), the edge marks and menus (FE_01, FE_02), the skin
  registry (both skins draw the window), T_02's tokens
- **Skills**: `cortex-architecture`, `cortex-docs`

> Modify only the files this task owns. Need a change elsewhere? List it under `REQUESTS`.

---

## Steps

1. [ ] **The window** (with `appWindow` on): a thin title bar holding the number (Bookmark, as on any node), the
       app's name, Allow or Allowed (today's control), the drawer arrow with the notes count and its unread state,
       and Open. No coloured border, no footer, no notes under the app. Everything under the bar is the app's. In
       this mode an app node offers no Save for later (hide it in the number menu and the right-click list; T_04
       changes the node type's own list).
2. [ ] **The drawer**: the arrow shows and hides the node's conversation (FE_03's box, docked to the window's right
       at its height, a comfortable chat width). Open, the node is wider by the drawer and the layout makes room,
       so neighbours move aside; closed, they return. It remembers open or closed per node for the session.
3. [ ] **The stage**: Open fills the page as the spike does, the title bar and the drawer come along, focus is
       held inside until Back or Escape and returns to the node after. Check it in WebKit (`npm run test:plugin:webkit`
       shows how the project runs WebKit) and record what you saw.
4. [ ] **Panel notes and replies** (the spike's channel): keep them, shown in the drawer's thread like any note and
       reply; add the gallery entries and page specs the spike lacked; hold the 2,000-character limit and the
       refusals in tests.
5. [ ] **A stuck panel**: show that a panel in a tight loop cannot freeze the board's own controls, or report
       plainly what it can freeze and what would fix it.
6. [ ] Every app state (`APP_CARD_STATES`) drawn in the window, both skins, light and dark; `pattern.json`,
       `apps.md`, `components.md` updated.

---

## Validation

- [ ] `npm run verify`, `npm run check`, `npm test` pass; every `app-*.spec.ts` passes with the flags off and no
      new baseline; the new specs pass with `?flags=nodeEdges,skins,appWindow,appStage`
- [ ] `tests/pages/app-safety.spec.ts` passes unchanged; the frame's `sandbox` and the panel CSP are unchanged
      except where `apps.md` already says
- [ ] Opening and closing the drawer never reloads the panel (test)
- [ ] A look in a browser with the mission-control app: window, drawer, stage, Escape, light and dark

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

**Status**: Pending  
**Completed**: YYYY-MM-DD HH:MM  

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- None / [what you noticed that this task didn't ask about]

### Deviations from Plan
- None / [Describe if any, and why approved]

---

## On Completion

1. Fill in Implementation Notes above; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append **your own** LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:

   ```
   [[YYYY-MM-DD HH:MM]] [board-ui] FE_08: [what you did] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/FE_08_app-window.md]]
   ```

   Cite files by path + symbol, never by line number. Never write the set's entry or to `AUDITED.md`.
