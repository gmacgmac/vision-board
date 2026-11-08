// Words: skill-edits. What the Vision Board skill (skills/vision-board/SKILL.md) loses and says differently for a bot
// a host names, as a list of edits applied in order (plugin/skill.ts). The standalone skill is not touched: a bot
// there reads it word for word. An edit cuts the text from `from` up to `until` (to the end of `from` with no
// `until`, to the end of the skill with `toEnd`) and puts `to` in its place. `from` must occur once: when the skill
// changes under an edit the build stops, and apps/board/tests/plugin-skill.test.ts holds what the result may and may not say.
// The plugin skill rides every turn of a host's chat, so each section is the standalone one cut to what a host's bot
// needs (plugin.md § The bot: `singleAgent`, no sign-up, no grants to wait on, no panel, no apps, one ledger); what is
// about one tool is in that tool's description. A section the standalone skill gains flows through unedited.
// `npm run eval:bot` (live) passes before a change here lands (T_02: sizes and runs in its notes).
// Keys: board.skill-edits.<name>. Plain code: no imports.
export interface SkillEdit { from: string; until?: string; toEnd?: boolean; to: string }

const INTRO = `The board is how you and the person chat: each point you would number in a chat reply is its own
card. The person answers any card, in any order (✓ or ✗ on a card that asks, a note or Later) and
presses **Send**; you read their answers, answer, and redraw.

`;

const CONVERSATION = `## The conversation

- **One point per card**: a one-line title, a body of a sentence or a few lines.
- **The person guides the structure.** Before drawing anything big (a new board, or more than
  about 6 cards), suggest the structure in a line and end the turn, with no write: "A row of the 6
  risks, or a flow of the 5 phases?" "Put it on the board" is not a shape. Skip it when they named
  the layout, or for a small change.
- **When you changed the board, the chat says "Done."**, unless the person must do something the
  board can't show (one short line). What you can't do takes one short sentence, with
  no list and no offer of something else.

`;

const RUNNING = `## Where you are running

You run in a host's chat. **Quiet while you work**: every block of text you write, before or between
tool calls too, shows as a chat message, so write none until the turn ends: no narration ("Let me
read the card"), no plan ("I'll add the card first"), no reasoning ("there is no data, so I'll say
so"; "no regions yet, so I'll add one"). Then only "Done."

- **A message carries** their words, \`The person selected these cards:\` (their "these"), and the
  Send message: one line per answered card in card order (\`2 (question): ✗\`, \`4 (decision): ✓:
  <their note>\`, \`5 (finding): comment: <their words>\`), "Still
  open: ..." (theirs: you owe nothing there), "Waiting for your reply: ..." and its \`head\`.
- **Their words are the request**; still answer every note and Later in the lines, in card order.
- **"Waiting for your reply" is yours.** Answer each card on it with a \`reply\` (or an \`append\`) on
  the board, never only in the chat. A note after a mark (\`2 (decision): ✓: <words>\`) is owed too,
  though its card isn't on that line: your answer clears the mark, so end it by asking for ✓ or ✗ again.
- **Don't fetch it again**: no \`check_responses\` or \`list_open\` to re-read what the message lists;
  \`show_node\` gives a card's \`ver\` and a note's \`seq\` before you \`reply\` (its \`to\`) or \`append\`.
- Never hold your turn open: no \`check_responses\` with \`wait\`. Their next message brings their answers.

`;

const STARTING = `## Starting a board

Call \`list_boards\` first and reuse the board for the same subject; when "the board" could mean more
than one, ask which. A new board's \`title\` is the subject only ("Pricing review").

`;

const ACCESS = `## Access

- **A write fails \`locked\`** (or a read says \`locked: true\`): tell the person in one line and
  stop: no retry, no other board.
- **\`read-only\`** (or \`readOnly: true\`): say in one line that it is
  read-only until they make it editable, and stop.

`;

const LAYOUT = `## Layout: fit the task and the screen

- Chatting (most boards): cards in containers, one per group, **no links**. A \`row\` per container (up to about 6 cards each; containers stack down the screen) unless you have a reason for another layout: leave \`mode\` out and a new container is a \`row\`.
  More cards: a \`grid\`. A process: \`flow\`, linked by its real steps; work between owners: \`lanes\`.
- **Links stay inside a container**, never for reading order; a reference goes in the card's text
  ("needs card 5").
- **To put a card into a flow** between two linked cards, send one \`node\` item with
  \`insert: { after, before }\` beside \`node\`, never an \`unlink\` and two \`link\`s. After the first
  draw of a \`flow\` or \`lanes\`, \`show_layout\` once.
- **Leave \`size\` and \`widths\` out**: the engine places cards. The person's arrangement wins.

`;

const WRITING = `## Writing cards

- One \`write_board\` call per round, in reading order: board, containers, cards, links.
- **Numbers belong to the board**: never write one into a card's title or text; say "card 12".
  Name a new card by its \`key\`. Never guess its number in text in the same call: its \`n\` comes in the answer to the call
  that draws it, so a reply that names it ("Added as card 7.") goes in a second call, this turn.
- **Give every item a \`key\` that names it**, starting with the board, so no later turn reuses it
  (\`pricing-card-flat-fee\`, \`pricing-reply-n3-s41\`); a new version takes a new key.
- **Body**: Markdown. A longer card may use \`#\` and \`##\` headings (large, medium), a table of 4 columns at most.
- **Each item wraps its content**: \`{"type": "node", "key": "…", "node": {"region": "options", "kind":
  "question", "title": "…"}}\`. A refused item comes back with an example: copy it, and resend only
  the failed items, with the same keys.

`;

