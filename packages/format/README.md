# packages/format

The file formats the agent and the board share: the view file (`view-vN.json`: regions, layout
modes, node kinds, stable item numbers, links, no coordinates) and the transcript
(`transcript.jsonl`: what the person did). Types, the validator, and a CLI the agent runs before
it writes a view (`node packages/format/bin/validate.ts <file>`). JSON Schema is still to come
(tracker N2).

The project ledger (`.visionboard/ledger.jsonl`, format 2, D-017) is the long-term shape: one
event per line for every node's identity, versions, the person's actions, the agent's replies,
proposals and parking bundles. A board version is a position in it (`seq`). It is defined and
validated here; the board still runs on view files and the transcript until the ledger module
lands (U3 step 2).

- **Depends on**: nothing.
- **Used by**: `packages/actions`, `packages/layout`, `packages/ui`, `apps/board`.
- **Public API** (`src/index.ts`): view types and constants (`View`, `ViewNode`, `Region`,
  `Link`, `MODES`, `KINDS`, `ID_PATTERN`, `FORBIDDEN_KEYS`), transcript types (`TranscriptRecord`,
  `ActionId`, `ACTION_IDS`), `validateView`; ledger types (`LedgerEvent` and one type per event,
  `NodeBody`, `ParkBundle`, `EVENT_TYPES`, `LEDGER_FORMAT`), `MAX_TEXT`, `eventProblems` (one
  event's shape), `LedgerIndex` with `emptyIndex`, `contextProblems` and `indexEvent` (is this
  the right next event), and `validateLedger` (a whole file).
