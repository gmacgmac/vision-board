// The tool list the server offers, read from tools.generated.json (api.md 46): one MCP tool per
// x-agent operation of openapi.json, written by scripts/gen-api.mjs. `routes` says which of a
// tool's arguments fill the path, the query and the body, and whether it takes the secret.
import { readFileSync } from 'node:fs';

/** A JSON Schema as the generator wrote it: plain 2020-12, no `$ref`. */
export type JsonSchema = boolean | { readonly [keyword: string]: unknown };

/** One MCP tool definition, exactly as `tools/list` sends it: no `outputSchema` (api.md 48). */
export interface ToolDef {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: { readonly [keyword: string]: unknown };
  readonly annotations: { readonly [hint: string]: boolean };
}

/** Where a tool's arguments go back to in the HTTP call. */
export interface Route {
  readonly path: readonly string[];
  readonly query: readonly string[];
  readonly body: readonly string[];
  /** True when the operation takes the agent secret (the `secret` argument or VB_AGENT_SECRET). */
  readonly secret: boolean;
}

export interface ToolFile {
  readonly note: string;
  /** openapi.json `info.version`: the server reports it as its own version. */
  readonly apiVersion: string;
  readonly tools: readonly ToolDef[];
  readonly routes: { readonly [tool: string]: Route };
}

export const TOOL_FILE: ToolFile = JSON.parse(readFileSync(new URL('./tools.generated.json', import.meta.url), 'utf8'));

/** The tools by name, in the file's (deterministic) order. */
export const TOOLS: ReadonlyMap<string, ToolDef> = new Map(TOOL_FILE.tools.map((t) => [t.name, t]));

export function routeOf(name: string): Route {
  const route = TOOL_FILE.routes[name];
  if (!route) throw new Error(`tools.generated.json has no route for ${name}; run npm run gen`);
  return route;
}
