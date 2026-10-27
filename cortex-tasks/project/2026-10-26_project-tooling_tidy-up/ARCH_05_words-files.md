# ARCH_05_words-files: Words Files

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

---

## Objective

Every sentence a person or an agent reads lives in a words file for its area, never in the code that
shows or sends it, and a test keeps it so.

## Context

`cortex-architecture` rule 7 and `references/words.md`; `docs/principles.md` § Architecture we adopt.
Today screen text sits in Svelte and TS templates, refusals in server handlers, MCP instructions in
`packages/mcp/src/info.ts`. Tool and parameter descriptions are already one source
(`packages/format/schema/openapi.json`, D-056): declare it a words home, don't move it.

nclite's plugin contract (PLAN § The Plugin Contract; `~/ai/nclite/docs/plugins.md` § Settings, words
and the skill) gives each plugin one words file of keyed sentences (`organizer.chip.task`), naming the
plugin, its chip kinds, settings, tool descriptions and its view's screen text. Keep our one home per
area, and key every sentence so that file can be built from the homes later (`board.<area>.<key>`).
nclite writes US English for now; this task changes no wording, so note any sentence that would
differ and leave the choice to the maintainer.

## Inputs

- **Files to modify**: any file that holds a sentence a person or agent reads (`apps/board/src/**`,
  `apps/board/server/**`, `packages/ui/src/**`, `packages/mcp/src/**`, `packages/cli/src/**`), new words
  files, one project doc listing every home (`docs/specification/words.md`, via `cortex-docs`), its test.
- **Shared artifacts to reuse**: module names (ARCH_01), `packages/testing` (TEST_01).
- **Skills**: `cortex-architecture` (rule 7, `references/words.md`), `cortex-docs`.

## Steps

1. [ ] **Homes**: one words file per area (a screen or feature) in each part that sends text (page, ui
   patterns, server, MCP, CLI); shared text in one file both can import. List every home, with the
   reason for any file that can't import words (HTML, a config), in `docs/specification/words.md`.
2. [ ] **Move the sentences**, area by area; code imports them. Keep each sentence word for word (this
   task changes no wording); fix only a sentence said two different ways for one thing, and list those.
3. [ ] **Keys**: every sentence has a stable key, `board.<area>.<key>`, unique across the homes; a test
   lists them all and fails on a duplicate. Building the plugin's one words file is not this task.
