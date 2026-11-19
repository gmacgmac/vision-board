# Export and import

A board, or one of its containers, leaves as an export file and comes back in as fresh cards.

- **Export**: `get_board` (a whole board) or `show_container` (one container) with `export: true` answers with the
  file, `{ v, title, items, ... }`.
- **Import**: `write_board` with `import: { into, file }` in place of `items`. `into: "new"` makes the board you name,
  which must not exist yet, titled from the file; `into: "current"` adds to the board you name, every container a new
  one, beside what it holds.
- **The file goes in as it is**: the object the export answered, or the JSON of the file the person names (read it
  first). Never change its items, or draw them yourself with `items`.
- **To copy a board**: export it, then import that file `into: "new"` under a new id.
- **What stays behind**: your import writes the containers, cards and links. The person's ✓ and ✗, the places they
  moved cards to and their notes stay behind, and the result's `dropped` names each, with anything else the board
  couldn't take. Never `propose` the marks or copy a note into a card: they are the person's to make again.
- **The chat**: "Done." and, when something stayed behind, one short line saying what in plain words; never what came
  across, never the `dropped` paths: "Done. Your ✓ and ✗ and the notes stayed behind: they're yours to add again."
- **A retried import writes the file twice**: an import's keys are new every time, so they don't guard a retry. When an
  import fails or times out, read the board before you import again: it may already be there.
