# ASK_01_folder-scope-ui: Allow for this folder, and forgetting it

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The chat's approval question offers "Allow for this folder" when the policy allows that scope, and the
chat lets the person see and forget what they allowed for the folder.

## Inputs

- **Files to modify**: TASK-STATUS.md File Ownership (ASK_01)
- **Files to reference**: WIRE_01's notes (the operations, the scopes the server sends with a question),
  `packages/chat/src/approval/` (its pattern and states), the chat header's menu
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. **Failing tests first** (`tests/pages/chat*.spec.ts`, 5500): a question inside the folder shows four
   answers (Allow once, Allow for this session, Allow for this folder, Deny), one outside shows three
   (no folder); the folder answer is kept (a second ask in a new session doesn't come); the header menu's
   "Allowed for this folder" lists each kept yes in words ("Write files in src/", "Run npm test") with
   Forget; Forget asks first, then the next such call asks again. Keyboard only, axe, light and dark.
2. **The approval pattern**: the third allow button in its states; words in the chat's words file.
3. **The list**: in the chat header's existing menu; reuse the menu and confirm patterns.
4. **Gallery**: the question with four answers, the list, light and dark (sections last).
5. **Checks**: unit, `check`, `verify`, `gen-api --check`, chat specs on 5500.

## Implementation Notes

**Status**: Pending · **Completed**:

### Changes Made
-

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-ui] ASK_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI.
