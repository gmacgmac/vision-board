---
name: vision-board
description: Draw your output on the Vision Board when it has more than a handful of points the person must respond to (findings, questions, decisions, risks, actions), then read their responses back. Use when the person says "show me this on the board" or a reply would be a long numbered list.
status: draft v0 (not yet tested against scenarios; project rule 17)
---

# Vision Board skill (draft v0)

## When to use it

Chat stays the default. Use the board when your reply would be a numbered list the person has
to answer item by item, roughly 8 items or more, or when how things connect matters.

## Write a view

1. Pick a session id: lowercase letters, digits and dashes (e.g. `login-review`).
2. Write `sessions/<id>/view-v<N>.json` (N = 1 first, then the next number). Views are immutable:
   never edit one, write the next version.
3. Shape (see `packages/format/src/view.ts`):
   - `regions`: one per category, each with a `mode`: `grid` (cards to review), `list` (ordered
     questions), `flow` (left-to-right steps, uses links), `lanes` (flows per owner or area,
     needs `lanes` and each node's `lane`), `radial` (ideas around a `center` node).
   - `nodes`: `id`, `region`, `kind` (question, finding, decision, risk, action, topic, note),
     `title` (one line), optional `body` (one or two plain sentences), `tags`, `emphasis`.
   - Give every node that needs a response a number `n`. **Numbers run across all regions**
     (1–3 in the first, 4–7 in the next...) and never change once given: in v2, item 7 is still
     item 7. New items take the next unused number. Topics and notes have no number.
   - `links`: `from`, `to`, optional `label`. Links may cross regions.
   - **Never write coordinates.** The engine places everything; the person's own moves are kept.
4. Keep ids of everything that didn't change, so only real changes stand out.
5. Validate before telling the person: `node packages/format/bin/validate.ts sessions/<id>/view-vN.json`.
   Fix every problem it lists.
6. Tell the person: "It's on the board: http://localhost:4466/#<id>" (server:
   `npm run board`).

## Read the responses

Run `node apps/board/bin/reply.ts <id>` for the numbered reply ("1 ok, 4 drop, 7 more
context: ..."), or `--json` for the full state. The raw record is `sessions/<id>/transcript.jsonl`.

- **ok / drop**: decided. Don't raise it again.
- **comment**: act on the note.
- **more context**: in the next view, rewrite that item's `body` in plain terms (same `id` and
  `n`), or add a `note` node linked to it.
- **later**: leave it; don't count it as open.
- Only the person decides. You never write to the transcript for them.

Then answer in chat, or draw the next version.
