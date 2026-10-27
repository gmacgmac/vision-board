---
category: project-docs
type: specification
status: active
created: 2026-10-18
updated: 2026-10-27
scope: Images in cards — the images folder, path rules, types and limits, svg as a picture, the route and its headers, updates by ETag
---

# Images in cards

A card can show a picture: a screenshot, a diagram, a mock-up. The agent saves the file in the
project's `.visionboard/images/` and writes `![alt text](path)` in the card's Markdown; the board
serves the file and draws it in the card (D-048; svg too, D-064). This page is the contract for the files and the
route. Raw HTML is still never rendered (D-023), and no image comes from the internet (steering
rule 18).

Its sources: the table and the path check in `packages/format/src/images.ts` (`IMAGE_LIMITS`,
`IMAGE_WORDS`, `imagePathProblem`, `imageTypeOf`, `imageTypeByName`, `svgProblem`,
`imageHeadProblem`, `imageCap`), which the route and the Markdown renderer both call, and the route
in `apps/board/server/images.ts` (`serveImage`, `SVG_CSP`).

## The folder

Images live in `.visionboard/images/` in the open project, in subfolders if the agent likes
(`diagrams/flow/v2.png`). The agent owns the folder and its files; the board only reads them. A
path in `![alt](path)` is relative to that folder. Overwrite a file to update its picture (§ Updates).

The images folder may itself be a link to another folder. A file or folder inside it that links out
of it is refused, so nothing outside the images folder is ever read.

## Paths

`imagePathProblem(path)` is the one check of a path as the Markdown writes it, not decoded. A path
passes only when it is a plain relative path:

