# FE_01_proposals: Proposals on cards and the bar

> **Parent**: [TASK-STATUS.md](./TASK-STATUS.md) · **Plan**: [PLAN.md](./PLAN.md) (rulings 2-5)
> · **Mockup**: `03-proposals-and-seen.html` Part A, board level and Option A's tab (the box is
> Option C's shape) · **Model**: Opus 5.5 · **Needs**: BE_01

## Objective

The person sees an agent's proposal on its card and accepts or rejects it, one by one or all at
once. The box beside the card is built as a reusable pattern.

## Rulings (do not reopen)

1. **Card popover pattern** (`packages/ui/src/node/node-popover.ts` `bindCardPopover`): a box
   beside the card, in the note preview's shape and place (`node-note-tip.ts`, `node.css`
   `.vb-note-tip`), opened from a bottom-edge tab. Hover or focus on the tab previews it; click
   or Enter opens it so its buttons are reachable (focus moves into it); Esc or a click outside
   closes it and returns focus to the tab. WCAG 1.4.13 (hoverable, persistent, dismissible).
   Reuse `bindHoverTip` (`packages/ui/src/tip/hover-tip.ts`) for the preview rules; extend it
   rather than copy it if it needs an "opened" state. FE_03 reuses this for the Handover box, so
   keep it free of proposal words. Gallery entry with every state.
2. **Bottom-edge tab slot** in `node-template.ts`: tabs on the bottom border like the top ones
   (number, kind), so FE_02 (N UPDATES) and FE_03 (HANDOVER) add theirs to the same slot. Only
   the tabs that apply show; the card's size never changes for a tab.
3. **PROPOSAL tab** on a card with a `proposal.open` or `proposal.stale` condition; "OUT OF DATE"
   when stale. The box: "Drop 47: the client declined", source and time, which agent; Reject and
   Accept. Several open proposals on one card: the box lists each, newest first. Out of date: the
   reason line and Accept `aria-disabled` with `aria-describedby` on the reason (mockup note).
   Accept and Reject are acts through the action layer and the one sender (`sender.ts`), with
   `proposal` set; ack and drop are decisions (`needsConfirmation`): the Accept click is the
   person's confirmation. A server refusal shows as the existing act error toast.
4. **The bar** above the board, in the requests strip's place and style (`AccessRequests.svelte`;
   both may show, stacked): "3 proposals from the agent · 1 out of date", Review (focuses the
   first card with a proposal and opens its box) and Accept all. Accept all opens
   `ConfirmDialog.svelte` listing exactly what it applies (number, action, reason) and, under
   "Not included", each out-of-date one with why; Apply sends them in order through the sender.
   A polite live region announces new proposals in the latest batch (as the strip does).
5. Read only from the conditions table (`pageConditions`, `board-data.ts`), never page-local
   sets. Off while a past version shows (`versions.ts` guard). Flag `proposals` (on).
6. Tokens only; reuse the CHANGED/`--warn` family for OUT OF DATE; no new colours. APCA tiers
   (rule 3) light and dark.

## Steps

1. [ ] Failing tests first: unit (`node-core` state for a proposal, stale; the bar's rows and
   Accept-all list); page tests (`tests/pages/proposals.spec.ts`): a proposal appears live,
   Accept drops the card, Reject clears it, a stale one can't be accepted, Accept all applies and
   skips, keyboard only, axe light and dark.
2. [ ] Build the popover pattern, the tab slot, the PROPOSAL tab, the bar; gallery entries;
   flag; `controller.ts` stays at or under 300 lines.

## Validation

- [x] The five gates exit 0. Look at the tab, the box and the bar, light and dark.

## Constraints

- If deviation is needed, stop and say so; no silent breaking changes. No PII in examples.
- No git commits or stash. Scratch in the system temp folder. Stop only your own processes.
- Fill Implementation Notes below, your row in TASK-STATUS.md, and your own LOG line.

## Implementation Notes

**Status**: Completed 2026-10-08

