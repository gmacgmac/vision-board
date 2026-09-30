// The board page: loads a session, lays it out, and routes every person action through the
// action layer and the I/O module. Layout, formats and actions live in packages/; this file
// only wires them to the page.
import type { Mode, View, ViewNode } from '/pkg/format/src/view.ts';
import type { ActionId } from '/pkg/format/src/transcript.ts';
import type { BoardLayout, Box, Size } from '/pkg/layout/src/index.ts';
import { layoutBoard, routeLinks } from '/pkg/layout/src/index.ts';
import type { BoardState } from '/pkg/actions/src/index.ts';
import {
  ACTIONS, counts, DECIDED, reduceTranscript, replyText, statusOf, validateRecord,
} from '/pkg/actions/src/index.ts';
import { isPressed, KIND_LABEL } from '/pkg/ui/src/item/item-core.ts';
import type { RecordFields, SessionData } from './io.ts';
import { ApiError, listSessions, loadSession, sendRecord, watchSession } from './io.ts';
import {
  buildCards, buildRegions, drawWires, measure, placeCards, placeRegions, readingOrder, updateCard,
} from './render.ts';
import { Viewport } from './viewport.ts';
import { bindPointer } from './pointer.ts';
import { bindKeys } from './keys.ts';
import { askNote } from './dialog.ts';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const stage = $('stage');
const world = $('world');
const wires = document.getElementById('wires') as unknown as SVGSVGElement;
const vp = new Viewport(stage, world);

const S = {
  id: '',
  data: null as SessionData | null,
  state: reduceTranscript([]) as BoardState,
  cards: new Map<string, HTMLElement>(),
  regions: new Map<string, HTMLElement>(),
  layout: null as BoardLayout | null,
  sizes: new Map<string, Size>(),
  hide: false,
  focus: null as string | null,
  unwatch: null as (() => void) | null,
  settle: 0,
};

const view = (): View => S.data!.view;
const nodeOf = (id: string): ViewNode | undefined => view().nodes.find((n) => n.id === id);

// ---- messages ------------------------------------------------------------------------------

let toastTimer = 0;
function toast(text: string, tone: 'info' | 'error' = 'info') {
  const el = $('toast');
  el.textContent = text;
  el.dataset.tone = tone;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { el.hidden = true; }, tone === 'error' ? 6000 : 2200);
}

function showMessage(text: string | null) {
  const el = $('message');
  el.hidden = text === null;
  el.textContent = text ?? '';
}

function fail(err: unknown) {
  const e = err instanceof ApiError ? err : new ApiError(String(err));
  toast([e.message, ...e.problems].join(' · '), 'error');
}

// ---- drawing -------------------------------------------------------------------------------

function hiddenSet(): Set<string> {
  if (!S.hide) return new Set();
  return new Set(view().nodes.filter((n) => DECIDED.has(statusOf(S.state, n.id))).map((n) => n.id));
}

function build() {
  world.classList.add('no-anim');
  S.cards = buildCards($('cards'), view());
  S.regions = buildRegions($('regions'), view());
  $('title').textContent = view().title;
  const v = $('version');
  v.hidden = false;
  v.textContent = `v${view().version}`;
  v.title = view().summary ?? '';
  relayout();
  requestAnimationFrame(() => requestAnimationFrame(() => world.classList.remove('no-anim')));
}

function relayout() {
  for (const n of view().nodes) updateCard(S.cards.get(n.id)!, n, S.state);
  S.sizes = measure(S.cards);
  S.layout = layoutBoard(view(), S.sizes, {
    pins: S.state.pins, modes: S.state.modes, hidden: hiddenSet(),
  });
  placeRegions(S.regions, S.layout, view(), S.state);
  placeCards(S.cards, S.layout);
  wires.classList.add('settling');
  drawWires(wires, S.layout, S.focus);
  clearTimeout(S.settle);
  S.settle = window.setTimeout(() => wires.classList.remove('settling'), 380);
  renderCounts();
}

function renderCounts() {
  const c = counts(view(), S.state);
  $('counts').innerHTML =
    `<span class="vb-chip" data-tone="open"><b>${c.open}</b> open</span>`
    + `<span class="vb-chip" data-tone="decided"><b>${c.decided}</b> decided</span>`
    + `<span class="vb-chip" data-tone="later"><b>${c.later}</b> later</span>`;
  $('reply-text').textContent = replyText(view(), S.state);
  const answered = view().nodes.filter((n) => n.n !== undefined && S.state.items.has(n.id)).length;
  $('reply-toggle').textContent = `Reply${answered ? ` (${answered})` : ''}`;
}

