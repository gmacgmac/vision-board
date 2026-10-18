// App cards (D-047, docs/specification/apps.md): the names, numbers and shapes an app card, the
// board's app host and the panel's frame share, defined once. An app is a folder the agent writes
// in the open project's `.visionboard/apps/<id>/`: a manifest (`app.json`, whose one source is
// schema/app/manifest.schema.json), a panel and, if it has tools, a tools module. Pure data: the
// host (apps/board/server/apps/) and the frame (packages/ui/src/app-frame/) both import it.
import { ID_PATTERN } from './view.ts';

/** An app's id is the name of its folder, with the same pattern as every other id (ruling 2). */
export const APP_ID = ID_PATTERN;

/** The SHA-256 of an app's code (its manifest, then its tools file), in lowercase hex: the version
 * the person allows (`app-allow`). */
export const APP_HASH_PATTERN = /^[0-9a-f]{64}$/;

/** A tool's name: the names every MCP client accepts (api.md 50). */
export const APP_TOOL_NAME = /^[a-z][a-z0-9_]{0,39}$/;

/** Where apps live in a project, under `.visionboard/`. */
export const APPS_DIR = 'apps';

/** The board server's panel route, outside /api: an app's panel is served at this path plus its id
 * (apps.md § The panel). The server's route and the page's frame both read it. */
export const APP_PANEL_PATH = '/app-panels/';

/** The files in an app's folder: the manifest's name is fixed; the panel's and the tools' are the
 * defaults the manifest's `panel` and `tools` may change. */
export const APP_FILES = { manifest: 'app.json', panel: 'panel.html', tools: 'tools.mjs' } as const;

/** The panel's size in px (ruling 3): the agent's `node.app.w` and `h`, else the manifest's
 * `size`, else the default. The schemas read the same numbers (a test checks). */
export const APP_SIZE = {
  w: { min: 280, max: 960, default: 360 },
  h: { min: 120, max: 800, default: 320 },
} as const;

/** Every limit on an app, in one table (ruling 8). */
export const APP_LIMITS = {
  /** How long one tool call may run, in ms; then the app's process is stopped. */
  callMs: 10_000,
  /** The most one tool's answer may hold, in bytes of JSON. */
  outputBytes: 256 * 1024,
  /** Tool calls running at once, per app. */
  inFlight: 4,
  /** Tool calls waiting behind those, per app; one more is refused as busy. */
  queue: 16,
  /** Crashes within `crashWindowMs` that mark an app broken until its code changes. */
  crashes: 3,
  crashWindowMs: 60_000,
  /** The wait before a crashed app's process starts again, in ms; it doubles with each crash in
   * the window. */
  restartMs: 250,
  /** How long an app's process waits for a call before it stops, in ms. */
  idleMs: 5 * 60_000,
  /** The heap an app's process may use, in MB. */
  memoryMb: 128,
  /** The most one of an app's files (manifest, panel, tools) may hold, in bytes. */
  fileBytes: 1024 * 1024,
  /** Messages a panel may send in one second; the rest are refused. */
  panelMessagesPerSecond: 50,
} as const;

/** What list_apps says of each app (ruling 11), worked out fresh by one function in the host:
 * `missing` (a card names it, no folder has it), `invalid` (its manifest or files have problems),
 * `needs-approval` (it has tools the person has not allowed at this version), `ready`, `broken`
 * (its tools crashed too often). */
export const APP_STATES = ['missing', 'invalid', 'needs-approval', 'ready', 'broken'] as const;
export type AppState = (typeof APP_STATES)[number];

/** The MCP Apps version the panel protocol follows (ruling 5). */
export const APP_PROTOCOL_VERSION = '2026-01-26';

/** Every message a panel may send the board (JSON-RPC 2.0 over `postMessage`, ruling 5): a request
 * gets an answer, a notification none. Anything else is answered "method not found" when it is a
 * request, and ignored when it is not. `ui/notifications/escape` is the board's own: Esc in the
 * panel puts focus back on the card (ruling 15). */
