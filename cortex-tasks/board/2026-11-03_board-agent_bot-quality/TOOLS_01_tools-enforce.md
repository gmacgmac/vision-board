# TOOLS_01: The Tools Enforce The Rules, And Reads Say What The Bot Needs

**Skills**: cortex-architecture, cortex-docs · **Model**: strong · **Wave**: 1 · **Branch**: `feat/bot-tools`

## Objective

Move the rules the plugin bot broke, and the facts it lacked, out of prose and into the tools: one source
(`openapi.json` and the tool table), per host (`x-hosts`, D-080), behind one flag on by default.

## Inputs

PLAN.md; the live run's findings (`2026-11-03_board-agent_plugin-skill-live-run.md` § Findings, § Caught
Beyond the Brief); `docs/specification/plugin.md` (§ Tools, § The bot); `docs/specification/api.md`;
`scripts/gen-api.mjs`, `scripts/gen-tools.mjs`; `apps/board/server/words/plugin-tools.ts`;
`packages/mcp/src/protocol.ts` `createMcpServer`, `packages/mcp/src/info.ts`.

## Steps (design first, in your notes, then build; failing test before each change)

1. **No holding the turn under a host.** A host's bot gets `check_responses` without `wait` in its schema,
   generated, not hand-edited; the engine answers a plugin caller's `wait` without waiting, with words that
   say the person's Send brings the answers and to end the turn (decide refuse vs. answer-now and say why).
   Standalone keeps `wait` (terminal agents poll).
2. **The right instructions per host.** `createMcpServer` sends a host's bot words from the plugin's words
   (no `join`, no `wait`), from one home; standalone's unchanged.
3. **Reads tell the truth.** `get_board` (and `show_node` if it has the same gap) marks each note answered or
   owed by this bot, from the same rule `list_open` `pending` uses (one source). A bot can tell a board it
   holds: `list_boards` / `get_board` say so for the caller, so it never asks a grant it has.
4. **A key conflict helps.** The `conflict` answer names what the key already holds and how to make a new one;
   consider whether a key that repeats with the *same* item should be a quiet success (idempotent) rather than
   a conflict, and decide by the ledger rules (append-only, D-017).
5. **Flag** in `packages/format/src/flags.ts`, on by default; off is today's behaviour exactly (test both).
6. **Contract**: `openapi.json` first, `gen-api`, `info.version` bumped; words in words files; docs:
   `api.md`, `api-reference.md` (generated), `plugin.md`. Seam types: if `plugin.d.ts` changes, follow D-078
   (decide whether it is breaking, set `SEAM_TYPES`, bump `SEAM` only if breaking) and say which in notes.
7. **Checks** (`nice -n 15`, 3 workers): `npm test`, `npm run verify`, `check`, `gen-api --check`,
   `test:plugin` on 6110, the page specs you touch and the agent/MCP ones on 6210.

## Validation

Each of 1–4 held by a named test that failed first; flag off proven unchanged; gates green.

## Notes

Constraints: worktree only, no commits, no LOG/AUDITED, never 4466, no protected files. Decision drafts
(a new D- entry) in your notes for the morning. STOP and report if a change would break the standalone app's
agents (Kiro, Claude Code through `vb-mcp`).

## Implementation Notes

### Design (written before building; Opus 5.5, sub-agent)

One flag, `botToolRules` (`packages/format/src/flags.ts`, on). The engine reads it from its own `flags` (`EngineOptions.flags`,
as `svgImages`); the standalone server now passes its `VB_FLAGS` to the engine too (`project.ts` `getEngine`), so
`VB_FLAGS=-botToolRules` reverts the standalone side as well. Off is today's behaviour exactly.

