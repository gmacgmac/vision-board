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

**Status**: Completed · **Completed**: 2026-10-29

### Changes Made
- `packages/chat`: `events.ts` (`ReadFacts`, scope `folder`, `ApprovalRequest.expiresAt` optional + `scopes`, the events `chat-allowed` and `chat-forget`); `feed-core.ts` (`ApprovalEntry.expiresAt?`, `scopes?`); `approval/` (`choicesFor`: the answers a request lists, Deny last, none listed = once and session; `msLeft(undefined)` is Infinity and `timeLeft` empty, `approvalView.timed`, no countdown and never "expired" without `expiresAt`, "Waiting for your answer"; "File read" / "Folder search"; "Allowed for this folder"); `conditions.ts` + `composer/composer-core.ts` (`ChatHost.queues`: busy and waiting rows `queued`, the hints); `header/` (`allowedLabel`, `allowedTemplate`, the list as a disclosure under the status: button with count, region of each yes in words with Forget; kept across the header's redraws; Esc, press outside or the button closes; focus kept after a Forget).
- Board: `shell/chat-allowed.ts` (new: the list, Forget with the confirm dialog, `forget_permission`; agentAccessRules flag), `chat-panel.ts` (`queues` from workAlongside, the header's `allowed`, the list read when the drawing comes, when it opens and when a `folder` answer lands), `page-io.ts` (`listPermissions`, `forgetPermission`, `FolderPermission`), `words/chat.ts` (the Forget confirm).
- Gallery section `folderAccess` (last; `folder-access-section.ts`), new baselines `folder-access-{dark,light}`.
- Tests: `packages/chat/tests/folder-scope.test.ts` (written first; `msLeft(undefined)` was NaN), `tests/pages/chat-folder.spec.ts`; two existing assertions follow the new words (`approval.test.ts` `choicesFor`; `chat-context.spec.ts` hint with workAlongside).
- Docs: `docs/specification/chat.md` (the "In the chat" bullet; words alone queue), `packages/chat/README.md`, the three `pattern.json`.

### Caught Beyond the Brief
- The brief says "the chat header's existing menu": the header had none, and `packages/chat` imports nothing from the repo, so it cannot use `#ui`'s menu. Built a disclosure in the header (aria-expanded button, region), as the composer's preview is, in `packages/chat`.
- `page-io.ts` (outside my files) got the two calls: the page's one I/O module, no other place for them.
- Gallery: my samples first reused `g-chat-sample`, which `chat.spec.ts` and `chat-follow.spec.ts` count and select by `data-state`; renamed `g-access-sample`.
- Page specs on a machine at load 15-28 sometimes hang 15 minutes in a gallery test's teardown (30 s timeout, renderer at 100 %); the same tests pass alone. Not the code: the interaction runs in 70 ms by script.

### Deviations from Plan
- The header menu above (no existing menu). Words in `packages/chat` are inline as the package's existing sentences are (it is in `NOT_SCANNED`); the board's new sentences are in `shell/words/chat.ts`.

## On Completion

Notes; your row in TASK-STATUS.md; one LOG line (`[board-ui] ASK_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS` for anything outside your files.

**Constraints**: deviation → stop and ask; no PII; no commits; never 4466; never `cortex/AUDITED.md`; no test starts a real CLI.
