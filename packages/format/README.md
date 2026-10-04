# packages/format

The format the agent and the board share: the project ledger (`.visionboard/ledger.jsonl`,
format 2, D-017), one event per line for every node's identity, versions, the person's actions,
the agent's replies, proposals and parking bundles. A board version is a position in it (`seq`).
Types, the validators, and a CLI (`node packages/format/bin/validate.ts <file>`). JSON Schema is
still to come (tracker N2).

The `View` (regions, layout modes, node kinds, item numbers, links, no coordinates) is the
projection the layout engine and the page read: one board folded from the ledger by `boardView`,
never a file. The format-1 view files and transcript are archived in
`prototypes/archive/view-format-v1/`.

- **Depends on**: nothing.
- **Used by**: `packages/actions`, `packages/layout`, `packages/ui`, `apps/board`.
- **Public API** (`src/index.ts`): view types and constants (`View`, `ViewNode`, `Region`,
  `Link`, `MODES`, `KINDS`, `ID_PATTERN`, `FORBIDDEN_KEYS`), `validateView`; ledger types
  (`LedgerEvent` and one type per event, `NodeBody`, `ParkBundle`, `EVENT_TYPES`, `LEDGER_FORMAT`,
  `ActionId`, `ACTION_IDS`), `MAX_TEXT`, `eventProblems` (one
  event's shape), `LedgerIndex` with `emptyIndex`, `contextProblems` and `indexEvent` (is this
  the right next event), `readLedger` and `validateLedger` (a whole file); the drawn fold
  (`foldDrawn`, `applyDrawn`, `nodesOf`, `latest`) and `boardView` (one board as a `View`).
