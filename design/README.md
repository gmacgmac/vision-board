# Design

Where the board's designs live: mockups, node skins and layouts, kept next to the code they shape.
What was decided about them is in the decisions draft
(`cortex-tasks/board/2026-11-11_board-ui_app-window-handover/design-decisions.md`), and, once settled,
in `docs/decisions.md`.

## mockups/

| Folder | What it holds |
|---|---|
| `node-skins/` | The two chosen node skins, each as a page you can open in a browser and as a full-page picture, dark and light: `default-skin-*` (the default look with Architecture content) and `command-lens-skin-*`. These are the reference for building. |
| `node-states/` | Where every state the skins pages never drew sits on the new node (proposal, handover, Later, moved, locked, a failed write, focus, hover, history's stepper, the conversation, an agent's icon, the app window), in both skins, dark and light, with the choices still open. Its `README.md` lists every state of today's node and where it went. Standalone, no network. |
| `node-directions/` | The whole design canvas as files: `canvas.json` (where each artboard sits, on two pages) and one `.dc.html` per artboard, from the first explorations (1 to 8) to the node anatomy (9 to 12). |

The canvas itself is the design artifact "Vision Board node directions" on claude.ai, private to the
maintainer. The files in `node-directions/` are a copy of it; the canvas is where designs are edited,
and a copy is taken here when a round of work ends.

## Reading the files

- A `.dc.html` file is a design-canvas artboard: plain HTML and CSS inside `<x-dc>`, with a small
  script for its switches (dark or light). It needs the canvas to run; to look at one, open the page
  in `node-skins/` or the canvas.
- Pages in `node-skins/` are standalone. They load their fonts from Google Fonts, so offline they
  fall back to system fonts.
- The artboards are named by number: 10 is the default skin's node anatomy, 11 the first Command Lens
  try, 12 the chosen Command Lens node.

## Adding a design

Draw it on the canvas, then copy its `.dc.html` (and `canvas.json`) into a folder under `mockups/`
named for what it designs, and export a page and a picture for the one that is chosen. Record the
decision in the decisions draft, naming the artboard.
