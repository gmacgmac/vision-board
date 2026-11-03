// An app card's saved panel state (D-050; apps.md § Saving the panel's state; api.md 157):
// the server's one reader and writer of the ledger folder's app state (`ledgerFiles(dir).appState`). The page saves a card's value
// (`put_panel_state`) and reads it back when the panel starts (`get_panel_state`), naming the card by
// its number on the board; here that becomes the card's identity (edge.ts `cardOn`), the only name
// its file takes, so no text from a request reaches a path. A value is checked against the schema
// and the size limit, then written whole (atomic-file.ts); a file is checked again when read, and
// one that doesn't fit, is too big, or was saved for another app reads as nothing saved. Person only
// (openapi.json `personCookie`): no agent read opens these files. A removed card keeps its file.
// A value can hold anything private, so the folder is named in the board's own `.gitignore` before the first is written.
import fs from 'node:fs';
import path from 'node:path';
import { appOf } from '#actions';
import type { AppStateFile, AppStateValue } from '#format';
import { APP_LIMITS, APP_STATE_DIR, APP_STATE_FORMAT, appStateBytes, appStateProblem, ledgerFiles } from '#format';
import { ignoreInGit } from '../agents.ts';
import { writeFileAtomic } from '../atomic-file.ts';
import type { Ctx, Handler } from '../dispatch.ts';
import { cardOn } from '../edge.ts';
import { isUnder } from '../folders.ts';
import { problem } from '../problem.ts';
import { sendJson } from '../respond.ts';
import { SCHEMA_BASE, schemaProblems } from '../schema.ts';
import { personBoard } from '../visibility.ts';
import { body } from '../body.ts';
import { APPS_OFF } from './host.ts';
import * as appsHostWords from '../words/apps-host.ts';

/** The one source of a kept file's shape, and of the route's bodies (`$defs`). */
export const PANEL_STATE_SCHEMA = `${SCHEMA_BASE}schema/app/panel-state.schema.json`;
/** A body, or a kept file, wraps the value and may be spaced out: room for twice the value's limit. */
const WRAPPED_LIMIT = 2 * APP_LIMITS.stateBytes;

/** The card the route names, and the app it names now. */
interface AppCard { id: number; app: string }

/** App card `n` on the path's board: `not-found` when app cards are off, for an unknown board or
 * card, a removed card, and a card that isn't an app card. */
function appCard({ ledger, params, apps }: Ctx): AppCard {
  if (!apps().on) throw problem('not-found', APPS_OFF);
  const s = ledger.state();
  const board = personBoard(s, params.board);
  const n = Number(params.n);
  const id = cardOn(s, board, n);
  if (id === undefined) throw problem('not-found', appsHostWords.thereIsNoCardOn(n, board));
  if (s.nodes.get(id)?.retired !== undefined) throw problem('not-found', appsHostWords.cardOnBoardIsRemoved(n, board));
  const app = appOf(s, id);
  if (app === undefined) throw problem('not-found', appsHostWords.cardOnBoardIsNot(n, board));
  return { id, app };
}

/** Card `id`'s file. The folder must be a real folder inside the ledger's folder (a link out
 * is refused); `make` creates it. Undefined when it isn't there, or leads out. */
function stateFile(ledgerFile: string, id: number, make: boolean): string | undefined {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error(`panel state: card identity ${id} is not a positive integer`);
  const data = path.dirname(ledgerFile);
  const dir = ledgerFiles(data).appState;
  if (make) {
    fs.mkdirSync(dir, { recursive: true });
    ignoreInGit(data, `${APP_STATE_DIR}/`);
  }
  let inside: boolean;
  try { inside = isUnder(fs.realpathSync(data), fs.realpathSync(dir)) && fs.lstatSync(dir).isDirectory(); } catch { return undefined; }
  if (inside) return path.join(dir, `${id}.json`);
  if (make) throw new Error(`panel state: ${dir} leads out of the project's data folder`);
  return undefined;
}

/** Why a kept file is read as nothing saved, on the server's log. */
function unreadable(file: string, why: string): undefined {
  console.error(`panel state: ${file} ${why}; it reads as nothing saved`);
  return undefined;
}

/** The value kept in `file` for `app`; undefined when there is none, it doesn't fit, or another app saved it. */
export function readPanelState(file: string, app: string): AppStateValue | undefined {
  let fd: number;
  try { fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW); } catch { return undefined; }
  try {
    const stat = fs.fstatSync(fd);
    if (!stat.isFile() || stat.size > WRAPPED_LIMIT) return unreadable(file, appsHostWords.isNotAFileOf);
    let doc: AppStateFile;
    try { doc = JSON.parse(fs.readFileSync(fd, 'utf8')) as AppStateFile; } catch { return unreadable(file, appsHostWords.isNotJSON); }
    if (schemaProblems(PANEL_STATE_SCHEMA, doc).length > 0 || appStateProblem(doc.state)) return unreadable(file, appsHostWords.doesNotFitTheSchema);
    return doc.app === app ? doc.state : undefined;
  } finally { fs.closeSync(fd); }
}

/** `get_panel_state`: the card's saved value, or `{}`. */
const getPanelState: Handler = (ctx) => {
  const card = appCard(ctx);
  const file = stateFile(ctx.ledger.file, card.id, false);
  const state = file === undefined ? undefined : readPanelState(file, card.app);
  sendJson(ctx.res, 200, state === undefined ? {} : { state });
};

/** `put_panel_state`: the value checked (schema, then size: `too-large`), kept whole for the card
 * and the app it names now, in place of the one before. */
const putPanelState: Handler = async (ctx) => {
  const card = appCard(ctx);
  const { state } = (await body('put_panel_state', ctx.req, WRAPPED_LIMIT)) as { state: AppStateValue };
  const why = appStateProblem(state);
  if (why) throw problem('too-large', why);
  const doc: AppStateFile = { v: APP_STATE_FORMAT, app: card.app, state };
  const wrong = schemaProblems(PANEL_STATE_SCHEMA, doc);
  if (wrong.length > 0) throw new Error(`panel state: the file for card ${card.id} would not fit its schema: ${wrong[0]!.detail}`);
  writeFileAtomic(stateFile(ctx.ledger.file, card.id, true)!, `${JSON.stringify(doc)}\n`);
  sendJson(ctx.res, 200, { bytes: appStateBytes(state) });
};

export const PANEL_STATE_HANDLERS = {
  get_panel_state: getPanelState, put_panel_state: putPanelState,
} satisfies Record<'get_panel_state' | 'put_panel_state', Handler>;
