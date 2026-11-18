# T_05_skill-core-and-references: One Skill Source, a Core and References

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Restructure the agent skill so one source builds both the standalone skill and the plugin skill: a small core every
agent reads, and references it reads only when the request needs them (progressive disclosure). The maintainer's
strategy, 2026-11-18, points 479 to 483. Then prove it live on Haiku 5.5.

## Strategy (maintainer)

1. **One source, two builds (479)**: the standalone `skills/vision-board/SKILL.md` and the plugin's skill are built
   from the same core and reference files. Today the plugin skill is made by cutting sections out
   (`skill-edits.ts`, 8,192 bytes): that cutting stops. Differences between the builds are listed in one place.
2. **The core, always read, as small as it can be (480, 481)**: the default board (kinds, Markdown, the answering
   loop, Add note and Ask now); the layout headlines (DL-01 to DL-03); **the icon library** for every board (list
   first, reuse, name for reuse, add through `add_icon`, never write a file); **colour** (a node's tone: the kind's
   colour by default, a tone to set parts apart and show what belongs together, a palette name or a hue); **the two
   skins as headlines only**: what each is good for, that both offer the same actions, that the agent chooses one when
   it makes a board and it stays the board's skin unless the person changes it. Details live in references.
3. **References, read on demand (481)**: architecture (laying out a system, icons and tones in depth, Command Lens in
   depth), layouts (each mode and when to use it, flow direction and branching), handover (the "Handover" section in
   Markdown), apps (standalone only; apps are self-contained so they stay portable). Timeline joins when it is built.
   Each reference is a short file beside the core; the core names when to read each.
4. **The plugin build (482)**: the core and the same reference files ship inside the plugin's folder (the host, nclite,
   reads files); apps is left out (the host makes its own artifacts); architecture, Command Lens and the rest stay.
   `docs/specification/plugin.md` names the files; an addition, nothing a host relies on changes.
