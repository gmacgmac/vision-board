---
category: project-docs
type: tracker
status: active
created: 2026-09-30
last_updated: 2026-10-01
scope: What is outstanding for Vision Board, from founding rules to the first working board
keywords: [tracker, roadmap, milestones, open questions]
---

# Vision Board — Tracker

> **Status**: Active
> **Owner**: maintainer

## Overview

Tracks Vision Board from its founding rules to a skill any agent session can use. Done for the
first milestone: an agent writes a view file, the board draws it, the person responds per item,
and the agent reads the transcript back.

## Current State

Founding docs drafted (rules, principles, decision register, all Proposed). Folder layout and
the Architect reference are in place. No code. Checkpoint tags: `checkpoint-01-layout`.

## Roadmap

| # | Item | Status | Link | Notes |
|---|------|--------|------|-------|
| 1 | Review and accept founding docs (rules, principles, D-001 to D-008) | In Progress | `docs/decisions.md` | |
| 2 | Cortex setup: project categories and registry | Planned | — | |
| 3 | Paper prototype: hand-written view file + transcript for a real review | Planned | — | Proves the formats before code |
| 4 | Format spec v0 (view, transcript, node types, item actions) | Planned | — | `packages/format/` |
| 5 | Decisions: framework, layout engine | Planned | — | Needs 3 and 4 |
| 6 | Scaffold: workspace, tokens, ui base, verify checks, tests | Planned | — | Port from Studio |
| 7 | Walking skeleton: grid mode, item card, actions, transcript, live reload | In Progress | — | First usable board |
| 8 | Agent skill v0: how an agent writes a view and reads a transcript | Planned | — | |
| 9 | More modes: flow, lanes, text, then radial | Planned | — | |
| 10 | Versions, diff highlights, Confirm these, Approve | Planned | — | From Architect |
| 11 | Board v3: notes beside cards, containers as threads, Send and vb wait, kiro-cli chat panel | In Progress | `cortex-tasks/board/2026-10-01_board-v3/TASK-STATUS.md` | D-010, D-011 |

## Updates

| Date | Update |
|------|--------|
| 2026-10-01 | Dogfooded the board on `first-look` (v1, v2). D-009 contrast tiers, D-010 kiro-cli chat, D-011 containers as threads. Board v3 plan approved |
| 2026-09-30 | Walking skeleton written, untested: 5 layout modes, pins, actions, server, canvas. See HANDOVER.md |
| 2026-09-30 | Repo organised; Architect copied as reference; founding docs drafted from Uplynk Studio |

## References

- `docs/vision.md`
- `docs/principles.md`
- `.kiro/steering/vision-board-proj.md`
