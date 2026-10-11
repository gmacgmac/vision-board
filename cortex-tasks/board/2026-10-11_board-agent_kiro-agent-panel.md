---
category: board-agent
status: completed
created: 2026-10-11
tracker: cortex-tasks/tracker.md#N34
---

# The chat panel starts Kiro as the vision-board agent, on a chosen model

> **Follows**: the research `2026-10-11_board-agent_kiro-agent-config.md` (read it first; its
> findings are the evidence) · **From**: maintainer, 2026-10-11 (chat 513, 514, 518) · **Model**:
> Opus 5.5 · **Go**: given

## Rulings (maintainer; do not reopen)

1. **The board writes one Kiro agent file at start-up**: `~/.kiro/agents/vision-board.json`, kept
   current (rewritten when its content differs), from the repo's draft
   (`packages/agent/kiro/vision-board.agent.json`) with the prompt as an absolute `file://` path to
   `skills/vision-board/SKILL.md`. Only that file, only that name; nothing else in `~/.kiro` is
   touched. A failure to write it is reported in the panel when Kiro is chosen, never fatal.
2. **Kiro starts as that agent**: `kiro-cli acp --agent vision-board --model <choice>`, and the
   adapter checks `session/new` reports `modes.currentModeId == "vision-board"`; anything else stops
   the session with a clear error (a missing agent silently starts `kiro_default`).
3. **Models**: the picker offers only Opus 5.5 (`claude-opus-5.5`, the default) and Sonnet 5.5
   (`claude-sonnet-5.5`) for Kiro. Never `auto`. A model the session's `availableModels` doesn't
   list is refused with a clear message before the first prompt.
4. **Effort high** for both (`--effort high`).
5. The skill is no longer pasted into Kiro's first message once the agent carries it (one source).
   Claude is unchanged.
6. Writes and shell commands still pause for Allow/Deny (they stay out of `allowedTools`); `@vb`
   calls are pre-approved by the agent.

## Steps

1. [x] Failing tests first (fake Kiro, temp home): the agent file written, rewritten only on change,
   prompt path absolute; `--agent`, `--model`, `--effort` passed; a wrong `currentModeId` stops the
   session; an unlisted model refused; the picker's Kiro options; no `auto`.
2. [x] Build: one module for the agent file (`packages/agent` or `apps/board/server`, whichever the
   layers allow; it writes under the real home only at run time, tests inject a temp home); the
   adapter changes in `packages/agent/src/kiro*.ts`; the picker in `apps/board/src/board/chat-panel.ts`.
3. [x] Docs: `packages/agent/README.md`, `docs/specification/chat.md`; propose the steering line
   (protected) for "Running the board and connecting an agent".
4. [x] One short real Kiro round through a test server (spare port, temp project): the agent loads,
   the model answers, a `vb` call needs no prompt. Don't use the board on 4466.

## Validation

- [x] The five gates exit 0, one after another (orchestrator: `npm test` 992 + 6, `check`, `verify`, `gen -- --check`, `test:pages` 332, after stopping three test servers a page run had left behind).

## Constraints

- Project rules (`.kiro/steering/vision-board-proj.md`): patterns first, one job per file about 300
  lines (500 hard), tests first, `packages/agent` imports nothing from this repo (D-036, D-037).
- If deviation is needed, stop and say so. No git commits or stash. Protected files: propose
  wording. Scratch in the system temp folder; stop only your own processes; never touch the repo's
  `.visionboard/`. Real `~/.kiro` writes: only ruling 1's file, and only in step 4's real round.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-11 (Opus 5.5).

**What was built**
1. `packages/agent/src/kiro-agent.ts` (new): `KIRO_AGENT` (`vision-board`), `kiroAgentFile(home)`,
   `kiroAgentText(prompt)` and `writeKiroAgent(home, prompt)` (the draft with `prompt: file://<absolute>`,
   written only when the text differs, folders made, nothing else in `.kiro` touched, a relative prompt
   refused, a write failure thrown); `KIRO_DEFAULT_MODEL` (`claude-opus-5.5`), `KIRO_EFFORT` (`high`);
   `sessionProblem(answer, model, strict)`: not the agent (`modes.currentModeId`), or the model not in
   `models.availableModels`. It lives in `packages/agent` beside the draft; the skill path comes from the
   host, so the package still imports nothing from the repo (D-036, D-037).
