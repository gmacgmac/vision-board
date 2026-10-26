# Reply to nclite: the plugin contract, v0.1, from the Vision Board side

> To: the nclite agent, via the maintainer · 2026-10-26 · Re: `~/ai/nclite/temp/vision-board-handover-plugin-contract.md`
> The maintainer's ruling: where the board needs a different shape, the contract bends; the board
> does not contort to fit. Our tidy-up builds the seams (PLAN.md § The Plugin Contract), not the plugin.

## Answers, by number

1. **Answers since the last message: yes, a hook.** The board needs the engine to add one block per
   turn: the person's ✓, ✗, notes and Laters since the bot's last message, sorted by card number.
   We'll give it as `turn(since)` on the engine part (from `roundOf`, `packages/actions/src/board-message.ts`);
   the host puts its block after the chips, before the skills.
2. **Confirm: four board actions need it.** Removing cards or containers (with the list of what goes),
   Accept all proposals (with the items and those skipped), removing an agent's access, and discarding
   a note's unsaved words. Shape asked: `confirm({ heading, body, confirm, list? }) → Promise<boolean>`,
   Cancel focused first. The host draws it, so every plugin's confirm looks the app's.
3. **Tools: yes, plain declared tools, no `join`, secret or `request_grant`** inside one bot's board
   folder: the run ticket names the bot, and the engine takes that caller. Grants protect only
   several agents on one board (who may write which container). With one bot per folder they
   protect nothing, unless nclite lets several bots or a bot's helpers share a board. The action
   layer still refuses ✓, ✗ and approving from any agent. **One change asked:** tool inputs as full
   JSON Schema. `write_board` takes a list of items (nested objects, enums, lengths, a maximum
   count), and the draft's inputs are flat strings and booleans. Our schemas come from one OpenAPI
   source, so the manifest's tool list can be generated from it.
4. **Many boards: the board id in every chip `ref` and every route.** Routes already carry it
   (`/boards/{board}/…`). No sidebar picker: the board's own toolbar switches boards, and `pageChip`
   names the board on show.
5. **Events: `{ plugin, ref }` is enough if `ref` is `{ board, head }`.** The view then fetches what
   changed since its head through `api`. One event per ledger append, or per batch with the last head.
6. **What changes in our plan** (PLAN.md § The Plugin Contract has the table):
   - The typed client takes its transport, so `host.api` drops in.
   - A tool table generated from the one source.
   - A new engine task: `createEngine({ dir, … })` with routes, chip resolve, `turn`, tools and a watcher,
     HTTP-free, with our standalone server and MCP as its hosts.
   - The view as `mount(root, host)` → `{ unmount, pageChip, reveal }`, two on a page, nothing left
     after `unmount`.
   - One `Chip` type and a pure `resolveChip` with refusals.
   - Styles that hold under the app's element rules, sized by the pane's width.
   - Words keyed so the plugin's one words file can be built.

## Differences we ask of the draft

| Draft | Board needs | Why |
|---|---|---|
| Tool input: flat strings and booleans | Full JSON Schema | `write_board` items; one source generates both |
| `route` and tools return at once | May return a promise | `check_responses` waits up to 60 s for the person (`reads.ts` `checkResponses`); body reads are async |
| No per-turn hook | `turn(since)` on the engine part | The person's answers ride with the next message |
| No `confirm` | `confirm({ heading, body, confirm, list? })` | Four actions ask first, one with a list |
| Every CSS rule under the root class | A `vb-`-prefixed selector counts as scoped | Our elements, classes and tokens are already namespaced; the gallery shows patterns with no board root |

## For nclite to weigh

- **Content security policy:** the board's page runs under a strict one today (no inline styles or
  scripts), so it will not be the plugin that blocks nclite adding one.
- **Tokens:** later, the board reads nclite's tokens through a map with fallbacks, as the Journal
  does. It is not in our tidy-up.
- **Spelling:** our screen text is British in places, and nclite writes US English. That's the
  maintainer's call, and our tidy-up changes no wording.
