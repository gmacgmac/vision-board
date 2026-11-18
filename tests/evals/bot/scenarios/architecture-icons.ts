// Standalone, written scenario 45: an architecture board (node-overhaul T_03, R28, point 246). The project's icon
// library already holds `x-watermark`. The bot lists the icons before it adds any, reuses the built-in ones and the
// library's, names any icon it adds by the rule, writes no file into `.visionboard/`, sets the pipeline's parts apart
// by tone (the same tone for parts that belong together, never one tone on every card), and still picks each kind by
// meaning. Icons and tone are standalone tools (`list_icons`, `add_icon`: `x-hosts` standalone), so this runs there.
import path from 'node:path';
import { ICON_NAMES, LIBRARY_ICON_PATTERN, isTone } from '#format';
import { callsTo, check, doneOnly, everyItemKeyed, itemsOf, noCoordinates, resultsOf } from '../checks.ts';
import type { FakeBot, RunRecord, Scenario } from '../types.ts';
import { fewCrossLinks, linkedInOneFlow } from './linked-pipeline.ts';

const BOARD = 'live-video';
const LIBRARY = 'x-watermark';
const WATERMARK = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>Watermark</title><path d="M4 4h16v16H4z M8 12h8"/></svg>';
const BUILT_IN = new Set<string>(ICON_NAMES);
const ASKS = new Set(['question', 'decision', 'action']);
const COLOURS = /\b(red|green|blue|teal|violet|magenta|amber|orange|slate|pink|purple|yellow|black|white|grey|gray)\b/;

/** The cards the bot drew (accepted node items), latest content per key. */
const nodesOf = (r: RunRecord) => itemsOf(r).filter(({ item, index, call }) => item.type === 'node' && resultsOf(call)[index]?.ok).map(({ item }) => item.node ?? {});
/** Every name the bot asked `add_icon` for, in order. */
const added = (r: RunRecord) => callsTo(r, 'add_icon').map((c) => String(c.input.name ?? ''));
/** The index in `r.calls` of the first call to `name`, or Infinity. */
const first = (r: RunRecord, name: string) => { const i = r.calls.findIndex((c) => c.name === name); return i < 0 ? Infinity : i; };

const lists = check('lists-icons-first', 'list_icons is called before any add_icon and before the first card naming an icon', (r) => {
  const iconWrite = callsTo(r, 'write_board').find((c) => (c.input.items ?? []).some((i: any) => i?.node?.icon));
  const at = first(r, 'list_icons');
  const before = Math.min(first(r, 'add_icon'), iconWrite ? r.calls.indexOf(iconWrite) : Infinity);
  return [at < Infinity && at < before, `list_icons at call ${at === Infinity ? 'never' : at + 1}; first add_icon or icon card at ${before === Infinity ? 'none' : before + 1}`];
});

const builtIns = check('built-ins-reused', 'at least four component cards name a built-in icon, and no added icon is a built-in again', (r) => {
  const used = nodesOf(r).map((n) => n.icon).filter((i): i is string => typeof i === 'string' && BUILT_IN.has(i));
  const again = added(r).filter((n) => BUILT_IN.has(n.replace(/^x-/, '').split('-')[0]!));
  return [used.length >= 4 && again.length === 0, `built-in icons: ${used.join(', ') || 'none'}${again.length ? `; added again: ${again.join(', ')}` : ''}`];
});

const library = check('library-reused', `the watermarking card names the library's ${LIBRARY}, and no second watermark icon is added`, (r) => {
  const mark = nodesOf(r).find((n) => /watermark/i.test(`${n.title ?? ''} ${n.body ?? ''}`));
  const twin = added(r).filter((n) => /watermark/.test(n));
  return [mark?.icon === LIBRARY && twin.length === 0, `watermark card icon: ${mark?.icon ?? (mark ? 'none' : 'no card')}${twin.length ? `; added: ${twin.join(', ')}` : ''}`];
});

const names = check('added-names', 'any icon added is named x-, a noun and a qualifier: no number, colour or board name', (r) => {
  const bad = added(r).filter((n) => !LIBRARY_ICON_PATTERN.test(n) || /\d/.test(n) || COLOURS.test(n.replace(/-/g, ' ')) || n.includes(BOARD));
  return [bad.length === 0, `added: ${added(r).join(', ') || 'none'}${bad.length ? `; against the rule: ${bad.join(', ')}` : ''}`];
});

const noFile = check('no-visionboard-write', 'no file written into .visionboard/ (an icon goes through add_icon)', (r) => {
  const wrote = r.turns.flatMap((t) => t.uses).filter((u) => ['Write', 'Edit', 'MultiEdit', 'NotebookEdit', 'Bash'].includes(u.name) && /\.visionboard/.test(JSON.stringify(u.input ?? '')));
  return [wrote.length === 0, wrote.map((u) => `${u.name} ${String(u.input?.file_path ?? u.input?.command ?? '').slice(0, 120)}`).join('; ') || 'none'];
});

