// Serves the page and the packages' TypeScript to the browser, type-stripped on the fly by
// Node itself: no bundler, no dependency. Paths are contained to two roots.
import fs from 'node:fs';
import path from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import type { ServerResponse } from 'node:http';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.ts': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const stripped = new Map<string, { mtime: number; code: string }>();

export function resolveStatic(urlPath: string, publicDir: string, packagesDir: string): string | null {
  let base = publicDir;
  let rel = urlPath === '/' ? 'index.html' : urlPath.slice(1);
  if (urlPath.startsWith('/pkg/')) {
    base = packagesDir;
    rel = urlPath.slice('/pkg/'.length);
    if (!/^[a-z][a-z0-9-]*\/(src|fixtures)\//.test(rel)) return null;
  }
  let decoded: string;
  try { decoded = decodeURIComponent(rel); } catch { return null; }
  const file = path.resolve(base, decoded);
  if (!file.startsWith(path.resolve(base) + path.sep)) return null;
  if (!TYPES[path.extname(file)]) return null;
  return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

export function sendStatic(res: ServerResponse, file: string): void {
  const ext = path.extname(file);
  let body: string | Buffer = fs.readFileSync(file);
  if (ext === '.ts') {
    const mtime = fs.statSync(file).mtimeMs;
    const hit = stripped.get(file);
    if (hit?.mtime === mtime) body = hit.code;
    else {
      const code = stripTypeScriptTypes(body.toString('utf8'), { mode: 'strip' });
      stripped.set(file, { mtime, code });
      body = code;
    }
  }
  res.writeHead(200, { 'Content-Type': TYPES[ext]!, 'Cache-Control': 'no-store' });
  res.end(body);
}
