---
category: board-agent
status: completed
created: 2026-10-11
tracker: cortex-tasks/tracker.md#N37
---

# Kiro reads the open repo's steering and skills; the picker follows the agent

> **Follows**: `2026-10-11_board-agent_kiro-agent-panel.md` · **From**: maintainer, 2026-10-11
> (chat 526 yes; N37 found in batch 2 VERIFY_01) · **Model**: Sonnet 5.5 · **Go**: given

## Rulings (maintainer; do not reopen)

1. The vision-board Kiro agent loads the open project's own steering always and its skills on
   demand: `resources` gains `file://.kiro/steering/**/*.md` (resolved from the working folder, which
   in the panel is the open project: research finding 5) and `skill://.kiro/skills/**/SKILL.md`.
   The board's written agent file (`packages/agent/src/kiro-agent.ts`) and the draft
   (`packages/agent/kiro/vision-board.agent.json`) change together; the board rewrites
   `~/.kiro/agents/vision-board.json` when its content differs (as built).
2. One short real Kiro round confirms it: a temp project with a `.kiro/steering/test.md` holding a
   harmless marker rule ("End every reply with the word MARKER") and a `.kiro/skills/x/SKILL.md`;
   the reply follows the steering marker; say whether the skill was listed. Spare port, temp project,
   not the board on 4466.
3. N37: choosing Kiro in the chat header shows Kiro's models (Opus 5.5, Sonnet 5.5) with Opus 5.5
   picked, and choosing Claude shows Claude's (Default, Opus 5.5, Sonnet 5.5), in every path
   (a fresh panel, a session in use, the new-session dialog).

## Steps

1. [x] Failing tests first: the agent text has the two resources; the picker follows the agent
   (unit and page).
2. [x] Build; docs (`packages/agent/README.md`, `docs/specification/chat.md` § Kiro).
3. [x] The real round (ruling 2), results in the notes; it may rewrite the real
   `~/.kiro/agents/vision-board.json` (approved file), nothing else in `~/.kiro`.

## Validation

- [x] The five gates exit 0, one after another (results in the notes).

## Constraints

- Project rules (`.kiro/steering/vision-board-proj.md`); `packages/agent` imports nothing from this
  repo. No git commits or stash. Scratch in the system temp folder; stop only your own processes and
  leave none running; never touch `.visionboard/`; don't use the board on 4466.
- Fill Implementation Notes below and append your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-11 (Sonnet 5.5).

**What was built**
1. Tests first: `packages/agent/tests/kiro-agent.test.ts` (the draft and the written file hold the two
   `resources`, relative); `apps/board/tests/chat-panel.test.ts` (`shownModel`); `tests/pages/chat-send.spec.ts`
   (the picker follows the agent: Claude session in use to Kiro, New session, a Kiro session recorded with no
   model after a reload, and back to Claude). `tests/pages/chat-server.ts` now also offers a `kiro` adapter (the
   same fake process under the name `kiro`; only the picker and the session record are under test there).
2. `packages/agent/kiro/vision-board.agent.json`: `resources` = `file://.kiro/steering/**/*.md` and
   `skill://.kiro/skills/**/SKILL.md`, relative on purpose (research finding 5: `file://` resources resolve from
   Kiro's working folder, which in the panel is the open project). `kiro-agent.ts` needed no change: it copies
   the draft, so the written file carries them and is rewritten once because its content now differs.
3. `apps/board/src/board/chat-panel.ts`: `shownModel(agent, model)` (the model recorded, else the agent's first:
   Kiro with none runs Opus 5.5) and `shownPick(session, refused, pick)` behind one `current()` used by the header,
   the pick and New session (see the N37 finding). File kept at 300 lines.
4. Docs: `packages/agent/README.md` (Kiro, The agent), `docs/specification/chat.md` § Kiro.

**N37 finding**: ruling 3's `MODELS.kiro`, `firstModel` and the pick path were already in HEAD (2f725ba, before
batch 2's VERIFY_01), so a fresh panel and a session in use already offered Kiro's two models with Opus 5.5 picked.
The page test for those paths passed without a code change. The paths that could still show the wrong thing, now
fixed with one `shownPick(session, refused, pick)` for the header, the pick and New session: (a) a Kiro
session recorded with no model (started through the API, or earlier) now shows Opus 5.5 (`shownModel`); (b) a
refused start (Kiro 422) with another session in use left the header on that session's agent, so the picker
showed Claude's "Default" options right after Kiro was chosen; it now shows the pick (Kiro, Opus 5.5) while the
composer says why. (b) is unit-tested only (`chat-panel.test.ts`): a refused start is a 4xx the page-test fixture
treats as a failure. I could not reproduce the maintainer's exact observation from the code alone; (a) and (b) are
the two ways the code could show it. [INFERENCE]

**Real round (step 3)**, kiro-cli 2.29.1, a script in the session scratchpad: an in-process board server on port
4481 (not 4466) over a temp project with `.kiro/steering/test.md` ("End every reply with the word MARKER.") and
`.kiro/skills/x/SKILL.md` (name `x`, a harmless greeting skill), real home, `kiroAgent: true`, the real Kiro adapter;
`start_folder_chat` `{ agent: 'kiro', model: 'claude-opus-5.5' }`, one message asking for a hello and the names of
the skills in its context.
1. Start 201, model `claude-opus-5.5`. The server rewrote the real `~/.kiro/agents/vision-board.json`: the only
   difference from the file before is the two `resources`. Nothing else in `~/.kiro/agents` was touched.
2. The steering was followed: the reply ended with "MARKER".
3. The skill was listed: "The only skill listed in my context is **x**, a test skill about greeting people politely."
4. Housekeeping: the temp project and tap file were removed, the server stopped, no process left. A first attempt
   (my own reader timed out at 10 s; the server and Kiro were closed) and the round each left a Kiro session record in
   `~/.kiro/sessions/cli/` (ids `5b15d3fd-ca31-4616-a6ab-4515665f77be`, `7e4fe612-3703-471f-95ab-3a8056ef94d2`);
   remove with `kiro-cli chat -d <id>` if wanted.

**Issue to report**: the maintainer's board on 4466 (`board:watch`, started before this change) does not watch
`packages/agent`, so it keeps the old agent text in memory until restarted; the file on disk is already the new one.
Project steering that Kiro now loads also goes into every panel turn's context, so a large `.kiro/steering` costs tokens.

**Validation**: `npm test` (1056 pass + 6 timing), `npm run check`, `npm run verify` (0 warnings), `npm run gen -- --check`, `npm run test:pages` (359 pass) all exit 0, run one after another. The only node processes left are the maintainer's own (`board:watch` 27205, a `--test` run 94058: not started here).
