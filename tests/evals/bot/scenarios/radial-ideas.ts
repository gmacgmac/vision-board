// Standalone, written scenario 48 (node-overhaul T_05, the layouts reference): ideas around one topic, as a radial. The bot
// reads `references/layouts.md`, draws the topic and the ideas in one `radial` container with no links, then sends the
// container again with `center` set to the topic card's number, which the first write's answer gave.
import path from 'node:path';
import { check, doneOnly, everyItemKeyed, noCoordinates } from '../checks.ts';
import type { FakeBot, Scenario } from '../types.ts';
import { accepted, cardsByContainer, noLinks } from './layout-checks.ts';

const BOARD = 'onboarding-ideas';
const IDEAS = [['buddy', 'A buddy for each new starter'], ['checklist', 'A first-week checklist'], ['videos', 'Recorded welcome videos'], ['glossary', 'A glossary of our terms'], ['check-in', 'A check-in after 30 days']] as const;

const centred = check('radial-centred', 'a `radial` container holds the ideas, and is sent again with `center`, a card drawn in it', (r) => {
  const radial = accepted(r, 'region').map(({ item }) => item.region).filter((g) => g?.mode === 'radial' || g?.center !== undefined);
  const id = radial[0]?.id;
  const cards = id ? cardsByContainer(r).get(id) ?? [] : [];
  const centre = radial.map((g) => g.center).find((c) => c !== undefined);
  return [Boolean(id) && cards.length >= 5 && typeof centre === 'number' && cards.includes(centre), `radial: ${id ?? 'none'}, ${cards.length} cards, center ${centre ?? 'not set'}`];
});

async function good(bot: FakeBot) {
  const { secret } = await bot.call('join', { label: path.basename(bot.dir) });
  bot.read('layouts');
  const drawn = await bot.call('write_board', { secret, board: BOARD, items: [
    { type: 'board', key: 'onboarding-board', title: 'Onboarding ideas', summary: 'Ideas for a better onboarding.' },
    { type: 'region', key: 'onboarding-region-ideas', region: { id: 'ideas', title: 'Better onboarding', mode: 'radial' } },
    { type: 'node', key: 'onboarding-card-topic', node: { region: 'ideas', kind: 'topic', title: 'Better onboarding' } },
    ...IDEAS.map(([id, title]) => ({ type: 'node', key: `onboarding-card-${id}`, node: { region: 'ideas', kind: 'note', title } })),
  ] });
  const topic = drawn.results.find((x: { key: string }) => x.key === 'onboarding-card-topic').n;
  await bot.call('write_board', { secret, board: BOARD, items: [
    { type: 'region', key: 'onboarding-region-ideas-centre', region: { id: 'ideas', title: 'Better onboarding', mode: 'radial', center: topic } },
  ] });
  bot.say('Done. Onboarding ideas (`onboarding-ideas`).');
}

/** Reads nothing, draws the ideas as a grid and links each to the topic instead of centring it. */
async function bad(bot: FakeBot) {
  const { secret } = await bot.call('join', { label: path.basename(bot.dir) });
  await bot.call('write_board', { secret, board: BOARD, items: [
    { type: 'board', key: 'onboarding-board', title: 'Onboarding ideas', summary: 'Ideas for a better onboarding.' },
    { type: 'region', key: 'onboarding-region-ideas', region: { id: 'ideas', title: 'Better onboarding', mode: 'grid' } },
    { type: 'node', key: 'onboarding-card-topic', node: { region: 'ideas', kind: 'topic', title: 'Better onboarding' } },
    ...IDEAS.map(([id, title]) => ({ type: 'node', key: `onboarding-card-${id}`, node: { region: 'ideas', kind: 'note', title } })),
    ...IDEAS.map(([id]) => ({ type: 'link', key: `onboarding-link-${id}`, from: { key: 'onboarding-card-topic' }, to: { key: `onboarding-card-${id}` } })),
  ] });
  bot.say('Done.');
}

export const radialIdeas: Scenario = {
  id: 'radial-ideas',
  title: 'Standalone: ideas around one topic as a radial, centred on the topic card',
  turns: [{ say: 'On a new board, put our ideas for better onboarding around the topic, as a radial: a buddy for each new starter, a first-week checklist, recorded welcome videos, a glossary of our terms, and a check-in after 30 days.' }],
  checks: [centred, noLinks(), everyItemKeyed(), noCoordinates(), doneOnly()],
  reads: { need: ['layouts'] },
  fake: { good: [good], bad: [bad], badFails: ['radial-centred', 'no-links', 'reads-references'] },
};
