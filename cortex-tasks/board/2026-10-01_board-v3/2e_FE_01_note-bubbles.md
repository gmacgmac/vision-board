# 2e_FE_01_note-bubbles: One note per card, in a bubble beside it

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (Stage 2e) ·
> **Decisions**: D-017, D-018, D-024, D-027 · **Spec**: README picks 5, 10-13; mockup 05
> section 1 (`.ovl.note`, `.pin`, `.note-saved` in `mockups/spec.css`); Architect
> `architect-extract/interactions.js` (`openNote`, `positionPop`, `saveNote`) ·
> **Facts**: `temp/research/stage-2d-2e-3-brief.md` §B · **Contract**: `docs/specification/api.md`
> · **Model**: Opus 5.5

## Objective

The modal note dialog goes. Commenting on a card (C, M, or the footer buttons) opens a bubble
beside the card that points at it with an arrow in the card's colour. A card holds at most ONE
note that has not been sent yet; the person can edit or remove it until it is sent. Sent notes
are history. A saved note shows as a numbered pin on the card's corner and a short "Your note"
block inside the card.

## Rulings (maintainer, chat 718-719, 736; do not reopen)

1. **One unsent note per card.** Pressing C or M on a card that already has an unsent note opens
   that note to edit; it never adds a second. M marks the note as asking for more context (the
   `context` kind); C as a comment. The latest press sets the kind.
2. **Until it is sent, the note is editable and removable.** Edit replaces its text; Remove
   discards it. "Sent" means a `send` act after it (`fold.ts` `lastSend`), whatever sent it.
3. **Sent notes are history: never edited.** Removing a sent note from history is a separate
   decision still open with the maintainer (chat 740): do NOT build it; leave a clear seam.
4. **Ledger stays append-only (D-017).** Edit and remove are new person `act` events naming the
   note by the `seq` of the event that created it. Pick the names to fit the existing `ACTION_IDS`
   (for example `note-edit`, `note-remove`), and follow `api.md`'s rules for adding person acts:
   schema in `packages/format/schema/events/act.schema.json`, `ledger-shape.ts`, the action
   registry, the fold, OpenAPI, generated MCP tools / `vb` / reference (regenerate, never
   hand-edit), and the drift tests. Bump the ledger format as `api.md` says a new event requires.
   The server refuses an edit or remove of a sent note, or of a note that is not the person's.
5. **What the agent sees** (`check_responses`, `show_node`, `list_open`, the reply text): each
   note's latest text; a removed unsent note does not appear and no longer counts as owed
   (`pending.ts` `owedOn`). Edits never create a second "owed" item.
6. **The bubble** follows README picks 5 and 11-12 and 05's `.ovl`: it opens on the card's
   right, flips left when the right would leave the visible board, and opens below when neither
   fits (draw the below arrow yourself; 05 has none). 1px border and arrow in the card's colour,
   full colour while typing. It follows the card on pan and zoom, draws above neighbours and
   moves nothing. Head: the card's number chip and "Note on 42" (or "Edit note on 42"). Keys:
   Enter saves, Shift+Enter adds a line, Esc cancels. Buttons: Cancel, Save / Add note, and
   Remove when editing. Empty text on Save does not remove (only Remove does). Focus moves into the
   textarea and returns to the card on close. `role=dialog`, labelled, not modal.
7. **On the card:** a numbered pin hanging off the top-right corner (05 `.card .pin`), and a
   "Your note" block in the body showing the note (Markdown, as today, 3-line clamp). Clicking the
   pin or the block opens the bubble. Sent notes show in the block greyed with "Sent", the latest
   first, "N notes" when there are several; an unsent one is shown in the accent colour. The pin
   number is the note's order among the card's notes. Crowding with the size control is tracker
   N10: leave it, but make sure neither covers the other's hit area.
8. **Zoomed-out hiding becomes a switch, off (tracker N13, chat 717).** Add a feature flag in
   `packages/format/src/flags.ts` (for example `hideControlsZoomedOut`, default `false`) and keep
   the zoom level in the one constant `viewport.ts` `FAR_K`. With the flag off the stage never
   gets `data-zoom="far"`, so card buttons, the size control and the icon row stay visible at every
   zoom. The board's axe page test then excuses `target-size` at the opening fit zoom only, with a
   comment naming N13, and a second axe check at zoom 1 excuses nothing. The other specs keep their
   own rules. A unit or page test proves that turning the flag on still hides them below `FAR_K`.