export const PANEL_METHODS = {
  'ui/initialize': 'request',
  'ui/notifications/initialized': 'notification',
  'tools/call': 'request',
  ping: 'request',
  'ui/notifications/size-changed': 'notification',
  'ui/notifications/escape': 'notification',
} as const;
export type PanelMethod = keyof typeof PANEL_METHODS;

/** What the board sends a panel, besides its answers: a new host context on a theme change. */
export const HOST_NOTIFICATIONS = ['ui/notifications/host-context-changed'] as const;

/** The JSON-RPC error codes the board answers a panel with. `failed` (MCP Apps' implementation
 * error) carries the board's problem code in `data.problem`. */
export const PANEL_ERRORS = { invalidRequest: -32600, methodNotFound: -32601, invalidParams: -32602, failed: -32000 } as const;

/** The board's look for a panel: MCP Apps style variables (hostContext.styles.variables), each
 * carrying the resolved value of a board token in the board's theme, so a panel can match it. */
export const APP_STYLE_VARIABLES = {
  '--color-background-primary': '--vb-surface-card',
  '--color-background-secondary': '--vb-surface-sunken',
  '--color-background-tertiary': '--vb-surface-deep',
  '--color-background-inverse': '--vb-accent-fill',
  '--color-text-primary': '--vb-ink-strong',
  '--color-text-secondary': '--vb-ink',
  '--color-text-tertiary': '--vb-ink-subtle',
  '--color-text-inverse': '--vb-ink-on-fill',
  '--color-text-danger': '--vb-state-drop',
  '--color-text-success': '--vb-state-ack',
  '--color-border-primary': '--vb-line-strong',
  '--color-border-secondary': '--vb-line',
  '--color-ring-primary': '--vb-focus',
  '--font-sans': '--vb-font',
  '--font-mono': '--vb-font-mono',
  '--font-text-sm-size': '--vb-text-sm',
  '--font-text-md-size': '--vb-text-md',
  '--font-text-lg-size': '--vb-text-lg',
  '--border-radius-sm': '--vb-radius-sm',
  '--border-radius-md': '--vb-radius-md',
} as const;

/** Which app an app card shows, and the panel size the agent chose (common.schema.json `appRef`). */
export interface AppRef { id: string; w?: number; h?: number }
export interface AppSize { w: number; h: number }

/** The panel's domains beyond the board (MCP Apps' names): https, exact hosts, no wildcards. */
export interface AppCsp { connectDomains?: string[]; resourceDomains?: string[] }

/** `app.json` (schema/app/manifest.schema.json, the one source; a test checks this type's fields). */
export interface AppManifest {
  id: string;
  title: string;
  version: string;
  /** The panel file in the app's folder; left out, `APP_FILES.panel`. */
  panel?: string;
  /** The tools module in the app's folder; left out, `APP_FILES.tools` when that file is there,
   * else the app has no tools (a panel-only app needs no approval). */
  tools?: string;
  /** The panel size for cards that set none. */
  size?: AppSize;
  /** The names of the keys in the project's `.env` the tools may read (`ctx.env`). */
  env?: string[];
  csp?: AppCsp;
}

/** One tool as the tools module exports it, less `run` (manifest.schema.json `$defs/tool`). */
export interface AppToolInfo {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

/** A tool call's answer in MCP's tool-result shape (`call_app_tool`, api/app-call-response). */
export interface AppToolResult {
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError: boolean;
}

/** One problem with an app's files, for the agent to fix: the file, where in it, and what. */
export interface AppProblem { file: string; pointer?: string; detail: string }

/** One app as list_apps gives it (api/list-apps-response). */
export interface AppInfo {
  id: string;
  state: AppState;
  title?: string;
  version?: string;
  size?: AppSize;
  /** The names of its tools; empty for a panel-only app. */
  tools: string[];
  hash?: string;
  /** The person allowed this hash. */
  allowed: boolean;
  /** The person allowed an earlier version, and the code has changed since. */
  changed?: true;
  problems?: AppProblem[];
}

/** An app card's panel size: the agent's, else the manifest's, else the default (ruling 3). */
export const appSize = (ref: AppRef, manifest?: AppSize): AppSize => ({
  w: ref.w ?? manifest?.w ?? APP_SIZE.w.default,
  h: ref.h ?? manifest?.h ?? APP_SIZE.h.default,
});
