# T_03 — The skill's labels sentence; the agent's chat text size

Model: standard · Skills: cortex-docs · Rulings: PLAN § Decisions 4-5

## Objective
Agents label a link only when it means more than "next", in short simple words; the agent's chat replies are the
same size as the person's.

## Inputs
`skills/vision-board/references/layouts.md` (the line "Link labels are a word or two ("then", ...)" and the example
`"label": "then"`), the skill's source and build (`skills/vision-board/source/`, `npm run build:skill`, the plugin's
copy: `npm run build:plugin`), the skill's tests (`apps/board/tests/plugin-skill.test.ts`), `npm run eval:bot`
(`tests/evals/bot/`). Chat: `packages/chat/src/message/message.css`, `apps/board/src/styles/chat-host.css` (maps
`--chat-*`), `packages/ui/src/markdown/markdown.css` (`.vb-md-p` reads `--vb-md-text`).

## Steps
1. Skill: one sentence and the example changed (no "then"); bump the skill version as the skill's own rule says;
   rebuild; run `npm run eval:bot` and report its result and cost.
2. Chat: one rule in `chat-host.css` setting `--vb-md-text` (and anything else the markdown reads for size) to the
   chat's text size inside a message bubble, so the agent's paragraphs, lists and headings match the person's.
   Measure both in a browser (computed font-size) light and dark; renew the chat baselines that change.

## Validation
`npm run verify`, `npm test`, the chat page specs pass; eval:bot passes.

## Constraints
Own files only; others are REQUESTS. No git command that changes state.

## Implementation Notes

- Skill v3.38: `source/references/layouts.md` (one sentence; flow row without labels; example label "blocks"), status line in
  `source/differences.md`, rebuilt (`build:skill`, `build:plugin`); test "v3.38" in `plugin-skill.test.ts`; NOTES.md section.
- eval:bot (live, Haiku 5.5, plugin, 16 runs): 113/114, $0.0424. The one miss, `insert-step` reads-references, is the known
  v3.35 miss (3 of 4 repeats, $0.0085 more), not caused by these words. Dry run 114/114.
- Chat: `chat-host.css` one rule, `chat-message .chat-bubble { --vb-md-text: var(--chat-text); }`. Measured in the gallery,
  both themes: agent paragraph and list item 16px = person's bubble 16px (was 13px); headings follow (calc from the same
  variable). New test in `tests/pages/chat.spec.ts`. Renewed: `tests/pages/__screenshots__/chat.spec.ts/chat-dark-darwin.png`,
  `chat-light-darwin.png`. Other chat specs and gallery (62) pass unchanged. `npm run verify` ok. Not run: full `npm test`.
