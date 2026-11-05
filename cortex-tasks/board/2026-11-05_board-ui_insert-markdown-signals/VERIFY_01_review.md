# VERIFY_01_review: Review the set as the person sees it

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

Wave 1, merged, meets PLAN Decisions 5 and 7-11 as the person and an agent meet it; the docs say what the code does;
shared screenshots are current. Findings, not fixes, for code.

## Inputs

- The merged branch `feat/insert-md` at wave 1's tag; PLAN.md; each wave-1 task's notes and requests
- A test board on your port (never 4466, never the repo's own `.visionboard/`), drawn through the API: a flow
  with an insert, a consolidated card with `#`/`##`/`###`, a 4-column table with long words and a `---`,
  updated cards and an agent reply unseen and seen
- **Skills**: `cortex-architecture`, `cortex-docs`

## Steps

1. Look in the browser, light and dark, at 1400, 900 and 600 px: is "updated" the brightest thing until seen,
   and does it read apart from the action amber? Do replies stand apart from notes? Do tables never scroll? Do
   headings step? Does the toggle read its state? Screenshots of each in your notes.
2. Try the edges: insert's refusals; a table at the narrowest card; the toggle with the lock held elsewhere.
3. `cortex-docs` audit of what the set touched; do the doc requests in TASK-STATUS.
4. Re-take any screenshot the merge changed that no wave-1 task re-took (the gallery's pages); explain each.
5. Findings: blocking or not, with the failing case.

## Validation

- [ ] Findings listed; docs true; screenshots green; the specs of every wave-1 task pass on the merged branch

## Constraints

Deviation from a PLAN decision: stop and report (`DEVIATION`). No PII in examples. No git commits. Long writes in
chunks. Only your files; other needs under `REQUESTS`.

## Implementation Notes

_Re-run? Add a `### Run N` block; never overwrite an earlier run._

### Run 1 (2026-11-05, Opus 5.5, worktree `.claude/worktrees/verify-01`, branch `feat/verify-01` at `insert-md/wave-1`, port 7600; look server 7690/7691)

**Changes Made**
- FE_01-R1: `tests/pages/{header-tiers,ledgers,read-only}.spec.ts`, "the section is last": `main > section` now excludes
  `[data-feature="updateSignals"]` (read-only keeps its `readOnlyControls` exclusion too). Selectors only.
- FE_02-R3 and the doc audit, `docs/specification/components.md`: "Read-only and Edit" said `readOnlyStart` is off by
  default (it is on: `flags.ts`), fixed; new paragraph "Read-only as one toggle" (`readOnlyToggle`: `EditChip.svelte`,
  `editing.ts` `toggleOn`/`toggleTip`/`toggleEditing`, the words, `editing.css`, no EditButton or "⋯" row, the gallery and
  `read-only-toggle.spec.ts`); new paragraph "Updated in amber" under § 8 New and updated cards (no doc described
  `updateSignals`, and § 8 says the tab is pink at rest): the token, tab, pill (`fillFreshPill`), reply edge
  (`repliesOn`, `litReplies`, `data-unseen`), the tests that hold each.
- Screenshots re-taken after checking each by eye against the committed one (`git show HEAD:`; a side-by-side and a
  one-pixel-shift test per pair):
  - Content the set meant: `gallery.spec.ts` `markdown-*` (MD_01's markdownMore group, card 61 a 5-column table as
    text; the section is 1341 px tall, was 887); `gallery-node-*`, `gallery-cardHistory-*`, `gallery-freshCards-*`,
    `gallery-note-bubble-*`, `gallery-groupNoteOnce-*`, `parking-replies-*` (FE_01's amber "N updates" tab, the
    two-colour pill and the replies' amber edges); `gallery-updateSignals-*` (new: the last section's each-section
    screenshot did not exist).
  - A sub-pixel shift only, same content (the taller Markdown section moves every section below it): `gallery-{appIcon,
    base,nodeSize,region,selection-bar,toolRail}-*`, `header-tiers` `header-*`, `ledgers-*`, `read-only-*`, `size`
    `node-size-*`, `app-gallery` `app-cards-*`, and FE_01/FE_02's own pre-merge re-takes `fresh-section-*`,
    `card-updates-*`, `update-signals-replies-*`, `read-only-toggle-*` (a few 1 px taller or shorter).

**Verification** (tier: normal; wide for the page specs of the whole wave)
- Unit: `npm test` 2399/2399, timing 14/14. `npm run verify` ok (35 warnings, none on a touched file). No code changed,
  so no `check`.
- Page specs, `VB_TEST_WORKERS=3`, port 7600: gallery, parking-replies, size, header-tiers, ledgers, read-only 97 pass
  (after the re-takes; before, 12 screenshot and 0 selector failures). markdown-more, update-signals, fresh-cards,
  card-updates, notes, note-polish, group-note, popover-thread 73 pass + 6 shifted screenshots, re-taken (34 pass).
  read-only-toggle, read-only-writes, read-only-controls, board-chrome, app-gallery: 3 shifted screenshots re-taken (17
  pass); `read-only-controls.spec.ts` gallery "…last…" still fails (finding 2). Full page suite: not run (the close).
- The look: a board drawn through the API (`temp/verify-01/seed.mjs`, `look.mjs`; scratch HOME and project): a 3-card
  flow, a consolidated card with `#`/`##`/`###`, a 4-column table with long words and `---` at L and (person's pick) at
  S, updated cards beside action cards, two agent replies, one seen and one not, a new card. Light and dark at 1400, 900
  and 600 px. Tables: table width equals its holder's at L (430) and S (246) at every width, 0 overflowing cells, no
  page scroll. Headings 18 / 15 / 11 px (title 15 px). Dark: updated `#ffc21a` vs action `#e8b04a` ΔE76 23.1, L* 81.8 vs
  75.3: the tab reads brighter than the action badge. Reply edge bright on the unseen card, muted after selecting it
  (`data-unseen` gone), the person's note grey. Toggle: eye and Read-only / pencil and Editing on the accent's soft fill,
  `aria-pressed` false/true, name Edit; at 600 the icon only.
- Edges: insert refusals, each writing nothing and saying what to fix: no link (1→3), reversed (says swap to 2→3), a
  `grid` container with a link ("lays out as `grid` … draw the card without it"), `region` elsewhere ("Send `region:
  "flow"`"), no region and one side missing (schema, with the insert example), the same card twice, card 999. Insert
  of a new card and of an existing card from another container both work (the moved card shows "1 update"); a retry
  replays with `replayed: true` and nothing written. Toggle with the lock held by a second server: stays Read-only, its
  tooltip names the computer, the toast says "Still read-only: <computer> has been editing this ledger since <time>.
  Press again once it stops editing." (the 409 is in the console, as for any refusal).

**Findings** (code: findings, not fixes)
1. **Blocking (Decision 10; the value is the maintainer's, the token protected).** In light, updated does not read
   apart from the action amber: `--vb-state-updated` `#a66800` vs `--vb-kind-action` `#b57c09`, ΔE76 9.0, and darker
   (L* 49.5 vs 56.3), not brighter. Failing case: action card 8 with "1 update" (`current-signals-light-100.png`): the tab
   and the ACTION badge are the same brown-gold; the reply edge reads as action too. `update-signals.spec.ts` checks
   "brighter than the action amber" in dark only. Dark passes (ΔE76 23.1).
2. **Blocking (the page suite).** `tests/pages/read-only-controls.spec.ts` "gallery (light|dark): … last …" fails on the
   merged branch: `main > section` last is `updateSignals`, expected `readOnlyControls`. The same one-line selector
   as FE_01-R1, in a file not routed to me (FE_02's).
3. **Blocking with FIX_01 item 3 (Decision 10, one colour per meaning).** The card's NEW tab is the accent pink
   (`packages/ui/src/node/node-popover.css` `.vb-node-btab[data-tab='new']`, "like the toolbar's chip"), while the pill's
   "new" is teal. Failing case: card 11 NEW in pink under a teal "1 new" pill (`board-dark-1400.png`). If the toolbar
   chip turns teal and this does not, the card is the last pink "new".
4. Not blocking (for the maintainer). A `#` in a card body (18 px, weight 680) outranks the card's own title (15 px,
   550): the consolidated card reads "Pricing review" as its title, not "Where pricing stands" (`current-summary-*`).
   Decision 7 is met; a cap at the title's size in cards is one answer.
5. Not blocking. A 4-column table at S breaks ordinary words mid-word ("Enterpri|se", "Unlimite|d", "langua|ges"); at
   L the equal fixed columns break "Internationalisa|tion" while "Plan" has room. Never scrolls (measured). Known to
   MD_01.
6. Not blocking. `---` straight after a table reads as the table's bottom border (`current-summary-*`).
7. Not blocking, outside the set (D-054's rule), for the maintainer. Selecting one card in a container ends its teal
   border and pill while its other cards keep "N updates" / NEW tabs and the toolbar still counts them ("6 new"):
   `current-signals-light-100.png` (no pill; tabs on 6, 7, 8 and NEW on 11). A person scanning by pills misses them;
   `components.md` § 8 says the pills and tabs "never disagree". Left as it is.
8. Not blocking. `update-signals.spec.ts`'s `update-signals-replies-*` screenshot clips the cards' top badges and the
   "1 update" tab: the gallery section box is shorter than its cards (`gallery/update-signals-section.ts`, FE_01's).
9. Not blocking. The gallery's editing section meta line says `readOnlyStart` is "off by default" (it is on); FE_02
   saw it; code words (`gallery/editing-section.ts`). The same claim in `components.md` is fixed.
10. Not blocking, for the orchestrator. `FIX_01_findings.md` carries ACT_01's Run 1 notes under its Implementation
   Notes ("### Run 1 (2026-11-05, worktree `feat/act-01`…"): FIX_01 may read its run as done. Remove before wave 3.
11. Not blocking, outside the set. Where two links enter one card (12→10 after the insert, and a 9→10 link from another
   container), the bundled entry draws no "then" label for 12→10; the ledger has it.

**Caught Beyond the Brief**
- No doc described `updateSignals`; § 8 said the tab is pink at rest: added (above), not just audited.
- FE_01/FE_02's own pre-merge re-takes went stale at the merge (the Markdown section's height): re-taken, as no wave-1
  task re-took them after it.
- `server-folders.ts` "until you press Edit on the board" prints at a read-only start: in FE_02-R2's list (BOT_01).

**Screenshots of the look** (`.claude/worktrees/verify-01/temp/verify-01/`, ignored by git)
- Amber on cards and the pill: `current-signals-{dark,light}-100.png`, `signals-{dark,light}-100.png` (before a card was
  looked at: pill "1 new · 4 updated"); whole board `board-{dark,light}-{1400,900,600}.png`.
- A reply unseen vs seen: `reply-9-seen-signals-{dark,light}-100.png` (card 6 bright, card 9 muted).
- Consolidated card, headings, table, line: `current-summary-{dark,light}-100.png` (L and S).
- The toggle: `toggle-read-only-{dark,light}-{1400,900,600}.png`, `toggle-editing-{dark,light}-1400.png`, held elsewhere
  `toggle-held-*`.
- A flow before and after inserts: `flow-before-insert-{dark,light}-100.png`, `after-insert-flow-{dark,light}-100.png`.

**Deviations**: none. No PLAN decision deviated from in code I could see; finding 1 is Decision 10's "clearly brighter
than the action amber" not met in light, which the decision leaves to the maintainer's eye (429), so reported, not
stopped on.


Notes here (Changes Made, Verification, Caught Beyond the Brief, Deviations); your TASK-STATUS row; one LOG line,
`[board-ui] VERIFY_01: … → Task: [[cortex-tasks/board/2026-11-05_board-ui_insert-markdown-signals/VERIFY_01_review.md]]`, ending in a
newline; the return block.
