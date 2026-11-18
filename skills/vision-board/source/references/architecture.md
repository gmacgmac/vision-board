# Architecture

For laying out a system: its components and how they connect. The path through it is a flow, so
`references/layouts.md` holds too.

## The components

- **One card per component**: a service, a store, a queue, a device, an outside system. Its kind
  is by meaning, as on any board: most are `topic` (a part) or `note` (background); a weak point is
  a `risk`, an open choice a `decision` that says what ✓ and ✗ mean.
- **The path is one flow**: the way a request or a piece of data moves, in one `flow` container,
  each link pointing the way it moves, labelled with what moves ("frames", "writes", "serves").
  Parts off that path (monitoring, an admin tool) go in a container beside it, with one link at most.
- A component's text says what it does and what it runs on, in a line or two; detail the person may
  ask for comes later, as a note's answer.

## Icons

- Give a component card an icon wherever one fits, and the same icon to the same kind of component,
  so the picture reads at a glance. A card that is not a component (a risk, a question) takes none.
- Pick the icon for what the component is, never for the part it belongs to or its colour.

## Tones

- Split the system into the parts the person names, or its natural ones (capture, processing,
  delivery; client, service, data), and give each part one tone, the same on every card of that
  part: two to four tones on a board, never one per card, never one on every card.
- A palette name for each part. A hue only when the thing has a colour of its own (a brand, a
  signal colour the person uses).

## The skin

- `default` suits architecture: cards to read and discuss.
- `command-lens` is for operating the system: a run sheet, a cutover, an incident checklist, many
  cards the person answers one after another. Each card's plate along the top carries its number,
  kind and notes; a card that asks is dark-plated, with a Tick | Cross switch along its bottom
  answered in one click; a card that tells is light. So keep titles short, and let the cards that
  ask be the steps the person must confirm. Both skins offer the same actions.
