# Insert, Markdown and Update Signals - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md) · **Created**: 2026-11-05 · **From**: maintainer chat
> 2026-11-04/05, points 419-433, after an agent's handover notes on using the board (a design discussion, three rounds)
> · **Checkpoint**: tag `insert-md/start` (main `24904b6`)

**How to start (orchestrator):** in the main checkout, cut `feat/insert-md` from `main`; add the four flags (Decision
12) on it and commit; per task, `npm run worktree -- <id-kebab> --base feat/insert-md`, using the port from
TASK-STATUS's Ports table, not the printed one. Then wave by wave with `cortex-task-exe`.

## Problem Statement

An agent's notes after a real session: it couldn't see where cards stand without reading every card in full; it
guessed a new card's number in a reply; putting a card into a flow took three items. The maintainer adds: headings
all look the same size; no tables or dividers for consolidated cards; the "updated" marker (pink) is hard to see in
dark; the agent's replies don't stand out from the person's notes; the read-only menu should be a toggle.

## Decisions (maintainer, points 419-433; binding)

1. **419**: agents are pointed to `list_open` for where cards stand (number, kind, title, status, what's owed), in
   SKILL.md and in `check_responses`'s description. No new read.
2. **420**: unchanged. A reply clears the person's ✓ or ✗ (D-045).
3. **421**: unchanged. Folded marks are already explained in `check_responses`'s description.
4. **422**: no placeholder. SKILL.md: to name a new card in a reply, draw it first, then reply with the `n` the
   write result gave it (`write-result.schema.json` `written`: `key`, `n`, `title`).
5. **424 (insert)**: a `node` item may carry `insert: { after, before }` (two card numbers). One write: the card,
   unlink `after`→`before`, link `after`→card and card→`before`, all or nothing. Both new links take the old link's
   label. Refused, with a reason, unless `after`→`before` is a link and both sit in one `flow` or `lanes`
   container (the card goes in that container). Works for a new card or an existing one (a rewrite). Applies only
   to flows: `row`, `column`, `grid` order by card number. API-only convenience: the ledger gets the existing
   node, unlink and link lines; ledger format version unchanged.
6. **425**: SKILL.md says where to save `agent` and `secret` (the session's scratchpad or notes file) and repeats
   that `not-authenticated` means join again; shows the pattern "reply, then ask again: ✓ if that settles it".
7. **426**: heading sizes: `#` large, `##` medium, `###` the small label as today; `####`-`######` as `###`.
8. **427**: GFM tables of up to 4 columns, never scrolling: the card goes to its widest tier (`l`), cells wrap,
   long words break. A table with 5 or more columns is not recognised (stays text). SKILL.md: 4 columns at most.
9. **428**: thematic break (`---`, `***`, `___`) drawn as a horizontal line. Setext headings stay unsupported, so
   `---` under a paragraph line is a break, never a heading underline.
10. **429/430/432 (signals)**: one colour per meaning. **New** stays teal (`--vb-state-fresh`). **Updated** gets a
    new token `--vb-state-updated`, a bright amber, clearly brighter than the action amber (`--vb-kind-action`) and
    the changed family's (`--vb-state-context`): the card's "N updates" tab at rest (pink today), the "updated"
    count in a container's pill. **The agent's reply** gets a left edge in that amber: bright while the card is
    unseen (D-054's rule: new or updated until engaged), then a muted amber tint, so a reply always reads apart
    from the person's grey notes. The person's own pink note edge stays. A container holding only updated cards
    keeps its teal border (432). Value: maintainer, 429: "let's see what it looks like, we can always change the
    colour": FE_01 picks it, measured (APCA, Lc 45 labels, 30 edges, light and dark), and the orchestrator reports
    it.
11. **431**: the read-only menu becomes one toggle button showing the current state ("Read-only" / "Editing");
    a press flips it. Taking the lock can still be refused (another server holds it), as today.
12. **Flags** (orchestrator, SETUP, `packages/format/src/flags.ts`, default **on**, descriptions in
    `FLAG_DESCRIPTIONS`): `insertBetween` (5), `markdownMore` (7-9), `updateSignals` (10), `readOnlyToggle` (11).
13. **Decisions to append** (orchestrator, at close, with these points as the maintainer's yes): D-086 Markdown
    gains heading sizes, tables and breaks (extends D-023's list); D-087 a card can be inserted into a flow in one
    item; D-088 updated is amber, and the agent's reply carries it.
14. All tasks run on Opus 5.5 (maintainer, 2026-11-05).

## Architecture (cortex-architecture, applied)

- **Contract first.** Insert: `insert` joins the node item's `sent` shape (`packages/format/schema/events/node.schema.json`
  `$defs/sent`), never the stored event; `npm run gen` carries it to `openapi.json`, the generated types, the MCP
  tool list and the CLI. The write path (`apps/board/server/write-board.ts`, `write-refs.ts`, `write-result.ts`,
  `write-problem.ts`, `examples.ts`) expands it into the existing node, unlink and link writes, checked together
  before any is appended. Refusal reasons go in the server's words home (`docs/specification/words.md` names it).
- **Reuse.** Markdown: the D-023 renderer (`packages/ui/src/markdown/{blocks,inline,render}.ts`, `markdown.css`,
  `pattern.json`), its CommonMark-example tests (`packages/ui/tests/markdown-*.ts`; GFM's own table examples for
  tables), its linear-time safety test; card width by the size tiers (`packages/layout/src/size.ts`
  `measureBody`: a table, like fenced code, makes the card `l`). Signals: the fresh/updated machinery
  (`packages/ui/src/region/region-fresh.{ts,css}`, `packages/ui/src/node/node-steps.css` the "N updates" tab,
  D-054's seen rule as the page already applies it), the note thread (`packages/ui/src/node/node-notes.ts`
  `replyEntry`, `packages/ui/src/note-bubble/`). Toggle: `apps/board/src/shell/{EditChip.svelte,editing.ts}` and
  `shell/words/editing.ts`; the toggle-button pattern already in `packages/ui` (`aria-pressed`) if one exists, else
  ask.
- **Words.** Every new sentence in its area's words file (`docs/specification/words.md`).
- **Tokens.** One new token, `--vb-state-updated` (+ `-soft` by `color-mix` like its siblings), in
  `packages/tokens/src/tokens.css` with its APCA figures in the comment; nothing else in tokens changes.
- No new dependency. No ledger version change. `SEAM` stays 1 (the plugin's types follow the generated ones).

## House Rules

As `cortex-tasks/board/2026-11-03_board-ui_read-only-follow-ups/PLAN.md` § House Rules, with:
- Model: every task `strong` = Opus 5.5 (Decision 14).
- Orchestrator-only: `docs/decisions.md`, `cortex-tasks/tracker.md`, `docs/specification/modules.md`,
  `package.json` and the lockfile, `packages/format/src/flags.ts`, `cortex/AUDITED.md`, `.git/**`.
- Protected: `.kiro/steering/vision-board-proj.md`, `AGENTS.md`, `CLAUDE.md`, `docs/principles.md`, existing
  `docs/decisions.md` entries. `packages/tokens/src/tokens.css`: FE_01 adds the one token of Decision 10, nothing
  else.
- Sub-agents write their TASK-STATUS row and one LOG line in the main checkout; everything else in their worktree.
  Only the orchestrator commits and merges, after each wave gate; tags `insert-md/wave-N`.
- Never port 4466, the repo's own `.visionboard/`, `~/ai/nclite`, `cortex/AUDITED.md`. `nice -n 15`,
  `VB_TEST_WORKERS=3`, time limits: 5 min a spec group, 15 the full page suite, 20 `eval:bot`. Page spec filters
  are full paths (`tests/pages/<name>.spec.ts`): a bare name matches the repo folder and runs everything.
- `npm run build` before `npm run verify` (the page budget reads the build).
- Done for UI: every state, axe and APCA, a gallery entry, a look in light and dark at 1400, 900 and 600 px.
- Wave gates: `map`, `build` then `verify`, `check`, `gen -- --check`, `npm test`, `test:plugin`; the full page
  suite at the close.

## Success Criteria

- [ ] One `node` item with `insert` puts a card between two linked cards of a flow; refusals say why; retry-safe
- [ ] `#`, `##`, `###` draw at three sizes; tables of up to 4 columns wrap, never scroll; `---` draws a line
- [ ] Updated is a bright amber on the card tab and the pill's count; new stays teal; the agent's reply has the
      amber edge, bright until seen, muted after
- [ ] Read-only is one toggle
- [ ] SKILL.md and `check_responses` carry Decisions 1, 4, 5, 6 and the new Markdown; `eval:bot` passes in both modes
- [ ] All gates and the full page suite green; D-086 to D-088 appended
