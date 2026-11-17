// Written scenario 44: a linked pipeline (DL-01 to DL-03, node-overhaul T_03). The person names a flow and two risks
// about it: the linked steps sit in one `flow` container, the risks in their own, and at most one link crosses between
// containers. The board places and routes; the bot never steers either.
import { callsTo, check, doneOnly, everyItemKeyed, itemsOf, noCoordinates, resultsOf } from '../checks.ts';
import type { Check, FakeBot, RunRecord, Scenario } from '../types.ts';

const BOARD = 'video-publishing';
const STEPS = [['upload', 'Upload'], ['transcode', 'Transcode'], ['captions', 'Add captions'], ['package', 'Package'], ['publish', 'Publish to the CDN']] as const;
const RISKS = [['vendor', 'Captions vendor turnaround'], ['cost', 'CDN cost']] as const;
const LINKED = new Set(['flow', 'lanes']);

/** Each card's container, by the key that drew it and by its number, and each container's latest mode. */
function placesOf(r: RunRecord) {
  const byKey = new Map<string, string>();
  const byN = new Map<number, string>();
  const modes = new Map<string, string>();
  for (const { item, index, call } of itemsOf(r)) {
    const done = resultsOf(call)[index];
    if (!done?.ok) continue;
    if (item.type === 'region' && item.region?.id) modes.set(item.region.id, item.region.mode ?? 'row');
    if (item.type !== 'node' || typeof item.node?.region !== 'string') continue;
    if (typeof item.key === 'string') byKey.set(item.key, item.node.region);
    if (typeof done.n === 'number') byN.set(done.n, item.node.region);
  }
  const at = (ref: any) => (typeof ref === 'number' ? byN.get(ref) : typeof ref?.key === 'string' ? byKey.get(ref.key) : undefined);
  const links = itemsOf(r).filter(({ item, index, call }) => item.type === 'link' && resultsOf(call)[index]?.ok)
    .map(({ item }) => [at(item.from), at(item.to)] as const);
  return { links, modes };
}

/** The linked cards sit in one container, a `flow` (or `lanes`), with at least `least` links in it. */
export const linkedInOneFlow = (least = 3): Check => check('linked-in-one-flow', `the linked cards (${least} links or more) sit in one container, a flow`, (r) => {
  const { links, modes } = placesOf(r);
  const inside = links.filter(([a, b]) => a !== undefined && a === b);
  const holders = [...new Set(inside.map(([a]) => a!))];
  const mode = holders.length === 1 ? modes.get(holders[0]!) : undefined;
  return [inside.length >= least && holders.length === 1 && LINKED.has(mode ?? ''), `${inside.length} links inside ${holders.join(', ') || 'no container'}${mode ? ` (${mode})` : ''}`];
});

/** At most one link between containers on the whole board. */
export const fewCrossLinks = (): Check => check('few-cross-links', 'at most one link between containers', (r) => {
  const across = placesOf(r).links.filter(([a, b]) => a !== undefined && b !== undefined && a !== b);
  return [across.length <= 1, `${across.length} between containers${across.length ? `: ${across.map(([a, b]) => `${a}→${b}`).join(', ')}` : ''}`];
});

const step = ([id, title]: readonly [string, string], region: string) => ({ type: 'node', key: `video-card-${id}`, node: { region, kind: 'topic', title } });
const link = (a: string, b: string) => ({ type: 'link', key: `video-link-${a}-${b}`, from: { key: `video-card-${a}` }, to: { key: `video-card-${b}` }, label: 'then' });
const risks = () => [
  { type: 'region', key: 'video-region-risks', region: { id: 'risks', title: 'Risks' } },
  ...RISKS.map(([id, title]) => ({ type: 'node', key: `video-card-${id}`, node: { region: 'risks', kind: 'risk', title, body: `${title} could hold up publishing.` } })),
];

async function good(bot: FakeBot) {
  await bot.call('list_boards', {});
  await bot.call('write_board', { board: BOARD, items: [
    { type: 'board', key: 'video-board', title: 'Video publishing', summary: 'How a video goes from upload to the CDN, and what could hold it up.' },
    { type: 'region', key: 'video-region-pipeline', region: { id: 'pipeline', title: 'Pipeline', mode: 'flow' } },
    ...STEPS.map((s) => step(s, 'pipeline')),
    ...risks(),
    ...STEPS.slice(1).map(([id], i) => link(STEPS[i]![0], id)),
  ] });
  await bot.call('show_layout', { board: BOARD, region: 'pipeline' });
  bot.say('Done.');
}

/** Breaks DL-01 and DL-02: the pipeline cut into two containers, linked across them, and a risk linked to a step. */
async function bad(bot: FakeBot) {
  await bot.call('write_board', { board: BOARD, items: [
    { type: 'board', key: 'video-board', title: 'Video publishing', summary: 'How a video goes from upload to the CDN.' },
    { type: 'region', key: 'video-region-prep', region: { id: 'prep', title: 'Prepare', mode: 'flow' } },
    { type: 'region', key: 'video-region-ship', region: { id: 'ship', title: 'Ship', mode: 'flow' } },
    ...STEPS.slice(0, 2).map((s) => step(s, 'prep')), ...STEPS.slice(2).map((s) => step(s, 'ship')),
    ...risks(),
    link('upload', 'transcode'), link('transcode', 'captions'), link('captions', 'package'), link('package', 'publish'), link('vendor', 'captions'),
  ] });
  bot.say('Done.');
}

export const linkedPipeline: Scenario = {
  id: 'linked-pipeline',
  title: 'A linked pipeline in one flow container, risks beside it, few links between containers',
  turns: [{ say: 'Put our video publishing pipeline on a new board as a flow: upload, transcode, add captions, package, then publish to the CDN. Add the two risks we know of as their own cards: the captions vendor\'s turnaround, and the CDN cost.' }],
  checks: [
    check('cards-drawn', 'write_board drew the five steps and the two risks', (r) => {
      const cards = callsTo(r, 'write_board').flatMap(resultsOf).filter((x) => x.ok && typeof x.n === 'number' && x.ver === 1).length;
      return [cards >= 7, `${cards} cards`];
    }),
    linkedInOneFlow(4), fewCrossLinks(), everyItemKeyed(), noCoordinates(), doneOnly(),
  ],
  fake: { good: [good], bad: [bad], badFails: ['linked-in-one-flow', 'few-cross-links'] },
};
