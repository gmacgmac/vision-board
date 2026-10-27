// Test helper for the app frame's protocol tests (not a test file): a bridge with fake windows. A
// message counts as the frame's only when its source is the frame's window, as the element checks.
import type { AppBridgeOptions, AppHostContext, BridgeState, HostMessage } from '../src/index.ts';
import { APP_PROTOCOL_VERSION } from '#format';
import { createAppBridge, hostContext } from '../src/index.ts';

export const LIGHT: AppHostContext = hostContext({ theme: 'light', styles: { variables: { '--color-text-primary': 'rgb(24, 24, 27)' } } }, { w: 360, h: 440 });
export const DARK: AppHostContext = { ...LIGHT, theme: 'dark', styles: { variables: { '--color-text-primary': 'rgb(237, 237, 239)' } } };

/** A bridge with fake windows: `frame` is the card's frame, `other` any other window. */
export function harness(o: Partial<AppBridgeOptions> = {}) {
  const sent: HostMessage[] = [];
  const states: BridgeState[] = [];
  const calls: { name: string; args: Record<string, unknown> }[] = [];
  let clock = 1000;
  let ctx = LIGHT;
  const frame = {};
  const other = {};
  const bridge = createAppBridge({
    send: (m) => sent.push(m),
    callTool: async (name, args) => {
      calls.push({ name, args });
      return { content: [{ type: 'text', text: '36' }], structuredContent: { value: 36 }, isError: false };
    },
    hostContext: () => ctx,
    onState: (s) => states.push(s),
    now: () => clock,
    ...o,
  });
  const from = (source: object, data: unknown) => bridge.receive(data, source === frame);
  return {
    bridge, sent, states, calls, frame, other,
    /** A message from the card's frame. */
    post: (data: unknown) => from(frame, data),
    /** A message from another window (a second frame, a pop-up, the page itself). */
    postFromOther: (data: unknown) => from(other, data),
    tick: (ms: number) => { clock += ms; },
    setContext: (c: AppHostContext) => { ctx = c; },
    last: () => sent.at(-1),
  };
}

export const req = (id: unknown, method: string, params?: unknown) =>
  ({ jsonrpc: '2.0', id, method, ...(params !== undefined && { params }) });
export const note = (method: string, params?: unknown) => ({ jsonrpc: '2.0', method, ...(params !== undefined && { params }) });
export const settle = () => new Promise((r) => setImmediate(r));

/** Handshake done: ui/initialize answered, then initialized. */
export function ready(h: ReturnType<typeof harness>): void {
  h.post(req(1, 'ui/initialize', { protocolVersion: APP_PROTOCOL_VERSION, appCapabilities: {} }));
  h.post(note('ui/notifications/initialized'));
}

export const errorOf = (m: HostMessage | undefined) => (m as { error: { code: number; message: string; data?: { problem: string; detail?: string } } }).error;