4. [ ] **The test**: the doc's list and the code agree both ways; a user-facing string literal outside a
   words home fails (with the reference's allowed exceptions: ids, keys, CSS, log lines).
5. [ ] Screenshots unchanged.

## Validation

- [ ] The words test passes and fails on a planted literal
- [ ] No screenshot changes; `npm test`, `npm run verify`, `npm run check`; the full page specs on your port

---

## Implementation Notes

_To be completed by agent after task completion. Re-run? Add a `### Run N` block; never overwrite._

**Status**: Completed  
**Completed**: 2026-10-27 08:00  

### Changes Made
- **Homes** (six words folders, 756 keys): the board `apps/board/src/board/words/` (13 files), the standalone page `apps/board/src/shell/words/` (13), the patterns `packages/ui/src/words/` (11), the server `apps/board/server/words/` (10), MCP `packages/mcp/src/words/` (3), CLI `packages/cli/src/words/` (4). The board's words sit inside `board/` because `verify` `checkBoardHost` forbids `board/` importing outside itself (the board must stay hostable); the shell reads the board's words, never the reverse. Shared text is in each part's `common.ts` (`ui-common`, `server-common`, `shell-common`). `app-words.ts` moved to `board/words/app-cards.ts` (test: `apps/board/tests/words-app-cards.test.ts`).
- **Moved by a codemod** (`temp/words-move.mjs`, `words-parts.mjs`, `words-split.mjs`, `words-rename.mjs`; scratch, git-ignored, kept for the REQUEST below): TypeScript AST for `.ts`, Svelte AST for markup text and text attributes, markup strings split into text and attributes. Fixed text is an exported constant, text with a value an exported function (types from the checker); code imports `import * as xWords`. Then by hand: plural and branch logic into the words (`proposalsOnItem`, `acceptHeading`, `askForAccess`, `cardRetired`, `reply2`, `moreTitle`, ...), fragments glued by callers (`', new'`, `'sent'`, `'unlock'`) into the sentence, ids the rule wrongly took (CSP directives, SSE lines, tool names) put back in code.
- **Rule and test**: `scripts/words-text.mjs` (what is a sentence), `words-scan.mjs` (TS and Svelte scan), `words-homes.mjs` (`PARTS`, `OTHER_HOMES`, `NOT_SCANNED`, `EXEMPT`, `sentencesOutside`), `words.test.mjs` (doc and code agree both ways; no sentence outside a home; keys `board.<area>.<name>` unique; a words file imports only words and types; one fixed sentence once per group), `words-scan.test.mjs` (rules on samples; a planted sentence fails). Doc: `docs/specification/words.md`.
- **Requests routed to me**: ARCH_03-R5: gallery text now `shell/chat-view.ts` (chat-section) and `app-cards.ts · app-state.ts · page-io.ts listApps, callAppTool` (app-section; kept short so the line does not wrap). Baselines changed: `app-gallery.spec.ts/app-cards-{light,dark}`, `chat.spec.ts/chat-{light,dark}`; diff images checked by eye: only that line of text differs, size unchanged. TEST_01-R5: `lane` "Now" on n 44 and "Next" on n 45 in `gallery.ledger.jsonl`; the `KNOWN_VIEW` todo is gone from `validate.test.ts` (14 pass, 0 todo). No gallery picture changed for it (the Lanes frame shows no cards, `gallery.spec` full-page baselines pass unchanged).

### Issues & Resolutions
- The scan rule found far more than ids: it first took `<command>` placeholders and `a-${b}-hint` ids as markup or text; fixed in `words-text.mjs` (tag whitelist, `readsAsWords`, CSP and SSE lines).
- Page words had to live under `board/` (host rule above); first placement in `src/words/` failed `verify` with 28 failures.
- Perf budgets failed once under a load average of 18 (first draw 1019 ms, a selection click timeout); alone with `--no-deps` all 10 pass (first draw 522 ms).
- Written before the coordinator's change of rule arrived: the full page suite ran twice (655 then 665 passed; the only failures were the two `chat.spec` baselines, updated, and the two load-affected budgets above).

### Caught Beyond the Brief
- `tests/pages/playwright.config.ts` changed on disk during my run (workers 3 to 5): not mine, left alone.
- Not detectable by the rule, still in code: a lone lower-case word joined to others (such as the 'added'/'saved' toast verbs now in `notes` words, but others may remain), and sentences split around an inline element in markup (`Enter go · Esc close` is three entries).
- US English for nclite (no wording changed): `apps/board/src/shell/words/toolbar.ts` `centreCards2` "Centre cards" and the "Centre cards" in `moreTitle`; outside my homes `skills/vision-board/SKILL.md` ("colour", "coloured"). No other British spelling found in any home.
- Sentences said two ways for one thing: none changed.

### Deviations from Plan
- None. Scope: the five parts the task names plus the standalone page split from the board. `packages/actions` and `packages/format` hold refusals and action labels too; they are not mine, so they are listed under "Not scanned yet" in the doc and requested below. The gallery's text is sample content and stays literal (listed, with why).

### Run 2

**Status**: Completed  
**Completed**: 2026-10-27 10:00  

#### Changes Made
- `packages/format/src/words/` (format-ledger, format-view, format-kinds, plus format-common: 134 keys) and `packages/actions/src/words/` (actions-refusals, actions-chips, actions-history, actions-registry, actions-message, 159 keys), both with the Run 1 codemod. Wording unchanged; the existing tests of the messages (ledger, validate, act, chips, history, registry) pass untouched. Words in `format` import nothing (no `node:`, no module); `#format` does not export them and `#actions` keeps its own, so no layer rule is touched. Groups `format` and `actions` in `scripts/words-homes.mjs` `PARTS`; rows in `docs/specification/words.md`.
- Left in code and listed in the doc (new section "Developer text"): `format/src/flags.ts` (flag descriptions), `actions/src/conditions.ts` (`trueWhen`, `endsWhen`), `actions/src/references.ts` (edge descriptions): documentation of registries that only a developer reads. `packages/format/src/images.ts` is an other home: `images-pure.test.ts` demands it import nothing, and `IMAGE_WORDS` is already its one words object. `actions/src/answers/remove-words.ts` stays (words with logic and a test). `scripts/words-homes.mjs` skips those files; the test checks the doc rows (`DEVELOPER_TEXT`) too.
- cortex-docs: `apps/board/README.md` and `docs/specification/components.md` repointed to `src/board/words/app-cards.ts` and `apps/board/tests/words-app-cards.test.ts`; the claim "the words are `node-app.ts` `COPY`" now names `packages/ui/src/words/node-app.ts`.

#### Issues & Resolutions
- The words import inserted between a JSDoc and its declaration in three files (`selection.ts`, `node-time.ts`, `region-fresh.ts`, from Run 1): moved above the comment.
- `images.ts` first took the import and failed `images-pure.test.ts`: reverted, made an other home.
- A doc generator in `temp/` rewrote a paragraph I had fixed by hand; the generator is fixed, the doc is as intended.
- Duplicates across groups (a sentence in actions and in the page, such as button names) are kept: they are separate modules; `#actions` does not export words yet. Say if you want them shared.

#### Caught Beyond the Brief
- None new.

#### Deviations from Plan
- None.

---

## On Completion

1. Fill in Implementation Notes; set **Status** to `Completed`.
2. Update this task's row in [TASK-STATUS.md](./TASK-STATUS.md) — your row only.
3. Append your own LOG entry to `cortex/LOG.md` — one line ending in a newline, append-only:
   `[[YYYY-MM-DD HH:MM]] [board-app] ARCH_05: what you did → Task: [[cortex-tasks/project/2026-10-26_project-tooling_tidy-up/ARCH_05_words-files.md]]`
4. Return the `cortex-task-exe` Return Contract, with `REQUESTS` for anything outside your files.
   Never write the set entry or `AUDITED.md`. No commits.
