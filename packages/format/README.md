# packages/format

The format the agent and the board share: the project ledger (`.visionboard/ledger.jsonl`,
format 13, readers accept 2 to 13; D-017, api.md 125-132), one event per line for every card's
identity, versions, the person's actions, the agent's replies, proposals, parking bundles,
retires, joins and grant requests. A card's identity is its ledger number: the file writes it `n`,
code calls it `id` (`fromLine`, `toLine`); every request and answer names a card by its board
number `n` instead, 1, 2, 3... per board in the order drawn (`boardNumber`, `cardId`; D-041
proposed). A
board version is a position in it (`seq`). Its one source is the JSON Schema in `schema/`
(`common`, `events/<type>` with `core`, `sent` and `stored` forms, and `ledger-event`; api.md
5-11), `schema/api/` (request and response bodies that are not events) and `schema/openapi.json` (every
operation, OpenAPI 3.2; `schema/vendor/` holds the official OAS schema the tests check it against). The
types and the hand validators here are tested against it; `ajv` runs only in the board
server (`apps/board/server/schema.ts`), as does the CLI (`npm run validate -- <ledger.jsonl>`).

The `View` (regions, layout modes, node kinds, board numbers, links, no coordinates) is the
projection the layout engine and the page read: one board folded from the ledger by `boardView`,
never a file. The format-1 view files and transcript are archived in
`prototypes/archive/view-format-v1/`.

- **Depends on**: nothing.
- **Used by**: `packages/actions`, `packages/layout`, `packages/ui`, `apps/board`.
- **Public API** (`src/index.ts`): view types and constants (`View`, `ViewNode`, `Region`,
  `Link`, `MODES`, `KINDS`, `ID_PATTERN`, `FORBIDDEN_KEYS`; card widths `WIDTHS`, `DEFAULT_WIDTHS`,
  `widthsOf`, api.md 132), `validateView`; ledger types
  (`LedgerEvent` and one type per event, `NodeBody`, `ParkBundle`, `LedgerRegion`, `EVENT_TYPES`,
  `RetireEvent`, `LEDGER_FORMAT`, `LEDGER_FORMATS`, `ActionId`, `ACTION_IDS`, `PRIVATE_ACTIONS`, `CARD_MARKS`, `BOARD_MARKS`,
  `isPrivateAct`, `CARD_EVENTS`, `NODE_SIZES`, `ACT_SIZES`, `RENAMED_MODES`, `LIST_RENAMED`),
  `fromLine` and `toLine` (a line as the file holds it, and the event code reads),
  `MAX_TEXT`, `LIMITS`, `codePoints`, `AGENT_ID_PATTERN`, `TIMESTAMP_PATTERN`, `eventProblems` (one
  event's shape), `LedgerIndex` with `emptyIndex`, `containerKey`, `contextProblems` and
  `indexEvent` (is this the right next event), `boardNumber` and `cardId` (a card's board number and back),
  `readLedger` and `validateLedger` (a whole file); the drawn fold
  (`foldDrawn`, `applyDrawn`, `nodesOf` (on the board now), `everyNodeOf` (retired too), `latest`) and `boardView` (one board as a `View`); the route table `OPERATIONS` and `OperationId` (each operation's
  method, path, path parameters, `xAgent` and `auth`), generated from `schema/openapi.json` by `npm run gen`.
