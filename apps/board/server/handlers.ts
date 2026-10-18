// The handler table (api.md 53): one handler per operationId of the route table. The type makes
// a missing or extra entry a type error, and api-dispatch.test.ts checks the keys at run time.
import { CHAT } from './chat.ts';
import type { Handler, HandlerTable } from './dispatch.ts';
import { OPEN_FOLDER } from './open-folder.ts';
import { problem } from './problem.ts';
import { READS } from './reads.ts';
import { sendJson } from './respond.ts';
import { WRITES } from './writes.ts';

/** The app operations (D-047, api.md 152) until the app host answers them (app-cards BE_02,
 * apps/board/server/apps.ts): no app is listed, and no app is found. */
const APPS = {
  list_apps: ({ res }) => sendJson(res, 200, { apps: [] }),
  call_app_tool: ({ params }) => { throw problem('not-found', `There is no app "${String(params.app)}" in this folder's .visionboard/apps/.`); },
} satisfies Record<string, Handler>;

export const HANDLERS: HandlerTable = { ...READS, ...WRITES, ...CHAT, ...OPEN_FOLDER, ...APPS };
