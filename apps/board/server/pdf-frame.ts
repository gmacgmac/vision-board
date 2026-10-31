// The frame's page, `GET /pdf-frame` (D-071 ruling 3, api.md 168): where the page has a stranger's PDF or
// picture read. As an app's panel (apps/panel.ts), its own Content-Security-Policy: the `sandbox` directive
// gives it an opaque origin even when it is opened on its own, and nothing in it can reach a network. Further than a
// panel: the one script is the built entry, inside the page and named by its hash, so the frame asks for no file at
// all and nothing else can run in it, and there is no `unsafe-eval`, which is what pdf.js's past flaws
// ran through. WebAssembly may compile, for the image decoders that come inside the script. No directive stops a frame's own
// WebRTC or its navigating itself, so the file is read in a worker, which can do neither (pdf-pages-worker.ts); and the
// page's `frame-src 'self'` (app.ts) would stop that navigation.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import type { ServerResponse } from 'node:http';
import path from 'node:path';
import { problem } from './problem.ts';
import * as serverChatWords from './words/server-chat.ts';

/** The frame's path, outside /api; the page's own copy is held equal by chat-attach.test.ts. */
export const PDF_FRAME_PATH = '/pdf-frame';
const ENTRY = /^pdf-frame-[\w-]+\.js$/;

/** The frame's policy, with its script's hash, or none for a refusal; the `sandbox` directive holds with or without the iframe's attribute. */
export function pdfFrameCsp(hash?: string): string {
  return [
    'sandbox allow-scripts', "default-src 'none'", hash ? `script-src 'sha256-${hash}' 'wasm-unsafe-eval'` : "script-src 'none'",
    'img-src data: blob:; worker-src blob:', 'font-src data:', "connect-src 'none'", "frame-ancestors 'self'", "base-uri 'none'", "form-action 'none'",
  ].join('; ');
}

/** A refusal keeps the frame shut too, and can be framed, so the page hears it as a load with nothing in it. */
const FRAMED = { headers: { 'Content-Security-Policy': pdfFrameCsp() } };

/** A script as an inline script's text: an HTML parser must not see an end, or a comment opening, in its strings. */
export const inlineScript = (js: string): string => js.replace(/<(?=\/script|!--|script)/gi, '\\x3C');

/** Answer the frame's page from the built entry in `dist`; none with the `readAttachment` flag off. */
export function servePdfFrame(res: ServerResponse, dist: string, on: boolean): void {
  if (!on) throw problem('not-found', serverChatWords.readingPagesIsOff, FRAMED);
  const assets = path.join(dist, 'assets');
  const entry = fs.existsSync(assets) ? fs.readdirSync(assets).find((f) => ENTRY.test(f)) : undefined;
  if (!entry) throw problem('not-found', serverChatWords.theFrameIsNotBuilt, FRAMED);
  const script = inlineScript(fs.readFileSync(path.join(assets, entry), 'utf8'));
  const hash = createHash('sha256').update(script).digest('base64');
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': pdfFrameCsp(hash), 'Cache-Control': 'no-store',
    'X-DNS-Prefetch-Control': 'off',
  });
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${serverChatWords.pagesOfAnAttachedFile}</title></head><body><script type="module">${script}</script></body></html>`);
}
