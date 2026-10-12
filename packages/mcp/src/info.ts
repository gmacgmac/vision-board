// Who this server says it is and what it speaks (api.md 45): the two protocol versions, the
// capabilities, `serverInfo`, and the instructions an agent reads before its first call.
import { TOOL_FILE } from './tools.ts';

/** The stateless revision: version and capabilities ride on every request's `_meta`. */
export const MODERN = '2026-07-28';
/** The handshake revision, for clients that have not moved yet: `initialize` first. */
export const LEGACY = '2025-11-25';
export const SUPPORTED_VERSIONS: readonly string[] = [MODERN, LEGACY];

export const META = {
  version: 'io.modelcontextprotocol/protocolVersion',
  capabilities: 'io.modelcontextprotocol/clientCapabilities',
  logLevel: 'io.modelcontextprotocol/logLevel',
  serverInfo: 'io.modelcontextprotocol/serverInfo',
} as const;

export const SERVER_INFO = { name: 'vision-board', title: 'Vision Board', version: TOOL_FILE.apiVersion } as const;

export const CAPABILITIES = { tools: {} } as const;

/** How long a client may cache `tools/list` and `server/discover`: the list only changes when
 * the server is regenerated and restarted. */
export const CACHE = { ttlMs: 3_600_000, cacheScope: 'public' } as const;

const ABOUT = 'Vision Board is a board you draw your output on, so the person can answer it card by card. Every card takes a comment, more context or Later; draw a `question`, `decision` or `action` card when you need a yes or no.';
const REST = [
  'Write with `write_board` and give every item a `key`, so a retry never writes twice.',
  'To draw on a board another agent made, call `request_grant` with just its `board` first. When an item fails with `needs-grant`, call `request_grant` once for what it names (the board, or the board and region) and wait for the answer.',
  'Then call `check_responses` with the `head` you last saw (and `wait` up to 60 seconds) to read what the person did, sorted by card number, and resend failed items with the same keys. Answer every comment and more context with a `reply` or an `append`, and every Later with a `park`.',
  '`join` and `list_boards` name the folder the board has open (`project`). If a call answers `wrong-folder`, the board has another folder open: stop, tell the person what it says, and do not call `join`.',
  'A board marked `locked` (`list_boards`, `get_board`) is read-only until the person unlocks it: every write on it answers `locked`, so tell the person in one line and stop.',
];

export const INSTRUCTIONS = [
  ABOUT,
  'Call `join` once and save your agent id and secret in your durable notes now, because a context compaction loses them; pass the secret as `secret` on later calls.',
  ...REST,
].join(' ');

/** When VB_AGENT_SECRET is set (a chat the board started): the identity is given, so nothing to save. */
export const INSTRUCTIONS_JOINED = [
  ABOUT,
  'You already have an identity on the board, set for you: do not call `join`, and leave `secret` out of every call.',
  ...REST,
].join(' ');
