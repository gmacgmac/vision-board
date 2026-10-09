# T_01_skill: The skill, rewritten

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (ruling 12) ·
> **Tracker**: N17 · **Rule**: 17 · **Model**: Opus 5.5

## Objective

`skills/vision-board/SKILL.md` teaches any agent to use the board well through the MCP API, and
is the launched agent's instructions.

## Rulings (do not reopen)

1. Start from `skills/vision-board/NOTES.md` (real-use evidence) and the generated tool
   descriptions; the old draft's view files are gone. Cover: when to use the board, choosing a
   layout, naming boards, keys and retries, access (board then container, person-made boards),
   reading responses and Send, reply vs append, propose (never decide), park bundles, re-saved
   Later cards asking for fresh context, chatting briefly in the panel ("Done, 3 cards added")
   while the board carries the content.
2. Short and plain; status `v1`. A `scenarios.md` beside it: 6 to 8 written scenarios (a review
   with 12 findings, a person's comment to answer, a card to extend, an email that settles a card,
   a card saved for later twice...), each with what a good run does. VERIFY_01 runs two of them
   through the panel.
3. NOTES.md stays as the evidence log.

## Validation

- [ ] The five gates exit 0 (docs only, plus any test that reads the skill).

## Constraints

- If deviation is needed, stop and say so; no silent breaking changes. No PII in examples.
- No git commits or stash. Scratch in the system temp folder. Stop only your own processes.
- No dependencies (D-036). Protected files: propose wording, never edit.
- Fill Implementation Notes below, your row in TASK-STATUS.md, and your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-09

- `skills/vision-board/SKILL.md` rewritten, status `v1` (159 lines), from `NOTES.md`, the generated
  tool descriptions, `info.ts` (both instruction sets) and api.md 29-36, 63-64, 69, 73, 83-86,
  93-97, 101-107. Sections: where you are running (own chat: `join`, keep the secret; panel: no
  join or secret, board granted, one-line chat words, chips carry the writes, Allow/Deny and no
  retry after Deny, never `wait`), when to use the board, starting a board (title = subject only),
  access (board first, then container, person-made boards, one `request_grant` per `needs-grant`),
  choosing a layout (a table of what each mode looks like; link every card in flow/lanes; radial
  `center` set after the cards exist), writing cards (keys scoped to the project, new key per new
  version, link by key, kinds and `item`, Markdown subset, no coordinates), changing a card
  (`append` vs a full `node` with `base`), reading answers (`list_open`, `check_responses`, Send,
  each act), answering (`reply` with `to`; group and container notes), propose never decide
  (re-propose after a change), saved for later (fresh `park` when re-saved).
- It does not repeat the MCP instructions; it points at the tool descriptions for exact fields.
  `chat-access.ts` passes the whole file (frontmatter included) with `--append-system-prompt-file`.
- `skills/vision-board/scenarios.md`: 8 scenarios with "A good run" and "Fails if": 12-finding
  review (panel), comment to answer, card to extend (panel), email that settles a card, saved for
  later twice, person-made board, denied file edit (panel), note on a whole container (panel).
  Scenarios 1 and 3 are named for VERIFY_01.
- `NOTES.md` stays the evidence log; only its intro line changed (no longer says v0).
- Checked against code: findings offer no drop (`NODE_TYPES` in `packages/format/src/node-types.ts`),
  `center` is a number only (write-item schema), lanes stack unlinked cards in one column
  (`packages/layout/src/modes/lanes.ts`), grid defaults to about √n columns (`modes/grid.ts`).
- No test reads the skill yet. Possible follow-up (not done, rule 17): a drift test that the skill
  names every MCP tool and every write item `type`, so a new item type fails until the skill
  covers it.
- Gates: `npm test` 852 + 6 pass, `npm run check` 0, `npm run verify` ok (0 warnings),
  `npm run gen -- --check` 0, `npm run test:pages` 258 passed.

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-agent] T_01: …`).
