# Vision Board

An interactive board an AI agent draws to mid-session, so you can review its output item by
item (acknowledge, drop, comment, ask for more context, save for later) instead of answering a
wall of text. Why it exists: [docs/vision.md](docs/vision.md).

Status: planning. Only the folder layout and reference material exist.

## Layout

| Folder | What belongs there |
|---|---|
| `apps/board/` | The app: canvas and the local server |
| `packages/format/` | View and transcript file formats, schemas, validator |
| `packages/layout/` | Layout engine: modes, region packing, connector routing |
| `packages/actions/` | Typed actions shared by buttons and agents |
| `packages/ui/` | Visual patterns (node, region, connector, note) |
| `packages/tokens/` | Design tokens and contrast checks |
| `docs/` | Vision, decisions, specifications |
| `prototypes/` | Reference only: the Uplynk Architect prototype |
| `cortex/`, `cortex-tasks/` | Work log and planned tasks (Cortex) |

Each folder has a README saying what goes in it. A new top-level folder or package needs a
decision entry.

## Working here

All work beyond a trivial fix is planned first as a Cortex task. `sessions/` (the agent's views
and your transcripts) is local working data and is not committed.
