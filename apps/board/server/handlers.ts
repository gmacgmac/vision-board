// The handler table (api.md 53): one handler per operationId of the route table. The type makes
// a missing or extra entry a type error, and api-dispatch.test.ts checks the keys at run time.
import { APP_HANDLERS } from './apps.ts';
import { CHAT } from './chat.ts';
import type { HandlerTable } from './dispatch.ts';
import { OPEN_FOLDER } from './open-folder.ts';
import { READS } from './reads.ts';
import { WRITES } from './writes.ts';

export const HANDLERS: HandlerTable = { ...READS, ...WRITES, ...CHAT, ...OPEN_FOLDER, ...APP_HANDLERS };
