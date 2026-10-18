// App frame pattern, layer 3 (element): <vb-app-frame>, in light DOM (components.md § The element).
// It draws an app's panel in a sandboxed frame (D-047 ruling 4) and speaks the panel protocol through
// the core (app-frame-core.ts). The node template puts one in each app card; the page wires it once
// (`wire`) and calls load() while the card is on screen and near enough to use, unload() when it
// leaves (ruling 14). Unloaded, it is a light placeholder with the app's title. Its inputs are
// attributes: data-app (the app's id), data-label (its name: the frame's title), data-w and data-h
// (the panel's size, held to APP_SIZE). Browser only: the class is created inside defineVbAppFrame().
import type { AppSize, AppToolResult } from '../../../format/src/index.ts';
import { APP_ID } from '../../../format/src/index.ts';
import type { AppBridge, AppLook } from './app-frame-core.ts';
import { createAppBridge, hostContext, hostStyles, panelSize } from './app-frame-core.ts';
import { KIND_ICON, svgIcon } from '../node/node-icons.ts';

export const VB_APP_FRAME_TAG = 'vb-app-frame';

/** The board's panel route (apps.md § The panel), outside /api: `/app-panels/<id>`. */
export const PANEL_PATH = '/app-panels/';

/** How long a loaded panel may take to say it is ready before it shows anyway, in ms: a panel that
 * never finishes the handshake is still seen. */
const SHOW_AFTER_MS = 1500;

/** What the page gives the frame (FE_02): the call to the board's server, and optionally the look
 * and what Esc in the panel does. */
export interface AppFrameWiring {
  /** `call_app_tool` through the page's one I/O layer; rejects with an `AppCallError`. */
  callTool(name: string, args: Record<string, unknown>): Promise<AppToolResult>;
  /** The board's look now; left out, the frame reads it from the page's tokens (`readLook`). */
  look?(): AppLook;
  /** Esc in the panel; left out, focus goes back to the card the frame is in. */
  onEscape?(): void;
}

export interface VbAppFrameElement extends HTMLElement {
  wire(w: AppFrameWiring): void;
  /** Make the frame and start the panel; nothing while it is loaded, not in the page, or its id is
   * not an app id. */
  load(): void;
  /** Remove the frame (the panel stops) and show the placeholder; focus in it goes to the card. */
  unload(): void;
  /** The board's theme changed: a ready panel gets `host-context-changed` with what changed. */
  lookChanged(): void;
  readonly loaded: boolean;
}

/** The CSS property that resolves each kind of board token: fonts, text sizes, radii, colours. */
const resolver = (token: string): string =>
  token.startsWith('--vb-font') ? 'font-family' : token.startsWith('--vb-text-') ? 'font-size'
    : token.startsWith('--vb-radius-') ? 'border-top-left-radius' : 'color';

