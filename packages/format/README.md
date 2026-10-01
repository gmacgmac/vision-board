# packages/format

The file formats the agent and the board share: the view file (`view-vN.json`: regions, layout
modes, node kinds, stable item numbers, links, no coordinates) and the transcript
(`transcript.jsonl`: what the person did). Types, the validator, and a CLI the agent runs before
it writes a view (`node packages/format/bin/validate.ts <file>`). JSON Schema is still to come
(tracker N2).

- **Depends on**: nothing.
- **Used by**: `packages/actions`, `packages/layout`, `packages/ui`, `apps/board`.
- **Public API** (`src/index.ts`): view types and constants (`View`, `ViewNode`, `Region`,
  `Link`, `MODES`, `KINDS`, `ID_PATTERN`, `FORBIDDEN_KEYS`), transcript types (`TranscriptRecord`,
  `ActionId`, `ACTION_IDS`), `validateView`.
