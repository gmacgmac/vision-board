// Words: plugin-tools. How a tool's description reads to a bot that a host names (engine/tools.ts): the tool table's
// words (openapi.json, D-056) are written for the standalone bot, which joins, holds a secret and has the app
// host; a plugin bot does none of these, so these edits take them out. The standalone bot is told the table's
// words as they are. Each edit's `from` must occur once in its tool's description (a test holds it).
// Keys: board.plugin-tools.<name>. Plain code: no imports.
/** `from` becomes `to`; with `until`, so does the text after it up to `until` (kept), and with `until: ''`, to the end. */
export interface DescriptionEdit { tool: string; from: string; to: string; until?: string }

/** The same for a tool's input, whose words the format's schemas hold: `from` must occur in it. */
export const inputEdits: readonly DescriptionEdit[] = [
  { tool: 'write_board', from: "The app's folder name in the open ledger's `apps/`", to: "The app's id" },
];

export const descriptionEdits: readonly DescriptionEdit[] = [
  { tool: 'list_open', from: 'With your secret, only the containers you hold,', to: 'Only the containers you hold,' },
  { tool: 'check_responses', from: 'With your secret, only the containers you hold.', to: 'Only the containers you hold.' },
  { tool: 'write_board', from: '(`app: { id }`, from `list_apps`)', to: '(`app: { id }`), already in the folder; you cannot list apps here, so draw one only when the person names its id' },
];

// ---- botToolRules (flag on; packages/format/src/flags.ts). A host's bot cannot hold its turn: `check_responses` is
// listed without `wait` (the tool table's `inputHosts`), its words lose the offer, and a `wait` sent is refused with
// `inputRefusals`. Off, none of these apply.

/** Edits to a tool's description, made only with the flag on. */
export const ruleEdits: readonly DescriptionEdit[] = [
  {
    tool: 'check_responses',
    from: '; optional `limit`, and `wait` (0-60 seconds) to hold until the person presses Send or answers a request.',
    to: '; optional `limit`. Your host brings the person\'s answers in their next message, when they press Send: this reads what they did, and never waits.',
  },
  { tool: 'check_responses', from: '; a wait that times out returns `{ responses: [], head }`.', to: '.' },
  { tool: 'check_responses', from: ': this reads what they did, and never waits.', to: ': never call this to read what that message lists. It never waits.' },
  {
    tool: 'list_open', from: 'List a board\'s open cards.',
    to: 'List a board\'s open cards, when no message lists the person\'s answers: never call it to read again what your host\'s message lists.',
  },
];

/** Why an input a host does not give is refused (`detail`) and its pointer's words, one per tool and input: a test holds
 * one for every input the tool table limits to other hosts. */
export const inputRefusals: readonly { tool: string; input: string; detail: string; pointer: string }[] = [
  {
    tool: 'check_responses',
    input: 'wait',
    detail: '`check_responses` takes no `wait` here: your host brings the person\'s answers in their next message, when they press Send. Don\'t wait for them: end your turn.',
    pointer: 'not given under a host',
  },
  {
    tool: 'list_boards',
    input: 'ledger',
    detail: '`list_boards` takes no `ledger` here: your host keeps one ledger, the one you work on. Read without it.',
    pointer: 'not given under a host',
  },
  {
    tool: 'get_board',
    input: 'ledger',
    detail: '`get_board` takes no `ledger` here: your host keeps one ledger, the one you work on. Read without it.',
    pointer: 'not given under a host',
  },
  {
    tool: 'show_node',
    input: 'ledger',
    detail: '`show_node` takes no `ledger` here: your host keeps one ledger, the one you work on. Read without it.',
    pointer: 'not given under a host',
  },
];

/** The MCP server's instructions for a host's bot (`createMcpServer({ tools })`, from `tools.instructions`): the
 * standalone joined text (`#mcp` `INSTRUCTIONS_JOINED`) less what a host's bot does not have (`join`, a secret, `wait`, a
 * folder header), each `from` found once. */
export const instructionEdits: readonly Omit<DescriptionEdit, 'tool'>[] = [
  {
    from: 'so a retry never writes twice.',
    to: 'so a retry never writes twice. Every block of text you write shows in the person\'s chat, so write none while you work: not what a read showed ("The board is empty"), nor your next step ("I\'ll add a region first"); a turn that changed the board ends "Done."',
  },
  { from: 'You already have an identity on the board, set for you: do not call `join`, and leave `secret` out of every call. ', to: '' },
  {
    from: 'To draw on a board another agent made, call `request_grant`',
    to: 'To draw on a board you don\'t hold (`list_boards` and `get_board` mark one you hold `held`), call `request_grant`',
  },
  { from: '(the board, or the board and region) and wait for the answer.', to: '(the board, or the board and region), and end your turn: the person answers it on the board.' },
  {
    from: 'Then call `check_responses` with the `head` you last saw (and `wait` up to 60 seconds) to read what the person did',
    to: 'Your host brings the person\'s answers in their next message, when they press Send, so never hold your turn to wait for them; `check_responses` with the `head` you last saw reads what they did',
  },
  { from: 'Answer every note with a `reply` or an `append`,', to: 'Answer every note a read marks `owed` with a `reply` or an `append` (one marked `answered` is answered already: never answer it again),' },
  { from: '`join` and `list_boards` name the folder the board has open (`project`) and, with ledger folders, the ledger open in it (`ledger`): check they are the ones you mean. If a call answers `wrong-folder`, the board has another folder or ledger open: stop, tell the person what it says, and do not call `join`. ', to: '' },
];

// ---- singleAgent (flag on; packages/format/src/flags.ts, plugin.md § The bot). One bot per folder: no sign-up, no
// `needs-grant`, no board kept for its creator, and every read unscoped. So nothing it reads speaks of grants, other
// agents' containers or a board's creator. `request_grant` stays listed (the manifest's tools are the engine's with no
// flags, and it answers `held`), saying it is not needed. Made after the edits above; off, none of these apply.

/** Edits to a tool's description, made only with the flag on. */
export const singleAgentEdits: readonly DescriptionEdit[] = [
  { tool: 'get_board', from: ' When agents write to the board, also open grant `requests`', until: ' `locked: true`', to: '' },
  { tool: 'show_container', from: ' or ask for a grant on it.', to: '.' },
  { tool: 'list_open', from: ' Only the containers you hold, so you never answer another agent\'s cards.', to: '' },
  { tool: 'check_responses', from: ', including answers to your grant requests;', to: ';' },
  { tool: 'check_responses', from: ' Only the containers you hold.', to: '' },
  {
    tool: 'request_grant', from: 'Ask the person for write access', until: '',
    to: 'Not needed here: you may write on every board in this folder that is not locked or read-only, the person\'s too. It writes nothing and answers `{ held: true }`, so never call it.',
  },
  { tool: 'write_board', from: ' On a board you did not create, call `request_grant` first', until: ' Returns one result', to: ' You may write on every board here, one the person made too, without asking; a board with no container yet takes a `region` item before its first card, in the same call.' },
];

/** Edits to the instructions (`instructionEdits` made first), only with the flag on: the grant steps go. */
export const singleAgentInstructionEdits: readonly Omit<DescriptionEdit, 'tool'>[] = [
  { from: 'To draw on a board you don\'t hold', until: 'Your host brings', to: '' },
];