/** How light a computed colour is, 0 to 1 (`rgb()`, or `color(srgb …)` from a mix). */
function lightness(css: string): number {
  const scale = css.startsWith('color(') ? 255 : 1;
  const [r = 255, g = 255, b = 255] = (css.match(/[\d.]+/g) ?? []).map((x) => Number(x) * scale);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

/** The board's look from its tokens as `host` resolves them, light-dark() in the theme it shows,
 * through a hidden probe; the theme is the card surface's: dark when it is. */
export function readLook(host: Element): AppLook {
  const probe = document.createElement('span');
  probe.hidden = true;
  host.append(probe);
  const cs = getComputedStyle(probe);
  const read = (token: string): string => {
    const prop = resolver(token);
    probe.style.setProperty(prop, `var(${token})`);
    const value = cs.getPropertyValue(prop);
    probe.style.removeProperty(prop);
    return value;
  };
  const variables = hostStyles(read);
  const theme = lightness(read('--vb-surface-card')) < 0.5 ? 'dark' : 'light';
  probe.remove();
  return { theme, styles: { variables } };
}

/** A number attribute, or undefined when absent or not a number. */
const num = (v: string | undefined): number | undefined => (v === undefined || v === '' || Number.isNaN(Number(v)) ? undefined : Number(v));

/** Defines `vb-app-frame` once; a second call is a no-op. */
export function defineVbAppFrame(): void {
  if (customElements.get(VB_APP_FRAME_TAG)) return;

  class VbAppFrame extends HTMLElement implements VbAppFrameElement {
    static observedAttributes = ['data-app', 'data-label', 'data-w', 'data-h'];
    private wiring: AppFrameWiring | undefined;
    private frame: HTMLIFrameElement | undefined;
    private bridge: AppBridge | undefined;
    private timer: ReturnType<typeof setTimeout> | undefined;
    /** Every message the window gets goes to the core, marked as the frame's only when it came from
     * this frame's window, whose sandbox gives it the opaque origin "null" (ruling 5). */
    private readonly onMessage = (e: MessageEvent): void => {
      const win = this.frame?.contentWindow;
      this.bridge?.receive(e.data, win != null && e.source === win && e.origin === 'null');
    };

    get loaded(): boolean { return this.frame !== undefined; }

    private get label(): string { return this.dataset.label ?? ''; }

    private get size(): AppSize {
      return panelSize({ id: this.dataset.app ?? '', w: num(this.dataset.w), h: num(this.dataset.h) });
    }

    connectedCallback(): void {
      this.placeholder();
      this.applySize();
      // A gallery sample may set another state on an unloaded frame first.
      if (!this.frame && !this.dataset.state) this.dataset.state = 'idle';
    }

    disconnectedCallback(): void { this.unload(); }

    attributeChangedCallback(name: string, before: string | null, after: string | null): void {
      if (before === after) return;
      if (name === 'data-w' || name === 'data-h') {
        this.applySize();
        this.bridge?.contextChanged();
      } else if (name === 'data-label') {
        const title = this.querySelector('.vb-af-title');
        if (title) title.textContent = this.label;
        if (this.frame) this.frame.title = this.label;
      } else if (this.frame) {
        // Another app: start again.
        this.unload();
        this.load();
      }
    }

    wire(w: AppFrameWiring): void { this.wiring = w; }

    lookChanged(): void { this.bridge?.contextChanged(); }

    load(): void {
      const app = this.dataset.app ?? '';
      if (this.frame || !this.isConnected || !APP_ID.test(app)) return;
      const frame = document.createElement('iframe');
      frame.className = 'vb-af-frame';
      // Scripts only: no same origin (so an opaque one), no top navigation, pop-ups or forms (ruling 4).
      frame.setAttribute('sandbox', 'allow-scripts');
      // The board's address (and its query) stays out of the panel's document.referrer.
      frame.referrerPolicy = 'no-referrer';
      frame.title = this.label;
      frame.src = `${PANEL_PATH}${encodeURIComponent(app)}`;
      this.bridge = createAppBridge({
        send: (m) => frame.contentWindow?.postMessage(m, '*'),
        callTool: (name, args) => (this.wiring ? this.wiring.callTool(name, args) : Promise.reject({ problem: 'not-found' })),
        hostContext: () => hostContext(this.wiring?.look?.() ?? readLook(this), this.size),
        onEscape: () => (this.wiring?.onEscape ? this.wiring.onEscape() : this.toCard()),
        onState: (s) => { if (s === 'ready') this.show(); },
      });
      // Listen before the frame exists, so its first message is heard.
      window.addEventListener('message', this.onMessage);
      frame.addEventListener('load', () => {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => this.show(), SHOW_AFTER_MS);
      });
      this.frame = frame;
      this.dataset.state = 'loading';
      this.setAttribute('aria-busy', 'true');
      this.append(frame);
    }

    unload(): void {
      window.removeEventListener('message', this.onMessage);
      clearTimeout(this.timer);
      this.bridge?.close();
      this.bridge = undefined;
      if (this.frame) {
        // Focus in the panel would be lost with it: it goes back to the card.
        if (document.activeElement === this.frame) this.toCard();
        this.frame.remove();
        this.frame = undefined;
      }
      this.dataset.state = 'idle';
      this.removeAttribute('aria-busy');
    }

    /** The panel said it is ready (or took too long to): it shows, and can take focus. */
    private show(): void {
      clearTimeout(this.timer);
      if (!this.frame) return;
      this.dataset.state = 'ready';
      this.removeAttribute('aria-busy');
    }

    private toCard(): void { this.closest<HTMLElement>('vb-node')?.focus(); }

    /** The placeholder: the app's icon and title, and "Loading…" while the panel starts. Hidden
     * from assistive tech, which reads the card's name and the frame's title. */
    private placeholder(): void {
      if (this.querySelector('.vb-af-ph')) return;
      const ph = document.createElement('div');
      ph.className = 'vb-af-ph';
      ph.setAttribute('aria-hidden', 'true');
      // The icon is a fixed drawing; the title goes in as text.
      ph.innerHTML = `${svgIcon(KIND_ICON.app, 24, 'vb-af-icon')}<span class="vb-af-title"></span><span class="vb-af-wait">Loading…</span>`;
      ph.querySelector('.vb-af-title')!.textContent = this.label;
      this.prepend(ph);
    }

    /** The panel's size as --app-w and --app-h (CSSOM: the page's CSP refuses style attributes). */
    private applySize(): void {
      const { w, h } = this.size;
      this.style.setProperty('--app-w', `${w}px`);
      this.style.setProperty('--app-h', `${h}px`);
    }
  }

  customElements.define(VB_APP_FRAME_TAG, VbAppFrame);
}