1. **No holding the turn under a host.** Contract first: the `wait` parameter in `openapi.json` gains `x-hosts:
   ["standalone"]` (who gives an *input*, as `x-hosts` on an operation says who gives a tool, D-080). `gen-tools.mjs`
   writes it into the tool table as the row's `inputHosts: { wait: ["standalone"] }` (only on a row that has one);
   `gen-api.mjs` `toolTableWithHosts` checks every host named. The MCP list (standalone) is unchanged. The engine
   (`engine/tools.ts` `makeTools`), flag on, lists each plugin tool's input without the inputs not given to `plugin`
   and checks calls against that input; the description loses its `wait` sentence by a flag-only edit
   (`words/plugin-tools.ts`). **Refuse, not answer-now**: a call with `wait` is `invalid`, with words that the
   person's Send brings their answers in their next message and to end the turn, and nothing is read or held. Why:
   (a) the schema the bot was given has no `wait`, and every other input outside a schema is refused
   (`additionalProperties: false`); quietly dropping this one would be the one input the engine ignores;
   (b) an answer-now looks like a wait that ended, so a bot asked to wait calls again: a poll loop; a refusal is a
   distinct signal carrying the instruction; (c) it costs one call, once, and with no `wait` in the schema a bot
   rarely sends it. Standalone (`vb-mcp`, `route`) keeps `wait`: terminal agents poll.
2. **The right instructions per host.** `#mcp` `ToolHost` gains an optional `instructions`; `createMcpServer({ tools })`
   sends `tools.instructions` when given, else standalone's joined text as today. The engine's `tools.instructions`
   (flag on) is standalone's joined instructions less what a host's bot doesn't have, by from/to edits in the one
   plugin words home (`words/plugin-tools.ts` `instructionEdits`, the same pattern as `descriptionEdits`): no `join`,
   no `secret`, no `wait`, no `wrong-folder`; and it says the Send brings the answers. `vb-mcp` is unchanged.
   Seam: `EngineTools` gains an optional member the host is given and may ignore: **not breaking** (plugin.md § The
   seam version); `SEAM_TYPES` set again, `SEAM` unchanged.
3. **Reads tell the truth.** A note in `get_board` (`state.items[].notes`, `state.containerNotes`), `show_node` (and its
   `linked`) and `show_container` carries `owed: true` when it waits for the caller's answer, from the same rows
   `list_open`'s `pending` and `containers` read (`#actions` `conditionsOf`: `item.owed`, `container.owed`, scoped to
   the agent). `list_boards` (each board) and `get_board` carry `held: true` when the caller holds the board, by the
   same test `request_grant` answers `held: true` by (`#actions` `holders`). Contract: `common.schema.json` `note.owed`,
   `list-boards-response` / `get-board-response` `held`. One file for both marks (`engine/caller-marks.ts`).
4. **A key conflict helps.** The same key with the same content is already a quiet replay (api.md 29, `write-replay.ts`):
   the first result, nothing written. That stays. Other content under a used key stays a `conflict`: a key names one
   ledger line forever (D-017, append-only), so a quiet success would drop the bot's new content unseen. Flag on, the
   conflict's words say what the key holds (card n "title" version v, or the line's kind and seq), that changing that
   card means writing it with its `n` under a new key, and name a free key (`<key>-2`, the first suffix this agent has
   not used). Words only: no contract shape changes.
5. **Contract**: `info.version` 1.38.0 → 1.39.0 (adds only). Docs: `api.md` point 171, `plugin.md` § The bot / § Tools,
   `api-reference.md` generated.

### What was built (as designed, with these differences)

