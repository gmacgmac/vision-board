// Who this server says it is and what it speaks (api.md 45): the two protocol versions, the
// capabilities and `serverInfo`. The instructions an agent reads before its first call are instructions.ts.
import { fileURLToPath } from 'node:url';
import { TOOL_FILE } from './tools.ts';
import * as infoWords from './words/info.ts';

/** The executable a host runs to start this server over stdio (`node MCP_BIN`). */
export const MCP_BIN = fileURLToPath(new URL('../bin/vb-mcp.ts', import.meta.url));

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

export const SERVER_INFO = { name: 'vision-board', title: infoWords.visionBoard, version: TOOL_FILE.apiVersion } as const;

export const CAPABILITIES = { tools: {} } as const;

/** How long a client may cache `tools/list` and `server/discover`: the list only changes when
 * the server is regenerated and restarted. */
export const CACHE = { ttlMs: 3_600_000, cacheScope: 'public' } as const;