- every name is letters, digits, `-`, `_` and `.`, and does not start with a dot, so `..`, hidden
  names, `%` codes, spaces, `\` and a scheme (`http:`, `javascript:`, `data:`) are all refused;
- it does not start with `/`, and has no empty name between slashes;
- it goes down at most `depth` folders (§ Limits), and each name is at most `nameChars` long;
- its file name ends in the extension of an allowed type (§ Types), in any case; svg only with the
  `svgImages` flag on (`imagePathProblem(path, { svg })`). Off, an svg and every other type not
  allowed get the words of the time before svg (`typeNoSvg`).

The route decodes the request path once and then makes the same check, so `%2e%2e%2f` is `../` and
is refused, and `%252e` is `%2e`, which is refused for its `%`. A path that passes is joined to the
images folder and its real path must still be inside the real images folder.

## Types

A file is shown only when its extension names an allowed type and its first bytes are that type's
(`imageTypeOf`), or, for svg, which has no such bytes, its opening passes `svgProblem` (§ SVG).
`imageHeadProblem` makes whichever check the type needs.

| Type | Extensions | Content type | Starts with |
|---|---|---|---|
| `png` | `png` | `image/png` | the PNG signature |
| `jpeg` | `jpg`, `jpeg` | `image/jpeg` | `FF D8 FF` |
| `webp` | `webp` | `image/webp` | `RIFF`, then four bytes, then `WEBP` |
| `gif` | `gif` | `image/gif` | `GIF87a` or `GIF89a` |
| `svg` | `svg` | `image/svg+xml` | an `<svg>` root in the SVG namespace that says its size (§ SVG) |

## SVG

An svg is a picture, never a page (D-064, amending D-048; behind the `svgImages` flag). D-048 left
it out because it can carry script; that is true only of an svg opened as a document. What holds:

| Property | Where | Proven by |
|---|---|---|
| The page draws an svg only as an `<img>`, the one image shape, in the card and in the zoomed view; never inline. In an `<img>` the browser runs none of its script and loads nothing it names (W3C SVG Integration, secure animated mode), while its CSS and SMIL animation play. | `packages/ui/src/markdown/image.ts` `imageMarkup`; `packages/ui/src/image-view/vb-image-view.ts` | `tests/pages/card-image-svg.spec.ts` ("an svg holding a script is drawn and the script never runs…", "an svg naming outside files…"); `card-image-svg-motion.spec.ts` ("…CSS animation and its SMIL animation play…") |
| Opened at its own address (a new tab, a link), it is served with `SVG_CSP` in place of the board's policy: `default-src 'none'`, its own inline styles and `data:` pictures and fonts only, `frame-ancestors 'none'`, `base-uri 'none'`, and `sandbox`, so it runs no script and has an opaque origin. Every directive is the board's or stricter but for inline style, which reaches nothing. A 304 carries it too, so a cached copy keeps it. | `apps/board/server/images.ts` `SVG_CSP`, `serveImage` | `apps/board/tests/images-svg-route.test.ts` ("an svg is served…", "SVG_CSP allows no script…", "a matching If-None-Match gets 304…"); `card-image-svg.spec.ts` (the script test, "opened at its own address") |
| An svg is known by its opening, within its first `svgHeadBytes`: after an optional BOM, white space, the XML declaration, comments and a doctype, an `<svg` root whose `xmlns` is the SVG namespace. HTML named `.svg`, text and an empty file are "not a real svg". | `packages/format/src/images.ts` `svgProblem` | `packages/format/tests/images-svg.test.ts` ("svgProblem: …") |
| It says its size: a `viewBox` whose width and height are above 0, or a `width` and a `height` that are positive lengths (not percentages). One with neither is refused, so the browser never falls back to its 300 by 150 box. With only a `viewBox`, the browser draws it inside that box at the viewBox's shape (300 by 100 for 3 to 1), up to the card's width. | `svgProblem`; the card's sizes are any image's (`apps/board/src/board/cards/card-images.ts`) | `images-svg.test.ts`; `card-image-svg.spec.ts` ("an svg sized by its width and height…", "an svg sized by its viewBox alone…") |
| A doctype that declares entities (`<!ENTITY`) is refused: a picture never needs one, and expanding them costs the browser. | `svgProblem` | `images-svg.test.ts`, `images-svg-route.test.ts` |
| Its cap is `svgMaxBytes`, smaller than other types': it is text the browser parses whole. | `imageCap` | `images-svg-route.test.ts` ("an svg over its own cap…") |
| Script inside it is not looked for, so an svg holding one is drawn without it. The `<img>` and the policy are the boundary, not a text search, which a namespace prefix or a handler attribute would get past. An svg that needs script is an app card (D-047); the agent's skill says so. | — | the script test above |
| Motion: a person who asks the system for less motion sees CSS animation written inside `@media (prefers-reduced-motion: no-preference)` hold still; the browser's own setting reaches into an svg image (Playwright's emulated media does not). SMIL ignores the setting, so the skill keeps it short. | the browser | `card-image-svg-motion.spec.ts` ("for a person who asked for less motion…") |
| Off (`svgImages`), the page's Markdown and the route each refuse an svg as before svg, with `typeNoSvg`. The page's flag reaches the renderer through `setMarkdownSvg`; the server's through `serveImage`'s `flags`. | `image.ts` `setMarkdownSvg`; `serveImage` | `images-svg.test.ts`, `images-svg-route.test.ts` ("with the svgImages flag off…"), `card-image-svg-motion.spec.ts` ("the svgImages flag off") |

Not covered: WebKit and Firefox. The page suite runs Chromium only, so the motion and natural-size
behaviour above is Chromium's.

## Limits

One table, `IMAGE_LIMITS`, which the route and the renderer both read:

| Limit | Value | What it means |
|---|---|---|
| `maxBytes` | 8388608 | The most one file may hold, in bytes. More is refused. |
| `svgMaxBytes` | 1048576 | The most one svg may hold, in bytes. More is refused. |
| `svgHeadBytes` | 4096 | How far into an svg its opening must end (§ SVG). |
| `depth` | 8 | The most folders a path may go down from the images folder. |
| `nameChars` | 100 | The most characters one name (a folder or the file) may have. |

## Reasons

When an image is not shown, the words are short and plain. They are `IMAGE_WORDS` (and
`imageNotReal`), used by the route's problems and by the page, so the two say the same thing.

| Reason | When |
|---|---|
| `no file name` | The path is empty or ends in `/`. |
| `must be inside the images folder` | Another scheme (`data:`, `file:`, `javascript:`), a leading `/` or `\`, a `..` name, or a link out of the folder. |
| `no images from the internet` | An internet address: `http:`, `https:` or `//` at the start. |
| `use / between folders` | A `\` anywhere else. |
| `names can't start with a dot` | A name that starts with `.`: hidden names, `.` and `...`. |
| `empty folder name` | Two slashes in a row. |
| `only letters, digits, - _ and .` | Any other character in a name, or a bad `%` code in the request. |
| `names are 100 characters at most` | A name over `nameChars`. |
| `more than 8 folders` | A path deeper than `depth`. |
| `only png, jpeg, webp, gif or svg` | Any other extension, or none. |
| `only png, jpeg, webp or gif` | The same, with the `svgImages` flag off: svg too. |
| `not found` | No such file. |
| `over 8 MB` | A file over `maxBytes`. |
| `over 1 MB` | An svg over `svgMaxBytes`. |
| `needs a viewBox, or a width and height` | An svg that says no size (§ SVG). |
| `an svg can't declare entities` | An svg whose doctype declares entities. |
| `not a real <type>` | The first bytes are not the type the extension says; for svg, it does not open as one. |

## The route

