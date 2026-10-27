// JSON-RPC 2.0 as MCP uses it over stdio: one message per line, the standard error codes plus
// MCP's UnsupportedProtocolVersion (-32022), and the response shapes.
import * as protocolWords from './words/protocol.ts';

export type Id = string | number;

export interface RpcMessage {
  readonly jsonrpc: '2.0';
  /** Present on a request, absent on a notification. */
  readonly id?: Id;
  readonly method: string;
  readonly params?: Readonly<Record<string, unknown>>;
}

export type RpcResponse =
  | { jsonrpc: '2.0'; id: Id; result: Record<string, unknown> }
  | { jsonrpc: '2.0'; id?: Id; error: { code: number; message: string; data?: unknown } };

export const CODES = {
  parseError: -32700,
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
  internalError: -32603,
  unsupportedProtocolVersion: -32022,
} as const;

/** A protocol error: answered as a JSON-RPC error, never as a tool result. */
export class RpcError extends Error {
  readonly code: number;
  readonly data?: unknown;
  constructor(code: number, message: string, data?: unknown) {
    super(message);
    this.name = 'RpcError';
    this.code = code;
    if (data !== undefined) this.data = data;
  }
}

export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

const validId = (id: unknown): id is Id => typeof id === 'string' || (typeof id === 'number' && Number.isInteger(id));

export function errorResponse(err: RpcError, id?: Id): RpcResponse {
  return { jsonrpc: '2.0', ...(id !== undefined && { id }), error: { code: err.code, message: err.message, ...(err.data !== undefined && { data: err.data }) } };
}

/** One line read from the client: a message, or the error response to send back for it. */
export function parseLine(line: string): { ok: true; message: RpcMessage } | { ok: false; response: RpcResponse } {
  let raw: unknown;
  try { raw = JSON.parse(line); } catch {
    return { ok: false, response: errorResponse(new RpcError(CODES.parseError, protocolWords.parseErrorEachLineMust)) };
  }
  const id = isRecord(raw) && validId(raw.id) ? raw.id : undefined;
  if (!isRecord(raw) || raw.jsonrpc !== '2.0' || typeof raw.method !== 'string' || ('id' in raw && !validId(raw.id)) ||
      (raw.params !== undefined && !isRecord(raw.params))) {
    return { ok: false, response: errorResponse(new RpcError(CODES.invalidRequest, protocolWords.invalidRequestExpectedAJSON), id) };
  }
  return { ok: true, message: raw as unknown as RpcMessage };
}
