// Serves the built page (apps/board/dist, from `npm run build`). Paths are contained to that
// one root, and only known file types are served.
import fs from 'node:fs';
import path from 'node:path';
import type { ServerResponse } from 'node:http';

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

export function resolveStatic(urlPath: string, root: string): string | null {
  const rel = urlPath === '/' ? 'index.html' : urlPath.slice(1);
  let decoded: string;
  try { decoded = decodeURIComponent(rel); } catch { return null; }
  const file = path.resolve(root, decoded);
  if (!file.startsWith(path.resolve(root) + path.sep)) return null;
  if (!TYPES[path.extname(file)]) return null;
  return fs.existsSync(file) && fs.statSync(file).isFile() ? file : null;
}

export function sendStatic(res: ServerResponse, file: string): void {
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)]!, 'Cache-Control': 'no-store' });
  res.end(fs.readFileSync(file));
}
