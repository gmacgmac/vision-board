// The app operations (D-047 rulings 6 and 12, api.md 152-153, 157): `list_apps` (an agent or the person)
// gives every app in its state now; `call_app_tool` (the person's panel only) runs one tool. Both go
// to the open folder's app host (host.ts). The panel's saved state, also the person's alone, is
// panel-state.ts's.
import type { Ctx, Handler } from '../dispatch.ts';
import { problem } from '../problem.ts';
import { sendJson } from '../respond.ts';
import { body } from '../body.ts';
import { APPS_OFF } from './host.ts';
import { PANEL_STATE_HANDLERS } from './panel-state.ts';

/** `call_app_tool`: the body checked, then the tool run. The call is given up (its `ctx.signal`
 * aborted) when the page goes away before the answer. */
const callAppTool: Handler = async ({ req, res, params, apps }: Ctx) => {
  const host = apps();
  if (!host.on) throw problem('not-found', APPS_OFF);
  const { tool, arguments: args = {} } = (await body('call_app_tool', req)) as { tool: string; arguments?: Record<string, unknown> };
  const gone = new AbortController();
  res.on('close', () => { if (!res.writableFinished) gone.abort(); });
  sendJson(res, 200, await host.call(String(params.app), tool, args, gone.signal));
};

export const APP_HANDLERS = {
  list_apps: ({ res, apps }) => sendJson(res, 200, { apps: apps().list() }),
  call_app_tool: callAppTool,
  ...PANEL_STATE_HANDLERS,
} satisfies Record<'list_apps' | 'call_app_tool' | keyof typeof PANEL_STATE_HANDLERS, Handler>;