5. **Tests (483)**: a scenario per mode (default, architecture, layouts, handover; apps standalone only), each checking
   the agent read the right reference and not the others; layout scenarios (straight pipeline, a flow that branches
   and rejoins, a grid of findings, lanes, radial relationships, the header's direction default respected). Then the
   live runs.

## Steps

1. Read the current skill, `NOTES.md`, `scenarios.md`, `skill-edits.ts`, `plugin-skill.test.ts`, the eval harness
   (`tests/evals/bot/`), and how the plugin build packs the skill (`apps/board/vite.plugin.config.ts`, `plugin.md`).
2. Write the core and references; build both skills from them (one script or build step; generated outputs checked by
   a test, never hand-edited). Words that agents read stay in their words homes.
3. Scenarios per (5); `npm run eval:bot -- --dry` and `--dry --standalone` green.
4. Live, approved by the maintainer (point 462): `npm run eval:bot -- --model haiku --port 7310` and
   `npm run eval:bot -- --standalone --model haiku --port 7310`, each once. A run that stalls (no stream line for a
   minute) is a harness fault: add the stall watchdog in `tests/evals/bot/model.ts` first (kill after ~60 s of silence,
   count it as a crash, retry once). Report cost and per-scenario results. Never raise a spend cap.
5. Bump the skill version, `NOTES.md`, the versioned test.

## Where

`.claude/worktrees/app-window` (branch `spike/stage-apps`), `VB_TEST_PORT=7310`. Run after T_04.

## On Completion

Fill Implementation Notes, update your TASK-STATUS row, append your own LOG line:
`[[YYYY-MM-DD HH:MM]] [board-agent] T_05: [what changed] → Task: [[cortex-tasks/board/2026-11-16_board-ui_node-overhaul/T_05_skill-core-and-references.md]]`

## Implementation Notes

**Status**: Blocked (the live proof of the final skill only; everything else done)  
**Completed**: 2026-11-18 18:20  

### Changes Made
- **One source, two builds (479)**: `skills/vision-board/source/` holds `core.md` (every bot), `references/`
  (`layouts.md`, `architecture.md`, `handover.md`, `apps.md`) and `differences.md`, the one place the builds differ
  (a block per `{{slot}}` per build: front matter, running, access and another ledger, images, icons, size/widths, the
  panel's hold rule, reading detail, the apps line). `source/build.mjs` (`buildSkill`, `stale`, `writeStandalone`,
  `unused`; types `build.d.mts`) builds `skills/vision-board/SKILL.md` + `references/` (`npm run build:skill`, new in
  `package.json`) and the plugin's `skill.md` + `references/` (`apps/board/bin/build-plugin.ts` `textFiles`). A build
  ships the references its text names, so `apps.md` is standalone's. Deleted: `apps/board/plugin/skill.ts`,
  `apps/board/plugin/words/skill-edits.ts` (`plugin-words.ts` `NOT_VIEW_TEXT` emptied).
- **The core (480, 481)**, the v3.34 plugin wording as its base: the references index under the title, each file with
  the moment to read it ("never just in case"), the read again where it is needed (Layout); the default board, the
  answering loop, Add note and Ask now; DL-01 to DL-03; the icon library (standalone: `list_icons` first, reuse, name
  for reuse, `add_icon`, never a file; plugin: the `icon` field's names); colour; the two skins as headlines.
  Standalone 44,614 → 19,148 bytes (+13,957 in references); plugin 8,174 → 8,167 of 8,192. Skill v3.35.
- **References (481, 482)**: layouts (each mode, the worked call, direction, branches, lanes, insert, the one
  `show_layout`), architecture (components, the path as one flow, icons and tones in depth, Command Lens in depth),
  handover (the park, its parts as Markdown, `sources` a list), apps (v3.34's section, standalone only). Shared files
  are identical in both builds (a test holds it). `plugin.md` § The folder (`references/`) and § The bot (same source,
  read on demand, how a host lets its bot reach them): an addition, nothing a host relies on changes.
- **Tests**: `skills/vision-board/source/build.test.mjs` (on-disk build current, slots used, a build ships what it
  names); `apps/board/tests/plugin-skill.test.ts` rewritten for the builds (every core line in both, shared references
  equal, no tool the plugin bot lacks in any of its files, v3.30/31/34 knowledge kept, v3.35); `plugin-build.test.ts`
  (the folder has `references/`); `write-examples.test.ts` (the worked call is in `references/layouts.md`).
- **Eval harness**: stall watchdog (`limits.ts` `STALL_MS` 75 s, above an unclamped 60 s `wait`; `model.ts`
  `runTurns`: only while a turn is open, a stall is a crash and retried; `Exit.stalled`; `checks.ts` `bounded` says it;
  test "stall:"). Both hosts let the bot `Read` the skill's folder and name it (`model.ts` `skillLine`, `--add-dir`);
  a dry plugin run writes the skill's plugin build to its temp folder. `reads-references` on every scenario
  (`Scenario.reads`, `checks.ts` `readsReferences`; `noFolderRead` leaves reference reads to it). `Person.direction`,
  `mark(..., 'later')`; `botBoard` falls back to the ledger (standalone). Scenarios 46-52 (`--standalone`):
  `flow-branches`, `lanes-handoffs`, `radial-ideas`, `direction-default`, `findings-grid`, `handover-park`,
  `app-build`, with `layout-checks.ts`; `insert-step`, `linked-pipeline` need layouts, `architecture-icons`
  architecture; `draw`'s bad script reads one just in case.
- `NOTES.md` § Skill v3.35 (and v3.28-v3.34 moved there from `status`), `scenarios.md` v3.35 and 46-52,
  `docs/specification/words.md` and `scripts/words-homes.mjs` (the home is `skills/vision-board/source`),
  `apps/board/README.md`.

### Verification
- `npm run verify` ok (42 warnings, none new), `npm run check` 0 errors, `npm test` 2,630 + 14 pass, `npm run gen --
  --check` current, `npm run build:skill -- --check` current, `npm run test:plugin` engine-hooks 20 pass.
- Dry: plugin 103/103 (15 runs), standalone 89/89 (11 runs); every bad script fails the checks it breaks.
- Live, Haiku 5.5, once each: plugin 99/103, 15 runs, **$0.0392** (draw 8/8, send-round 6/7, picture 5/5, refusals
  6/6, wait 4/4, answered-note 6/6, own-board 5/5, two-turns 5/7, read-only 9/9, where-cards-stand 8/8, new-card-number
  9/9, insert-step 6/7, summary-card 8/8, person-board 6/6, linked-pipeline 8/8). Standalone 81/96, 12 runs,
  **$0.5560** ($0.50 of it the cap counted for one stalled run): ledger-picture 6/6, other-ledger 9/9, join-ledger
  stalled 4/7 then 7/7 on retry, architecture-icons 12/15, findings-grid 6/8, flow-branches 7/9, lanes-handoffs 8/9,
  radial-ideas 4/7, direction-default 7/8, handover-park 5/5, app-build 6/6. Reports: `tests/evals/bot/out/
  2026-11-18T18-03-24-691Z/` and `2026-11-18T18-08-11-891Z/` (git-ignored).

### Issues & Resolutions
- Passed before, failed live (plugin): send-round asks-again, two-turns done-only. Cause: wording this build trimmed
  from the v3.34 plugin skill; restored word for word ('Then only "Done."', "so end it by asking for ✓ or ✗ again"),
  plus "never recaps the cards".
- Standalone: Haiku read `handover.md` and `apps.md` (the core has no detail there) but `layouts.md` once in five and
  `architecture.md` never, since the core lets it act; the misses followed (radial linked and uncentred, `direction`
  set, `list_icons` skipped). Fixed in the skill: the read at the point of use in Layout, "Leave `direction` out",
  "**Call `list_icons` first**", the structure rule's "ask anyway ... Never draw a big board unasked" back. These fixes,
  and the plugin two, are **not yet proven live**: both approved runs were used. Dry green.
- `layout-checked-once` counted a `show_layout` refused for its arguments (the bot sent `secret`); it now counts
  answered calls (my check from this task, made precise, not loosened).
- One live stall (`join-ledger`, no stream line for 78 s): the watchdog ended it and the retry passed.

### Caught Beyond the Brief
- **The chat panel can't reach the references.** Its bot gets `SKILL.md` as a system prompt file (`chat-access.ts`
  `INSTRUCTIONS_FILE`), so it is not told the skill's folder, and the gate asks for any read outside the person's
  folder (`access-rules.ts` `OUTSIDE_RULE`). Until the panel names the folder and the rules let it read
  `skills/vision-board/references/` unasked, a panel bot works from the core alone (no apps detail). The standalone
  core names `skills/vision-board/references/` "in the Vision Board repo" as a fallback. Requested.
- Progressive disclosure on a small model: a reference is read when the core leaves a gap, not because an index says
  so; where a reference matters, the core must say "read it before you write" at that point, or leave the gap.
- The person-only act route's description (`openapi.json`, `/act`) still says "flag, unflag" (the bookmark rename).
- `npm test` in a fresh worktree fails `api-ledgers.test.ts` "the folder open now..." until `npm run build`: its board
  serves the page from `apps/board/dist`. Built here; 13/13 then.
- A stalled run is counted at the whole per-run cap ($0.50, `runCost`), so the standalone report's spend overstates
  the real cost (the other 11 runs: $0.056).

### Deviations from Plan
- **Direction narrowed**: v3.34 said set `direction` when the content fits; now leave it out and set it only when the
  person asks (point 483, "the header's direction default respected"). For the maintainer to confirm.
- Plugin build: Access (locked, read-only) and "never hold your turn" left to its MCP instructions, which say them;
  the Images never-list left to `write_board`'s `images` answer. Standalone now reads the plugin's default-board
  wording: detail no scenario held is gone (NOTES § v3.35 lists it).
- The mode and layout scenarios run under `--standalone`: the plugin's 15 scenarios already sit one under the 16-run
  default cap. The plugin proves the references through `linked-pipeline` and `insert-step`.

### Run 2

**Status**: Completed (two edits after the last approved live run are not yet run live; see Issues)  
**Completed**: 2026-11-18 19:00  

The orchestrator reran both live evals on run 1's fixes (plugin 102/103 $0.03; standalone 90/96 $0.56). The
maintainer ruled point 547 (the panel's bot is told the skill's folder and reads its references unasked, never writes
there) and accepted the three choices of run 1 (point 548: `direction` narrowed, Access and "never hold" left to the
plugin bot's instructions, the standalone on the plugin's default-board wording).

### Changes Made
- **Point 547**:
  - `packages/agent`:
    - `policy.ts`: new option `PolicyOptions.readOnly` (applied in `readOnlyFor`). For a file tool's call into that folder, wherever it is, a read goes ahead unasked. Under `strict`, or for a hard-linked file, it is asked once. A name the rules refuse anywhere is still refused. A write is refused with `agent-access.ts` `skillReferences`.
    - The read-only folder reaches every path that decides: `StartOptions.readOnlyFolder`, the gate (`GATE_READONLY_ENV`, `GateAccess.readOnly`), Kiro's verdict (`verdictFor`), Claude Code's own deny rule (`claudeDenyRules`, an `Edit(…/**)` for that folder), and Kiro's agent file (an `fs_write` deny plus `write.deniedPaths`).
    - `StartOptions.instructionsNote` adds a line after the instructions. Claude gets the skill and the note together in one private file per turn (`instructionsText`, `claude.ts`). Kiro gets the note as a resource file of its own (`kiroNoteFile`, `~/.kiro/vision-board/note.md`).
  - Server:
    - `chat-access.ts`: `SKILL_REFERENCES`, `SKILL_NOTE` (`server-chat.ts` `skillFolder`: "Base directory for the vision-board skill: <dir>"), and `keepKiroAgent`.
    - `chat-sessions.ts`: passes `readOnlyFolder` and `instructionsNote`, and gives the approval route `readOnly` too (`chat-approvals.ts`, `chat-session.ts` `SessionAccess`).
  - Tests:
    - `packages/agent/tests/policy-readonly.test.ts` (6 tests).
    - `apps/board/tests/api-chat-access.test.ts` "point 547": the real gate reads a reference with no approval request; a Write or an Edit there, or a new file, is denied; the deny rule is in place; the note follows the skill.
    - `api-chat-sessions.test.ts`: the turn's instructions are the skill then the note, and its file is gone after the turn.
    - `api-chat-kiro.test.ts`: the note file, the resource and the write deny.
    - The fake CLI (`fake-claude.ts`) now records the instructions it was given.
  - Docs: `packages/agent/README.md`, `docs/specification/chat.md` § the skill's references.
- **Skill (v3.35, same version)**: each reference is read at its point of use:
  - Layout: linked cards, including a card put between two linked cards, or a `radial` → `layouts.md`; a system's architecture → `architecture.md` first; and "**Leave `direction` out** unless the person asks".
  - Later → `handover.md`.
  - The standalone `app` kind → `apps.md`.
  - One line under the title replaces the index ("read one where this page says, never just in case").
  - The region schema's `direction` description says the same (`region.schema.json`; `npm run gen`).
  - After run 3: the plugin's Images line gets back "(that file is `images/ui/settings.png`)"; the kinds line now reads "options the person will answer too … never a `topic`".
  - Sizes: plugin 8,117 of 8,192 bytes; standalone 19,117.
- **Stall**: live runs pass `--debug-file <run>/debug.log` (`eval.ts` `botArgs`). It logs every API request and its first byte.
- **Tracker row**: the person-only `/act` description in `openapi.json` now names `bookmark, unbookmark`, not "flag, unflag" (`npm run gen`).
- Tests updated: `plugin-skill.test.ts` v3.35 (the reads at their points of use) and the v3.34 phrase.

### Verification
- `npm test` 2,637 + 14 pass. `npm run check` 0 errors. `npm run gen -- --check` and `npm run build:skill -- --check` current. `npm run test:plugin` 116 pass. Page specs chat-folder, chat, chat-send, access-by-bot and chat-panel: 54 pass.
- `npm run verify` fails only on `modules.md` (`npm run map`; new agent exports).
- Live run 3, Haiku 5.5, once each:
  - Standalone **89/89**, 11 runs, **$0.0599**, no stall. Every reference was read where needed and nowhere else.
  - Plugin **98/103**, 15 runs, **$0.0393**:
    - draw 8/8, send-round 7/7, picture 3/5, refusals 6/6, wait 4/4, answered-note 6/6, own-board 5/5, two-turns 4/7, read-only 9/9, where-cards-stand 8/8, new-card-number 9/9, insert-step 7/7 (read layouts), summary-card 8/8, person-board 6/6, linked-pipeline 8/8.
    - picture and two-turns passed in runs 1 and 2; their fixes are above, not yet run live.
- Reports (git-ignored): `tests/evals/bot/out/2026-11-18T18-44-12-723Z/` (plugin) and `2026-11-18T18-47-11-069Z/` (standalone).

### Issues & Resolutions
- **join-ledger stalls** (runs 1 and 2, first attempt each; none in run 3), all evidence from those runs' `stream.jsonl`:
  - Our results came back at once: `join` (and `list_boards`) answered in the stream, vb-mcp sends nothing unasked, `stderr.txt` was empty.
  - Then the CLI's next model request never started: no thinking event and no assistant line until the 75 s watchdog.
  - The retry with the same inputs passed in 8 s.
  - [INFERENCE: a request that never began streaming, not ours.] The new `debug.log` will show any next one.
- The fixes made after run 3 are restorations or clarifications, but they are **not yet run live**. Proving them takes one `npm run eval:bot -- --model haiku --port 7310 --only picture,two-turns,draw`, which needs a go.

### Caught Beyond the Brief
- Progressive disclosure on a small model: an index was not enough. A read happened when the core left a gap (handover, apps) or when the page said "read it" at the moment of acting. Run 3 confirms the second.
- A stalled run still counts at the full per-run cap ($0.50, `runCost`) in a report's spend.

### Deviations from Plan
- None beyond run 1's, which point 548 accepted.
