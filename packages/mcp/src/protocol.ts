// One message in, one response out (api.md 45). Modern requests (2026-07-28) carry their version
// and capabilities in `_meta` and are served statelessly; an unknown version, or none at all
// outside a legacy session, gets UnsupportedProtocolVersionError (-32022). A legacy client opens
// with `initialize` (answered with 2025-11-25), which makes requests without `_meta` legacy for the
// rest of this process. Every result carries `resultType: "complete"` and `serverInfo` in `_meta`.
// Logs go to stderr only: no `notifications/message` is ever sent, so none is sent unasked.
import { callTool } from './call-tool.ts';
import { CACHE, CAPABILITIES, INSTRUCTIONS, INSTRUCTIONS_JOINED, LEGACY, META, MODERN, SERVER_INFO, SUPPORTED_VERSIONS } from './info.ts';
import type { RpcMessage, RpcResponse } from './rpc.ts';
import { CODES, RpcError, errorResponse, isRecord } from './rpc.ts';
import { TOOL_FILE } from './tools.ts';
import * as protocolWords from './words/protocol.ts';

export interface ServerOptions {
  /** The board server, such as `http://127.0.0.1:4466`. */
  readonly base: string;
  /** VB_AGENT_SECRET: the secret for calls that do not pass `secret`. */
  readonly secret?: string;
  /** The folder this server works in (`projectOf`), sent as `VB-Project` on every call. */
  readonly project?: string;
  readonly fetch?: typeof fetch;
  /** Where log lines go (stderr in the executable). */
  readonly log?: (line: string) => void;
}

export interface McpServer {
  /** The response to send, or undefined for a notification (which gets none). */
  handle(message: RpcMessage, signal?: AbortSignal): Promise<RpcResponse | undefined>;
}

const complete = (result: Record<string, unknown>) => ({ resultType: 'complete', ...result, _meta: { [META.serverInfo]: SERVER_INFO } });

const unsupported = (requested?: unknown) =>
  new RpcError(CODES.unsupportedProtocolVersion, protocolWords.unsupportedProtocolVersion, {
    supported: SUPPORTED_VERSIONS, ...(requested !== undefined && { requested }),
  });

/** Throw when this server cannot serve the request's era; return when it can. */
function checkEra(params: Readonly<Record<string, unknown>>, legacy: boolean): void {
  const meta = isRecord(params._meta) ? params._meta : undefined;
  const version = meta?.[META.version];
  if (version === undefined) {
    if (legacy) return;
    throw unsupported();
  }
  if (typeof version !== 'string' || !SUPPORTED_VERSIONS.includes(version)) throw unsupported(version);
  if (version === MODERN && !isRecord(meta?.[META.capabilities])) {
    throw new RpcError(CODES.invalidParams, protocolWords.invalidParamsMetaIsRequired(META.capabilities));
  }
}

export function createMcpServer(opts: ServerOptions): McpServer {
  const log = opts.log ?? (() => {});
  const instructions = opts.secret ? INSTRUCTIONS_JOINED : INSTRUCTIONS;
  /** Set by `initialize`: legacy semantics for this process (stdio is one client). */
  let legacy = false;

  async function result(method: string, params: Readonly<Record<string, unknown>>, signal?: AbortSignal): Promise<Record<string, unknown>> {
    if (method === 'initialize') {
      legacy = true;
      return { protocolVersion: LEGACY, capabilities: CAPABILITIES, serverInfo: SERVER_INFO, instructions };
    }
    checkEra(params, legacy);
    switch (method) {
      case 'server/discover':
        return { supportedVersions: SUPPORTED_VERSIONS, capabilities: CAPABILITIES, instructions, ...CACHE };
      case 'ping':
        return {};
      case 'tools/list':
        return { tools: TOOL_FILE.tools, ...CACHE };
      case 'tools/call':
        return { ...await callTool(params, {
          base: opts.base, ...(opts.secret && { secret: opts.secret }), ...(opts.project && { project: opts.project }),
          ...(opts.fetch && { fetch: opts.fetch }), ...(signal && { signal }),
        }) };
      default:
        throw new RpcError(CODES.methodNotFound, protocolWords.methodNotFound(method));
    }
  }

  return {
    async handle(message, signal) {
      if (message.id === undefined) return undefined; // a notification: initialized, cancelled, ...
      try {
        return { jsonrpc: '2.0', id: message.id, result: complete(await result(message.method, message.params ?? {}, signal)) };
      } catch (err) {
        if (err instanceof RpcError) return errorResponse(err, message.id);
        log(`vb-mcp: ${message.method} failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
        return errorResponse(new RpcError(CODES.internalError, protocolWords.internalErrorTheServerLog), message.id);
      }
    },
  };
}