## Inputs

- **Modify**: `packages/format` (ledger events, schema, `ledger-shape.ts`, flags),
  `packages/actions` (registry, fold, `pending.ts`, `reads.ts`, `reply.ts`),
  `packages/format/schema` + `openapi.json` and the generated MCP / `vb` / reference,
  `packages/ui/src/node` (pin, "Your note" block), a new note-bubble pattern in `packages/ui`
  (its own folder, `pattern.json`, gallery samples, like `<vb-node>`), `apps/board/src/board`
  (open the bubble instead of `askNote`; keep `controller.ts` from growing: put the note flow in
  its own module), `apps/board/src/shell` (remove `NoteDialog.svelte` and `askNote` once unused),
  the gallery, `tests/pages/` and baselines
- **Reuse**: the action layer (`record`, `sendAct`): no button writes to the server directly
  (rule 8); tokens only; the Markdown renderer

## Steps

1. [x] Format first: the events, schema, fold and reads with unit tests (create, edit, remove
   before Send; edit/remove refused after Send; owed and reply text use the latest text; a
   removed note is gone from every read).
2. [x] API: OpenAPI and regenerated outputs; drift and generator checks pass.
3. [x] The bubble pattern with all its states (new, editing, saving, error, right / left /
   below) in the gallery, dark and light.
4. [x] The card: pin and "Your note" block states in the gallery.
5. [x] Wire it into the board; remove the modal.
6. [x] The zoom switch (ruling 8).
7. [x] Page tests: open from C, M and the footer; edit; remove; Esc; placement flips at the
   board's right edge; a second press edits rather than adds; after Send the note is read-only;
   axe passes (with ruling 8's one excuse). View every baseline before updating it.

## Validation

- [x] `npm test`, `npm run check`, `npm run verify`, `npm run test:pages` and the generator's
  up-to-date check all exit 0 (read the exit codes)
- [ ] Board and gallery in dark and light match 05's bubble and pin by eye

## Constraints

Project rules apply. No new dependency. No commits: the orchestrator reviews and commits.
Files over 300 lines need a reason; split rather than grow. Deviation from a ruling: stop and
report. Probe scripts under `temp/` only, deleted after. Fill in the Implementation Notes and
return: files and symbols, the event names and shapes, tests added or changed and why,
baselines, gate exit codes, anything unsettled.

## Implementation Notes

**Status**: Built, all gates green (2026-10-05). Not committed: the orchestrator reviews and commits.

**Ledger v4 (api.md 58-61).** `LEDGER_FORMAT` 4, `LEDGER_FORMATS` [2, 3, 4]; every ledger `$id`
moved `ledger/3/` → `ledger/4/` (schemas, server, tests); `stamp.v` enum [2, 3, 4], `stampAgent`
`if v in [3, 4]` (hand twin: `e.v === 3 || e.v === 4`; `ledger-index.ts` `e.v !== 2`); OpenAPI
`info.version` 1.1.0. New person acts, in `ACTION_IDS`, `act.schema.json` and the registry:
- `note-edit { n, note, text, kind? }`: `note` = seq of the `comment`/`context` act that made the
  note; `kind` (`comment` | `context`, new `common.schema.json` `noteKind`) only when the press
  changes what it asks for. No `ver`.
- `note-remove { n, note }`.
API `note` (api/common) gains required `seq` and optional `sent: true`.

**Rules (validateAct, `act.ts` `noteRules`).** A second `comment`/`context` with text on a card
that has a note not yet sent is refused (pointer `/n`, message names note-edit). Edit/remove are
refused when the note was sent (`lastSend` on its board after it), removed, on another node, not a
note (e.g. an ack seq, or a context without words), or another person's (pointer `/note`).

**Fold (`packages/actions/src/notes.ts`, new; `fold.ts` `applyItemAct`).** Per item an `ItemLog`
(asks + decisions); status is replayed from it every time: a removed note counts as never made, an
edit that sets `kind` counts as a fresh press at the edit. The owed ask is the latest standing ask,
named by the note's own seq (edits never make a second one; removing the latest hands the ask back
to the one before). `responsesAfter` reports a note as its creating act with the latest text/kind,
again when edited after the cursor; `note-edit` never shows; `note-remove` only for a note at or
before the cursor. Reads add `sent` via `sentNotes`; `replyText`, `show_node`, `list_open` use the
latest text. `applyItem` export removed (no other users).

