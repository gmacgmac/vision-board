# view-format-v1 (archived)

Reference only. Nothing runs from here, and no code or test may import from this folder.

**What format 1 was.** The agent wrote one whole board at a time as a view file
(`sessions/<id>/view-vN.json`, `format: 1`), and the person's clicks went to a separate
`transcript.jsonl`. Node ids were strings the agent chose; item numbers were unique per session
only.

**What replaced it.** The project ledger (D-017, `packages/format/src/ledger.ts`): one
append-only JSON Lines file per project, where every node has a number assigned once and never
reused, every agent update is a new version, and the person's actions sit in the same file. A
board version is a position in the ledger, not a file. Test boards are now fixture ledgers in
`packages/format/fixtures/*.ledger.jsonl`.

**What is here.**

- `fixtures/roadmap.json`, `fixtures/login-review.json`: the two view fixtures the tests ran on
  until U3 step 2 (BE_04). Their content lives on as `roadmap.ledger.jsonl` and
  `login-layout.ledger.jsonl`, converted node for node (numbered 1, 2, 3 in view order).

The old local `sessions/` folder was not moved here: it holds the maintainer's own dictated
comments, so it stays local and git-ignored until the maintainer decides.
