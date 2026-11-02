---
task_name: Prefix The Board's Ids Everywhere
created: 2026-11-02
completed:
status: pending
categories: [board-app]
type: implementation
model: standard
persona: Front-end engineer who ships embeddable widgets — the widget behaves the same on its own page as inside anyone else's, and an id it owns never collides with one it doesn't.
skills: [cortex-architecture, cortex-docs]
tracker:
---

# Task: Prefix The Board's Ids Everywhere

---

## Problem Statement

Under a host the board's ids start `vb1-` (`vb2-` for a second mount); on its own page (`host.page`
set) the first mount keeps bare ids (`board`, `reply`, `send`...). The maintainer decided (point 376,
2026-11-02) the two must not drift: the board's ids carry the prefix on its own page too. The shell's
own ids (the page around the board: `apps/board/src/shell/`, the chat panel) are not the board's and
stay as they are.

---

## Steps

1. Read `apps/board/src/board/mount-ids.ts` (`takeIdPrefix`, `prefixOf`) and its callers
   (`apps/board/src/board/mount.ts`). Find every place that relies on bare ids on the own page:
   `git grep` the board's id names and `getElementById` / `#id` selectors in `apps/board/src/`.
2. Write the failing test first: `apps/board/tests/mount-ids.test.ts` — the own-page mount gets
   `vb1-` like any first mount.
3. Change `takeIdPrefix` so the own-page case goes (drop the `ownPage` parameter if nothing else
   needs it). Fix any code in `apps/board/src/` that looked a board id up bare.
4. Tests: every page spec (`tests/pages/`) and plugin spec (`tests/plugin/`) that selects one of the
   **board's** ids moves to the prefixed id. If a spec selects board ids often, give them one home
   (a small helper in the existing fixture, e.g. `tests/pages/board-host-fixture.ts`, or an existing
   shared helper; search first) rather than pasting `vb1-` everywhere. Shell ids are untouched.
5. Docs: `docs/specification/plugin.md` — remove the bare-on-own-page exception wherever it is stated
   (search `host.page`, `bare`, `vb1-`); state the one rule: every id the board owns starts `vb<n>-`.
   Audit any other doc under the `REGISTRY.md` doc surface that says the same (`cortex-docs`).
6. Gates, at low priority (the maintainer is transcribing): `npm run map`, `npm run verify`,
   `npm run check`, `node scripts/gen-api.mjs --check`, `npm test`, then the plugin and full page
   suites with `nice -n 15`, `VB_TEST_WORKERS=3`, `VB_TEST_PORT=4910` (plugin) and `4810` (pages).
   Run the specs you changed first; the full suites once, at the end.
7. Look in a browser: start the board from this worktree on port 4820 (never 4466), check the ids in
   the DOM carry `vb1-`, labels still focus their fields, menus and the reply panel still open, light
   and dark.

---

## Files Involved

| File | Purpose |
|------|---------|
| `apps/board/src/board/mount-ids.ts` | `takeIdPrefix`: the change |
| `apps/board/src/board/mount.ts` | Caller |
| `apps/board/src/board/**` | Any bare id lookup the change breaks |
| `apps/board/tests/mount-ids.test.ts` | Unit test, first |
| `tests/pages/**`, `tests/plugin/**` | Selectors of the board's ids, and a shared helper if needed |
| `docs/specification/plugin.md` | The rule, without the exception |

> Modify only the files listed for changes here. Need a change elsewhere? Don't make it — list it
> under `REQUESTS` in your return block.

---

## Constraints

- **Work only in the worktree you are given** (branch `feat/ids`). Never the main checkout, never
  `.claude/worktrees/tidy`.
- **DO NOT** commit, push, or touch git history. The orchestrator commits.
- **DO NOT** use port 4466 (the maintainer's board) or the ports 4600–4799 (another session's gates).
- **DO NOT** re-baseline a screenshot. Ids don't change pixels; a moved screenshot is a finding.
- **DO NOT** edit protected files: `.kiro/steering/*`, `AGENTS.md`, `CLAUDE.md`, `docs/principles.md`,
  `packages/tokens/`, existing `docs/decisions.md` entries. Never write `cortex/AUDITED.md`.
- **DO NOT** rename the shell's own ids, or the `vb-` class names.
- Install with `npm ci` (install scripts are off in `.npmrc`); no `--omit=optional`.
- **STOP** and report if the change needs a contract change beyond ids (the seam's types,
  `packages/format/`), or if a host-facing behaviour other than ids would change.

---

## Success Criteria

- [ ] On the board's own page, every id inside the board's root starts `vb1-`; shell ids unchanged
- [ ] No duplicate id on the page; every `for`, `aria-controls`, `aria-labelledby` and
      `aria-describedby` inside the board points at an element inside it
- [ ] `plugin.md` states one rule, no exception
- [ ] All gates green; the full page and plugin suites pass, no screenshot re-baselined
- [ ] Looked at in a browser, light and dark
- [ ] Task file updated with completion notes

---

## References

- `docs/specification/plugin.md` (the seam; ids)
- `cortex-tasks/board/2026-10-31_board-app_plugin-mode/VERIFY_01_findings.md` § F8
- `cortex-tasks/board/2026-10-31_board-app_plugin-mode/FIX_01_verify-findings.md` § Decisions, for the maintainer

---

## Implementation Notes

_To be completed by agent after task execution._

**Completed**: YYYY-MM-DD HH:MM

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- None

### Deviations from Plan
- None

---

## On Completion

1. Update frontmatter: `status: completed` and `completed: YYYY-MM-DD`
2. Append your LOG entry to `cortex/LOG.md` — one line, terminated with a newline, append-only:
   ```
   [[YYYY-MM-DD HH:MM]] [board-app] Completed: Prefix The Board's Ids Everywhere → Task: [[cortex-tasks/board/2026-11-02_board-app_prefix-ids-everywhere.md]]
   ```