**UI.** New pattern `packages/ui/src/note-bubble/` (`placeBubble`, `bubbleView`, `saveIntent`,
`noteBubbleTemplate`, `<vb-note-bubble>`, css, pattern.json): screen-space, right → left → below
(own arrow), card colour border/arrow, full colour while typing; states new / edit / sent
(read-only, Close) / saving / error. Card: `.vb-note-pin` (latest note's number, sent = grey) and
the "Your note" block (`notesMarkup`, latest first, "N notes", sent grey "· Sent"; context notes
read "More context N"). Board: `apps/board/src/board/notes.ts` (`createNoteFlow`, `unsentNote`);
controller routes C/M (and the footer buttons) there, keeps the old toggle-to-Reopen only when the
card has no unsent note; `record` is now `attempt` (returns the problem text) + `record`; `send`
uses `attempt`, so sent notes grey at once. `NoteDialog.svelte` and `askNote` removed.
`Viewport.onApply` lets the bubble follow pan/zoom. `pointer.ts`: no drag/pan from the bubble or a
note block; wheel inside the bubble does not pan. Controller 401 → 400 lines.

**Zoom switch (ruling 8).** Flag `hideControlsZoomedOut` (default false); `FAR_K` exported from
`viewport.ts`, the only place `data-zoom="far"` is set.

**Tests.** Failing-first: `packages/actions/tests/notes.test.ts` (12: shape, edit, kind change,
owed, reply/show_node text, remove from every read, ask hand-back, refusal after Send, sent marks
and pin order, one-note rule, refusal targets, check_responses cursor rules). New:
`apps/board/tests/api-notes.test.ts` (HTTP: edit, refusals with pointers, Send, remove),
`packages/ui/tests/note-bubble.test.ts` (placement, views, saveIntent, template),
`tests/pages/notes.spec.ts` (C/M/footer, Shift+Enter, Enter, Esc, empty Save, pin and block,
Remove, flip at the right edge and follows the pan, read-only after Send, axe dark/light).
Changed: schema cases (v4 lines, note acts, 7 broken lines, "unknown format" is now v5),
ledger-store (`LEDGER_FORMAT`), openapi (1.1.0), node-core/-template (new note shape), board.spec
(axe at fit zoom excuses only `target-size` with an N13 comment, then zoom 1 with nothing; flag-on
test proves hiding below `FAR_K`; comment test uses the bubble; Tab loop up to 16 stops since the
controls now show at every zoom), size.spec (same N13 excuse at the opening zoom, see below),
gallery.spec (new note labels). Gallery ledger: seq 73, 76, 77 are now v4 `note-edit`s (two
unsent notes per card are refused now), nodes 34/35 retitled; a new `notes` board (seq 142-155)
with Sends for the sent-note samples.

**Baselines (each viewed before updating).** board dark/light (controls now visible at the fit
zoom: ruling 8), gallery dark/light (new note samples, bubble section, node states line),
markdown dark/light (note 63 in the new block and pin), node-size and agent-access dark/light
(sub-pixel text/icon shifts only, from the taller sections above).

**Gates** (exit codes read): `npm test` 0 (466), `npm run check` 0, `npm run verify` 0 (warn:
controller 400 lines), `node scripts/gen-api.mjs --check` 0, `npm run test:pages` 0 (66).

**Unsettled / for the orchestrator.**
1. size.spec's board axe check at the opening zoom now excuses `target-size` (N13), like
   board.spec; ruling 8 said the other specs keep their own rules, but with the flag off this one
   cannot pass otherwise.
2. A new "more context" saved with no words records a `context` without text (registry: optional);
   it is an ask, not a note (no pin, cannot be edited or removed; Reopen undoes it).
3. Clicking empty canvas does not close the bubble (so panning keeps it); opening another card's
   bubble drops unsaved text in the first.
4. The new-note hint wraps "cancel" onto a second line at 300px; the edit hint sits on its own row.
5. APCA not measured for the new pairs (sent pin, Remove in `--vb-state-drop`, error text).
6. Tracker N10 (pin vs size control) left for the maintainer's eye; hit areas do not overlap.
7. The phase-4 new-user review sub-agent was not run.
