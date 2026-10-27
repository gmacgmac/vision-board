// Names defined once (cortex-architecture rule 4): the environment variables the board server, `vb`
// and the MCP server read, imported wherever one is read. The port, the default server and the folder
// header are the API contract's, so they are generated from openapi.json (`DEFAULT_PORT`,
// `DEFAULT_SERVER`, `PROJECT_HEADER` in operations.generated.ts).
export const ENV = {
  /** The board server an agent's tools call (`vb`, MCP); left out, `DEFAULT_SERVER`. */
  server: 'VB_SERVER',
  /** The folder to open (the board server) or to work in (`vb`, MCP). */
  project: 'VB_PROJECT',
  /** One agent identity for every chat sharing an MCP configuration. */
  agentSecret: 'VB_AGENT_SECRET',
  /** The board server's port; left out, `DEFAULT_PORT`. */
  port: 'VB_PORT',
  /** A fixture ledger copied into a new project at start. */
  seed: 'VB_SEED',
  /** `1`: serve the page as it rebuilds. */
  watch: 'VB_WATCH',
  /** `0`: the board server leaves Kiro's agent file alone (it keeps it current otherwise). */
  kiroAgent: 'VB_KIRO_AGENT',
  /** Feature flags to turn on or off (flags.ts). */
  flags: 'VB_FLAGS',
} as const;

export type EnvName = (typeof ENV)[keyof typeof ENV];
