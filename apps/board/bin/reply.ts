// For the agent: print the person's responses on one board as a numbered reply, or with --json
// the board's state. Reads the project ledger through the ledger store. Stays until U4's `vb check`.
// Usage: node apps/board/bin/reply.ts <board> [--json]   (VB_PROJECT = project folder, default repo root)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardView } from '../../../packages/format/src/index.ts';
import { boardState, replyText } from '../../../packages/actions/src/index.ts';
import { ledgerPath, openLedger } from '../server/ledger.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const id = process.argv[2];
if (!id || id.startsWith('-')) {
  console.error('Usage: node apps/board/bin/reply.ts <board> [--json]');
  process.exit(2);
}
const s = openLedger(ledgerPath(process.env.VB_PROJECT ?? ROOT)).state();
if (!s.boards.has(id)) {
  console.error(`No board "${id}" in the project ledger.`);
  process.exit(2);
}
const view = boardView(s, id);
const state = boardState(s, id);
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({
    board: id,
    seq: s.seq,
    items: Object.fromEntries(state.items),
    pins: Object.fromEntries(state.pins),
    modes: Object.fromEntries(state.modes),
  }, null, 2));
} else {
  console.log(replyText(view, state));
}
