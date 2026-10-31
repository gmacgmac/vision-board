# BUILD_01_plugin-folder: The plugin folder

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

`npm run build:plugin` writes one self-contained folder, `dist/plugin/board/`: `manifest.json`, `view/board.js` (exports `mount`) and `view/board.css`, `engine/engine.js` (exports `createEngine`), `words.json`, `skill.md`. Standalone is built from the same entry points. Tracker M14.

## Steps

1. **`#board` and `#board/styles.css`** (M14): the view's one name; `#board/engine` for the engine. A host never imports a path into `apps/board`.
2. **Manifest**: JSON, checked by a JSON Schema in `apps/board/plugin/`; version from the API's; its tools generated from the tool table filtered by `x-hosts` (PROOF_01). Words keys, never text, as hosts expect.
3. **The view bundle**: Vite library build, one ESM file carrying Svelte's runtime, one CSS file, no chunk that a host must serve by path. The PDF frame stays standalone's. Note the bundle's size in the task notes, gzip too; a budget test.
4. **The engine bundle**: one ESM file for Node, `ajv` and `fflate` inside; no `import` a host must satisfy.
5. **Theme**: `apps/board/plugin/theme.css` maps `--vb-*` from a small documented list of a host's own properties, with fallbacks, as `chat-host.css` does for the chat; the UI text scale comes with it. A host with none still looks right.
6. **Words and skill**: `words.json` generated from the words files; `skill.md` is `skills/vision-board/SKILL.md` less what only standalone has, with a test they don't drift.
7. **Reproducible**: same input, same bytes; `--watch` for development, so a host linked to the folder picks up changes. `dist/` stays git-ignored.

## Validation

- [ ] A clean build writes exactly the folder; a test imports `mount` and `createEngine` from it with nothing else on the path
- [ ] Standalone behaves as before; bundle sizes recorded

## Implementation Notes

_To be completed by agent after task completion._

**Status**: Pending · **Completed**:

## On Completion

Notes; your row; one LOG line (`[project-tooling] BUILD_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS`.
