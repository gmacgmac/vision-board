# Uplynk Architect — data contracts

Local-first. No npm dependencies. Node 22. Everything is files.

```
prototypes/architect/
  primitives/<type>.json     one primitive per file
  primitives/index.json      generated summary + alias map
  rules/platform-rules.json  plain-English platform rules; some are machine-checked (see "Rules")
  plans/<planId>/v<N>.json   plan versions, N = 1,2,3... (latest = highest N)
  plans/<planId>/log.jsonl   one line per request: what the operator sent, what Claude replied, attempts
  prompts/architect.md       system prompt for the planner
  app/index.html             the canvas UI (single file)
  app/server.mjs             static server + API + claude -p bridge
```

## Primitive (`primitives/<type>.json`)

```json
{
  "type": "cloud-ingest",                 // kebab-case, equals filename
  "name": "Cloud Ingest",
  "kind": "node",                         // "node" (a box in the flow) | "attachment" (a badge on a node)
  "stage": "make",                        // "in" | "make" | "out"   (nodes only; attachments omit)
  "family": "uplynk",                     // "live" | "files" | "managed" | "uplynk" | "destination"
  "icon": "cloud",                        // one of ICONS below
  "description": "One plain-English line an operator would understand.",
  "aliases": ["slicer", "cloud slicer", "ingest", "slice it"],  // lower-case, what people SAY
  "props": [                              // configurable fields; may be []
    { "key": "protocol", "label": "Protocol", "options": ["SDI", "Zixi", "RIST"] },
    { "key": "name", "label": "Name" }    // free text when no options
  ],
  "providers": ["Grass Valley"],          // optional: vendors that can fulfil it
  "inputs":  { "max": 1,    "from": ["signal-in", "prep-mcr"] },   // nodes only. max = most edges IN (0 = source, null = unlimited)
  "outputs": { "max": null, "to":   ["transcode", "transmux"] },   // nodes only. max = most edges OUT (0 = terminal, null = unlimited)
                                          // outputs.to MUST be the exact inverse of every other node's inputs.from
  "attachesTo": ["transcode"],            // attachments only: node types it can badge
  "subflow": null                         // or a Plan-shaped {nodes, edges} this node expands into
}
```

ICONS: `signal` `file` `cloud` `cog` `layers` `broadcast` `calendar` `scissors` `doc` `globe` `play` `share` `tv` `server` `box` `lock` `dollar` `cc` `image` `ban` `tag` `user` `bolt` `link`

## index.json

```json
{
  "generated": "ISO date",
  "primitives": [ { "type", "name", "kind", "stage", "family", "icon", "description", "aliases" } ],
  "aliasMap": { "slicer": "cloud-ingest", "cloud slicer": "cloud-ingest", "...": "..." }
}
```
Every alias maps to exactly one type. The type and the lower-cased name are also keys.

## Plan (`plans/<planId>/v<N>.json`)

```json
{
  "id": "live-channel-demo",
  "title": "Stadium feed to channel, event and YouTube",
  "version": 3,
  "status": "draft",                      // "draft" | "approved"
  "createdAt": "ISO date",
  "summary": "What changed in this version, one sentence.",
  "assumptions": ["Things the planner assumed and the operator should confirm."],
  "nodes": [
    {
      "id": "src",                        // short, stable across versions; keep ids when a node survives
      "type": "signal-in",                // must be a primitive with kind "node"
      "label": "Stadium feed",
      "props": { "protocol": "SDI" },
      "attachments": [ { "type": "drm", "props": { "systems": "FairPlay, Widevine" } } ],
      "notes": ["Short config bullets shown on the card."],
      "subflow": null                     // optional expanded internals, Plan-shaped {nodes, edges}
    }
  ],
  "edges": [ { "from": "src", "to": "ingest", "label": "" } ]
}
```
Layout is computed by the UI from edges (left to right). Plans never store coordinates.

## Annotation (sent from UI to server)

```json
{ "id": "a1", "text": "use Zixi here", "nodes": ["src"], "region": {"x":0,"y":0,"w":0,"h":0} | null }
```

## HTTP API (server.mjs, default port 4455)

- `GET /` and static files from `app/`
- `GET /api/primitives` → `{ primitives: [ ...full primitive objects ], aliasMap }`
- `GET /api/plans` → `[ { id, title, version, status } ]`
- `GET /api/plans/:id` → latest version
- `GET /api/plans/:id/versions` → `[ { version, status, summary, createdAt } ]`
- `GET /api/plans/:id/v/:n` → that version
- `POST /api/plans/:id/propose` body `{ message, annotations: [Annotation], selection: [nodeIds] }` → runs the planner, writes v(N+1), returns the new plan. For a new id with no versions, the planner starts from an empty plan.
- `POST /api/plans/:id/approve` → writes v(N+1) identical to latest with `status: "approved"`, summary "Approved.", returns it
- `GET /api/plans/:id/events` → Server-Sent Events; emits `event: version` `data: {version}` whenever a new v<N>.json appears on disk (so edits made by Claude Code directly on files show up live)

## Rules (`rules/platform-rules.json`)

```json
{ "rules": [
  { "id": "abr-transmux", "text": "Plain-English rule shown to operators and to the planner.", "check": "abr-path", "abrProtocols": ["HLS", "DASH"] }
] }
```
Every rule's `text` goes to the planner. A rule with a `check` the server implements is also enforced; others are guidance only.
Checks always enforced from the primitives themselves: edge allowed (`A.outputs.to` has B and `B.inputs.from` has A), `inputs.max`, `outputs.max`, attachment `attachesTo`.
Named checks: `abr-path` (a Cloud Ingest fed directly by a signal-in whose protocol is in `abrProtocols` may only feed `transmux`; fed by anything else it may only feed `transcode`), `abr-no-attachment` (the `attachment` type may not sit on an ABR signal-in, nor on a Cloud Ingest fed by one).

## Plan additions
Plans also carry `"reply"`: Claude's short conversational answer to the operator for that version.

## Log entry (`plans/<planId>/log.jsonl`, one JSON object per line)
```json
{ "at": "ISO", "version": 3, "ok": true, "ms": 14210, "request": { "message", "annotations", "selection" },
  "reply": "...", "summary": "...", "problems": [], "attempts": [ { "ms": 9000, "ok": false, "problems": ["..."] }, { "ms": 5210, "ok": true, "problems": [] } ] }
```
API: `GET /api/plans/:id/log` → array of log entries, oldest first ([] if none). `GET /api/primitives` also returns `rules` (the rules array).
