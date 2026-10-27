# packages/cli

`vb`: a terminal command for every agent operation of the board API (api.md 51). One command per
`x-agent` operation in `openapi.json`, generated into `src/commands.generated.ts` by `npm run gen`
(`npm run gen -- --check` fails when it is stale). A command's flags are the operation's inputs; the
call goes through `packages/client`, so `vb`, the board page and the MCP server speak the same way.

Run it from the repo with `npm run vb -- <command> [flags]` (or `node packages/cli/bin/vb.ts`).
`vb help` lists the commands; `vb <command> --help` shows one command's inputs.

## Setup

- `--server <url>` or `VB_SERVER`: the board server. Default `http://127.0.0.1:4466`.
- `--secret <secret>` or `VB_AGENT_SECRET`: your agent secret from `join`. Reads need none.
- Output is the JSON answer. `--text` prints `key: value` lines instead (`boards[0].title: Roadmap`).
- Exit codes: `0` done, `1` the call failed (a problem answer prints its `detail` and each
  error's pointer and detail to stderr; no answer at all prints the address), `2` the arguments
  were wrong.

## Examples

```sh
npm run vb -- list-boards --text
npm run vb -- show-node --board roadmap --n 3 --linked
npm run vb -- check-responses --board roadmap --after 51 --wait 60   # waits until the person presses Send
npm run vb -- join --label "Pricing chat"                            # prints { agent, secret } once: save both
npm run vb -- write-board --board pricing --json-body items.json      # items.json holds { "items": [ ... ] }
```

`--json-body <file>` gives a whole request body; `-` reads it from stdin. A flag for a body input
(such as `--reason`) overrides the same field in the file. A body input that is a list or object
(`--items`) takes JSON text.

- **Depends on**: `packages/format`, `packages/client`.
- **Used by**: the root `vb` script, and agents with a shell.
- **Public API** (`src/index.ts`): `run(argv, io)`, `nodeIo`, the generated `COMMANDS`, `parseArgs`,
  `assemble`, `formatText`, `overview`, `commandHelp`.
- **Tests**: `tests/` (parsing, help, formatter, exit codes against a stub server, and a real round
  trip of the reads against the board's test support, `#board/testing`, started as a child process).
