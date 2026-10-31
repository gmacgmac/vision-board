// The one request the board makes outside the API (ARCH_06, split out of io.ts): a picture's
// version, from the host's image route (D-048, images.md § Updates; BoardHost.imageRoute). The route is
// not an API operation, and the browser loads the picture from it by address, so the question goes the
// same way, not through the host's transport.
import { IMAGE_WORDS } from '#format';

/** What the image route `route` says of `path` now: `same` when `etag` is still its version (304), else its
 * version's ETag, or why it is not shown (the problem's words, `IMAGE_WORDS`). A HEAD, so no picture
 * comes back. The route is not an API operation, so this is the page's one request for it by code; the
 * browser loads the picture itself (`<img src>`). Throws when the board can't be reached. */
export async function imageVersion(route: string, path: string, etag?: string): Promise<{ same?: true; etag?: string; problem?: string }> {
  const url = route + path;
  const head = await fetch(url, { method: 'HEAD', cache: 'no-store', ...(etag && { headers: { 'If-None-Match': etag } }) });
  await head.arrayBuffer(); // empty; read so the request ends as finished, not aborted
  if (head.status === 304) return { same: true };
  if (head.ok) return { etag: head.headers.get('ETag') ?? '' };
  const got = await fetch(url, { cache: 'no-store' }).then((r) => r.json() as Promise<{ detail?: unknown }>).catch(() => ({ detail: undefined }));
  return { problem: typeof got.detail === 'string' ? got.detail : IMAGE_WORDS.missing };
}
