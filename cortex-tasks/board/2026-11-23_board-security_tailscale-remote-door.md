---
task_name: Open the Board over Tailscale Serve (the remote door)
created: 2026-11-23
completed:
status: pending
categories: [board-security, board-app]
type: implementation
model: strong
persona: Application security engineer — a door is decided by where a request arrived, never by a header the caller can write; every refusal is tested before the feature that needs it.
skills: [cortex-architecture, cortex-docs]
tracker:
---

# Task: Open the Board over Tailscale Serve (the remote door)

---

## Problem Statement

The maintainer wants to use the board on dev-mac from one other Mac (lite-mac) by typing one web
address, with everything working as it does locally: reading, editing, answering cards, chat with
streamed replies, paste, attach, copy buttons. Today the server answers only on `127.0.0.1` /
`localhost` (`apps/board/server/guard.ts` `guard`, `allowedHosts`), and whoever loads the page gets
the person cookie (`apps/board/server/callers.ts` `personCookie`, set in `apps/board/server/app.ts`
`createBoardServer`), so the page has no sign-in of its own. Tailscale already knows which device and
which user is calling; this task lets the board trust that, through a second door that only
Tailscale Serve reaches. Rulings: maintainer, points 41, 52, 55 and 62 of 2026-11-23 (option B).

---

## The flow (option B, as agreed)

```
 lite-mac                         tailnet                 dev-mac
 ┌──────────────────────┐                     ┌──────────────────────────────┐
 │ Browser              │                     │ Tailscale Serve              │
 │ https://dev-mac.     │   HTTPS (Tailscale  │  • adds "who you are" label  │
 │   <tailnet>.ts.net   │      certificate)   │  • a fake label is replaced  │
 │   :4466  ────────────┼────────────────────►│      │                       │
 └──────────────────────┘                     │      ▼                       │
                                              │ 127.0.0.1:4467  (remote door)│
                                              │      │  is the label on the  │
                                              │      │  allow list?          │
                                              │      ├── no  ─► ✗ refused    │
                                              │      ▼  yes                  │
                                              │   Board server ─► ledger     │
                                              │      ▲                       │
                                              │ 127.0.0.1:4466  (local door, │
                                              │   unchanged: your browser,   │
                                              │   agents, MCP)               │
                                              └──────────────────────────────┘
 Config:
   policy    only lite-mac may reach dev-mac on tcp:4466
   dev-mac   tailscale serve --bg --https=4466 http://127.0.0.1:4467
   board     VB_REMOTE_URL=https://dev-mac.<tailnet>.ts.net:4466
             VB_REMOTE_USERS=<your tailnet login>
   browser   https://dev-mac.<tailnet>.ts.net:4466   (just type it)
```

Two layers guard the remote door:

| Layer | Decides | Set in |
|---|---|---|
| Tailscale policy grant | which device reaches port 4466 | Tailscale admin console (lite-mac only) |
| `VB_REMOTE_USERS` | which tailnet user the board accepts | the board's start settings |

**Why a second door, not a Host check on 4466.** Serve chooses its site by the TLS server name and
passes the caller's `Host` header on [INFERENCE, from Tailscale's serve code; step 1 confirms]. A
Host-based check would let a caller send `Host: 127.0.0.1:4466` through Serve and be treated as
local, skipping the user check. On a door of its own, every request needs the Tailscale login
whatever its headers say; the local door never reads Tailscale headers at all.

**Why trusting the header is safe.** Only Serve forwards to 4467, and Serve deletes any
`Tailscale-User-*` header a client sends before setting its own. A process on dev-mac could forge it,
but such a process can already load the page on 4466 and get the person cookie: no new local risk.

**Plugin.** Untouched. Under a host (nclite) the engine is called through `route(req, { caller })`
with no HTTP; nothing in `apps/board/server/engine/` or `apps/board/plugin/` uses `guard` or the
person cookie (`docs/specification/plugin.md` § The engine). A host that runs over Tailscale guards
its own door; it may copy this pattern in its own code.

---

## Decision (D-117, appended to `docs/decisions.md` with the maintainer's yes, before any code)

