// Words: protocol. The protocol's errors and the tool call's refusals.
// Keys: vision-board.protocol.<name>. Plain code: no imports but other words files and types.

// ---- call-tool.ts
export const example = (stringify: string): string => `Example: ${stringify}`;
export const theBoardServerAtIs = (base: string, why: string): string => `The board server at ${base} is not answering (${why}). Start it with \`npm run board\`, then call again.`;
export const toolsCallNeedsNameThe = 'tools/call needs `name`, the tool to call.';
export const unknownTool = (name: string): string => `Unknown tool: ${name}`;
export const toolsCallArgumentsMustBe = 'tools/call `arguments` must be an object.';
export const theArgumentsDoNotFit = (name: string, join: string): string => `The arguments do not fit ${name}:\n${join}`;

// ---- protocol.ts
export const unsupportedProtocolVersion = 'Unsupported protocol version';
export const invalidParamsMetaIsRequired = (capabilities: string): string => `Invalid params: _meta["${capabilities}"] is required on every request.`;
export const methodNotFound = (method: string): string => `Method not found: ${method}`;
export const internalErrorTheServerLog = 'Internal error; the server log has the details.';

// ---- rpc.ts
export const parseErrorEachLineMust = 'Parse error: each line must be one JSON-RPC message.';
export const invalidRequestExpectedAJSON = 'Invalid request: expected a JSON-RPC 2.0 request or notification.';
