// A picture: an SVG the bot writes into the board folder's `images/`, shown on a card of its own with alt text, by a
// path the engine serves (as a host's `imageRoute` would).
import { existsSync } from 'node:fs';
import path from 'node:path';
import { check, doneOnly, itemsOf } from '../checks.ts';
import type { Scenario } from '../types.ts';
import { BOARD, drawOffsite } from './offsite.ts';

const PICTURE = /!\[([^\]]*)\]\(([^)\s]+)\)/g;
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="60"><text x="10" y="35">Morning · Lunch · Afternoon</text></svg>';

/** Every picture written in a card body or an append, as [alt, path]. */
export const picturesIn = (texts: string[]) => texts.flatMap((t) => [...t.matchAll(PICTURE)].map((m) => [m[1]!, m[2]!] as const));

/** The bot wrote an .svg inside the board folder's `images/`, and it is there (the plugin's folder, or the open ledger's). */
export const svgInImages = () => check('svg-in-images', 'the bot wrote an .svg inside the board folder\'s images/, and it is there', (r) => {
  const images = path.join(String(r.facts.boardDir), 'images') + path.sep;
  const writes = r.turns.flatMap((t) => t.uses).filter((u) => u.name === 'Write').map((u) => String(u.input?.file_path ?? ''));
  const inside = writes.filter((f) => f.startsWith(images) && f.endsWith('.svg') && existsSync(path.join(r.dir, 'images', f.slice(images.length))));
  return [inside.length > 0, writes.length ? writes.join(', ') : 'no Write'];
});

/** A card shows the picture: alt text, and a path the board serves (200). */
export const cardShowsIt = () => check('card-shows-it', 'a card shows the picture: alt text, a path inside images/ the engine serves (200)', (r) => {
  const texts = itemsOf(r).map(({ item }) => String(item.node?.body ?? item.text ?? ''));
  const shown = picturesIn(texts).filter(([alt, p]) => alt.trim() && r.imageStatus[p] === 200);
  return [shown.length > 0, JSON.stringify(picturesIn(texts).map(([alt, p]) => ({ alt, p, status: r.imageStatus[p] })))];
});

export const picture: Scenario = {
  id: 'picture',
  title: 'Show a small SVG diagram on a card of its own',
  setup: drawOffsite,
  turns: [{ say: 'Show me a small picture on the offsite board: a simple diagram of the day, morning session then lunch then afternoon session, drawn as an SVG on a card of its own.' }],
  checks: [
    svgInImages(),
    cardShowsIt(),
    doneOnly(),
  ],
  fake: {
    good: [async (bot) => {
      bot.write(path.join(bot.dir, 'images', 'day-plan.svg'), SVG);
      await bot.call('write_board', { board: BOARD, items: [
        { type: 'region', key: 'offsite-region-day', region: { id: 'day', title: 'The day', mode: 'column' } },
        { type: 'node', key: 'offsite-card-day-plan', node: { region: 'day', kind: 'note', title: 'Plan of the day', body: '![Morning, then lunch, then afternoon](day-plan.svg)' } },
      ] });
      bot.say('Done.');
    }],
    bad: [async (bot) => {
      bot.write(path.join(bot.dir, 'day-plan.svg'), SVG);
      await bot.call('write_board', { board: BOARD, items: [{ type: 'node', key: 'offsite-card-day', node: { region: 'venues', kind: 'note', title: 'Plan of the day', body: '![](images/day-plan.svg)' } }] });
      bot.say('Done.');
    }],
    badFails: ['svg-in-images', 'card-shows-it'],
  },
};