// ---- actions -------------------------------------------------------------------------------

async function record(fields: RecordFields): Promise<boolean> {
  const draft = { ...fields, at: new Date().toISOString(), by: 'person' as const, version: view().version };
  const problems = validateRecord(draft, view());
  if (problems.length) { toast(problems.join(' · '), 'error'); return false; }
  try {
    const saved = await sendRecord(S.id, fields);
    S.data!.transcript.push(saved);
    S.state = reduceTranscript(S.data!.transcript);
    return true;
  } catch (err) {
    fail(err);
    return false;
  }
}

async function act(id: string, requested: ActionId) {
  const n = nodeOf(id);
  if (!n || n.n === undefined) return;
  // Pressing the button that matches the current status undoes it.
  const action: ActionId = isPressed(requested, statusOf(S.state, id)) ? 'reopen' : requested;
  const def = ACTIONS[action];
  let text: string | undefined;
  if (def.text) {
    const got = await askNote(
      action === 'context' ? 'Ask for more context' : 'Comment',
      `${n.n}. ${KIND_LABEL[n.kind]}: ${n.title}`,
      def.text === 'required',
      action === 'context' ? 'Optional: what is unclear? e.g. "explain in plain terms"' : 'Your note for the agent',
    );
    if (got === null) return;
    text = got || undefined;
  }
  const next = S.hide && def.status && DECIDED.has(def.status) ? neighbour(id, 1) : null;
  if (!(await record({ action, node: id, text }))) return;
  relayout();
  const focusId = next && hiddenSet().has(id) ? next : id;
  S.cards.get(focusId)?.focus({ preventScroll: true });
  if (def.reply) toast(`${n.n} ${action === 'reopen' ? 'reopened' : def.reply}`);
}

function regionOf(id: string) {
  const n = nodeOf(id);
  return S.layout?.regions.find((r) => r.id === n?.region);
}

async function pin(id: string, box: Box) {
  const r = regionOf(id);
  if (!r) return;
  const x = Math.round(box.x - r.origin.x);
  const y = Math.round(box.y - r.origin.y);
  await record({ action: 'pin', node: id, x, y });
  relayout(); // on failure this snaps the card back to its computed place
}

async function unpin(id: string) {
  if (!S.state.pins.has(id)) return;
  if (await record({ action: 'unpin', node: id })) relayout();
}

async function setMode(region: string, mode: Mode) {
  if (await record({ action: 'mode', region, mode })) {
    relayout();
    const r = S.layout?.regions.find((x) => x.id === region);
    if (r) vp.reveal(r.box);
  }
}

async function resetRegion(region: string) {
  const ids = view().nodes.filter((n) => n.region === region && S.state.pins.has(n.id)).map((n) => n.id);
  for (const id of ids) if (!(await record({ action: 'unpin', node: id }))) break;
  relayout();
}

// ---- navigation and focus ------------------------------------------------------------------

function visibleOrder(): string[] {
  return readingOrder(view()).map((n) => n.id).filter((id) => S.layout?.nodes.has(id));
}

function neighbour(id: string | null, dir: 1 | -1): string | null {
  const ids = visibleOrder();
  if (!ids.length) return null;
  const i = id ? ids.indexOf(id) : -1;
  return ids[(i + dir + ids.length) % ids.length] ?? null;
}

function setFocus(id: string | null) {
  if (S.focus === id) return;
  S.focus = id;
  if (S.layout) drawWires(wires, S.layout, S.focus);
  if (id) {
    const b = S.layout?.nodes.get(id);
    if (b) vp.reveal(b);
  }
}

$('cards').addEventListener('focusin', (e) => {
  setFocus((e.target as HTMLElement).closest<HTMLElement>('.vb-item')?.dataset.id ?? null);
});
$('cards').addEventListener('focusout', (e) => {
  const to = (e as FocusEvent).relatedTarget as HTMLElement | null;
  if (!to?.closest('.vb-item')) setFocus(null);
});

// ---- wiring --------------------------------------------------------------------------------

document.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const actBtn = t.closest<HTMLButtonElement>('button[data-act]');
  if (actBtn) {
    const id = actBtn.closest<HTMLElement>('.vb-item')!.dataset.id!;
    void act(id, actBtn.dataset.act as ActionId);
    return;
  }
  const modeBtn = t.closest<HTMLButtonElement>('button[data-mode]');
  if (modeBtn) return void setMode(modeBtn.dataset.region!, modeBtn.dataset.mode as Mode);
  const reset = t.closest<HTMLButtonElement>('button[data-reset]');
  if (reset) return void resetRegion(reset.dataset.reset!);
});

