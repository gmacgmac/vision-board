---
category: project-docs
last_updated: 2026-10-04
status: active
scope: Why Vision Board exists, what it does, and where it is going
keywords: [vision, board, review, agent, feedback]
---

# Vision Board

Status: vision, updated 2026-10-04. Building: see `cortex-tasks/tracker.md`.
Origin: the Uplynk Architect prototype, copied as reference into `prototypes/architect/`
(from Uplynk Studio, `~/WORK/uplynk-studio/prototypes/architect/`).

Where to look in Architect:

- `README.md`: what it does and how to run it
- `CONTRACT.md`: the file formats (building blocks, plans, versions, log)
- `app/index.html`: the canvas (drawing, click and lasso, notes, versions, Confirm these, Approve)
- `app/server.mjs`: the local server, live updates and the Claude bridge
- `prompts/architect.md`: the instructions the planner follows

## The problem

- Working with AI, we can put out a lot quickly. What slows us down is taking in the AI's output so we can make the next decision.
- AI output is often hard to take in. It's dense and full of commentary, and it assumes context we don't have.
- A big piece of work comes back as dozens of points: findings, questions, options, risks, action items. Each one needs a response.
- Bullets make that hard: to answer one, you have to quote it back. Numbered lists that run across categories help ("1 ok, 40 skip, 47 more context"), but it is still a wall of text, and the back and forth to get context (or a plain-language version) buries the thread.
- As the AI does more of the work, we become conductors. Conductors need visual feedback so they can decide faster.

## The idea

A board the agent can draw to mid-session: "show me this on the vision board."

- **Output becomes modules.** Text blocks, bullets, node graphs that show how things connect, flows, responsibilities. Any mix of them.
- **Purpose:** learn and understand anything, then decide, whether that's through nodes, flows, text or a combination.
- **You can work on the board.** Click a node or lasso a group of nodes and pin a note. Notes become context, questions or actions for the agent.
- **It loops.** The agent reads your notes and replies in chat or by redrawing the board. Each pass moves the project forward.
- **It works on any project.** Code, product management, writing, research: anything the agent can investigate.
- **End state:** a skill (and later perhaps a plugin) that works in any agent session.

Normal chat stays the default. The board is for the moments when the agent comes back with more than you can comfortably answer in text.

## Kept from Uplynk Architect

1. **A fixed set of building blocks** that the agent draws from.
2. **Notes pinned on the board:** click or lasso, then add a note.
3. **A "Confirm these" list:** the assumptions the agent made, which you confirm or correct.
4. **Versions that highlight what changed**, so you only re-read the parts that changed.
5. **An Approve step:** the approved version becomes the decision you're working from.

Dropped: the video-specific rules.

Changed (2026-10-01, D-010): the board has its own chat panel on the right, powered by kiro-cli.
The agent draws on the board through a tool call when the subject suits it. Its text answers
appear in the chat, and the person's notes on the board go into the chat input as references to
nodes.

## Handoff: getting notes back to the agent

- Everything the agent draws and everything you do goes into one append-only log per project,
  the project ledger (`.visionboard/ledger.jsonl`, D-017). The board is worked out from it.
- The agent reads your notes back through the board API and replies in chat or by redrawing.
- A small local server owns the ledger; the page, the `vb` CLI and MCP all go through it (D-019).
- Later: a plugin tool that shows the board and waits for your notes, with no manual "go read it" step.

## Many chats, one board

The board is shared ground for several conversations at once, not a picture of one chat.

- **One ledger per project, not per chat.** Every chat and every agent writes into the same
  project ledger, and each entry records who wrote it. So any chat can see the whole board.
- **A container is a thread.** Each container has its own id and holds one line of work. The main
  conversation lives in one container.
- **Branching.** You can pull cards, a flow or a lane out into a new container and hand it to a new
  chat. That chat starts with only the handover bundle and the linked cards (D-020), not a copy of
  the whole conversation, so its context stays small.
- **Aware, not tangled.** Through the API and MCP, each chat works in its own container and can read
  the others: what they are doing, what they decided, what they parked. It shares context by
  pointing at cards, not by copying them.
- **Why it matters.** Threads of work run side by side and in their own direction, while the
  person still sees and steers all of them in one place. That is the multi-threaded way of working
  the board exists for.

Still to design: which chat owns which container, what a chat may write outside its own container,
and how the board shows that two agents are working at the same time. Each becomes a decision entry
when it is built.

## Layout: a smart coordinate system

- **The agent describes, the engine places.** The agent never writes x/y. It gives the nodes, links, region and mode, and the engine computes positions, spacing and collision avoidance.
- **The canvas is split into regions**, and each region has its own layout mode.
- **Regions are arranged automatically**, from the agent's order and size hints. Dragging comes later, if ever.
- **Links can cross regions.** A bullet in a text region can point at a node in a flow region.

### Layout modes

| Mode | What it does |
|---|---|
| Radial | Builds outward from a centre node |
| Flow | Left to right, with branches |
| Lanes | Several left-to-right flows, one per lane; each lane is as tall as its tallest node |
| Text | Headings, bullets and notes |
| Tree | Parent above children |
| Timeline | Things placed in time order |
| Grid | Cards in rows |
| Matrix | A 2×2 of two dimensions |
| Layers | A stack |

Optional hints from the agent: pin a node, set the order, emphasise something.

### How the drawing should look (not like Mermaid)

- Mermaid uses a layout library called dagre. Its curvy connectors and odd starting points are what look messy.
- **Proposed instead:**
  - right-angle connectors with rounded corners (new work: Architect draws curved Bézier connectors)
  - connection points on fixed sides of each node
  - parallel links bundled together
  - consistent spacing between nodes
- **Engine choice to decide:**
  - write our own layout for each mode, extending Architect's flow layout
  - or use ELK (elkjs) for flow, tree and lanes, and our own code for radial

## Prior work nearby to check

These folders are in `~/Dropbox (Personal)/Developer/web-apps/`: `flow-designer`, `flow-designer-uplynk`, `module-designer`, `mermaid-render`, `project-manager`.

## Next steps (when picked up)

1. Write the view file format (building blocks, regions, modes, links, hints).
2. Write the transcript file format.
3. Build the layout engine for radial, flow, lanes and text.
4. Move the Architect canvas across (drawing, notes, versions, Confirm these, Approve).
5. Package it as a skill.