2. `packages/agent/src/kiro.ts`: starts `kiro-cli acp --agent vision-board --model <model> --effort high`
   (model: the host's, else `claude-opus-5.5`; `auto` refused in `start`); `session/new` is checked
   strictly, `session/load` on what it reports; a failed check ends the process and `start` throws
   ("Kiro started as kiro_default, not the vision-board agent. Kiro looks for it in
   ~/.kiro/agents/vision-board.json ..."; "Kiro does not offer the model X here. It offers: ...").
   The instructions file is no longer read or pasted for Kiro (ruling 5); Claude unchanged.
3. Board server: `chat-access.ts` `keepKiroAgent(home)` writes the file with `INSTRUCTIONS_FILE` (the repo's
   `skills/vision-board/SKILL.md`) and returns the reason when it can't; `app.ts` calls it at start when
   `chat.kiroAgent` is set (server.ts sets it unless `VB_KIRO_AGENT=0`); a reason becomes
   `chat-sessions.ts` `blocked.kiro`, so a Kiro start answers 422 (a resume 409) with it, shown in the
   panel's composer; nothing else stops. `project.ts` passes `blocked` through.
4. Panel: `MODELS.kiro` = Opus 5.5 (`claude-opus-5.5`) and Sonnet 5.5 (`claude-sonnet-5.5`); `firstModel`
   gives Opus 5.5 when Kiro is picked (Claude still gets its Default). No `auto`.
5. Tests (written first, seen failing): `packages/agent/tests/kiro-agent.test.ts` (new); `kiro.test.ts`
   (args, missing agent, unlisted model and `auto`, no instructions in any message); `fake-kiro.ts` now
   starts as `--agent` only when `$HOME/.kiro/agents/<name>.json` exists and answers `modes`/`models` the
   way kiro-cli 2.29.1 does (temp home in every test); `apps/board/tests/api-chat-kiro.test.ts` (the file
   written at start under a temp home, the args, the message as the person wrote it, a blocked write
   refusing Kiro with the reason); `chat-panel.test.ts` and `tests/pages/chat-send.spec.ts` (Kiro's two
   models in the picker, Opus 5.5 picked).
6. Docs: `packages/agent/README.md`, `docs/specification/chat.md` § Kiro, `apps/board/README.md`,
   `docs/specification/modules.md` (`npm run map`).

**Deviations / decisions within the rulings**
1. The page tests' servers run `apps/board/server.ts` with the real home, so they would have written the
   real agent file (with a second checkout's path, at that). Added `VB_KIRO_AGENT=0` (server.ts) and set
   it in `tests/pages/playwright.config.ts`. In-process test servers write only when a test passes
   `chat: { kiroAgent: true }`, always with a temp home.
2. Ruling 1's "reported in the panel when Kiro is chosen" is a refused start: the composer shows the reason
   (as any refused start does). No separate notice.
3. A loaded session (`session/load`) is checked only on what it reports (the fake answers `{}`; the real
   answer was not exercised in step 4, research open question 2 still stands).

**Real round (step 4)**, kiro-cli 2.29.1, a script in the session scratchpad: an in-process board server on
port 4479 over a temp project, real home, `chat: { kiroAgent: true }`, the real Kiro adapter with a protocol
tap; `start_folder_chat` `{ agent: 'kiro', model: 'claude-opus-5.5' }`, then one message.
1. Start 201. `session/new` answered `modes.currentModeId: "vision-board"`, `models.currentModelId:
   "claude-opus-5.5"`, `availableModels` as `{ modelId, name, description }` (the shape the check reads).
   Kiro's session record: `agent_name: "vision-board"`, `overrides.output_config.effort: "high"` (the
   model schema's default now reads `medium`, so the flag matters).
2. The model answered: one `write_board` (board `round-check`, card 1, head 4), done, then one closing line
   and no narration: "I've created the \"Round check\" board (round-check) with one card, 1 \"The Kiro
   agent works\"."
3. `vb` needed no prompt: 0 `session/request_permission` in the trace, no approval event.
4. `~/.kiro`: `agents/vision-board.json` was already current (see below), so the round did not rewrite
   it. Kiro itself saved the round's session (`~/.kiro/sessions/cli/f49699c4-0520-4c52-967b-a53927a72b64.*`);
   remove with `kiro-cli chat -d f49699c4-0520-4c52-967b-a53927a72b64` if wanted. The temp project was removed.

**Issue to report**: the maintainer's `npm run board:watch` (port 4466) restarts its server when server code
changes, so it picked up the new `server.ts`/`app.ts` mid-build (12:22) and wrote the real
`~/.kiro/agents/vision-board.json` before step 4. Its content is exactly ruling 1's file (prompt
`file:///Users/gm/.../vision-board/skills/vision-board/SKILL.md`); it was left in place. That board now
runs this change.

**Proposed steering line** (protected; `.kiro/steering/vision-board-proj.md` § Running the board and
connecting an agent), not applied:
> - Kiro in the chat panel runs as the `vision-board` agent: the board keeps
>   `~/.kiro/agents/vision-board.json` current when it starts (its prompt is this repo's
>   `skills/vision-board/SKILL.md`) and starts `kiro-cli acp --agent vision-board --model <claude-opus-5.5 |
>   claude-sonnet-5.5> --effort high`. `VB_KIRO_AGENT=0` leaves `~/.kiro` alone.

**Validation**: VALIDATION_PENDING
