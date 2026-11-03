// Words: skill-edits. What the Vision Board skill (skills/vision-board/SKILL.md) loses and says differently for a bot
// a host names, as a list of edits applied in order (plugin/skill.ts). The standalone skill is not touched: a bot
// there reads it word for word. An edit cuts the text from `from` up to `until` (to the end of `from` with no
// `until`, to the end of the skill with `toEnd`) and puts `to` in its place. `from` must occur once: when the skill
// changes under an edit the build stops, and apps/board/tests/plugin-skill.test.ts holds what the result may and may not say.
// Keys: board.skill-edits.<name>. Plain code: no imports.
export interface SkillEdit { from: string; until?: string; toEnd?: boolean; to: string }

/** The plugin skill's Images section: the standalone one's rules, the folder named from the board folder the host gives. */
const IMAGES = `### Images in cards

Show a picture when it beats words: a screenshot of the page you mean, a diagram.
- Save the file in the \`images/\` folder of the board folder your host names (subfolders welcome, up to 8
  deep; names of letters, digits, \`-\`, \`_\` and \`.\`; png, jpeg, webp or gif, at most 8 MB, or svg, at most
  1 MB) and write \`![What it shows](ui/settings.png)\` in the body, the path starting inside \`images/\`
  (that file is \`images/ui/settings.png\`; written \`images/ui/settings.png\`, it is not found).
  Alt text is required and says what the picture shows (without it the card shows the path).
- Never an internet address, \`data:\`, \`..\` or a leading \`/\`: the card says "Image not shown".
- To change it, overwrite the file under the same name: the person sees it on select or open.
- An svg's root says its size: \`width\` and \`height\`, or a \`viewBox\` alone (then at most 300 px wide);
  with neither it is not shown. Its CSS and SMIL animation play; its script never runs and nothing
  outside the file loads (draw everything inside it).
- Animate with CSS inside \`@media (prefers-reduced-motion: no-preference) { … }\`. Keep it short: a few
  runs, about 5 seconds in all, then it rests. Nothing flashes more than three times a second.

`;

export const skillEdits: readonly SkillEdit[] = [
  // Front matter: no chat panel, no apps (pictures stay).
  { from: ", and always in the board's own chat panel. It also shows pictures, and small apps you build, inside a card.", to: '. It also shows pictures inside a card.' },
  { from: 'status: ', until: '\n---\n', to: 'status: the Vision Board skill, for a bot that a host names' },
  // Where you are running: the standalone chat's own join, panel and permissions go; the message's blocks stay.
  { from: '**From your own chat** (the', until: '- **Quiet while you work.**', to: 'You run in a host\'s chat, with the `vision-board` tools.\n\n' },
  { from: '**One message carries everything**', to: '**A message carries**' },
  { from: '  2. `The person attached these files:`', until: '`The person selected these cards:`', to: '  2. ' },
  { from: '  4. (Rare, an older page)', until: 'The Send message:', to: '  3. ' },
  { from: '  6. `Board: <id>`.\n', to: '' },
  { from: '- Board writes never ask the person.', until: '- Never hold your turn open', to: '' },
  // Starting a board and access: no panel, no join, no waiting inside a call.
  { from: 'In the chat panel, "the board" is always the panel\'s own (`Board: <id>`).\n  Elsewhere, when', to: 'When' },
  { from: 'do not `join` or write until', to: 'do not write until' },
  { from: 'in your own chat, `check_responses` with `wait` until a `grant` or\n  `deny` for your request arrives. In the panel, say', to: 'say' },
  { from: 'In your own chat, pass `wait` (up to 60 seconds) to hold until they press Send. On', to: 'On' },
  // Pictures: the folder is named from the board folder, which the host tells the bot, never by the standalone path.
  // Apps are the standalone host's.
  { from: '### Images in cards', until: '## Kinds: the kind decides', to: IMAGES },
  { from: '| `app` | No | An app you built, for the person to use in the card (Apps on the board) |\n', to: '' },
  { from: '## Apps on the board', toEnd: true, to: '' },
];
