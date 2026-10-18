// Test support for the image route (app-cards BE_03, D-048): four tiny real images (each decodes),
// writing a file into a temp project's `.visionboard/images/`, and a raw request that returns the
// body as bytes and sends the path exactly as written (fetch would resolve `..` and `%2e%2e`).
// Only a temp project is ever written.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

const b64 = (s: string) => Buffer.from(s, 'base64');

/** A 1x1 image of each type; the jpeg is the smallest one macOS's `sips` wrote. */
export const IMAGES = {
  png: b64('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='),
  gif: b64('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'),
  webp: b64('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA=='),
  jpeg: b64('/9j/4AAQSkZJRgABAQAASABIAAD/4QBMRXhpZgAATU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAAaADAAQAAAABAAAAAQAAAAD/7QA4UGhvdG9zaG9wIDMuMAA4QklNBAQAAAAAAAA4QklNBCUAAAAAABDUHYzZjwCyBOmACZjs+EJ+/8AAEQgAAQABAwEiAAIRAQMRAf/EAB8AAAEFAQEBAQEBAAAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/EAB8BAAMBAQEBAQEBAQEAAAAAAAABAgMEBQYHCAkKC//EALURAAIBAgQEAwQHBQQEAAECdwABAgMRBAUhMQYSQVEHYXETIjKBCBRCkaGxwQkjM1LwFWJy0QoWJDThJfEXGBkaJicoKSo1Njc4OTpDREVGR0hJSlNUVVZXWFlaY2RlZmdoaWpzdHV2d3h5eoKDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uLj5OXm5+jp6vLz9PX29/j5+v/bAEMAAgICAgICAwICAwUDAwMFBgUFBQUGCAYGBgYGCAoICAgICAgKCgoKCgoKCgwMDAwMDA4ODg4ODw8PDw8PDw8PD//bAEMBAgICBAQEBwQEBxALCQsQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEP/dAAQAAf/aAAwDAQACEQMRAD8A+mKKKK/Kz/QA/9k='),
} as const;

/** An svg picture: the board refuses it, whatever its name. */
export const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><script>alert(1)</script></svg>');

/** The project's images folder. */
export const imagesDir = (project: string): string => path.join(project, '.visionboard', 'images');

/** Write `data` as `rel` in the project's images folder (folders made); returns the file's path. */
export function put(project: string, rel: string, data: Buffer | string): string {
  const file = path.join(imagesDir(project), rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, data);
  return file;
}

export interface Got { status: number; headers: http.IncomingHttpHeaders; body: Buffer }

/** A request for the raw path `rawPath`, sent as written; the body comes back as bytes. `host`
 * overrides the Host header (a request for another site). */
export function get(base: string, rawPath: string, { method = 'GET', headers = {}, host }: { method?: string; headers?: Record<string, string>; host?: string } = {}): Promise<Got> {
  const { hostname, port } = new URL(base);
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname, port, path: rawPath, method, headers: { Host: host ?? `127.0.0.1:${port}`, ...headers } }, (res) => {
      const parts: Buffer[] = [];
      res.on('data', (c: Buffer) => parts.push(c));
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(parts) }));
    });
    req.on('error', reject);
    req.end();
  });
}

/** The problem an error answer holds: its code (the `type`'s last part) and its detail. */
export const problemOf = (got: Got): { code: string; detail: string } => {
  const p = JSON.parse(got.body.toString('utf8')) as { type: string; detail: string };
  return { code: p.type.slice(p.type.lastIndexOf('/') + 1), detail: p.detail };
};
