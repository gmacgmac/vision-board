# CONTRACT_01_spec-and-test: The spec and the contract test

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

`docs/specification/plugin.md` says, generally, what any host implements. `tests/plugin/` proves a host written only from that spec gets a whole, working board.

## Steps

1. **The spec**: what a plugin is here; the folder; the view seam and the engine seam, each hook, what it promises and what happens without it; the manifest; tools over MCP, with the worked transports (stdio `vb-mcp`; a host's own MCP server calling `tools.call`); attachments (the host's chat; how a path reaches the agent); theme; how to link the folder and update. Plain, general, no host named in the seam. A last section: **what nclite needs**, as a list: its contract's gaps (RESEARCH § 4), each with why and a suggested change, and the recommended tool pass-through (RESEARCH § 2).
2. **The fake host**: `tests/plugin/fake-host/`, written from the spec alone, importing only `dist/plugin/board/`. It runs a different Svelte beside the bundle, hostile element styles, and its own keys.
3. **The test**: every view hook and every engine hook; every listed tool; a chip added, replaced and removed; Send; `reveal`; `unmount` leaves nothing. Add a board-to-chat round trip through a fake chat that uses only the seam.
4. **nclite's prototype**: mount the built folder in a copy of `prototypes/plugin-host/` under `temp/` (never write in nclite), and report what its `PluginHost` lacks. Not a test we keep: findings for the list.

## Validation

- [ ] The fake host imports nothing outside the built folder and the spec's shapes
- [ ] Each hook in the spec names its test (`cortex-docs`)

## Implementation Notes

_To be completed by agent after task completion._

**Status**: Pending · **Completed**:

## On Completion

Notes; your row; one LOG line (`[project-docs] CONTRACT_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS`.
