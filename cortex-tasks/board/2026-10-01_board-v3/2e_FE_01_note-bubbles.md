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

1. [ ] Format first: the events, schema, fold and reads with unit tests (create, edit, remove
   before Send; edit/remove refused after Send; owed and reply text use the latest text; a
   removed note is gone from every read).
2. [ ] API: OpenAPI and regenerated outputs; drift and generator checks pass.
3. [ ] The bubble pattern with all its states (new, editing, saving, error, right / left /
   below) in the gallery, dark and light.
4. [ ] The card: pin and "Your note" block states in the gallery.
5. [ ] Wire it into the board; remove the modal.
6. [ ] The zoom switch (ruling 8).
7. [ ] Page tests: open from C, M and the footer; edit; remove; Esc; placement flips at the
   board's right edge; a second press edits rather than adds; after Send the note is read-only;
   axe passes (with ruling 8's one excuse). View every baseline before updating it.

## Validation

- [ ] `npm test`, `npm run check`, `npm run verify`, `npm run test:pages` and the generator's
  up-to-date check all exit 0 (read the exit codes)
- [ ] Board and gallery in dark and light match 05's bubble and pin by eye

## Constraints

Project rules apply. No new dependency. No commits: the orchestrator reviews and commits.
Files over 300 lines need a reason; split rather than grow. Deviation from a ruling: stop and
report. Probe scripts under `temp/` only, deleted after. Fill in the Implementation Notes and
return: files and symbols, the event names and shapes, tests added or changed and why,
baselines, gate exit codes, anything unsettled.

## Implementation Notes

**Status**: Not started.
