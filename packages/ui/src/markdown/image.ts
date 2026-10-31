// Markdown, the image shape (D-048 ruling 19, app-cards FE_03): what `![alt](path)` becomes. A path
// the one check (`imagePathProblem`, packages/format) passes, with alt text, is one fixed <img> under
// the board's image route, lazy and decoded off the main thread; a refused path is the box saying why
// (`imageNote`), so nothing outside the images folder, and nothing from the internet, is ever asked
// for; no alt text is the path as plain text. The page sizes and versions the image once it knows it
// (apps/board/src/board/cards/card-images.ts); the zoomed view is the image-view pattern's. An svg is
// an image like any other here, and only ever an <img> (D-064): never inline markup, so its script
// never runs; whoever renders says whether the path check allows it, and where the pictures are served.
import { IMAGE_ROUTE, IMAGE_WORDS, flagOn, imagePathProblem } from '#format';
import { esc } from './inline.ts';
import * as markdownWords from '../words/markdown.ts';

/** What the box in an image's place begins with (ruling 23): a missing file, or anything else refused. */
export const IMAGE_NOTE = { notFound: markdownWords.imageNotFound, notShown: markdownWords.imageNotShown } as const;

/** The box in an image's place: "Image not found: <path>" for a missing file, else "Image not shown:
 * <path> (<reason>)", the reason in `IMAGE_WORDS`' words (the route's problem detail, or the path
 * check's). The page draws the same box for a file the route refuses (image-view `showProblem`). */
export function imageNote(path: string, reason: string): string {
  const missing = reason === IMAGE_WORDS.missing;
  const where = path ? `: <code>${esc(path)}</code>` : '';
  return `<span class="vb-md-noimg">${missing ? IMAGE_NOTE.notFound : IMAGE_NOTE.notShown}${where}${missing ? '' : ` (${esc(reason)})`}</span>`;
}

/** The description's rendered inlines as plain text, for the alt attribute: tags dropped (an inner
 * image gives its own alt), white space as single spaces. Its text runs are already escaped. */
const plain = (html: string): string =>
  html.replace(/<img [^>]*?alt="([^"]*)"[^>]*>/g, '$1').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/** An image's markup from its destination and its description's rendered inlines (inline.ts calls it). */
export type ImageWriter = (url: string, altHtml: string) => string;

/** The writer of `![alt](path)`: `path` as the Markdown wrote it (backslash escapes undone, nothing
 * decoded), `altHtml` the description's rendered inlines. `svg` is the svgImages flag (off, an svg path
 * is refused in the words of the time before svg; default, the flag's default), and `route` where the
 * pictures are served (default `IMAGE_ROUTE`). */
export const imageMarkup = (svg = flagOn('svgImages'), route = IMAGE_ROUTE): ImageWriter => (path, altHtml) => {
  const why = imagePathProblem(path, { svg });
  if (why) return imageNote(path, why);
  const alt = plain(altHtml);
  if (!alt) return esc(path);
  return `<img class="vb-md-img" src="${esc(route + path)}" alt="${alt}" loading="lazy" decoding="async">`;
};
