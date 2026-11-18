// Standalone, written scenario 52 (node-overhaul T_05, the apps reference): build a small app. The bot reads
// `references/apps.md` and no other, writes the app's files in the open ledger's `apps/<id>/`, checks them with
// `list_apps`, and draws an `app` card naming that id.
import path from 'node:path';
import { callsTo, check, shortChat } from '../checks.ts';
import type { FakeBot, RunRecord, Scenario } from '../types.ts';
import { accepted } from './layout-checks.ts';

const BOARD = 'dinner-tools';
const APPS = /\.visionboard\/main\/apps\/([a-z0-9-]+)\/(app\.json|panel\.html|tools\.mjs)$/;
/** The apps the bot wrote files for, each with the files written, in the open ledger's `apps/`. */
function written(r: RunRecord): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const u of r.turns.flatMap((t) => t.uses).filter((x) => ['Write', 'Edit'].includes(x.name) && !x.isError)) {
    const m = APPS.exec(String(u.input?.file_path ?? ''));
    if (m) out.set(m[1]!, (out.get(m[1]!) ?? new Set()).add(m[2]!));
  }
  return out;
}

const files = check('app-files', 'app.json and panel.html written in the open ledger\'s apps/<id>/', (r) => {
  const apps = [...written(r)].filter(([, f]) => f.has('app.json') && f.has('panel.html'));
  return [apps.length >= 1, [...written(r)].map(([id, f]) => `${id}: ${[...f].join(', ')}`).join('; ') || 'none'];
});
const listed = check('lists-apps', 'list_apps is called after the files are written', (r) => {
  const writes = r.turns.flatMap((t, turn) => t.uses.map((u) => ({ u, turn }))).filter(({ u }) => u.name === 'Write' && APPS.test(String(u.input?.file_path ?? '')));
  return [writes.length > 0 && callsTo(r, 'list_apps').length > 0, `${writes.length} file write(s), ${callsTo(r, 'list_apps').length} list_apps`];
});
const card = check('app-card', 'an `app` card is drawn naming an app whose files were written', (r) => {
  const ids = accepted(r, 'node').map(({ item }) => item.node).filter((n) => n?.kind === 'app').map((n) => n.app?.id);
  return [ids.some((id) => written(r).has(id)), `app cards: ${ids.join(', ') || 'none'}`];
});

const APP = { id: 'tip-split', title: 'Tip splitter', version: '1.0.0', size: { w: 360, h: 280 } };
const PANEL = '<!doctype html><title>Tip splitter</title><label>Bill <input id="bill"></label><output id="each" aria-live="polite"></output>';
async function build(bot: FakeBot, where: string, read: boolean) {
  const { secret } = await bot.call('join', { label: path.basename(bot.dir) });
  if (read) bot.read('apps');
  bot.write(path.join(bot.dir, where, 'tip-split', 'app.json'), `${JSON.stringify(APP, null, 2)}\n`);
  bot.write(path.join(bot.dir, where, 'tip-split', 'panel.html'), PANEL);
  if (read) await bot.call('list_apps', { secret });
  await bot.call('write_board', { secret, board: BOARD, items: [
    { type: 'board', key: 'dinner-board', title: 'Dinner tools', summary: 'Small tools for dinners out.' },
    { type: 'region', key: 'dinner-region-apps', region: { id: 'apps', title: 'Apps' } },
    { type: 'node', key: 'dinner-card-tip-split', node: { region: 'apps', kind: 'app', title: 'Tip splitter', app: { id: 'tip-split', w: 360, h: 280 } } },
  ] });
  bot.say('Done.');
}

export const appBuild: Scenario = {
  id: 'app-build',
  title: 'Standalone: build a small app in the open ledger\'s apps/, from the apps reference',
  turns: [{ say: 'Make me a small app on a new board called Dinner tools: a tip splitter where I type the bill, the tip percent and how many people, and it shows what each person pays.' }],
  checks: [files, listed, card, shortChat()],
  reads: { need: ['apps'] },
  fake: {
    good: [(bot) => build(bot, '.visionboard/main/apps', true)],
    /** Reads nothing, writes the app where no ledger is (`.visionboard/apps/`) and never lists it. */
    bad: [(bot) => build(bot, '.visionboard/apps', false)],
    badFails: ['app-files', 'lists-apps', 'app-card', 'reads-references'],
  },
};
