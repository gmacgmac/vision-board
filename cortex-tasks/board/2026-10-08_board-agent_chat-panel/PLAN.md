# Stage 6: the chat panel - Plan

> **Status Doc**: [TASK-STATUS.md](./TASK-STATUS.md)  
> **Created**: 2026-10-08 · **Tracker**: U1 (board-v3 PLAN item 6), N17 (skill) · **Decisions**:
> D-036, D-037 (proposed with this plan), D-012, D-016, D-028, D-033 · **Agreed**: chat 279-311
> (maintainer, 2026-10-08) · **Reference app**: nclite (`~/ai/nclite`), where this becomes a chat mode

## Problem Statement

The person talks to an agent in another window and the board shows only the result. There is no
chat beside the board, so every round means switching windows, and the board can't show which
message changed what.

## Rulings (maintainer, 2026-10-08; do not reopen)

1. **Built for nclite.** The panel becomes nclite's "vision board chat" mode. Everything reusable
   follows nclite's shapes and stands alone: no board code in the chat or agent packages; the
   board talks to them through a bridge in `apps/board` (D-037).
2. **One adapter interface, one adapter per CLI** (`packages/agent`), shaped after the Agent
   Client Protocol: start or resume a session, send a prompt, streamed updates (agent text, tool
   call, tool result, done, error), approval request, cancel. Claude CLI first, then Kiro CLI
   (ACP, run once), Codex later. Our own code, no adapter packages (D-036).
3. **Claude, the nclite way** (spike 307-311): one `claude -p --output-format stream-json
   --verbose` process per message, prompt on stdin, `--session-id` then `--resume`, `--mcp-config`
   with the vb server and `--strict-mcp-config`, `--allowedTools`, `--permission-mode default`,
   inline `--settings` for the gate hook, the person's own login (no API key). Unlike nclite, the
   tool calls are kept: they drive the change chips.
4. **The CLI keeps its own tools** (read, edit, shell...) and settings; the board adds only the vb
   MCP server and the gate.
5. **Approvals pause the tool** (maintainer 305-306): a "before tool use" hook sends file edits and
   shell commands, with exactly what they would change, to the server and waits; the panel shows
   Allow or Deny; the hook lets it through or refuses it, and the agent is told. Shapes follow
   nclite's (`WriteFacts`, `CommandFacts`, an answer with `scope` once or session, a time limit).
   Board tools are not gated in this version.
6. **The feed shows only the agent's words.** Tool calls never show raw (they carry its board
   key). A board write becomes a change chip ("Drew 3 cards on Pricing"); clicking it zooms to
   them. Other tools show as one quiet status line while they run.
7. **Sessions:** the CLI's own transcript is the record; nothing in the ledger. "New session"
   starts an agent with no memory. A session belongs to one board and survives a reload and a
   server restart. Claude models, the 1M context assumed; the model is chosen per session.
8. **The agent's board access:** the server joins the board for each new session and passes the
   secret to the vb MCP server through its environment, so it never appears in tool calls or the
   transcript. Starting a session on a board is the person's click, so it grants that board to
   the session's agent.
9. **The composer** takes chips: the person's unsent notes and selected cards (the Architect
   composer). Sending a message also sends the board's round (the existing Send act).
10. **Styling:** the chat package reads its own `--chat-*` custom properties; each host maps them
    to its tokens (here `--vb-*`). Its core is framework-free with plain web components (rule 16),
    so nclite's Svelte page hosts them unchanged.
11. **Awareness:** chat states (busy, waiting for approval, blocked, stopped, error) are rows in
    the chat's own small conditions table, one test per row, as D-033 does for the board.
12. **The skill (N17):** rewritten for the MCP API (write, append, reply, propose, park, grants)
    and given to the launched agent as its instructions; tested against written scenarios
    (rule 17).
13. Feature flag `chatPanel`, on by default once VERIFY passes. Contract first (rule 6).

## Order

BE_01 contract → BE_02 agent package (Claude adapter) → BE_03 server sessions, gate, bridge
routes → FE_01 chat package → FE_02 board sidebar and bridge → T_01 skill → BE_04 Kiro adapter
→ VERIFY_01. Page tests share ports, so everything runs in sequence.

## Risks

- A launched CLI runs tools on this computer. Mitigations: the gate on edits and shell, the
  CLI's own settings, localhost only, one process per message, a time limit, stopped on Stop and
  on server exit.
- Anthropic's docs don't say whether driving a subscription login from an app is allowed; the
  maintainer already does this in nclite (293).
- The stream-json format is internal to Claude Code and may change: the adapter checks the
  `system/init` event and fails loudly on shapes it doesn't know; a recorded stream is the test
  fixture.

## Out of scope

Live approvals inside board tools, several sessions per board, Codex, moving into nclite itself
(its MCP config, tool check and tool-activity event, 298), chat history in the ledger.

## Success Criteria

- [ ] From the panel, Claude draws, appends and replies on the open board; its words show, its
      board writes show as chips that zoom to the change
- [ ] A file edit pauses for Allow or Deny; Deny leaves the file unchanged and the agent says so
- [ ] Resume after a reload and a server restart; New session starts fresh
- [ ] Kiro answers one round through the same panel
- [ ] `packages/chat` and `packages/agent` import nothing from this repo
- [ ] The five gates exit 0
