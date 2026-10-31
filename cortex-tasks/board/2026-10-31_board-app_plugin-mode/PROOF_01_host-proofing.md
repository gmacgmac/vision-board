# PROOF_01_host-proofing: Nothing assumes it owns the page

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

The board behaves as a guest in any page: tracker M12, M13, M15, M21, M22, plus the image route and the zoomed image view. RESEARCH § 4 "where the board strays".

## Steps

Each with its failing test first, in a fixture host with its own keys, its own storage and two boards from different folders.

1. **M12**: every flag comes from `host.settings`, with its default; no module switch (`setMarkdownImages`, `setMarkdownSvg`).
2. **M13**: the saved view goes through the host, keyed so two bots with a board "plans" never clash. Standalone keeps sessionStorage in its host.
3. **M21**: an open board menu takes Esc only when focus is in the board. **M22**: every key the board acts on is `preventDefault`ed, and typing includes `[contenteditable]`, so a host can tell.
4. **M15**: `x-hosts` on each tool in `openapi.json`, generated into the table: what a plugin bot gets. `read_attachment` is `standalone`. `list_apps`, `join` and `request_grant` are settled here, with the reasoning noted.
5. **Images**: a host's route prefix works for `io/image.ts` and `/board-images`; no bare `fetch` to a fixed path.
6. **The zoomed image view** draws inside `root`, or says plainly why it can't. A check that no document-level listener outlives `unmount`, and every selector stays scoped.

## Validation

- [ ] Two mounts in one page don't share a view or a listener; unmount leaves nothing behind (a test counts listeners)
- [ ] `host-styles` holds; standalone's specs pass

## Implementation Notes

_To be completed by agent after task completion._

**Status**: Pending · **Completed**:

## On Completion

Notes; your row; one LOG line (`[board-security] PROOF_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS`.
