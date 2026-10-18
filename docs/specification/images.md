---
category: project-docs
type: specification
status: active
created: 2026-10-18
updated: 2026-10-18
scope: Images in cards — the images folder, path rules, types and limits, the route and its headers, updates by ETag
---

# Images in cards

A card can show a picture: a screenshot, a diagram, a mock-up. The agent saves the file in the
project's `.visionboard/images/` and writes `![alt text](path)` in the card's Markdown; the board
serves the file and draws it in the card (D-048). This page is the contract for the files and the
route. Raw HTML is still never rendered (D-023), and no image comes from the internet (steering
rule 18).

Its sources: the table and the path check in `packages/format/src/images.ts` (`IMAGE_LIMITS`,
`IMAGE_WORDS`, `imagePathProblem`, `imageTypeOf`, `imageTypeByName`), which the route and the
Markdown renderer both call, and the route in `apps/board/server/images.ts` (`serveImage`).

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
- its file name ends in the extension of an allowed type (§ Types), in any case.

The route decodes the request path once and then makes the same check, so `%2e%2e%2f` is `../` and
is refused, and `%252e` is `%2e`, which is refused for its `%`. A path that passes is joined to the
images folder and its real path must still be inside the real images folder.

## Types

A file is shown only when its extension names an allowed type and its first bytes are that type's
(`imageTypeOf`). svg is not allowed, because it can carry script.

| Type | Extensions | Content type | Starts with |
|---|---|---|---|
| `png` | `png` | `image/png` | the PNG signature |
| `jpeg` | `jpg`, `jpeg` | `image/jpeg` | `FF D8 FF` |
| `webp` | `webp` | `image/webp` | `RIFF`, then four bytes, then `WEBP` |
| `gif` | `gif` | `image/gif` | `GIF87a` or `GIF89a` |

## Limits

One table, `IMAGE_LIMITS`, which the route and the renderer both read:

| Limit | Value | What it means |
|---|---|---|
| `maxBytes` | 8388608 | The most one file may hold, in bytes. More is refused. |
| `depth` | 8 | The most folders a path may go down from the images folder. |
| `nameChars` | 100 | The most characters one name (a folder or the file) may have. |

## Reasons

When an image is not shown, the words are short and plain. They are `IMAGE_WORDS` (and
`imageNotReal`), used by the route's problems and by the page, so the two say the same thing.

| Reason | When |
|---|---|
| `no file name` | The path is empty or ends in `/`. |
| `must be inside the images folder` | A scheme, a leading `/` or `\`, a `..` name, or a link out of the folder. |
| `use / between folders` | A `\` anywhere else. |
| `names can't start with a dot` | A name that starts with `.`: hidden names, `.` and `...`. |
| `empty folder name` | Two slashes in a row. |
| `only letters, digits, - _ and .` | Any other character in a name, or a bad `%` code in the request. |
| `names are 100 characters at most` | A name over `nameChars`. |
| `more than 8 folders` | A path deeper than `depth`. |
| `only png, jpeg, webp or gif` | Any other extension, or none. |
| `not found` | No such file. |
| `over 8 MB` | A file over `maxBytes`. |
| `not a real <type>` | The first bytes are not the type the extension says. |

## The route

`GET /board-images/<path>` (`IMAGE_ROUTE`), and `HEAD`, outside `/api`: `serveImage` in
`apps/board/server/images.ts`, called from `app.ts` before the page's own files. It is not an API
operation (api.md, Images in cards). The Host check applies as on every request. No cookie is needed
and none is set. Any other method is 405 with `Allow: GET, HEAD`; the route never writes.

For each request it decodes the path once, holds it to `imagePathProblem`, finds the real path
inside the real images folder, opens the file once, and reads everything after from that open file:
its size, then its first bytes, which must be the type the extension names, then the body. Only
then does it answer, so a refused file never gets a 304.

### Headers

| Header | Value |
|---|---|
| `Content-Type` | The type's content type (§ Types), from the extension that the bytes confirmed. |
| `Content-Length` | The file's size. |
| `ETag` | The file's size and modified time, as `"<size>-<time>"` in hex. |
| `Cache-Control` | `no-cache`: the page may keep the picture but must ask before using it. |
| `X-Content-Type-Options` | `nosniff`, set by the server on every response. |

### Answers

| Status | Problem | When |
|---|---|---|
| 200 | | The image; no body for `HEAD`. |
| 304 | | `If-None-Match` names the current `ETag` (strong or weak, one of a list, or `*`); no body. |
| 403 | forbidden | The Host is not this server's. |
| 404 | not-found | A refused path, a missing file or folder, or a link out of the images folder. |
| 405 | method-not-allowed | Any method but `GET` and `HEAD`. |
| 413 | too-large | The file is over `maxBytes`. |
| 415 | unsupported-media-type | The extension is not an allowed type, or the bytes are not the type the extension says. |

Every refusal is a problem document (api.md 38-40) whose `detail` is one of the words in § Reasons.

## Updates

The agent updates a picture by overwriting the file. The `ETag` comes from the file's size and
modified time, so a changed file has a new one: a request with the old `ETag` gets the new picture
(200), and one with the current `ETag` gets 304 and no body. The page asks this way when a card that
holds images is selected and when an image is opened, and not on a timer.

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
  limit; `HEAD`; 304 and the ETag after an overwrite; svg and fakes: 415; the size limit: 413; 404s;
  path tricks; links out and links in; a linked images folder; the Host check; other methods; the
  folder that is open now).
- Not covered here: the Markdown renderer's `<img>`, the zoomed view and the check on select and open
  are built and tested by app-cards FE_03, which updates this page and components.md if what it builds
  differs.
