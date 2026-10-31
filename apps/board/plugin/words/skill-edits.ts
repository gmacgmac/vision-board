// Words: skill-edits. What the Vision Board skill (skills/vision-board/SKILL.md) loses and says differently for a bot
// a host names, as a list of edits applied in order (plugin/skill.ts). The standalone skill is not touched: a bot
// there reads it word for word. An edit cuts the text from `from` up to `until` (to the end of `from` with no
// `until`, to the end of the skill with `toEnd`) and puts `to` in its place. `from` must occur once: when the skill
// changes under an edit the build stops, and apps/board/tests/plugin-skill.test.ts holds what the result may and may not say.
// Keys: board.skill-edits.<name>. Plain code: no imports.
export interface SkillEdit { from: string; until?: string; toEnd?: boolean; to: string }

export const skillEdits: readonly SkillEdit[] = [
  // Front matter: no chat panel, no apps.
  { from: ", and always in the board's own chat panel. It also shows pictures, and small apps you build, inside a card.", to: '.' },
  { from: 'status: ', until: '\n---\n', to: 'status: the Vision Board skill, for a bot that a host names' },
  // Where you are running: the standalone chat's own join, panel and permissions go; the message's blocks stay.
  { from: '**From your own chat** (the', until: '- **One message carries everything**', to: 'You run in a host\'s chat, with the `vision-board` tools.\n\n' },
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
  // Pictures: where a bot puts one is the host's folder, which the skill cannot name. Apps are the standalone host's.
  { from: '### Images in cards', until: '## Kinds: the kind decides', to: '' },
  { from: '| `app` | No | An app you built, for the person to use in the card (Apps on the board) |\n', to: '' },
  { from: '## Apps on the board', toEnd: true, to: '' },
];