const tones = check('tones-group', 'the parts are set apart by tone: valid tones, at least two, each on two cards or more, never one tone on every card', (r) => {
  const cards = nodesOf(r);
  const toned = cards.filter((n) => n.tone !== undefined);
  const count = new Map<string, number>();
  for (const n of toned) count.set(String(n.tone), (count.get(String(n.tone)) ?? 0) + 1);
  const lone = [...count].filter(([, k]) => k < 2).map(([t]) => t);
  const ok = toned.every((n) => isTone(n.tone)) && count.size >= 2 && lone.length === 0;
  return [ok, `${toned.length} of ${cards.length} cards toned: ${[...count].map(([t, k]) => `${t}×${k}`).join(', ') || 'none'}`];
});

const kinds = check('kinds-by-meaning', 'kinds still follow meaning: a card of an asking kind asks, and none is an app', (r) => {
  const wrong = nodesOf(r).filter((n) => n.kind === 'app' || (ASKS.has(n.kind) && !/\?|✓|Answer in a note/.test(`${n.title ?? ''} ${n.body ?? ''}`)));
  return [nodesOf(r).length > 0 && wrong.length === 0, `kinds: ${nodesOf(r).map((n) => n.kind).join(', ')}${wrong.length ? `; not by meaning: ${wrong.map((n) => n.title).join(', ')}` : ''}`];
});

const skin = check('skin-fits', 'an architecture board keeps the default skin (command-lens is for operational boards)', (r) => {
  const said = itemsOf(r).filter(({ item }) => item.type === 'board').map(({ item }) => item.skin ?? 'default');
  return [said.length > 0 && said.every((s) => s === 'default'), `skin: ${said.join(', ') || 'no board item'}`];
});

/** The service, in order: [key, title, icon, tone]. Capture, processing and delivery, each a tone. */
const PARTS = [
  ['camera', 'Camera feed', 'camera', 'teal'], ['ingest', 'Ingest', 'ingest', 'teal'],
  ['encoder', 'Encoder', 'encoder', 'violet'], ['watermark', 'Watermarking', LIBRARY, 'violet'], ['packager', 'Packager', 'packager', 'violet'],
  ['storage', 'Storage', 'storage', 'amber'], ['cdn', 'CDN', 'cdn', 'amber'], ['player', 'Player', 'player', 'amber'],
] as const;
const card = ([id, title, icon, tone]: readonly string[], extra: Record<string, unknown> = {}) =>
  ({ type: 'node', key: `live-video-card-${id}`, node: { region: 'service', kind: 'topic', title, icon, tone, ...extra } });
const links = () => PARTS.slice(1).map(([id], i) => ({ type: 'link', key: `live-video-link-${PARTS[i]![0]}-${id}`, from: { key: `live-video-card-${PARTS[i]![0]}` }, to: { key: `live-video-card-${id}` } }));
const head = (skin?: string) => [
  { type: 'board', key: 'live-video-board', title: 'Live video', summary: 'How a live stream goes from the camera to the player.', ...(skin && { skin }) },
  { type: 'region', key: 'live-video-region-service', region: { id: 'service', title: 'Service', mode: 'flow' } },
];

async function good(bot: FakeBot) {
  const { secret } = await bot.call('join', { label: path.basename(bot.dir) });
  bot.read('architecture');
  bot.read('layouts');
  await bot.call('list_icons', {});
  await bot.call('write_board', { secret, board: BOARD, items: [...head(), ...PARTS.map((p) => card(p)), ...links()] });
  await bot.call('show_layout', { board: BOARD, region: 'service' });
  bot.say('Done. Live video (`live-video`).');
}

/** Adds before listing, under a built-in's name with a colour, writes a drawing into the library by hand, tones every
 * card alike, draws components as decisions that ask nothing, and picks the operational skin. */
async function bad(bot: FakeBot) {
  const { secret } = await bot.call('join', { label: path.basename(bot.dir) });
  await bot.call('add_icon', { secret, name: 'x-cdn-blue', title: 'CDN', svg: WATERMARK.replace('Watermark', 'CDN') });
  bot.write(path.join(bot.dir, '.visionboard', 'icons', 'x-player.svg'), WATERMARK);
  const parts = PARTS.map(([id, title, icon]) => [id, title, id === 'watermark' ? 'shield' : id === 'cdn' ? 'x-cdn-blue' : icon, 'blue'] as const);
  await bot.call('write_board', { secret, board: BOARD, items: [...head('command-lens'), ...parts.map((p) => card(p, { kind: 'decision' })), ...links()] });
  bot.say('Done.');
}

export const architectureIcons: Scenario = {
  id: 'architecture-icons',
  title: 'Standalone: an architecture board lists icons first, reuses built-in and library ones, and tones its parts',
  setup: async (s) => { await s.tool('add_icon', { name: LIBRARY, title: 'Watermark', svg: WATERMARK }); },
  turns: [{ say: 'Put the architecture of our live video service on a new board as a flow: the camera feed comes into ingest, then the encoder, then our watermarking service, then the packager, which writes to storage; the CDN serves it from storage to the player. Make it easy to see which parts are capture, processing and delivery.' }],
  checks: [lists, builtIns, library, names, noFile, tones, kinds, skin, linkedInOneFlow(5), fewCrossLinks(), everyItemKeyed(), noCoordinates(), doneOnly()],
  reads: { need: ['architecture'], may: ['layouts'] },
  fake: {
    good: [good], bad: [bad],
    badFails: ['lists-icons-first', 'built-ins-reused', 'library-reused', 'added-names', 'no-visionboard-write', 'tones-group', 'kinds-by-meaning', 'skin-fits', 'reads-references'],
  },
};