```
## D-117 The board may be opened over Tailscale Serve, through a door of its own
- **Date**: 2026-11-23 · **Status**: Accepted (maintainer, point <n>) · **From**: using the board from a second Mac without screen sharing
- **Decision**: When `VB_REMOTE_URL` (an `https://host:port` origin) and `VB_REMOTE_USERS` (tailnet logins) are both set, the standalone server opens a second door on `127.0.0.1`, one port above its own, for Tailscale Serve alone. Every request there must carry a `Tailscale-User-Login` on the allow list, no `Tailscale-Funnel-Request`, and on a write an Origin equal to `VB_REMOTE_URL`; the person cookie it sets is `Secure`, and it offers no system folder chooser. The local door is unchanged and never reads Tailscale headers. One setting without the other, or a URL that is not `https://host:port`, stops the start. The two settings are the switch (no flag in `flags.ts`: a page flag could be turned on from the address bar). Never Funnel.
- **Why**: the tailnet already proves the device (policy grant) and the user (Serve's header); a door of its own means no header a caller writes can make a remote request local. Rejected: a board-issued token (a sign-in page, token storage and rotation for what Tailscale already proves); an SSH tunnel (a tunnel to keep open, and a full shell login to dev-mac).
- **Task**: cortex-tasks/board/2026-11-23_board-security_tailscale-remote-door.md
```

---

## Steps

1. **Confirm Tailscale's behaviour (needs the maintainer's OK; changes Serve for a minute).** In
   `temp/`, run a tiny echo server on a spare loopback port, then
   `tailscale serve --bg --https=4499 http://127.0.0.1:<echo port>`. From dev-mac, `curl` the
   `.ts.net:4499` address three ways: plain; with a forged `Tailscale-User-Login`; with
   `-H "Host: 127.0.0.1:4466"`. Record in Implementation Notes: the `Host` the echo server saw, that the
   forged login was replaced, the header names as sent. Then `tailscale serve --https=4499 off` and
   delete the spike. If Serve rewrites `Host`, the remote door checks Origin only (step 3) and says
   so in D-117 before it is appended.
2. **Settings.** Add `remoteUrl: 'VB_REMOTE_URL'` and `remoteUsers: 'VB_REMOTE_USERS'` to `ENV` in
   `packages/format/src/constants.ts`. One parser (in `apps/board/server/remote.ts`, new) turns them
   into `RemoteDoor | undefined` = `{ origin, host, users: Set<string> }`, or throws the start
   refusal; `server.ts` calls it before anything opens. Write the failing tests first.
3. **The remote door's check.** In `guard.ts`, `guard(req, port, door)` where `door` is `'local'`
   or a `RemoteDoor`. Local: today's code, word for word. Remote: Host equals `door.host` (unless
   step 1 says otherwise); `Tailscale-Funnel-Request` absent; `Tailscale-User-Login` present and in
   `door.users` (compare after trimming, case-insensitive), else 403 with a words-file refusal that
   names no header; on a write, Origin equals `door.origin` exactly (whole origin, no scheme strip).
   It runs on every request: page, `/api`, images, panels, the PDF frame, event streams.
4. **Two doors, one board.** In `app.ts` `createBoardServer`, move the request listener into one
   function over one `env` (one person token, one `project`) that takes the door. `BoardServerOptions`
   gains `remote?: RemoteDoor`; when given, the function also builds a second `http.Server` on the
   same listener with the remote door, returned as `server.remote` (not listening). Closing the
   main server closes it too. `createBoardServer`'s return type and every existing caller stay as
   they are. In `server.ts`, listen it on `127.0.0.1`, `PORT + 1`, and print one line (words file)
   naming the address and the users. Do not change the main `server.listen`.
5. **What differs behind the remote door.**
   - `personCookie(token, secure)` in `callers.ts`: `; Secure` when the page is served on the remote
     door.
   - `Ctx` in `dispatch.ts` gains `remote: boolean`. `listFolders` (`open-folder.ts`) leaves out
     `chooser: true` and `chooseFolder` refuses with the existing
     `serverFoldersWords.chooserNotOffered`, both when `remote`.
6. **Words.** New refusals in `apps/board/server/words/http.ts`; start lines and start refusals
   in `apps/board/server/words/server-common.ts` (or the server words file that already holds start
   lines; check before adding). No sentence in code.
7. **Tests** (each fails on today's code first; `apps/board/tests/`, beside
   `api-identity.test.ts`, reusing `test-board.ts` / `api-harness.ts`; any port from
   `VB_TEST_PORT`, never 4466):
   - remote door + allowed login: the page loads, its cookie has `Secure`, a write succeeds;
   - remote door + no login, + a login not on the list, + `Tailscale-Funnel-Request`: 403;
   - remote door, write with Origin `https://<remote>`: accepted; `https://evil.example` and
     `http://<remote>`: refused;
   - local door + a forged `Tailscale-User-Login`: exactly as today (the header is ignored, the
     cookie has no `Secure`);
   - with remote off: no second door is built; the local door is unchanged;
   - remote door: `list_folders` offers no chooser; `choose_folder` refused;
   - an event stream (`watch_project`, a chat stream) delivers through the remote door;
   - the settings parser: one setting alone, an `http://` URL, a URL with a path, an empty users
     list each stop the start with its words.
8. **Docs** (`cortex-docs`): `docs/specification/api.md` 20 (the person cookie: `Secure` on the
   remote door), 27 and 28 (transport: the remote door and its checks), 161 (the standalone server's
   HTTP edge has two doors); `apps/board/README.md` gains a "From another Mac over Tailscale" section
   with the diagram above, the setup and turn-off below, and "never Funnel". Examples use
   `<you>@example.com` and `dev-mac.<tailnet>.ts.net`, never a real login or tailnet.
9. Run the tests for what changed, `npm run verify`, then the page suite once.

---

## Setup after the code lands (the maintainer, by hand)

