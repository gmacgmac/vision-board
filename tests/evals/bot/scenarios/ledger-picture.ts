// Standalone, written scenario 37: a picture in a ledger folder. The bot joins (`ledger: "main"`), writes the SVG into
// the open ledger's `images/` (`.visionboard/main/images/`, from what `join` names), and shows it on a card of its
// own, without looking around the folder for where pictures go.
import path from 'node:path';
import { doneOnly, noFolderRead } from '../checks.ts';
import type { FakeBot, Scenario } from '../types.ts';
import { cardShowsIt, svgInImages } from './picture.ts';

const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="60"><text x="10" y="35">Merge → Tag → Deploy</text></svg>';
const BOARD = 'ship-steps';

/** The bot's board, with one card showing `file` (a path inside the open ledger's `images/`). */
async function draw(bot: FakeBot, secret: string, file: string) {
  await bot.call('write_board', { secret, board: BOARD, items: [
    { type: 'board', key: 'ship-steps-board', title: 'Ship steps', summary: 'How a change ships.' },
    { type: 'region', key: 'ship-steps-region', region: { id: 'steps', title: 'Steps', mode: 'column' } },
    { type: 'node', key: 'ship-steps-diagram', node: { region: 'steps', kind: 'note', title: 'The shipping steps', body: `![Merge, then tag, then deploy](${file})` } },
  ] });
}

export const ledgerPicture: Scenario = {
  id: 'ledger-picture',
  title: 'Standalone: a picture lands in the open ledger\'s images/',
  turns: [{ say: 'Make a new board called Ship steps with just one card: a small diagram of the shipping steps (merge, then tag, then deploy), drawn as an SVG picture.' }],
  checks: [svgInImages(), cardShowsIt(), noFolderRead(), doneOnly()],
  fake: {
    good: [async (bot) => {
      const joined = await bot.call('join', { label: path.basename(bot.dir) });
      bot.write(path.join(bot.dir, '.visionboard', joined.ledger, 'images', 'ship-steps.svg'), SVG);
      await draw(bot, joined.secret, 'ship-steps.svg');
      bot.say('Done. Ship steps (`ship-steps`).');
    }],
    bad: [async (bot) => {
      const joined = await bot.call('join', { label: path.basename(bot.dir) });
      bot.use('Glob', { pattern: '.visionboard/**' });
      bot.write(path.join(bot.dir, '.visionboard', 'images', 'ship-steps.svg'), SVG);
      await draw(bot, joined.secret, 'ship-steps.svg');
      bot.say('Done.');
    }],
    badFails: ['svg-in-images', 'card-shows-it', 'no-folder-read'],
  },
};