`GET /board-images/<path>` (`IMAGE_ROUTE`), and `HEAD`, outside `/api`: `serveImage` in
`apps/board/server/images.ts`, called from `app.ts` before the page's own files. It is not an API
operation (api.md, Images in cards). The Host check applies as on every request. No cookie is needed
and none is set. Any other method is 405 with `Allow: GET, HEAD`; the route never writes.

For each request it decodes the path once, holds it to `imagePathProblem`, finds the real path
inside the real images folder, opens the file once, and reads everything after from that open file:
its size, then its first bytes, which must be the type the extension names (`imageHeadProblem`),
then the body. Only then does it answer, so a refused file never gets a 304.

### Headers

| Header | Value |
|---|---|
| `Content-Type` | The type's content type (§ Types), from the extension that the bytes confirmed. |
| `Content-Length` | The file's size. |
| `ETag` | The file's size and modified time, as `"<size>-<time>"` in hex. |
| `Cache-Control` | `no-cache`: the page may keep the picture but must ask before using it. |
| `X-Content-Type-Options` | `nosniff`, set by the server on every response. |
| `Content-Security-Policy` | For svg, `SVG_CSP` (§ SVG), on 200 and 304; every other answer keeps the board's own. |

### Answers

| Status | Problem | When |
|---|---|---|
| 200 | | The image; no body for `HEAD`. |
| 304 | | `If-None-Match` names the current `ETag` (strong or weak, one of a list, or `*`); no body. |
| 403 | forbidden | The Host is not this server's. |
| 404 | not-found | A refused path, a missing file or folder, or a link out of the images folder. |
| 405 | method-not-allowed | Any method but `GET` and `HEAD`. |
| 413 | too-large | The file is over its type's cap (`maxBytes`, or `svgMaxBytes` for svg). |
| 415 | unsupported-media-type | The extension is not an allowed type, the bytes are not the type the extension says, or an svg's opening is refused (§ SVG). |

Every refusal is a problem document (api.md 38-40) whose `detail` is one of the words in § Reasons.

## Updates

The agent updates a picture by overwriting the file. The `ETag` comes from the file's size and
modified time, so a changed file has a new one: a request with the old `ETag` gets the new picture
(200), and one with the current `ETag` gets 304 and no body. The page asks this way, with a HEAD, when a
card that holds images is selected and when an image is opened, and not on a timer; it loads each
picture at the version the route named (`?v=`, which the route ignores), so it always knows the version
it shows (components.md § Images in cards).

## The zoomed view

Clicking an image opens it larger over the board. That is a pattern of the page (the image view);
its sizes, motion and states are described in [components.md](./components.md), not here, and
nothing on this page depends on it.

## Kept true by

- The tables on this page (§ Types, § Limits, § Reasons, § Answers' statuses) are read from this file by
  `apps/board/tests/images.test.ts` and compared with `IMAGE_LIMITS`, `IMAGE_WORDS`, `imageNotReal`
  and the server's `PROBLEMS`.
- The path check, the type by name and by bytes, and that `images.ts` is pure string logic with no
  Node or DOM name: `apps/board/tests/images.test.ts` ("imagePathProblem: …", "imageTypeByName: …",
  "imageTypeOf: …", "images.ts is pure string logic: …").
- The route, through the real server on a temp project, with valid pictures just outside the images
  folder as decoys: `apps/board/tests/images-route.test.ts` (every type with its headers; the depth
  limit; `HEAD`; 304 and the ETag after an overwrite; fakes, an svg under another name: 415; the size
  limit: 413; 404s; path tricks; links out and links in; a linked images folder; the Host check; other
  methods; the folder that is open now), and for svg `apps/board/tests/images-svg-route.test.ts` (its
  headers and `SVG_CSP`, its 304, its refusals, its cap, the flag off) and
  `packages/format/tests/images-svg.test.ts` (the table, the flag, the path check with svg on and off,
  `svgProblem`, `imageHeadProblem`).
- The Markdown renderer's `<img>`, and a refused path as text that is never asked for:
  `packages/ui/tests/markdown-images.test.ts`, `markdown-safety.test.ts` ("an image cannot break out of
  its shape…") and `markdown-adversarial.ts` `IMG_SHAPE`.
- The page's side, through a real board on a temp project: `tests/pages/card-images.spec.ts` ("a replaced
  image shows after its card is selected again: a conditional request with its ETag, …, and no request on
  a timer", "opening an image asks for a newer version too, …") and `tests/pages/card-image-states.spec.ts`
  (a missing file, a fake png and one over 8 MB say the route's words in the card; a path out of the folder
  and an internet address are never asked for), `tests/pages/card-image-svg.spec.ts` and
  `card-image-svg-motion.spec.ts` (§ SVG). The zoomed view: components.md § Image view.