bindPointer(stage, vp, {
  box: (id) => S.layout?.nodes.get(id),
  dragMove: (id, box) => {
    // Live connectors while dragging: re-route with the moved box, no full relayout.
    if (!S.layout) return;
    const nodes = new Map(S.layout.nodes).set(id, box);
    drawWires(wires, { ...S.layout, nodes, routes: routeLinks(view().links, nodes) }, id);
  },
  dragEnd: (id, box) => void pin(id, box),
});

bindKeys({
  act: (id, a) => void act(id, a),
  nudge: (id, dx, dy) => {
    const b = S.layout?.nodes.get(id);
    if (b) void pin(id, { ...b, x: b.x + dx, y: b.y + dy });
  },
  unpin: (id) => void unpin(id),
  step: (from, dir) => {
    const next = neighbour(from, dir);
    if (next) S.cards.get(next)?.focus({ preventScroll: true });
  },
  fit: () => S.layout && vp.fit(S.layout.bounds),
  toggleHide,
  zoom: (f) => vp.zoomCentre(f),
  escape: () => { ($('reply').hidden = true); $('reply-toggle').setAttribute('aria-expanded', 'false'); },
});

function toggleHide() {
  S.hide = !S.hide;
  $('hide').setAttribute('aria-pressed', String(S.hide));
  if (S.data) relayout();
}
$('hide').onclick = toggleHide;
$('fit').onclick = () => S.layout && vp.fit(S.layout.bounds);

$('reply-toggle').onclick = () => {
  const panel = $('reply');
  panel.hidden = !panel.hidden;
  $('reply-toggle').setAttribute('aria-expanded', String(!panel.hidden));
  if (!panel.hidden) $('reply-text').focus();
};
$('reply-close').onclick = () => { $('reply').hidden = true; $('reply-toggle').setAttribute('aria-expanded', 'false'); };
$('copy').onclick = async () => {
  try {
    await navigator.clipboard.writeText($('reply-text').textContent ?? '');
    toast('Reply copied');
  } catch {
    toast('Copy failed: select the text and copy it by hand', 'error');
  }
};

const THEMES = ['system', 'light', 'dark'] as const;
function applyTheme(t: (typeof THEMES)[number]) {
  if (t === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = t;
  $('theme').textContent = `Theme: ${t}`;
  localStorage.setItem('vb-theme', t);
}
$('theme').onclick = () => {
  const cur = (localStorage.getItem('vb-theme') ?? 'system') as (typeof THEMES)[number];
  applyTheme(THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length]!);
};
applyTheme((localStorage.getItem('vb-theme') as (typeof THEMES)[number]) ?? 'system');

window.addEventListener('resize', () => S.layout && vp.apply());

// ---- sessions ------------------------------------------------------------------------------

async function openSession(id: string, fit = true) {
  try {
    const data = await loadSession(id);
    const sameVersion = S.id === id && S.data?.view.version === data.view.version;
    S.id = id;
    S.data = data;
    S.state = reduceTranscript(data.transcript);
    showMessage(null);
    if (sameVersion) relayout();
    else build();
    if (fit && S.layout) vp.fit(S.layout.bounds, false);
    history.replaceState(null, '', `#${encodeURIComponent(id)}`);
  } catch (err) {
    fail(err);
    showMessage(err instanceof ApiError ? [err.message, ...err.problems].join('\n') : String(err));
  }
}

function watch(id: string) {
  S.unwatch?.();
  let pending = 0;
  S.unwatch = watchSession(id, () => {
    clearTimeout(pending);
    pending = window.setTimeout(async () => {
      const before = S.data?.view.version;
      await openSession(id, false);
      if (S.data && S.data.view.version !== before) toast(`The agent drew v${S.data.view.version}`);
    }, 150);
  });
}

async function boot() {
  const select = $<HTMLSelectElement>('session');
  try {
    const sessions = await listSessions();
    if (!sessions.length) {
      showMessage('No sessions yet. The agent writes sessions/<id>/view-v1.json to start one.');
      return;
    }
    select.innerHTML = sessions
      .map((s) => `<option value="${s.id}">${s.title.replace(/[&<>"]/g, '')} · v${s.versions.at(-1)}</option>`)
      .join('');
    const wanted = decodeURIComponent(location.hash.slice(1));
    const id = sessions.some((s) => s.id === wanted) ? wanted : sessions[0]!.id;
    select.value = id;
    select.onchange = () => { void openSession(select.value); watch(select.value); };
    await openSession(id);
    watch(id);
  } catch (err) {
    fail(err);
    showMessage('Could not reach the board server. Start it with: node apps/board/server.ts');
  }
}

void boot();
