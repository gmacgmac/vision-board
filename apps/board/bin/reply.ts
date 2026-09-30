// For the agent: print the person's responses as a numbered reply, plus the raw state.
// Usage: node apps/board/bin/reply.ts <session> [--json]
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { latestView, readTranscript, sessionDir } from '../server/sessions.ts';
import { reduceTranscript, replyText } from '../../../packages/actions/src/index.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const id = process.argv[2];
if (!id) {
  console.error('Usage: node apps/board/bin/reply.ts <session> [--json]');
  process.exit(2);
}
const dir = sessionDir(path.resolve(process.env.VB_SESSIONS ?? path.join(ROOT, 'sessions')), id);
const view = latestView(dir);
const state = reduceTranscript(readTranscript(dir));
if (process.argv.includes('--json')) {
  console.log(JSON.stringify({
    session: id,
    version: view.version,
    items: Object.fromEntries(state.items),
    pins: Object.fromEntries(state.pins),
    modes: Object.fromEntries(state.modes),
  }, null, 2));
} else {
  console.log(replyText(view, state));
}
