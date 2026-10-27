// The panel route, `GET /app-panels/<id>` (D-047 rulings 4, 9, 13; apps.md § Panel CSP): an app's
// panel file with its own Content-Security-Policy. The `sandbox` directive gives the panel an opaque
// origin even when it is opened on its own, so it can't read the board's page, cookies or storage
// or call /api; it reaches nothing beyond itself unless the manifest's `csp` names an https origin
// (schema-checked: exact hosts, no wildcards). Only a valid id reaches the state function; a
// missing or invalid app, or app cards off, is 404, with ruling 4's policy too: a card's frame that
// asks after its folder went loads the refusal (frame-ancestors 'self'), not a blank the page's own
// policy (frame-ancestors 'none') would make, and its load tells the page to read list_apps again.
import fs from 'node:fs';
import type { ServerResponse } from 'node:http';
import type { AppCsp } from '#format';
import { APP_ID, APP_PANEL_PATH } from '#format';
import { problem } from '../problem.ts';
import type { AppHost } from './host.ts';
import { APPS_OFF } from './host.ts';

/** The panel's path, outside /api: `APP_PANEL_PATH` (the one route string, which the page's frame
 * reads too) and the id, not decoded. */
export const PANEL_PATH = new RegExp(`^${APP_PANEL_PATH}([^/]*)$`);

/** Ruling 4's policy, for a manifest with no `csp`. */
export const PANEL_CSP = panelCsp(undefined);

/** The panel's policy: ruling 4's, with the manifest's `connectDomains` as `connect-src` and its
 * `resourceDomains` added to `img-src`, `font-src` and `style-src`. */
export function panelCsp(csp: AppCsp | undefined): string {
  const connect = csp?.connectDomains ?? [];
  const resource = csp?.resourceDomains ?? [];
  const plus = (base: string) => [base, ...resource].join(' ');
  return [
    'sandbox allow-scripts', "default-src 'none'", "script-src 'unsafe-inline'", plus("style-src 'unsafe-inline'"),
    plus('img-src data:'), plus('font-src data:'), connect.length ? `connect-src ${connect.join(' ')}` : "connect-src 'none'",
    "frame-ancestors 'self'", "base-uri 'none'", "form-action 'none'",
  ].join('; ');
}

/** The route's refusals carry the panel's own policy, with no manifest's domains. */
const FRAMED = { headers: { 'Content-Security-Policy': PANEL_CSP } };

/** Answer the panel of app `raw` (the path's text, not decoded: an id needs no decoding). */
export function servePanel(res: ServerResponse, raw: string, host: AppHost): void {
  if (!host.on) throw problem('not-found', APPS_OFF, FRAMED);
  const status = APP_ID.test(raw) ? host.status(raw) : undefined;
  const folder = status?.folder;
  if (!status || status.info.state === 'missing' || status.info.state === 'invalid' || !folder?.panel || !folder.manifest) {
    throw problem('not-found', 'There is no app panel here to show. list_apps lists the apps, and what to fix in each.', FRAMED);
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': panelCsp(folder.manifest.csp), 'Cache-Control': 'no-store' });
  res.end(fs.readFileSync(folder.panel));
}
