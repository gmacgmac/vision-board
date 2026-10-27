// App frame pattern, layer 1 (core): the panel protocol (D-047; docs/specification/apps.md § The
// panel protocol), JSON-RPC 2.0 over postMessage in MCP Apps' shape. No DOM: the element
// (vb-app-frame.ts) hands it every message its window gets, marked with whether it came from the
// card's own frame, and a way to post to that frame; the page hands it `callTool`, the card's saved
// state (`saveState`, `loadState`) and the board's look. Every number is the shared table's
// (`APP_LIMITS`, `APP_SIZE` in packages/format).
import type { AppRef, AppSize, AppStateValue, AppToolResult, PanelMethod } from '#format';
import {
  APP_HOST_NAME, APP_LIMITS, APP_PROTOCOL_VERSION, APP_SIZE, APP_STATE_KEY, APP_STYLE_VARIABLES, APP_TOOL_NAME, appSize,
  HOST_NOTIFICATIONS, LEDGER_FORMAT, PANEL_ERRORS, PANEL_METHODS, PANEL_SAVE_STATE,
} from '#format';
import { checkSave, SAVE_WORDS } from './app-frame-state.ts';

/** The panel's size in px: the agent's, else the manifest's, else the default (`appSize`), held to
 * `APP_SIZE` (ruling 3). The card and the frame both read it, so they never disagree. */
export function panelSize(ref: AppRef, manifest?: AppSize): AppSize {
  const s = appSize(ref, manifest);
  const fit = (v: number, side: 'w' | 'h'): number => {
    const { min, max, default: d } = APP_SIZE[side];
    return Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : d;
  };
  return { w: fit(s.w, 'w'), h: fit(s.h, 'h') };
}

export type AppTheme = 'light' | 'dark';
export type AppStyleVariable = keyof typeof APP_STYLE_VARIABLES;
export type AppStyles = Partial<Record<AppStyleVariable, string>>;

/** What a panel gets in answer to `ui/initialize` (apps.md § Host context). */
export interface AppHostContext {
  theme: AppTheme;
  containerDimensions: { width: number; height: number };
  styles: { variables: AppStyles };
  platform: 'web';
  /** The value the panel last saved for its card: in the `ui/initialize` answer only, left out when
   * none (apps.md § Saving the panel's state). */
  [APP_STATE_KEY]?: AppStateValue;
}

/** The board's look, which the page reads from its tokens; the frame adds its own size. */
export type AppLook = Pick<AppHostContext, 'theme' | 'styles'>;

export const hostContext = (look: AppLook, size: AppSize): AppHostContext =>
  ({ theme: look.theme, containerDimensions: { width: size.w, height: size.h }, styles: look.styles, platform: 'web' });

/** The style variables, each `read`'s value for its board token (the page resolves them in its
 * theme, light-dark() and all); a token that resolves to nothing is left out. */
export function hostStyles(read: (token: string) => string): AppStyles {
  const out: AppStyles = {};
  for (const [name, token] of Object.entries(APP_STYLE_VARIABLES) as [AppStyleVariable, string][]) {
    const value = read(token).trim();
    if (value) out[name] = value;
  }
  return out;
}

export type JsonRpcId = string | number;
export type HostNotification = (typeof HOST_NOTIFICATIONS)[number];
export interface PanelError { code: number; message: string; data?: { problem: string; detail?: string } }
/** Everything the board posts to a panel: an answer to one of its requests, or a notification. */
export type HostMessage =
  | { jsonrpc: '2.0'; id: JsonRpcId | null; result: unknown }
  | { jsonrpc: '2.0'; id: JsonRpcId | null; error: PanelError }
  | { jsonrpc: '2.0'; method: HostNotification; params: Record<string, unknown> };

/** How the page's `callTool` says the board refused a call or the tool failed: it rejects with the
 * problem code (api.md § Errors) and, if the server gave one, its detail. */
