// The one request the board makes outside the API (ARCH_06, split out of io.ts): a picture's
// version, from the page's own image route (D-048, images.md § Updates). The route is not an API
// operation, so no call goes through the host's transport; a host serves the pictures at the same
// path (ARCH_03 REQUESTS).
import { IMAGE_ROUTE, IMAGE_WORDS } from '#format';

/** What the image route says of `path` now: `same` when `etag` is still its version (304), else its
 * version's ETag, or why it is not shown (the problem's words, `IMAGE_WORDS`). A HEAD, so no picture
 * comes back. The route is not an API operation, so this is the page's one request for it by code; the
 * browser loads the picture itself (`<img src>`). Throws when the board can't be reached. */
export async function imageVersion(path: string, etag?: string): Promise<{ same?: true; etag?: string; problem?: string }> {
  const url = IMAGE_ROUTE + path;
  const head = await fetch(url, { method: 'HEAD', cache: 'no-store', ...(etag && { headers: { 'If-None-Match': etag } }) });
  await head.arrayBuffer(); // empty; read so the request ends as finished, not aborted
  if (head.status === 304) return { same: true };
  if (head.ok) return { etag: head.headers.get('ETag') ?? '' };
  const got = await fetch(url, { cache: 'no-store' }).then((r) => r.json() as Promise<{ detail?: unknown }>).catch(() => ({ detail: undefined }));
  return { problem: typeof got.detail === 'string' ? got.detail : IMAGE_WORDS.missing };
}
