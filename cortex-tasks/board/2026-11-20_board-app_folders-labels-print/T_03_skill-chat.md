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