export interface AppCallError { problem: string; detail?: string }

/** What a refused `tools/call` says in its error `message`, in plain words, for each problem code a
 * panel can get (apps.md § Errors); `data.problem` carries the code itself. */
export const PROBLEM_WORDS: Readonly<Record<string, string>> = {
  'needs-approval': 'Allow this app on its card first.',
  invalid: "The tool can't take that input.",
  'app-invalid': 'This app has problems to fix.',
  'app-failed': 'The tool failed.',
  'app-busy': 'The app is busy. Try again.',
  'app-timeout': 'The tool took too long.',
  'too-large': "The tool's answer is too big.",
  'app-not-found': "This app wasn't found.",
  'not-found': 'App cards are off.',
};

/** Tool calls a panel may have waiting for answers at once: as many as the app host takes (running
 * plus waiting in line); one more is busy here, without reaching the server. */
export const FRAME_CALLS = APP_LIMITS.inFlight + APP_LIMITS.queue;

/** The window `panelMessagesPerSecond` counts over, in ms. */
const RATE_WINDOW_MS = 1000;
/** The longest string id the board answers. */
const MAX_ID = 256;

/** Where the handshake is: before `ui/initialize`, between it and `initialized`, ready, closed. */
export type BridgeState = 'connecting' | 'initializing' | 'ready' | 'closed';

type Parsed =
  | { kind: 'request'; id: JsonRpcId; method: string; params: unknown }
  | { kind: 'notification'; method: string }
  | { kind: 'response' }
  | { kind: 'invalid'; id: JsonRpcId | null };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isId = (v: unknown): v is JsonRpcId => (typeof v === 'string' && v.length <= MAX_ID) || Number.isSafeInteger(v);

/** One message from a panel, checked as JSON-RPC 2.0: a request (a good id), a notification (no
 * id), a response (ignored: the board sends no requests) or invalid. */
export function parsePanelMessage(m: unknown): Parsed {
  if (!isObject(m)) return { kind: 'invalid', id: null };
  const id = isId(m.id) ? m.id : null;
  if (m.jsonrpc !== '2.0') return { kind: 'invalid', id };
  if (!('method' in m)) return 'result' in m || 'error' in m ? { kind: 'response' } : { kind: 'invalid', id };
  if (typeof m.method !== 'string' || !m.method) return { kind: 'invalid', id };
  if (!('id' in m)) return { kind: 'notification', method: m.method };
  return id === null ? { kind: 'invalid', id } : { kind: 'request', id, method: m.method, params: m.params };
}

/** A tool's answer as the panel gets it: MCP's tool result and nothing else. */
function toolResult(r: unknown): AppToolResult {
  const x = isObject(r) ? r : {};
  return {
    content: Array.isArray(x.content) ? x.content : [],
    ...(isObject(x.structuredContent) && { structuredContent: x.structuredContent }),
    isError: x.isError === true,
  };
}

/** The parts of `after` that differ from `before`. */
function changes(before: AppHostContext | undefined, after: AppHostContext): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(after)) {
    if (JSON.stringify(value) !== JSON.stringify(before?.[key as keyof AppHostContext])) out[key] = value;
  }
  return out;
}

export interface AppBridgeOptions {
  /** Post one message to the card's frame (the element: `contentWindow.postMessage(m, '*')`). */
  send(message: HostMessage): void;
  /** Run one of the app's tools through the page's I/O layer; rejects with an `AppCallError`. */
  callTool(name: string, args: Record<string, unknown>): Promise<AppToolResult>;
  /** The host context now: the board's theme and look, the panel's size. */
  hostContext(): AppHostContext;
  /** Keep the panel's state for its card (`vision-board/save-state`), resolved once the page holds
   * it where it lasts; rejects with an `AppCallError`. Left out, a save is refused `not-found`. */
  saveState?(state: AppStateValue): Promise<void>;
  /** The value the card's panel last saved, for the `ui/initialize` answer (undefined: none). The
   * answer waits for it; a rejection starts the panel without. Left out, the answer is at once. */
  loadState?(): Promise<AppStateValue | undefined>;
  /** The person pressed Esc in the panel (`ui/notifications/escape`): focus goes back to the card. */
  onEscape?(): void;
  /** The handshake moved on (the element shows the panel once it is ready). */
  onState?(state: BridgeState): void;
  /** The clock the message cap counts by; Date.now unless a test gives another. */
  now?(): number;
}