- **Marks only for an agent caller.** First built as "no agent: every agent's owed notes"; `board-data.test.ts` (the
  page's fold equals `get_board`) showed a no-secret read would change. A read with no agent has no "you", so it is
  unmarked and exactly as before (`caller-marks.ts` `marksFor`).
- **Grant wording.** Standalone's "call `request_grant` once ... and wait for the answer" would also invite a held turn
  under a host; the plugin's instructions say "and end your turn: the person answers it on the board".
- **The instructions moved to their own file**, `packages/mcp/src/instructions.ts` (`INSTRUCTIONS`, `INSTRUCTIONS_JOINED`,
  same text, same exports from `#mcp`). Importing them from `info.ts` pulled `MCP_BIN`'s `import.meta.url` into the
  engine bundle (`plugin-build.test.ts` "the engine bundle ... knows no path of its own" failed); `/* @__PURE__ */` did
  not drop it. `docs/specification/modules.md` regenerated (`npm run map`) for the new export group.
- **Free key** steps past a trailing number: a conflict on `fee-2` offers `fee-3`, never `fee-2-2`.
- **`engine.test.ts`** "a held call ends when its host's signal does" runs with the flag off (on, there is no held call
  through the tools); its listing test applies the flag's edits. **`engine-hooks.spec.ts`** "route and tools.call" now
  holds through `route` (kept) and checks the tools refuse `wait`.

### Seam (D-078): not breaking

`plugin.d.ts` changed: `EngineTools` gained `readonly instructions?: string`, a member the host is given and may ignore,
so `SEAM_TYPES` is set to the new hash (`054c27ef...`) and `SEAM` stays 1. The behaviour change (`tools.call` with `wait`
is refused) was weighed against plugin.md's rule "a promise ... that now means something else": the host makes no such
call, its bot does, and the bot's schema no longer offers `wait`; a call outside the schema answering `isError` with words
is the page's existing promise. A host built for 1 survives (compiler and behaviour), so not breaking. **For review**: a
stricter reading would raise `SEAM` to 2; no host is built yet, so either costs nothing today.

### Ownership note

The contract's response schemas (`packages/format/schema/api/common.schema.json`, `get-board-response.schema.json`,
`list-boards-response.schema.json`) are outside the File Ownership list's literal `openapi.json`, but they are the
contract `openapi.json` `$ref`s and the task's step 6 ("`openapi.json` first"); no other wave-1 task touches them. Also
touched as generated or as tests of what changed: `packages/format/src/api-types.generated.ts`, `docs/specification/modules.md` (generated map),
`packages/mcp/README.md`, `apps/board/tests/{engine,openapi,plugin-types}.test.ts`, `tests/plugin/engine-hooks.spec.ts`.

### Decision draft (for the morning; append as D-083 only with the maintainer's yes)

> **D-083. The tools keep a bot's rules; the reads give it the facts** (2026-11-03, points 393, 394; bot-quality TOOLS_01).
> 1. A rule a bot must not break is held by its tool, not its instructions: an input it may not use is missing from its
>    schema and refused when sent; prose carries only judgement. Who gives an input is said once, `x-hosts` on the
>    parameter in `openapi.json`, as for a tool (D-080), and generated into the tool table (`inputHosts`).
> 2. Under a host, `check_responses` has no `wait`; one sent is refused at once (`invalid`, words: the Send brings the
>    answers, end the turn), never answered as if it had waited. Standalone keeps `wait`.
> 3. The MCP instructions are per host: tools may carry their own (`ToolHost.instructions`); the engine's are the
>    plugin's, made from standalone's by edits in the plugin's words.
> 4. A read tells an agent caller what is true for it: `owed` on each note it owes (the `item.owed` / `container.owed`
>    rows, one rule with `list_open`), `held` on a board it holds (the test `request_grant` uses). A person's read is
>    unmarked.
> 5. A key repeated with the same content stays a quiet replay; with other content, a conflict whose words say what the
>    key holds and name a free key. A key names one ledger line for good (D-017).
> 6. All behind `botToolRules`, on; off is the revert. Not a seam break (`SEAM` 1).

### Notes for SKILL_01 and the eval

- With the flag on, the plugin bot's `check_responses` schema has no `wait`, its description says the Send brings the
  answers, and a `wait` sent is refused with "end your turn". Finding 1 (holding the turn) should not reproduce; the
  skill's line "Never hold your turn open: no `check_responses` with `wait`" is now backed by the tool.
