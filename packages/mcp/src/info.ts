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

export const INSTRUCTIONS = [
  'Vision Board is a board you draw your output on, so the person can answer it item by item.',
  'Call `join` once and save your agent id and secret in your durable notes now, because a context compaction loses them; pass the secret as `secret` on later calls.',
  'Write with `write_board` and give every item a `key`, so a retry never writes twice.',
  'When an item fails with `needs-grant`, call `request_grant` once for that container and wait for the answer.',
  'Then call `check_responses` with the `head` you last saw (and `wait` up to 60 seconds) to read what the person did, and resend failed items with the same keys.',
].join(' ');
