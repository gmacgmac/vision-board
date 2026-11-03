---
inclusion: always
---

> **Version**: 0.7 | **Updated**: 2026-11-03 (maintainer approved, point 403)

# Vision Board — project rules

Vision Board: an agent draws its output on a board; the person answers card by card (✓, ✗, a note,
Later); the agent reads the answers and redraws. Destination: a plugin in nclite, which supplies the
chat; the standalone app stays for development. Build for change: open, swappable shapes.

This file is general on purpose: it points to this project's sources of truth and does not restate
them. **Precedence:** this project's own documents (this file, `docs/principles.md`,
`docs/decisions.md`) come first. Cortex skills are the reference we draw on: consult them, and
follow them where our documents are silent. If two of our documents disagree, raise it.

## Sources of truth

| Need | Source |
|---|---|
| Architecture and design principles: the target we build to, and why | `docs/principles.md` |
| The method behind the architecture we adopt (reference, consulted before planning) | `cortex-architecture` skill |
| What was decided (binding) | `docs/decisions.md` |
| What is next | `cortex-tasks/tracker.md` (read first, every session) |
| File and ledger formats | `packages/format/` |
| Patterns, their states and looks | each pattern's `pattern.json`; the gallery |
| Module map and allowed layers | `docs/specification/modules.md`; `npm run verify` |
| How each part is built | `docs/specification/` |
| Using the board as a plugin in another app: the folder, `mount`, what a host gives and gets | `docs/specification/plugin.md` |
| Svelte | `.kiro/steering/svelte-conventions.md` |
| Where a sentence lives (screen text, refusals, what an agent is told) | `docs/specification/words.md` |
| Work categories, doc surface | `cortex/PROFILE.md`, `cortex/REGISTRY.md` |

## How to work

- **Plan first.** Non-trivial work: talk the plan through, write a Cortex task, execute it, log it.
  Throwaway spikes only in `temp/`.
- **Before any planning or task writing, read `docs/principles.md` and consult the
  `cortex-architecture` skill.** The plan says how it meets the principles: the existing pattern or
  module each piece reuses, the contract that changes first, any registry row, any words home. Name
  the skill in every task's `skills:` so the executing agent consults it too. No existing pattern
  fits: ask the maintainer. The code is behind the principles in places; new work moves it towards
  them, never further away.
- **Done** means every state, accessibility and contrast pass, tests, a gallery entry, and a look in a
  browser in light and dark, as the person sees it.
- **Tests while working**: unit tests plus the page specs for what changed; the full page suite once,
  at the end (`npm run test:pages`: 5 workers, `VB_TEST_WORKERS` to change; each worker's servers on
  `VB_TEST_PORT` + 10 per worker, fresh for every spec file). Never use port 4466: it is the
  maintainer's board. Tasks running at once take `VB_TEST_PORT`s 100 apart.
- **Bot instructions**: Changing a bot's instructions (`skills/vision-board/SKILL.md`, the plugin's edits):
  `npm run eval:bot` passes before it merges.
- **Sentences**: a new sentence a person or an agent reads goes in its area's words file
  (`docs/specification/words.md`), never in the code that shows or sends it.
- **Worktrees**: work in one; the maintainer's board runs from the main checkout.
- **Sub-agents** always name their model: Sonnet 5.5 for well-specified work, configuration and cited
  research; Opus 5.5 for new patterns and judgement-heavy design.
- **Protected**: this file, `AGENTS.md`, `CLAUDE.md`, `docs/principles.md`, the design tokens, and
  existing entries in `docs/decisions.md`. Propose the exact change and wait for the maintainer's yes.
  New decision entries are appended with that yes, never edited after.

## Project numbers (the skill leaves these to the project)

- **File length**: `npm run verify` warns over 300 lines, fails over 500 unless the file carries
  `verify: long-file <reason>`. Functions about 50 lines.
- **Contrast**: APCA-W3 0.0.98G-4g, light and dark. Lc 60 reading text, 45 short coloured labels, 30
  decoration. Body text carries no hue. A colour that fails is fixed in its token; a tier is overruled
  only by a recorded decision (D-009).
- **Flags**: new behaviour ships behind a flag in `packages/format/src/flags.ts`.
- **Dependencies**: exact versions, install scripts off, recorded in the dependency register in the
  same change.

## Board invariants (detail: `docs/principles.md` § Board-specific principles)

- The agent describes, the engine places: no coordinates in what the agent writes; layout is a pure
  function; a card the person moves is a pin in the ledger.
- Card numbers are given once per board and never change or get reused.
- The ledger (`.visionboard/ledger.jsonl`) is append-only JSONL. Every person and agent action goes
  through the one action layer. ✓, ✗ and approving are the person's clicks, never an agent's.
- Local-first: localhost only, Origin and Host checked, JSON only, ids sanitised; no third-party
  network call without a decision.
- Shareable: neutral names (`vb-`, `--vb-`), and the board stays hostable inside nclite
  (`docs/principles.md` § The board is a plugin).

## Replying to the maintainer

- Points the maintainer may answer go in one numbered list that keeps counting across replies for the
  whole conversation; sub-points lettered (72A). One point per number. Status lines stay unnumbered.
- Never a bare number for anything else: "card 6", "tracker N33", "D-040", "commit b68e280".
- Refer back with context: "(398, the launcher)". The question goes last, by its number.
- When the conversation runs through a Vision Board, the board's card numbers are the numbering; keep
  the chat to a line or two on what changed.

## Words

The same word for the same thing in code, docs and the UI:
board (what the person sees for one session) · view (one immutable version the agent wrote) · ledger
(the append-only record) · container (a region of the board, with one layout mode) · node (anything
drawn) · item (a card that needs an answer: question, decision, action) · number (a card's stable
number on its board) · flag (the person's private mark, never sent to an agent) · link · note (the
person's comment on one or more cards) · answered (✓ or ✗; a note never answers, D-045).

## Running

- Board: `npm run board`, then http://localhost:4466 (`npm run board:watch` reloads on changes). It
  opens `VB_PROJECT`, else the last folder opened from the board, else this repo. One writing server per ledger; any number read it.
- MCP server `vision-board`: `packages/mcp/README.md` has the client entries (Claude Code, Kiro).
- Kiro in the chat panel runs as the `vision-board` agent, from this repo's
  `skills/vision-board/SKILL.md`; `~/.claude/skills/vision-board` and `~/.kiro/skills/vision-board`
  link to that one copy (D-057).