- `get_board` / `show_node` / `show_container` mark `owed` on the note the bot owes; `list_boards` / `get_board` mark
  `held`. Findings 4 and 6a have the facts in the reads; the skill may point at `owed` and `held` (skill-edits.ts) if the
  eval shows bots still miss them.
- A key conflict's words now name the card and a free key (finding 3: fewer wasted calls; the key scheme is still the
  skill's to teach).
- The engine's `tools.instructions` is the plugin text; a harness that passes `engine.tools` to `createMcpServer` sends it
  (the live run's pass-through stripped `instructions`; an eval that wants the real host behaviour should not).

### Verification (all `nice -n 15`, at most 3 workers)

- Failing first: `apps/board/tests/bot-tool-rules.test.ts` (6 of its tests failed before the change: wait, instructions,
  owed, held, conflict; the flag-off ones passed, as they must) and `scripts/gen-tools.test.mjs` "x-hosts on an input".
  Now 9/9 and 5/5.
- Unit suite (`npm test`'s globs): 2217/2217. `gen-api --check`: current. `verify`: ok (warnings only; `flags.ts` 328
  lines, warned before at 322). `check`: svelte-check 0 errors, `tsc` clean.
- `test:plugin` on 6110: 79/79. Page specs on 6210 (agent and read users): `access-by-bot`, `send-access`, `chat-send*`,
  `picker-archive`, `lock-board`, `versions`, `size`: 78/78.
- `test:timing`: 13/14 on the last run; "the server starts on a 100,000-event ledger in under 1000 ms" fails under the
  machine's load (load average 38, three tasks running), and fails the same in the `tidy` worktree without these changes
  (1.9 s and 1.7 s there, 1.3 s and 2.5 s here): load, not this change. Earlier runs also had search, markdown and layout
  timings fail under the same load, none touched here.
- Nothing left running; 6110 and 6210 free.

### Return Contract

```
TASK_ID: TOOLS_01
STATUS: completed
FILES: packages/format/schema/openapi.json; packages/format/schema/api/{common,get-board-response,list-boards-response}.schema.json;
  packages/format/src/flags.ts; scripts/gen-api.mjs, gen-tools.mjs, gen-tools.test.mjs; generated: packages/format/src/
  {tools.generated.json,api-types.generated.ts}, packages/mcp/src/tools.generated.json, docs/specification/api-reference.md,
  docs/specification/modules.md; packages/mcp/src/{call-tool,protocol,info,index}.ts, instructions.ts (new), README.md;
  apps/board/server/engine/{tools,engine,operations,reads,writes}.ts, caller-marks.ts (new); apps/board/server/
  {project,write-board,write-refs,write-replay}.ts; apps/board/server/words/{plugin-tools,writes}.ts; apps/board/plugin/seam.ts;
  apps/board/tests/bot-tool-rules.test.ts (new), engine.test.ts, openapi.test.ts, plugin-types.test.ts;
  tests/plugin/engine-hooks.spec.ts; docs/specification/api.md (171), plugin.md
VERIFICATION: unit 2217/2217; gen --check, verify, check clean; test:plugin 79/79 (6110); agent page specs 78/78 (6210);
  timing: server-start fails under load, same in baseline worktree
REQUESTS: (1) orchestrator: D-083 draft above, for the maintainer; (2) maintainer: confirm the seam call (not breaking,
  SEAM 1) or raise SEAM to 2; (3) ownership: response schemas under packages/format/schema/api/ and the generated
  modules.md were edited as part of the contract (no other wave-1 task touches them)
NOTES: flag `botToolRules` (on; off reverts each part, tested). Refuse, not answer-now, for `wait` under a host.
  `owed`/`held` marks only on an agent's read. Same-content keys were already a quiet replay; conflicts now say what the
  key holds and a free key. Standalone's `vb-mcp`, instructions and `wait` unchanged; its agents get the additive marks.
```
