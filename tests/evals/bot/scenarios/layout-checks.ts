// Checks the layout scenarios share (node-overhaul T_05, the layouts reference): what a run drew, per container.
import { callsTo, check, itemsOf, resultsOf } from '../checks.ts';
import type { Check, RunRecord } from '../types.ts';
import { placesOf } from './linked-pipeline.ts';

/** Accepted items of `type`, with their answers. */
export const accepted = (r: RunRecord, type: string) =>
  itemsOf(r).filter(({ item, index, call }) => item.type === type && resultsOf(call)[index]?.ok).map(({ item, index, call }) => ({ item, done: resultsOf(call)[index] }));

/** The cards drawn new in each container (`n` by container id). */
export function cardsByContainer(r: RunRecord): Map<string, number[]> {
  const out = new Map<string, number[]>();
  for (const { item, done } of accepted(r, 'node')) {
    if (done.ver !== 1 || typeof done.n !== 'number' || typeof item.node?.region !== 'string') continue;
    out.set(item.node.region, [...(out.get(item.node.region) ?? []), done.n]);
  }
  return out;
}

/** Every region item the bot sent leaves `direction` out: the board's header holds which way flows run. */
export const directionLeftOut = (): Check => check('direction-left-out', 'no container the bot sends sets `direction` (the board\'s header choice holds)', (r) => {
  const set = itemsOf(r).filter(({ item }) => item.type === 'region' && item.region?.direction !== undefined).map(({ item }) => `${item.region.id}: ${item.region.direction}`);
  return [set.length === 0, set.join(', ') || 'left out'];
});

/** Inside one container, a card links out to two or more (a fork) and a card is linked from two or more (a rejoin). */
export const forksAndRejoins = (): Check => check('forks-and-rejoins', 'in one container a card forks into two branches and a later card joins them again', (r) => {
  const out = new Map<string, number>();
  const into = new Map<string, number>();
  for (const [from, to, region] of placesOf(r).ends) {
    if (from === undefined || to === undefined || region === undefined) continue;
    out.set(`${region}:${from}`, (out.get(`${region}:${from}`) ?? 0) + 1);
    into.set(`${region}:${to}`, (into.get(`${region}:${to}`) ?? 0) + 1);
  }
  const forks = [...out].filter(([, k]) => k >= 2).map(([c]) => c);
  const joins = [...into].filter(([, k]) => k >= 2).map(([c]) => c);
  return [forks.length > 0 && joins.length > 0, `forks at ${forks.join(', ') || 'none'}; rejoins at ${joins.join(', ') || 'none'}`];
});

/** `show_layout` once for the linked container, never twice (the reference's check). A call refused for its arguments
 * checked nothing, so it is not counted (the live run's bot once sent `secret`, which show_layout does not take). */
export const layoutCheckedOnce = (): Check => check('layout-checked-once', 'show_layout answers once, for the container it drew', (r) => {
  const calls = callsTo(r, 'show_layout');
  const read = calls.filter((c) => !c.isError).map((c) => String(c.input.region ?? ''));
  return [read.length === 1, `show_layout: ${read.join(', ') || 'never'}${calls.length > read.length ? ` (${calls.length - read.length} refused)` : ''}`];
});

/** No link at all: chatting cards are never linked. */
export const noLinks = (): Check => check('no-links', 'no link items: the numbers and the container give the order', (r) => {
  const links = itemsOf(r).filter(({ item }) => item.type === 'link');
  return [links.length === 0, `${links.length} link item(s)`];
});