/** The plugin skill's Images section: the standalone one's rules, the folder named from the board folder the host gives. */
const IMAGES = `### Images in cards

Save a picture in the \`images/\` folder of the board folder your host names (png, jpeg, webp or gif, at most 8 MB, or svg, at most
  1 MB) and write \`![What it shows](ui/settings.png)\` in the body, the path starting inside \`images/\`
(that file is \`images/ui/settings.png\`). Alt text is required. Never an internet address, \`data:\`,
\`..\` or a leading \`/\` (the card says "Image not shown"). An svg's root says its size (\`width\` and
\`height\`, or a \`viewBox\`); its script never runs.

`;

const KINDS = `## Kinds: the kind decides

\`question\`, \`decision\` and \`action\` ask for ✓ or ✗; \`finding\`, \`risk\`,
\`topic\` and \`note\` tell.

- Need a yes, a no or a choice: a card that asks, never a line in another card. **One ask per card.**
- **Say on the card what ✓ and ✗ each mean**: end with a line such as "✓ keep · ✗ rename it now".
  Every \`decision\` and \`action\` card says it; only a plain yes/no question may leave it out.
- **When the answer is words** (a name, a pick among several), the card ends "Answer in a note";
  never ✓ or ✗ on a name.

`;

const ANSWERS = `## What the person's answers mean

- **✓ and ✗** mean what your card asks (\`check\`, \`cross\`). ✗ is an answer: act on it. A mark that
  doesn't make sense on that card: ask what they meant in a \`reply\`, and act on nothing yet.
- **A note never answers a card**, even when it sounds like an answer: act on what it says and answer it.
- **Your answer clears the card.** A \`reply\` to its latest note, or a new version of it, wipes the
  person's ✓, ✗ or Later: on a card that asks, end your answer by asking for the mark again ("✓ if
  that settles it").
- **Later**: you owe a \`park\` handover a new chat can pick up (name the files, links and cards).

`;

const RETIRING = `## Retiring and distilling

- Only when the person asks, or after their ✓ on your proposal to.
- In one \`write_board\` call: one summary card in that container, then one \`retire { n }\` per card it
  replaces. Keep a card that still asks and is unanswered. Answer what a card owes first.
- **A summary card** reads at a glance: a \`##\` heading per part (what was found, what ✓ and ✗
  settled, what is still open) and a table, 4 columns at most, with a row per card it replaces.

`;

const ANSWERING = `## Answering

- **Answer a note once**: only while a read marks it \`owed\` or \`list_open\` has it in \`pending\`.
- \`reply { n, to, text }\`, \`to\` the note's \`seq\`. A note on several cards or a container: one \`reply\`.
- A note asking for a change: make it, then reply in one line.
- **To change a card**, read it with \`show_node\` (a container, \`show_container\`): \`append { n, text,
  base }\` adds to it; a \`node\` item with \`n\`, \`base\` and its full content rewrites it.
- \`list_open\` is your to-do list. When no message lists the answers ("pick up where we left off"),
  read it first; never read every card with \`get_board\` to find what you owe.
  Answer on the board, and the chat is still "Done."

## Propose, never decide

Only the person presses ✓ or ✗; \`propose\` one when evidence settles a card. **Asked to press ✓ or ✗
for the person**: say in one line that the mark is theirs to press, and propose nothing.
`;

export const skillEdits: readonly SkillEdit[] = [
  // Front matter: no chat panel, no apps (pictures stay).
  { from: ' or its chat panel,', to: ',' },
  { from: 'a picture or an app you build in a card.', to: 'a picture in a card.' },
  { from: 'status: ', until: '\n---\n', to: 'status: for a bot that a host names' },
  // Each section, cut to what a host's bot needs, in the standalone skill's order.
  { from: 'The board is how you and the person chat.', until: '## The conversation', to: INTRO },
  { from: '## The conversation\n', until: '## Where you are running', to: CONVERSATION },
  { from: '## Where you are running\n', until: '## Starting a board', to: RUNNING },
  { from: '## Starting a board\n', until: '## Access', to: STARTING },
  { from: '## Access\n', until: '## Another ledger', to: ACCESS },
  // Reading another ledger is the standalone host's (`ledger` is not offered here).
  { from: '## Another ledger\n', until: '## Layout: fit the task', to: '' },
  // How to read `show_layout` is in its description.
  { from: '## Layout: fit the task', until: '## Writing cards', to: LAYOUT },
  { from: '## Writing cards\n', until: '### Images in cards', to: WRITING },
  // Pictures: the folder is named from the board folder, which the host tells the bot, never by the standalone path.
  { from: '### Images in cards\n', until: '## Kinds: the kind decides', to: IMAGES },
  { from: '## Kinds: the kind decides\n', until: '## What the person\'s answers mean', to: KINDS },
  { from: '## What the person\'s answers mean\n', until: '## Changing a card', to: ANSWERS },
  // Changing a card is in Answering.
  { from: '## Changing a card\n', until: '## Retiring and distilling', to: '' },
  { from: '## Retiring and distilling\n', until: '## Reading the person\'s answers', to: RETIRING },
  // How `check_responses` reads is in its description; `list_open` is in Answering.
  { from: '## Reading the person\'s answers\n', until: '## Answering', to: '' },
  { from: '## Answering\n', until: '## Saved for later', to: ANSWERING },
  // Later is in What the person's answers mean; apps are the standalone host's.
  { from: '## Saved for later\n', toEnd: true, to: '' },
];
