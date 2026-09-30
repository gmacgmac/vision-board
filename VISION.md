# Vision Board

Status: idea, captured 2026-09-29. Nothing built yet.
Origin: the Uplynk Architect prototype (`~/AI-Work-VSCode/uplynk-architect`).

## The problem

- Working with AI, we can put out a lot quickly. What slows us down is taking in the AI's output so we can make the next decision.
- AI output is often hard to take in. It's dense and full of commentary, and it assumes context we don't have.
- As the AI does more of the work, we become conductors. Conductors need visual feedback so they can decide faster.

## The idea

A board the agent can draw to mid-session: "show me this on the vision board."

- **Output becomes modules.** Text blocks, bullets, node graphs that show how things connect, flows, responsibilities. Any mix of them.
- **Purpose:** learn and understand anything, then decide, whether that's through nodes, flows, text or a combination.
- **You can work on the board.** Click a node or lasso a group of nodes and pin a note. Notes become context, questions or actions for the agent.
- **It loops.** The agent reads your notes and replies in chat or by redrawing the board. Each pass moves the project forward.
- **End state:** a skill (and later perhaps a plugin) that works in any agent session.

## Kept from Uplynk Architect

1. **A fixed set of building blocks** that the agent draws from.
2. **Notes pinned on the board:** click or lasso, then add a note.
3. **A "Confirm these" list:** the assumptions the agent made, which you confirm or correct.
4. **Versions that highlight what changed**, so you only re-read the parts that changed.
5. **An Approve step:** the approved version becomes the decision you're working from.

Dropped: the video-specific rules, and the app running Claude itself. The agent already in the session does the drawing.

## Handoff: getting notes back to the agent

- The page saves a transcript locally (notes, selections, replies).
- The agent picks it up and replies in chat or by updating the board.
- A small local server plus a folder sits in between:
  - `sessions/<id>/view-vN.json`: what the agent drew (version N)
  - `sessions/<id>/transcript.jsonl`: what you did on the board
- Later: a plugin tool that shows the board and waits for your notes, with no manual "go read it" step.

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
  - right-angle connectors with rounded corners, the same style as Architect
  - connection points on fixed sides of each node
  - parallel links bundled together
  - consistent spacing between nodes
- **Engine choice to decide:**
  - write our own layout for each mode, as Architect did
  - or use ELK (elkjs) for flow, tree and lanes, and our own code for radial

## Prior work nearby to check

These folders are in `~/Dropbox (Personal)/Developer/web-apps/`: `flow-designer`, `flow-designer-uplynk`, `module-designer`, `mermaid-render`, `project-manager`.

## Next steps (when picked up)

1. Write the view file format (building blocks, regions, modes, links, hints).
2. Write the transcript file format.
3. Build the layout engine for radial, flow, lanes and text.
4. Move the Architect canvas across (drawing, notes, versions, Confirm these, Approve).
5. Package it as a skill.
