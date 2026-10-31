// Front door of packages/mcp (D-028, D-029): the stdio MCP server for the board API, one tool per
// agent operation, generated from openapi.json. The executable is bin/vb-mcp.ts.
export { createMcpServer } from './protocol.ts';
export type { McpServer, ServerOptions } from './protocol.ts';
export { serveStdio } from './stdio.ts';
export type { StdioStreams } from './stdio.ts';
export { answerResult, callTool, failureText, httpTools, problemResult, split, unknownToolResult } from './call-tool.ts';
export type { CallContext, ListedTool, ToolHost, ToolResult } from './call-tool.ts';
export { checkArgs } from './check-args.ts';
export type { Checked } from './check-args.ts';
export { TOOL_FILE, TOOLS, routeOf } from './tools.ts';
export type { JsonSchema, Route, ToolDef, ToolFile } from './tools.ts';
export { CAPABILITIES, INSTRUCTIONS, INSTRUCTIONS_JOINED, LEGACY, MCP_BIN, MODERN, SERVER_INFO, SUPPORTED_VERSIONS } from './info.ts';
export { CODES, RpcError } from './rpc.ts';
export type { Id, RpcMessage, RpcResponse } from './rpc.ts';
