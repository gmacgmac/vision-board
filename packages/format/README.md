# packages/format

The format the agent and the board share: the project ledger (`.visionboard/ledger.jsonl`,
format 18, readers accept 2 to 18; D-017, api.md 125-156), one event per line for every card's
identity, versions, the person's actions, the agent's replies, proposals, parking bundles,
retires, joins and grant requests. A card's identity is its ledger number: the file writes it `n`,
code calls it `id` (`fromLine`, `toLine`); every request and answer names a card by its board
number `n` instead, 1, 2, 3... per board in the order drawn (`boardNumber`, `cardId`; D-041
proposed). A
board version is a position in it (`seq`). Its one source is the JSON Schema in `schema/`
(`common`, `events/<type>` with `core`, `sent` and `stored` forms, and `ledger-event`; api.md
5-11), `schema/api/` (request and response bodies that are not events), `schema/app/` (an app's manifest, D-047) and `schema/openapi.json` (every
operation, OpenAPI 3.2; `schema/vendor/` holds the official OAS schema the tests check it against). The
types and the hand validators here are tested against it; `ajv` runs only in the board
server (`apps/board/server/schema.ts`), as does the CLI (`npm run validate -- <ledger.jsonl>`).

The `View` (regions, layout modes, node kinds, board numbers, links, no coordinates) is the
projection the layout engine and the page read: one board folded from the ledger by `boardView`,
never a file. The format-1 view files and transcript are archived in
`prototypes/archive/view-format-v1/`.

- **Depends on**: nothing.
- **Used by**: `packages/actions`, `packages/layout`, `packages/ui`, `apps/board`.
- **Public API** (`#format`, `src/index.ts`, D-059): view types and constants (`View`, `ViewNode`, `Region`,
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
- **App cards** (`src/apps.ts`, D-047, [apps.md](../../docs/specification/apps.md)): `APP_ID`,
  `APP_HASH_PATTERN`, `APP_TOOL_NAME`, `APPS_DIR`, `APP_FILES`, `APP_SIZE`, `APP_LIMITS`,
  `APP_STATES`, the panel protocol (`APP_PROTOCOL_VERSION`, `PANEL_METHODS`, `HOST_NOTIFICATIONS`,
  `PANEL_ERRORS`, `APP_STYLE_VARIABLES`), the types `AppRef`, `AppManifest`, `AppToolInfo`,
  `AppToolResult`, `AppInfo`, and `appSize`; `APP_ACTIONS` (ledger.ts); the manifest's one source is
  `schema/app/manifest.schema.json`. The hand twin of the app card's schema pieces is
  `src/app-shape.ts`.
- **Images in cards** (`src/images.ts`, D-048, svg D-064, [images.md](../../docs/specification/images.md)):
  `IMAGES_DIR`, `IMAGE_ROUTE`, `IMAGE_LIMITS` (png, jpeg, webp, gif and svg with their extensions,
  content types and first bytes; the size, svg size and svg head, depth and name limits),
  `IMAGE_HEAD_BYTES`, `IMAGE_WORDS` and `imageNotReal` (the plain words for why an image is not
  shown), `imagePathProblem` (the one path check, used by the board's route and the Markdown
  renderer; `ImageAllow` `svg` is the svgImages flag), `imageTypeByName`, `imageTypeOf`, `svgProblem`
  (an svg known by its opening), `imageHeadProblem`, `imageCap` and the type `ImageName`. Pure string
  logic: no Node and no DOM.
- **Geometry and text** (ARCH_04): `src/geometry.ts`, the one home of a box on the board (`Box`,
  `Point`, `Size`, `clamp`, `overlaps`, `touches`, `boundsOf`, `boxAround`, `boxBetween`; layout and
  `packages/ui` re-export what they name; `tests/geometry.test.ts`), and `src/clip.ts` (`clip`, a line cut to
  a length).
- **Names defined once** (ARCH_02, `src/constants.ts`): `ENV`, the `VB_*` environment variable names;
  the port, default server, folder header and route prefix are generated into `operations.generated.ts`
  (`DEFAULT_PORT`, `DEFAULT_SERVER`, `PROJECT_HEADER`, `ROUTE_PREFIX`; `tests/constants.test.ts`).
- **Files Node reads** (`#format/files`, `src/files.ts`, D-060): `SCHEMA_DIR`, `OPENAPI_FILE`, `TOOLS_FILE`
  (the tool table `npm run gen` writes), `FIXTURES_DIR`.
  Not on `#format`, which the page loads, so `node:url` stays out of the page bundle.
- **Fixtures** (`fixtures/`): the roadmap, login-review and login-layout ledgers, and
  `gallery.ledger.jsonl`, which the gallery page imports `?raw` as `#format/gallery.ledger.jsonl` (D-062).
- **Test support** (`#format/testing`, `tests/support.ts`, D-060): `FIXTURE_LEDGERS`, `fixtureLines`,
  `lineMaker`, `checkedEvents`, `makeTempDir`, and the performance fixture `perfLedger` and `BIG`
  (`tests/perf-ledger.ts`). Every module's tests use these instead of keeping their own copies.