1. **Tailscale policy** (admin console): in the lite-mac grant, `"ip": ["tcp:4466", "tcp:5476", "tcp:5900"]`
   with a comment line "4466 = Vision Board"; in the lite-mac test, move `nanoclaw-host:4466` from
   `deny` to `accept`; in the iphone test, add `nanoclaw-host:4466` to `deny`. Nothing else changes.
2. On dev-mac: `tailscale serve --bg --https=4466 http://127.0.0.1:4467`.
3. Start the board with `VB_REMOTE_URL=https://dev-mac.<tailnet>.ts.net:4466` and
   `VB_REMOTE_USERS=<lite-mac's login>`, then `npm run board`.
4. On lite-mac, open `https://dev-mac.<tailnet>.ts.net:4466`.
5. Turn off: `tailscale serve --https=4466 off`, and start the board without the two settings.

## Acceptance (by hand, from lite-mac)

- The page opens with no sign-in step; edit a card, answer a card, send a chat message and see the
  reply stream in.
- Paste text and an image into the chat; a copy button puts text on lite-mac's clipboard.
- From the phone the address does not open.
- On dev-mac, `http://127.0.0.1:4466` still works and agents still join.

---

## Files Involved

| File | Purpose |
|------|---------|
| `packages/format/src/constants.ts` | `ENV.remoteUrl`, `ENV.remoteUsers` |
| `apps/board/server/remote.ts` | New: parse the settings into `RemoteDoor`; the type |
| `apps/board/server/guard.ts` | `guard` takes the door; the remote checks |
| `apps/board/server/app.ts` | One listener over one `env`, two doors; `remote` option |
| `apps/board/server.ts` | Parse settings, listen the remote door, the start line |
| `apps/board/server/callers.ts` | `personCookie` `Secure` |
| `apps/board/server/dispatch.ts` | `Ctx.remote` |
| `apps/board/server/open-folder.ts` | No chooser behind the remote door |
| `apps/board/server/words/http.ts`, a server start words file | New sentences |
| `apps/board/tests/` (new `remote-door.test.ts`) | The tests in step 7 |
| `docs/specification/api.md`, `apps/board/README.md` | Docs (step 8) |
| `docs/decisions.md` | D-117, appended by the orchestrator with the maintainer's yes |
| `temp/` | Step 1 spike only; deleted after |

> Modify only the files listed. Need a change elsewhere? Don't make it — report it.

---

## Constraints

- **DO NOT** change the local door's behaviour, the main `server.listen`, or bind anything to an
  address other than `127.0.0.1`.
- **DO NOT** read any `Tailscale-*` header on the local door.
- **DO NOT** touch the engine (`apps/board/server/engine/`), the plugin (`apps/board/plugin/`) or the
  plugin contract.
- **DO NOT** add a dependency, a flag in `flags.ts`, or any network call.
- **DO NOT** run `tailscale funnel`, or leave the step 1 Serve entry in place.
- **DO NOT** put a real login, email or tailnet name in code, tests or docs.
- **STOP** and alert the maintainer if step 1 shows Serve does not replace a forged
  `Tailscale-User-Login`: the design rests on it.
- **STOP** if D-117 is not yet in `docs/decisions.md`.
- No git commands that change state if run as a sub-agent; the orchestrator commits.

---

## Success Criteria

- [ ] D-117 appended with the maintainer's yes, matching what was built
- [ ] Step 1 findings recorded
- [ ] Every test in step 7 failed on today's code and passes now
- [ ] `npm run verify` and the page suite pass
- [ ] Docs in step 8 updated; no PII
- [ ] Acceptance passed by hand from lite-mac
- [ ] Task file updated with completion notes

---

## References

- `docs/principles.md` § Board-specific principles (local-first), § The board is a plugin
- `docs/specification/api.md` 20, 27, 28, 161
- `docs/specification/plugin.md` § The engine (`route` trusts `caller`)
- `apps/board/server/chooser.ts` `createChooser` (D-110)
- `apps/board/tests/api-identity.test.ts` (the person cookie tests to sit beside)

---

## Implementation Notes

_To be completed by agent after task execution._
_Re-run? Add a `### Run N` block below the last one; never overwrite an earlier run._

**Completed**: YYYY-MM-DD HH:MM

### Changes Made
- 

### Issues & Resolutions
- 

### Caught Beyond the Brief
- None / [what you noticed that this task didn't ask about]

### Deviations from Plan
- None / [Describe if any, and why approved]

---

## On Completion

1. Update frontmatter: `status: completed` and `completed: YYYY-MM-DD`
2. Append your LOG entry — one line, terminated with a newline, append-only (never `str_replace`):
   ```
   [[YYYY-MM-DD HH:MM]] [board-security] Completed: Open the Board over Tailscale Serve → Task: [[cortex-tasks/board/2026-11-23_board-security_tailscale-remote-door.md]]
   ```
3. Not a sub-agent → commit the task once verified (`cortex-task-exe` § Commits). A sub-agent →
   don't; the orchestrator commits.
