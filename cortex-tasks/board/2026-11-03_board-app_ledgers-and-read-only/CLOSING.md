# Ledgers and Read-only — closing note

> For the maintainer · 2026-11-03 · [TASK-STATUS.md](./TASK-STATUS.md) · [PLAN.md](./PLAN.md) ·
> [VERIFY_01_findings.md](./VERIFY_01_findings.md) · D-084, D-085

## What changed

- **Ledgers (D-084, `ledgerFolders`).** `.visionboard/<ledger>/` holds one ledger each (`main/` first): ledger, agents,
  lock, images, apps, app state. The standalone chat's sessions, attachments and permissions stay at `.visionboard/`.
  One paths module (`packages/format/src/data-folder.ts`) gives every data-folder path; `npm run verify` refuses any other
  file naming one. The header reads folder / ledger ▾ / board ▾ / version ▾ at every width; the ledger list switches
  and ends with New ledger… ("Keep out of git" writes a `*` `.gitignore`).
- **Agents and ledgers.** Agents, keys, numbers and grants are per ledger. `vb-mcp` and `vb` find a project in either
  layout; an agent of one ledger calling while another is open gets `wrong-folder` naming both, reads and writes alike.
  An agent's `list_boards`, `get_board` and `show_node` may name another ledger of the folder (`ledger`) and read it,
  read-only, to bring a throwaway ledger's work into the open one. Chat sessions are kept per ledger.
- **Read-only (D-085, `readOnlyStart`).** A ledger opens read-only and takes no lock; nothing is written into its folder.
  The header shows Read-only or Editing in all three forms; Edit takes the lock or names the computer holding it; Stop
  editing gives it back. Reads carry `readOnly: true`; writes answer `read-only` (409). A watching board follows another
  writer's lines, a replaced ledger file, and a move into `main/`. A chat's file writes are refused the moment the
  ledger stops being writable. D-043's per-board Locked is unchanged.
- **Plugin.** An optional `readOnly` engine option; `SEAM` stays 1 (`SEAM_TYPES` reset). Ledgers need no seam change.
- **Bot.** SKILL.md v3.28 and the tool words: join's `ledger`, read-only, another ledger, the open ledger's `images/` and
  `apps/`. `eval:bot` 48/48 (baseline 39/40), with a new read-only scenario.

## The flags: both on

`ledgerFolders` and `readOnlyStart` default on (`packages/format/src/flags.ts`), by PLAN decision 22: VERIFY_01 Run 2
and FIX_01 Runs 2-3 left no blocking finding. Full gates with both on: `npm test` 2361/0, `test:plugin` 83/83,
`test:pages` 893/0, `verify`, `check`, `gen --check` green. `npm run dev` now starts with `VB_EDIT=1` (read-only skips
`VB_SEED`).

## What happens to your own folder

- Your board on port 4466 keeps the code it started with until you restart it (`npm run board`; `board:watch` reloads on
  its own). After that it opens this repo **read-only**: nothing is written and no lock is taken.
- The first time you press **Edit** (or start with `npm run board -- --edit` / `VB_EDIT=1`), the old layout moves into
  `.visionboard/main/`: by rename only, while holding the lock, never twice. Your boards, agents, pictures and apps go
  with it; the chat's sessions, attachments and permissions stay at `.visionboard/`.
- Agents that joined before keep their secrets: `agents.json` moves with the ledger.
- On the other computer: stop any board still running code from before this set before pressing Edit. A live lock
  anywhere refuses the move, but a checkout from before this set (for example `checkpoint/before-ledgers`) must never
  open a folder that has moved: it has no ledger-folders check and would start a new ledger at the old place.

## How to undo

1. `npm run ledgers:undo -- <folder>` moves `main/` back to `.visionboard/`, byte for byte. It refuses while another
   ledger or a live lock exists.
2. The flags off: `VB_FLAGS=-ledgerFolders,-readOnlyStart` for the server, `?flags=-ledgerFolders,-readOnlyStart` for
   the page, or their defaults back to `false`.
3. The whole set: tag `checkpoint/before-ledgers` (main at 45ee1dd). Per wave: tags `ledgers/wave-0` … `ledgers/wave-8`.

## Findings left

| Finding | Where it stands |
|---|---|
| F10 write controls stay enabled while read-only (access strip, Agents' remove, Allow app) | Tracker N44; the server refuses each, nothing is written |
| Dialog body and hint text at Lc 49 in dark (every dialog, before this set) | Tracker N45; a token change needs your yes |
| F11 the ledger chip follows the page flag, not the server's answer | Tracker M51 |
| F15 zoom and proposals-hidden shared by same-id boards of two ledgers | Tracker M52 |
| The bot eval runs only the plugin's bot; standalone lines were checked by hand, one run each | Tracker M53 |
| Host-styles shots read a partial pixel row (why F16 failed) | Tracker M54 |
| F2's app process: an allowed app still runs on a read-only ledger (its state writes are refused) | `[needs-human-input]` in LOG: should it run at all? |
| `plugin.md` open points 12-14: Edit words under a host, a plugin bot's own `images/` writes, a host's own lock | Your call; the bot's sentence is already host-neutral, the person's (`READ_ONLY_PERSON`) still says "press Edit" |
| `chat-sessions.ts` 345 lines, `skills/vision-board/SKILL.md` 509 lines | Over the 300-line aim; no split in this set |

## Worth knowing

- SKILL.md v3.28 went live at wave 6, not at the close: the main checkout was on `feat/ledgers` from set-up, and the live
  skill links to it (D-057).
- `eval:bot` ran with both flags at wave 6 (48/48). Nothing after it changed the bot's instructions; FIX_01's new
  sentences reach only the person or the chat's file gate (its dry run 48/48).
- Four page screenshots that failed before this set (glyph rendering on this machine, proven on the commit that last
  wrote them) and two masked by them were re-taken in wave 3.
- Small deviations accepted at the gates are in TASK-STATUS § Wave gates.

## For your yes

1. **Steering** (`.kiro/steering/vision-board-proj.md` § Running, protected): "One server per ledger." →
   "One writing server per ledger; any number read it."
2. **Tracker**: rows opened N44, N45, M51, M52, M53, M54 (above). No row closed; L6 (a board views a second
   ledger) is related but stays open: an agent can read another ledger now, the person cannot.
3. **App process on a read-only ledger** (the LOG item above).
4. **The person's read-only sentence under a plugin host** (`plugin.md` open point 12).