export interface AppBridge {
  /** One message the window got; `fromFrame` is true only when its source is the card's frame. */
  receive(message: unknown, fromFrame: boolean): void;
  /** Send the panel one of the board's notifications; false (nothing sent) before it is ready. */
  post(method: HostNotification, params: Record<string, unknown>): boolean;
  /** The board's look or the panel's size changed: a ready panel gets what changed. */
  contextChanged(): void;
  /** The frame is gone: everything after is ignored, and answers on their way are dropped. */
  close(): void;
  readonly state: BridgeState;
}

/** The protocol for one card's frame (apps.md § The panel protocol). */
export function createAppBridge(o: AppBridgeOptions): AppBridge {
  const now = o.now ?? Date.now;
  let state: BridgeState = 'connecting';
  /** The host context the panel holds, so a change sends only what differs. */
  let held: AppHostContext | undefined;
  /** Bumped on each ui/initialize: an answer meant for the panel before a restart is dropped. */
  let epoch = 0;
  let calls = 0;
  const times: number[] = [];

  const send = (m: HostMessage): void => {
    try { o.send(m); } catch { /* the frame went away mid-answer */ }
  };
  const setState = (s: BridgeState): void => {
    if (state === s) return;
    state = s;
    o.onState?.(s);
  };
  const reply = (id: JsonRpcId | null, result: unknown): void => send({ jsonrpc: '2.0', id, result });
  const fail = (id: JsonRpcId | null, code: number, message: string, data?: PanelError['data']): void =>
    send({ jsonrpc: '2.0', id, error: { code, message, ...(data && { data }) } });
  const refuse = (id: JsonRpcId, problem: string, detail?: string): void =>
    fail(id, PANEL_ERRORS.failed, PROBLEM_WORDS[problem] ?? PROBLEM_WORDS['app-failed']!, { problem, ...(detail !== undefined && { detail }) });

  function post(method: HostNotification, params: Record<string, unknown>): boolean {
    if (state !== 'ready' || !HOST_NOTIFICATIONS.includes(method)) return false;
    send({ jsonrpc: '2.0', method, params });
    return true;
  }

  function contextChanged(): void {
    if (state !== 'ready') return;
    const ctx = o.hostContext();
    const changed = changes(held, ctx);
    held = ctx;
    if (Object.keys(changed).length) post('ui/notifications/host-context-changed', changed);
  }

  /** An answer to a request made in this start of the panel only; dropped once it restarted or closed. */
  const liveFrom = (at: number) => (): boolean => state !== 'closed' && epoch === at;
  /** Why the page refused, as the panel gets it. */
  const refusal = (e: unknown): { problem: string; detail?: string } => {
    const err = isObject(e) ? e : {};
    return { problem: typeof err.problem === 'string' ? err.problem : 'app-failed', ...(typeof err.detail === 'string' && { detail: err.detail }) };
  };

  function initialize(id: JsonRpcId, params: Record<string, unknown>): void {
    if (typeof params.protocolVersion !== 'string') return fail(id, PANEL_ERRORS.invalidParams, 'ui/initialize needs a protocolVersion.');
    epoch += 1;
    const live = liveFrom(epoch);
    const answer = (saved?: AppStateValue): void => {
      if (!live()) return;
      held = o.hostContext();
      setState('initializing');
      reply(id, {
        protocolVersion: APP_PROTOCOL_VERSION, hostInfo: { name: APP_HOST_NAME, version: String(LEDGER_FORMAT) },
        hostCapabilities: { serverTools: {} }, hostContext: saved === undefined ? held : { ...held, [APP_STATE_KEY]: saved },
      });
    };
    if (!o.loadState) return answer();
    Promise.resolve().then(() => o.loadState!()).then(answer, () => answer());
  }

  /** `vision-board/save-state` (`checkSave`), passed to the page and answered when it settles. */
  function saveState(id: JsonRpcId, params: Record<string, unknown>): void {
    const checked = checkSave(params);
    if ('error' in checked) return send({ jsonrpc: '2.0', id, error: checked.error });
    const live = liveFrom(epoch);
    Promise.resolve()
      .then(() => (o.saveState ? o.saveState(checked.value) : Promise.reject({ problem: 'not-found' })))
      .then(() => { if (live()) reply(id, {}); }, (e: unknown) => { if (live()) fail(id, PANEL_ERRORS.failed, SAVE_WORDS, refusal(e)); });
  }

  function callTool(id: JsonRpcId, params: Record<string, unknown>): void {
    const { name, arguments: args = {} } = params;
    if (typeof name !== 'string' || !APP_TOOL_NAME.test(name)) return fail(id, PANEL_ERRORS.invalidParams, 'tools/call needs the name of a tool.');
    if (!isObject(args)) return fail(id, PANEL_ERRORS.invalidParams, 'tools/call arguments must be an object.');
    if (calls >= FRAME_CALLS) return refuse(id, 'app-busy');
    calls += 1;
    const live = liveFrom(epoch);
    Promise.resolve()
      .then(() => o.callTool(name, args))
      .then((r) => { if (live()) reply(id, toolResult(r)); }, (e: unknown) => {
        if (!live()) return;
        const { problem, detail } = refusal(e);
        refuse(id, problem, detail);
      })
      .finally(() => { calls -= 1; });
  }

  function request(id: JsonRpcId, method: string, raw: unknown): void {
    if (!Object.hasOwn(PANEL_METHODS, method)) return fail(id, PANEL_ERRORS.methodNotFound, `No such method: ${method.slice(0, 64)}.`);
    if (PANEL_METHODS[method as PanelMethod] === 'notification') return fail(id, PANEL_ERRORS.invalidRequest, `${method} is a notification: send it without an id.`);
    const params = raw === undefined ? {} : raw;
    if (!isObject(params)) return fail(id, PANEL_ERRORS.invalidParams, 'params must be an object.');
    if (method === 'ui/initialize') initialize(id, params);
    else if (method === 'ping') reply(id, {});
    else if (method === PANEL_SAVE_STATE) saveState(id, params);
    else callTool(id, params);
  }

  function notify(method: string): void {
    if (method === 'ui/notifications/initialized' && state === 'initializing') {
      setState('ready');
      contextChanged();
    } else if (method === 'ui/notifications/escape') o.onEscape?.();
    // ui/notifications/size-changed is ignored (the agent sets the size), and so is any other.
  }

  function receive(message: unknown, fromFrame: boolean): void {
    if (!fromFrame || state === 'closed') return;
    const m = parsePanelMessage(message);
    if (m.kind === 'response') return;
    const t = now();
    while (times.length && t - times[0]! >= RATE_WINDOW_MS) times.shift();
    if (times.length >= APP_LIMITS.panelMessagesPerSecond) {
      if (m.kind === 'request') refuse(m.id, 'app-busy');
      return;
    }
    times.push(t);
    if (m.kind === 'invalid') fail(m.id, PANEL_ERRORS.invalidRequest, 'Not a JSON-RPC 2.0 message.');
    else if (m.kind === 'notification') notify(m.method);
    else request(m.id, m.method, m.params);
  }

  return {
    receive, post, contextChanged,
    close: () => { setState('closed'); times.length = 0; },
    get state() { return state; },
  };
}
