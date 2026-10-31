// What passes between the page and the frame that reads a stranger's file (D-071 ruling 3), and the check of what
// comes back. The frame has no origin and no network; even so, what it hands over is what a hostile file may have
// written, so nothing is believed until `checkedAnswer` has read it: the shape, the page that was asked for, the
// size, and that the bytes are the picture they say they are. Pure, with no DOM. The frame's own code
// imports only the types, so it shares no chunk with the board.
import { PICTURE_BYTES } from '#format';

/** At most this many pages become pictures (D-071; the schema's `of.page` holds the server to the same). */
export const PAGES_MAX = 30;
/** A picture's limits: over either, it gets a fitted copy, and no copy is over them (D-071; the bytes, `#format`). */
export { PICTURE_BYTES };
export const PICTURE_EDGE = 2000;
/** The frame's path, held equal to the server's by chat-attach.test.ts. */
export const PDF_FRAME_PATH = '/pdf-frame';

export interface FrameLimits { bytes: number; edge: number }
const LIMITS: FrameLimits = { bytes: PICTURE_BYTES, edge: PICTURE_EDGE };

/** What the page asks of the frame. */
export type FrameAsk =
  | { kind: 'open'; bytes: ArrayBuffer; limits: FrameLimits }
  | { kind: 'page'; page: number }
  | { kind: 'fit'; bytes: ArrayBuffer; type: string; limits: FrameLimits };

/** Why a file could not be read: no words from the file itself ever come back. */
export type FrameRefusal = 'password' | 'damaged';
export type PictureKind = 'png' | 'jpeg';

/** What the frame answers. */
export type FrameAnswer =
  | { kind: 'ready' }
  | { kind: 'opened'; pages: number }
  | { kind: 'refused'; why: FrameRefusal }
  | { kind: 'page'; page: number; png: ArrayBuffer; blank?: true }
  | { kind: 'no-page'; page: number }
  | { kind: 'fits' }
  | { kind: 'fitted'; bytes: ArrayBuffer; picture: PictureKind };

/** What the page is waiting for: only that answer is taken. */
export type Awaiting = { for: 'ready' } | { for: 'opened' } | { for: 'page'; page: number } | { for: 'fit' };

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
const IEND = [0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82];
const IHDR_AT = 16;
const PAGES_MOST = 1_000_000;

const startsAt = (bytes: Uint8Array, at: number, want: number[]) => want.every((b, i) => bytes[at + i] === b);
const wholeCount = (n: unknown, most: number): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= most;

/** A PNG's size, read from its header; undefined when it is no whole PNG. */
export function pngSize(bytes: Uint8Array): { w: number; h: number } | undefined {
  if (bytes.length < IHDR_AT + 8 + IEND.length || !startsAt(bytes, 0, PNG) || !startsAt(bytes, bytes.length - IEND.length, IEND)) return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { w: view.getUint32(IHDR_AT), h: view.getUint32(IHDR_AT + 4) };
}

/** A JPEG's size, from its first frame header (the SOF markers: C0 to CF but DHT C4, JPG C8 and DAC CC); undefined when none is found. */
export function jpegSize(bytes: Uint8Array): { w: number; h: number } | undefined {
  if (!startsAt(bytes, 0, JPEG)) return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let at = 2; at + 9 <= bytes.length;) {
    if (bytes[at] !== 0xff) return undefined;
    const marker = bytes[at + 1]!;
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) return { w: view.getUint16(at + 7), h: view.getUint16(at + 5) };
    at += 2 + view.getUint16(at + 2);
  }
  return undefined;
}

const within = (size: { w: number; h: number } | undefined, limits: FrameLimits) =>
  size !== undefined && size.w >= 1 && size.h >= 1 && size.w <= limits.edge && size.h <= limits.edge;

/** Whether `png` is a whole PNG within the limits. */
const goodPng = (png: unknown, limits: FrameLimits): png is ArrayBuffer =>
  png instanceof ArrayBuffer && png.byteLength <= limits.bytes && within(pngSize(new Uint8Array(png)), limits);

const goodPicture = (bytes: unknown, picture: unknown, limits: FrameLimits): boolean => {
  if (!(bytes instanceof ArrayBuffer) || bytes.byteLength > limits.bytes) return false;
  if (picture === 'png') return goodPng(bytes, limits);
  return picture === 'jpeg' && within(jpegSize(new Uint8Array(bytes)), limits);
};

/** The frame's message `data` as the answer the page is `waiting` for; undefined, and so dropped, for anything else. */
export function checkedAnswer(data: unknown, waiting: Awaiting, limits: FrameLimits = LIMITS): FrameAnswer | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  const m = data as Record<string, unknown>;
  if (waiting.for !== 'ready' && m.kind === 'refused') return m.why === 'password' || m.why === 'damaged' ? { kind: 'refused', why: m.why } : undefined;
  switch (waiting.for) {
    case 'ready': return m.kind === 'ready' ? { kind: 'ready' } : undefined;
    case 'opened': return m.kind === 'opened' && wholeCount(m.pages, PAGES_MOST) ? { kind: 'opened', pages: m.pages } : undefined;
    case 'page':
      if (m.page !== waiting.page) return undefined;
      if (m.kind === 'no-page') return { kind: 'no-page', page: waiting.page };
      return m.kind === 'page' && goodPng(m.png, limits) ? { kind: 'page', page: waiting.page, png: m.png, ...(m.blank === true && { blank: true as const }) } : undefined;
    case 'fit':
      if (m.kind === 'fits') return { kind: 'fits' };
      return m.kind === 'fitted' && goodPicture(m.bytes, m.picture, limits) ? { kind: 'fitted', bytes: m.bytes as ArrayBuffer, picture: m.picture as PictureKind } : undefined;
  }
}

/** Whether a picture's own header says it is within the limits, so needs no copy and no frame: only a PNG's or a JPEG's, read by arithmetic on its bytes with nothing decoded. Any other needs the frame to tell. */
export function headerWithin(bytes: Uint8Array, limits: FrameLimits = LIMITS): boolean {
  return bytes.length <= limits.bytes && within(pngSize(bytes) ?? jpegSize(bytes), limits);
}

/** A PDF, by the type the browser reports or by its name: the frame then finds out what it really is. */
export const isPdf = (file: { name: string; type: string }): boolean => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

const RASTER_TYPE = /^image\/(?:png|jpeg|jpg|webp|gif|bmp|avif)$/i;
const RASTER_NAME = /\.(?:png|jpe?g|webp|gif|bmp|avif)$/i;
/** A picture a browser can draw on a canvas, by the same two: an SVG has no pixels to be over, and needs no copy. */
export const isRaster = (file: { name: string; type: string }): boolean => RASTER_TYPE.test(file.type) || (file.type === '' && RASTER_NAME.test(file.name));
