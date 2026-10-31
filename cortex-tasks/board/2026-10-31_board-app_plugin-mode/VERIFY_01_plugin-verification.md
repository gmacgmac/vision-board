# VERIFY_01_plugin-verification: Verification

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md)

## Objective

As a newcomer with the built folder and the spec: does a host get a whole, working board, and does standalone behave exactly as before? Findings in `VERIFY_01_findings.md`; nothing is fixed here.

## Steps

1. Write a small host of your own from the spec alone. Where the spec fails you, that's a finding.
2. Use the board in it: every control, a card answered, Send, search, a dialog, narrow panes, two boards, unmount and mount again. Hostile host styles and keys.
3. Standalone against main before this set: anything different is a finding. Chat with a fake agent: chips, Send, zoom, attachments, approvals.
4. Bundle sizes, first paint in a host, a page with no chat. Does anything reach outside `root`? Does a listener survive `unmount`?
5. The doc audit (`cortex-docs`).

The live look (standalone built from the plugin folder, real Kiro on Sonnet, tiny) is the orchestrator's, after this.

## Validation

- [ ] Each finding has the steps, what happened, what should, and blocking or not

## Implementation Notes

_To be completed by agent after task completion._

**Status**: Pending · **Completed**:

## On Completion

Notes; your row; one LOG line (`[board-app] VERIFY_01: …` → this file, one line ending in a newline); the Return Contract with `REQUESTS`.