**Pattern (packages/ui/src/node).** `node-popover.ts` `bindCardPopover(card, name)`: tab
`.vb-node-btab[data-tab=name]`, box `.vb-card-pop[data-pop=name]` (a `.vb-tip`, role dialog,
tabindex -1, beside the card at its top); bound once per card, finds tab and box afresh (the markup is
rebuilt per version); sets `data-open` on the box and `aria-expanded` on the tab; focus in the box goes
back to the tab on close; fires `POPOVER_OPEN` (bubbling, detail = box) when a click or Enter opened
it. No proposal words in it. `bindHoverTip` extended, not copied: `opens` (a click or Enter opens for
good, a second click closes, focus leaving the group closes) and `onToggle`. Bottom tab slot:
`node-template.ts` `bottomTabs` (`POPOVERS = ['proposal']`, `popoverId`); FE_03 adds `'handover'` to
`POPOVERS`; FE_02 adds its non-popover tab to `.vb-node-btabs`. Styles in `node-popover.css` (node.css
would pass 300). Card state: `nodeState(n, s, tier, selected, c: CardConditions)`; `CardConditions`
holds `proposals` (FE_02/FE_03 add their fields); `NodeState.proposal` from `proposalsView`;
the card's name gains ", 1 proposal" (", out of date"). `proposalsMarkup` builds the box.

**Page.** `pageConditions` gains `proposals` (`proposal.open`/`.stale`); `attention.ts` keeps them and
sets `shell.proposalNews`; `proposals.ts` (pure: rows, acts, bar words, Accept all plan and words);
`proposal-flow.ts` (refresh before each draw, card facts, answer, acceptAll, review); cards.ts/draw.ts
pass `facts`; wiring routes `button[data-answer]` (aria-disabled ignored); versions guard has `answer`;
keys.ts ignores keys inside `.vb-card-pop`; pointer.ts treats it as interactive; focus.ts reveals an
opened box (`POPOVER_OPEN`). `ProposalsBar.svelte` (strip style, under the requests strip,
`--vb-proposals-h`), `ConfirmList.svelte` in `ConfirmDialog` (`askConfirm(..., list)`),
`styles/proposals.css`. Accept all applies the newest non-stale proposal per card in card order
(accepting one closes the rest on its card, api.md 93) and lists the others under "Not included".
Flag `proposals` (on). controller.ts 298 lines.

**Contrast (APCA-W3 0.0.98G-4g, measured by script, light / dark).** Reason line `--vb-state-context`
on `--vb-surface-raised` 62.6 / 62.9 (reading, >= 60); OUT OF DATE tab `--vb-state-context` on
`--vb-state-context-soft` 53.6 / 59.8 (label, >= 45); PROPOSAL tab `--vb-accent-text` on
`--vb-accent-soft` 64.0 / 49.1 (label). No new token. Reported, not new: the "from" line uses
`--vb-ink-subtle` like other muted lines; on the dark raised surface it measures about Lc 49, under the
reading tier (the token is the maintainer's).

**Known.** A box beside a card near the stage's right edge is cut until the board pans: hover previews
do not pan (as the note preview); a click, Enter or Review does.

**Tests.** `packages/ui/tests/node-proposal.test.ts`, `apps/board/tests/proposals.test.ts`, a proposals
case in `gallery-fixture.test.ts`; `tests/pages/proposals.spec.ts` (13: live arrival and size kept,
Accept, Reject, out of date, Accept all, keyboard only, Review, flag off, axe light/dark, gallery,
screenshots). Gallery: fixture board `proposals` (seq 201-212), `proposals-section.ts`.

**Screenshots.** New: `proposals-{light,dark}`. Updated on purpose: `gallery-{light,dark}` (only the node
section's states line, which now lists "proposal, proposal out of date, popover open").

**Gates (all exit 0):** `npm test` (685 + 6); `npm run check`; `npm run verify` (0 warnings, map
regenerated); `npm run gen -- --check`; `npm run test:pages` (198 passed).

## On Completion

Fill in notes, update your row, append your own LOG line (`[board-app] FE_01: …`).
